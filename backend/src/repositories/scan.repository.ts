import { prisma } from "../config/database.js";
import { getImageSignedUrl } from "../services/storage.service.js";
import { logger } from "../config/logger.js";
import { redisConnection } from "../config/redis.js";

// Helper functions for safe Redis operations with graceful database fallback
async function safeGet(key: string): Promise<string | null> {
  try {
    return await redisConnection.get(key);
  } catch (err) {
    logger.warn({ err, key }, "Redis get failed, falling back to database");
    return null;
  }
}

async function safeSetEx(key: string, seconds: number, value: string): Promise<void> {
  try {
    await redisConnection.setex(key, seconds, value);
  } catch (err) {
    logger.warn({ err, key }, "Redis setex failed");
  }
}

async function safeIncr(key: string): Promise<number | null> {
  try {
    return await redisConnection.incr(key);
  } catch (err) {
    logger.warn({ err, key }, "Redis incr failed");
    return null;
  }
}

async function safeDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) {
      await redisConnection.del(...keys);
    }
  } catch (err) {
    logger.warn({ err, keys }, "Redis del failed");
  }
}

export type Grade = "A" | "B" | "C" | "D" | "E";

const isGrade = (value: unknown): value is Grade =>
  typeof value === "string" && ["A", "B", "C", "D", "E"].includes(value);

export interface ScanRecord {
  id: string;
  name: string;
  brand: string;
  score: number;
  grade: Grade;
  summary: string;
  allergens: string[];
  ingredients: {
    name: string;
    rating: "safe" | "caution" | "avoid" | "unknown";
    description: string;
    percentage?: string;
    commonUses?: string;
    evidenceLevel?: string;
    consumptionGuidance?: string;
  }[];
  additives: {
    code: string;
    name: string;
    rating: "safe" | "caution" | "avoid";
    purpose: string;
    description: string;
  }[];
  nutrition: {
    label: string;
    value: string;
    rating: "good" | "neutral" | "bad";
    description: string;
  }[];
  alternatives: {
    name: string;
    brand: string;
    score: number;
    grade: "A" | "B";
    emoji: string;
    gradient: string;
  }[];
  emoji: string;
  gradient: string;
  image?: string;
  imageKey?: string; // original Cloudinary public ID
  evidence?: any[]; // Authoritative scientific evidence retrieved via RAG
}

const globalForDb = globalThis as unknown as {
  scanDatabase: Map<string, ScanRecord>;
};

if (!globalForDb.scanDatabase) {
  globalForDb.scanDatabase = new Map<string, ScanRecord>();
}

export const scanDatabase = globalForDb.scanDatabase;

