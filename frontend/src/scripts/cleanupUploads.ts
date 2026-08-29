#!/usr/bin/env node
import { logger, captureException } from "@/lib/logger";
import { scanDatabase, db, prisma } from "@/lib/db";
import { deleteStoredImages, listStoredImages } from "@/lib/storage";

async function run() {
  const days = Number(process.env.UPLOAD_RETENTION_DAYS || 30);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  logger.info({ days }, "Starting upload cleanup");
  try {
    const toDelete = await listStoredImages(new Date(cutoff));
    logger.info(
      { stale: toDelete.length },
      "Found stale Cloudinary images",
    );

    if (toDelete.length === 0) {
      logger.info("No stale objects to delete");
      return;
    }

    // For each key, find related scans (persisted) and create audit logs before deleting
    for (const key of toDelete) {
      try {
        const affected = await prisma.scan.findMany({
          where: { imageUrl: { contains: key } },
          select: { id: true, imageUrl: true } as any,
        });
        for (const s of affected) {
          await db.createAuditLog({
            eventType: "image_cleanup_prepare",
            targetKey: key,
            scanId: s.id,
            details: { imageUrl: s.imageUrl, retentionDays: days },
          });
        }
      } catch (e) {
        logger.warn(
          { err: e, key },
          "Failed to enumerate affected scans for audit",
        );
      }
    }

    // Delete images from Cloudinary
    await deleteStoredImages(toDelete);

    // After deletion, clear persisted scan imageUrl references and create audit entries
    for (const key of toDelete) {
      try {
        const affected = await prisma.scan.findMany({
          where: { imageUrl: { contains: key } },
          select: { id: true } as any,
        });
        for (const s of affected) {
          await prisma.scan.update({
            where: { id: s.id },
            data: { imageUrl: null } as any,
          });
          await db.createAuditLog({
            eventType: "image_deleted",
            targetKey: key,
            scanId: s.id,
            details: { deletedBy: "cleanup", retentionDays: days },
          });
        }
      } catch (e) {
        logger.warn(
          { err: e, key },
          "Failed to clear persisted scan imageUrl fields",
        );
      }
    }

    // Clear references in in-memory scan DB for deleted objects
    const deletedSet = new Set(toDelete);
    for (const [id, record] of Array.from(scanDatabase.entries())) {
      let changed = false;
      if (record.imageKey && deletedSet.has(record.imageKey)) {
        record.imageKey = undefined as any;
        record.image = undefined as any;
        changed = true;
      } else if (record.image) {
        // Signed URLs may contain the key in the path; check substring match
        for (const key of toDelete) {
          if (record.image.includes(key)) {
            record.imageKey = undefined as any;
            record.image = undefined as any;
            changed = true;
            break;
          }
        }
      }

      if (changed) {
        scanDatabase.set(id, record);
        await db.createAuditLog({
          eventType: "image_deleted_inmemory",
          targetKey: record.imageKey || null,
          scanId: id,
          details: { deletedBy: "cleanup" },
        });
        logger.info({ id }, "Cleared image reference from scan record");
      }
    }

    // Create a top-level audit entry summarizing the cleanup
    await db.createAuditLog({
      eventType: "cleanup_run",
      details: { deletedCount: toDelete.length, retentionDays: days },
    });

    logger.info("Cleanup complete");
  } catch (e) {
    logger.error({ err: e }, "Cleanup run failed");
    captureException(e);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

export default run;
