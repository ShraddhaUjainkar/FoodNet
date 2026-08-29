import { prisma } from "../config/database.js";
// Import storage service for signed URL retrieval
import { getImageSignedUrl } from "../services/storage.service.js";
import { logger } from "../config/logger.js";

export interface ScanRecord {
  id: string;
  name: string;
  brand: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "E";
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

    try {
      await prisma.scan.upsert({
        where: { id },
        create: {
          id,
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
      { scanId: id, imageUrl: record.image },
      "Scan saved successfully",
    );
    return record;
  },

  getScan: async (id: string): Promise<ScanRecord | null> => {
    const mem = scanDatabase.get(id);
    if (mem) return mem;

    try {
      const p = await prisma.scan.findUnique({ where: { id } });
      if (!p) return null;
      const mapped: ScanRecord = {
        id: p.id,
        name: p.id,
        brand: "",
        score: p.score ?? 0,
        grade: (p.grade as any) || "C",
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
