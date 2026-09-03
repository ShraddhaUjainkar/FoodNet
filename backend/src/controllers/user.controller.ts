import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

export async function syncUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, email, name, image } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'User email is required for sync',
        },
      });
      return;
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: name || undefined,
        image: image || undefined,
        ...(id ? { id } : {}),
      },
      create: {
        ...(id ? { id } : {}),
        email,
        name: name || null,
        image: image || null,
      },
    });

    logger.info({ userId: user.id, email: user.email }, 'User profile synced to Neon');

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to sync user');
    next(error);
  }
}

export async function getUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { email: id }],
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error({ err: error, id: req.params.id }, 'Failed to get user');
    next(error);
  }
}
