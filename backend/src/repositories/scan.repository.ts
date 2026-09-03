import { prisma } from "../config/database.js";
import { getImageSignedUrl } from "../services/storage.service.js";
import { logger } from "../config/logger.js";
import { Redis } from "ioredis";

let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
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

    // 1. If Guest: save in Redis with 7-day TTL and in PostgreSQL for 7-day retention & migration
    const targetUserId = userContext?.isGuest
      ? userContext.guestId
      : userContext?.userId || null;

    if (userContext?.isGuest && userContext.guestId) {
      if (redis) {
        try {
          // 7 days in seconds = 604800
          await redis.setex(`temp_scan:${id}`, 604800, JSON.stringify(record));

          const redisKey = `guest:${userContext.guestId}`;
          await redis.incr(redisKey);
          await redis.expire(redisKey, 604800);

          logger.info(
            { scanId: id, guestId: userContext.guestId },
            "Guest scan saved in Redis with 7-day TTL successfully"
          );
        } catch (err) {
          logger.error({ err }, "Failed to save guest scan to Redis");
        }
      }
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

    // B. Check Redis for temporary guest scans
    if (redis) {
      try {
        const tempScan = await redis.get(`temp_scan:${id}`);
        if (tempScan) {
          const record = JSON.parse(tempScan);
          scanDatabase.set(id, record);
          return record;
        }
      } catch (e) {
        // Fallback to database
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
        emoji: "",
        gradient: "",
        image: p.imageUrl || undefined,
      };
      scanDatabase.set(id, mapped);
      return mapped;
    } catch (e) {
      return null;
    }
  },

  getAllScans: async (
    limit: number = 20,
    userId?: string | null
  ): Promise<any[]> => {
    try {
      let where: any = undefined;
      const isGuest = userId?.startsWith("guest_");

      if (isGuest) {
        // Scans for guests are shown for 7 days only, after that they vanish
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        where = {
          userId,
          createdAt: { gte: sevenDaysAgo },
        };
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

      return scans.map((p) => {
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
      if (redis) {
        await redis.del(`guest:${guestId}`).catch(() => {});
      }

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
      if (requesterId) {
        const existing = await prisma.scan.findUnique({ where: { id } });
        if (!existing || (existing.userId && existing.userId !== requesterId)) {
          return false;
        }
      }
      await prisma.scan.delete({ where: { id } });
      scanDatabase.delete(id);
      if (redis) {
        await redis.del(`temp_scan:${id}`).catch(() => {});
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
