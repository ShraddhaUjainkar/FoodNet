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

    // 1. Check if user already exists by email
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    let user;
    if (existing) {
      // User ALREADY exists: update profile info, but NEVER replace or overwrite their primary ID!
      user = await prisma.user.update({
        where: { email },
        data: {
          name: name || undefined,
          image: image || undefined,
        },
      });

      // If the incoming session had an ID different from the canonical DB ID,
      // reattach any scans saved under that alternate ID to the canonical ID
      if (id && id !== existing.id) {
        const reattached = await prisma.scan.updateMany({
          where: { userId: id },
          data: { userId: existing.id },
        });
        if (reattached.count > 0) {
          logger.info(
            { count: reattached.count, fromId: id, canonicalId: existing.id },
            "Reattached scans from session ID to canonical user ID"
          );
        }
      }
    } else {
      // 2. New user registration: create user with stable ID
      user = await prisma.user.create({
        data: {
          ...(id ? { id } : {}),
          email,
          name: name || null,
          image: image || null,
        },
      });
    }

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
