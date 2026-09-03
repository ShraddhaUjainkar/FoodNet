import { Request, Response, NextFunction } from 'express';
import { scanRepository } from '../repositories/scan.repository.js';
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

    // If user is authenticated, query by userId; otherwise query by guestId
    const targetId = userId || guestId || undefined;

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
