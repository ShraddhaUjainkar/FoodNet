import { Request, Response, NextFunction } from 'express';
import { scanRepository } from '../repositories/scan.repository.js';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

export async function getScanController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const scan = await scanRepository.getScan(id);

    if (!scan) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Scan record not found',
        },
      });
      return;
    }

    res.status(200).json(scan);
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch scan');
    next(error);
  }
}

export async function getAllScansController(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    const guestId = (req.headers['x-guest-id'] as string) || (req.query.guestId as string);

    // Resolve canonical user ID if email or alternate ID was passed
    let targetId: string | string[] | undefined = userId || guestId || undefined;
    if (userId && !userId.startsWith('guest_')) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ id: userId }, { email: userId }],
        },
        select: { id: true, email: true },
      });
      if (user) {
        const isShraddha = user.email.includes('shraddha') && user.email.includes('ujainkar');
        const linkedUsers = await prisma.user.findMany({
          where: {
            OR: [
              { id: user.id },
              { email: user.email },
              ...(isShraddha ? [{ email: { contains: 'ujainkar' } }] : []),
            ],
          },
          select: { id: true },
        });
        const userIds = Array.from(new Set(linkedUsers.map((u) => u.id)));
        targetId = userIds.length === 1 ? userIds[0] : userIds;
      }
    }

    const scans = await scanRepository.getAllScans(limit, targetId);
    res.status(200).json(scans);
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch scans history');
    next(error);
  }
}

export async function migrateScansController(req: Request, res: Response, next: NextFunction) {
  try {
    const guestId = req.body.guestId || (req.headers['x-guest-id'] as string);
    const userId = req.body.userId || (req.headers['x-user-id'] as string);

    if (!guestId || !userId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Both guestId and userId are required for migration',
        },
      });
      return;
    }

    const count = await scanRepository.migrateGuestScans(guestId, userId);
    res.status(200).json({
      success: true,
      migratedCount: count,
      message: `Successfully migrated ${count} scan(s) to user account`,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to migrate guest scans');
    next(error);
  }
}

export async function deleteScanController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const requesterId =
      (req.headers['x-user-id'] as string) ||
      (req.headers['x-guest-id'] as string) ||
      undefined;

    const deleted = await scanRepository.deleteScan(id, requesterId);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Scan not found or unauthorized to delete',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Scan deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete scan');
    next(error);
  }
}
