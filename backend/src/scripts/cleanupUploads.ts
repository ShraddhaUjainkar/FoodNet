#!/usr/bin/env node
import { logger, captureException } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { scanDatabase, scanRepository } from '../repositories/scan.repository.js';
import { deleteStoredImages, listStoredImages } from '../services/storage.service.js';

async function run() {
  const days = Number(process.env.UPLOAD_RETENTION_DAYS || 30);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  logger.info({ days }, 'Starting upload cleanup');

  try {
    const toDelete = await listStoredImages(new Date(cutoff));
    logger.info({ stale: toDelete.length }, 'Found stale Cloudinary images');

    if (toDelete.length === 0) {
      logger.info('No stale objects to delete');
      return;
    }

    for (const key of toDelete) {
      try {
        const affected = await prisma.scan.findMany({
          where: { imageUrl: { contains: key } },
          select: { id: true, imageUrl: true } as any,
        });
        for (const s of affected) {
          await scanRepository.createAuditLog({
            eventType: 'image_cleanup_prepare',
            targetKey: key,
            scanId: s.id,
            details: { imageUrl: s.imageUrl, retentionDays: days },
          });
        }
      } catch (e) {
        logger.warn({ err: e, key }, 'Failed to enumerate affected scans for audit');
      }
    }

    await deleteStoredImages(toDelete);

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
          await scanRepository.createAuditLog({
            eventType: 'image_deleted',
            targetKey: key,
            scanId: s.id,
            details: { deletedBy: 'cleanup', retentionDays: days },
          });
        }
      } catch (e) {
        logger.warn({ err: e, key }, 'Failed to clear persisted scan imageUrl fields');
      }
    }

    const deletedSet = new Set(toDelete);
    for (const [id, record] of Array.from(scanDatabase.entries())) {
      let changed = false;
      if (record.imageKey && deletedSet.has(record.imageKey)) {
        record.imageKey = undefined;
        record.image = undefined;
        changed = true;
      } else if (record.image) {
        for (const key of toDelete) {
          if (record.image.includes(key)) {
            record.imageKey = undefined;
            record.image = undefined;
            changed = true;
            break;
          }
        }
      }

      if (changed) {
        scanDatabase.set(id, record);
        await scanRepository.createAuditLog({
          eventType: 'image_deleted_inmemory',
          targetKey: record.imageKey || null,
          scanId: id,
          details: { deletedBy: 'cleanup' },
        });
        logger.info({ id }, 'Cleared image reference from scan record');
      }
    }

    await scanRepository.createAuditLog({
      eventType: 'cleanup_run',
      details: { deletedCount: toDelete.length, retentionDays: days },
    });

    logger.info('Cleanup complete');
  } catch (e) {
    logger.error({ err: e }, 'Cleanup run failed');
    captureException(e);
    process.exitCode = 1;
  }
}

if (process.argv[1] === import.meta.url) {
  run();
}

export default run;