export const scanRepository = {
  saveScan: async (
    id: string,
    report: Omit<ScanRecord, "id">,
    userContext?: { userId?: string; guestId?: string; isGuest: boolean }
  ): Promise<ScanRecord> => {
    const record = { id, ...report } as ScanRecord;

    try {
      if (
        record.image &&
        !record.image.startsWith("data:") &&
        !/^https?:\/\//i.test(record.image)
      ) {
        record.imageKey = record.image;
        const signed = await getImageSignedUrl(record.image, 60 * 60);
        if (signed) record.image = signed;
      }
    } catch (e) {
      // ignore storage errors
    }

    const targetUserId = userContext?.isGuest
      ? userContext.guestId
      : userContext?.userId || null;

    // 1. Redis Cache Storage for the scan report
    const scanTtl = userContext?.isGuest ? 604800 : 86400; // 7 days for guests, 24h for registered users
    await safeSetEx(`scan:${id}`, scanTtl, JSON.stringify(record));

    if (userContext?.isGuest && userContext.guestId) {
      // Backward compatibility for legacy temp_scan keys and guest counters
      await safeSetEx(`temp_scan:${id}`, 604800, JSON.stringify(record));

      const redisKey = `guest:${userContext.guestId}`;
      await safeIncr(redisKey);
      try {
        await redisConnection.expire(redisKey, 604800);
      } catch (err) {
        // ignore
      }

      logger.info(
        { scanId: id, guestId: userContext.guestId },
        "Guest scan saved in Redis with 7-day TTL successfully"
      );
    }

    // Invalidate Vault List Cache for this user / guest in O(1)
    if (targetUserId) {
      await safeIncr(`vault:ver:${targetUserId}`);
    } else {
      await safeIncr("vault:ver:public");
    }

    // 2. Persist in PostgreSQL (both guest and authenticated user scans)
    try {
      await prisma.scan.upsert({
        where: { id },
        create: {
          id,
          userId: targetUserId,
          imageUrl: record.image || null,
          score: record.score ?? null,
          grade: record.grade || null,
          summary: record.summary || null,
          ingredients: record.ingredients as any,
          additives: record.additives as any,
          allergens: record.allergens as any,
          alternatives: record.alternatives as any,
          evidence: (record.evidence as any) || [],
        },
        update: {
          userId: targetUserId,
          imageUrl: record.image || null,
          score: record.score ?? null,
          grade: record.grade || null,
          summary: record.summary || null,
          ingredients: record.ingredients as any,
          additives: record.additives as any,
          allergens: record.allergens as any,
          alternatives: record.alternatives as any,
          evidence: (record.evidence as any) || [],
        },
      });
    } catch (e) {
      logger.error({ err: e, scanId: id }, "Failed to save scan to database");
    }

    scanDatabase.set(id, record);
    logger.info(
      { scanId: id, targetUserId, imageUrl: record.image },
      "Scan saved successfully"
    );
    return record;
  },

  getScan: async (id: string): Promise<ScanRecord | null> => {
    // A. Check in-memory cache first
    const mem = scanDatabase.get(id);
    if (mem) return mem;

    // B. Check Redis for scan report (checks primary scan:${id} and fallback temp_scan:${id})
    const cachedScan =
      (await safeGet(`scan:${id}`)) || (await safeGet(`temp_scan:${id}`));
    if (cachedScan) {
      try {
        const record = JSON.parse(cachedScan) as ScanRecord;
        scanDatabase.set(id, record);
        return record;
      } catch (e) {
        // Fallback to database if cached JSON is malformed
      }
    }

    // C. Check PostgreSQL permanently stored scans
    try {
      const p = await prisma.scan.findUnique({ where: { id } });
      if (!p) return null;
      const mapped: ScanRecord = {
        id: p.id,
        name: p.id,
        brand: "",
        score: p.score ?? 50,
        grade: isGrade(p.grade) ? p.grade : "C",
        summary: p.summary || "",
        allergens: (p.allergens as any) || [],
        ingredients: (p.ingredients as any) || [],
        additives: (p.additives as any) || [],
        nutrition: [],
        alternatives: (p.alternatives as any) || [],
        evidence: (p.evidence as any) || [],
        emoji: "",
        gradient: "",
        image: p.imageUrl || undefined,
      };
      scanDatabase.set(id, mapped);

      // Populate Redis cache: 7 days for guests, 24 hours for registered users
      const ttl = p.userId?.startsWith("guest_") ? 604800 : 86400;
      await safeSetEx(`scan:${id}`, ttl, JSON.stringify(mapped));

      return mapped;
    } catch (e) {
      return null;
    }
  },

  getAllScans: async (
    limit: number = 20,
    userId?: string | string[] | null
  ): Promise<any[]> => {
    const isGuest = typeof userId === "string" && userId.startsWith("guest_");
    const targetId = Array.isArray(userId)
      ? [...userId].sort().join("_")
      : (userId || "public");

    // 1. Check Redis Cache for Vault list
    const vaultVersion = (await safeGet(`vault:ver:${targetId}`)) || "0";
    const cacheKey = `vault:${targetId}:v${vaultVersion}:${limit}`;

    const cachedVault = await safeGet(cacheKey);
    if (cachedVault) {
      try {
        const parsed = JSON.parse(cachedVault);
        logger.debug(
          { targetId, limit, count: parsed.length },
          "Vault list served from Redis cache"
        );
        return parsed;
      } catch (err) {
        logger.warn({ err, cacheKey }, "Failed to parse cached vault list");
      }
    }

    // 2. Fetch from PostgreSQL
    try {
      let where: any = undefined;

      if (isGuest) {
        // Scans for guests are shown for 7 days only, after that they vanish
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        where = {
          userId,
          createdAt: { gte: sevenDaysAgo },
        };
      } else if (Array.isArray(userId)) {
        where = { userId: { in: userId } };
      } else if (userId) {
        where = { userId };
      }

      const scans = await prisma.scan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          score: true,
          grade: true,
          summary: true,
          imageUrl: true,
          createdAt: true,
          ingredients: true,
        },
      });

      const formattedScans = scans.map((p) => {
        const ingredients = (p.ingredients as any[]) || [];
        const avoidsCount = ingredients.filter(
          (i: any) => i.rating === "avoid"
        ).length;
        const cautionsCount = ingredients.filter(
          (i: any) => i.rating === "caution"
        ).length;

        // Calculate expiration for guest scans (createdAt + 7 days)
        let expiresAt: string | undefined = undefined;
        if (isGuest && p.createdAt) {
          const exp = new Date(
            p.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000
          );
          expiresAt = exp.toISOString();
        }

        return {
          id: p.id,
          score: p.score ?? 0,
          grade: isGrade(p.grade) ? p.grade : "C",
          summary: p.summary,
          imageUrl: p.imageUrl,
          createdAt: p.createdAt,
          expiresAt,
          ingredientsCount: ingredients.length,
          avoidsCount,
          cautionsCount,
        };
      });

      // 3. Populate Redis Cache (10 minute TTL = 600s)
      await safeSetEx(cacheKey, 600, JSON.stringify(formattedScans));

      return formattedScans;
    } catch (e) {
      logger.error({ err: e }, "Failed to fetch all scans from database");
      return [];
    }
  },

  migrateGuestScans: async (
    guestId: string,
    userId: string
  ): Promise<number> => {
    if (!guestId || !userId || guestId === userId) {
      return 0;
    }
    try {
      // 1. Only migrate active guest scans (within 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await prisma.scan.updateMany({
        where: {
          userId: guestId,
          createdAt: { gte: sevenDaysAgo },
        },
        data: {
          userId,
        },
      });

      // 2. Clear Redis guest scan counter
      await safeDel(`guest:${guestId}`);

      // 3. Atomically invalidate Vault lists for both guest and target user
      await safeIncr(`vault:ver:${guestId}`);
      await safeIncr(`vault:ver:${userId}`);

      logger.info(
        { guestId, userId, migratedCount: result.count },
        "Migrated guest scans to user account successfully"
      );
      return result.count;
    } catch (e) {
      logger.error({ err: e, guestId, userId }, "Failed to migrate guest scans");
      return 0;
    }
  },

  deleteScan: async (id: string, requesterId?: string): Promise<boolean> => {
    try {
      let existingUserId: string | null = null;
      if (requesterId) {
        const existing = await prisma.scan.findUnique({ where: { id } });
        if (!existing || (existing.userId && existing.userId !== requesterId)) {
          return false;
        }
        existingUserId = existing.userId;
      } else {
        const existing = await prisma.scan.findUnique({
          where: { id },
          select: { userId: true },
        });
        existingUserId = existing?.userId || null;
      }

      await prisma.scan.delete({ where: { id } });
      scanDatabase.delete(id);

      // Clean Redis cache
      await safeDel(`scan:${id}`, `temp_scan:${id}`);

      // Invalidate Vault List Cache
      const userToInvalidate = requesterId || existingUserId;
      if (userToInvalidate) {
        await safeIncr(`vault:ver:${userToInvalidate}`);
      } else {
        await safeIncr("vault:ver:public");
      }

      return true;
    } catch (e) {
      logger.error({ err: e, scanId: id }, "Failed to delete scan");
      return false;
    }
  },

  createAuditLog: async (params: {
    eventType: string;
    targetKey?: string | null;
    scanId?: string | null;
    userId?: string | null;
    details?: any;
  }) => {
    try {
      await prisma.auditLog.create({ data: { ...params } as any });
    } catch (e) {
      // ignore — best-effort audit
    }
  },
};
