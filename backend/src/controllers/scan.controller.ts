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
    const scans = await scanRepository.getAllScans(limit);
    res.status(200).json(scans);
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch scans history');
    next(error);
  }
}
