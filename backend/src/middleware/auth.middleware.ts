import { Request, Response, NextFunction } from "express";
import { Redis } from "ioredis";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import crypto from "crypto";

let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURI(parts.join("="));
    }
  });
  return list;
}

export async function authAndLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const cookies = parseCookies(req.headers.cookie);

    // 1. Check for logged-in user
    const userId = cookies["userId"] || (req.headers["x-user-id"] as string);

    if (userId) {
      // User path: count scans in PostgreSQL
      const userScansCount = await prisma.scan.count({
        where: { userId },
      });

      if (userScansCount >= 20) {
        res.status(403).json({
          success: false,
          error: {
            code: "USER_LIMIT_EXCEEDED",
            message:
              "You have reached the maximum limit of 20 saved scans. Please delete some scans to scan again.",
          },
        });
        return;
      }

      // Attach user details to request object
      (req as any).user = { userId, isGuest: false };
      return next();
    }

    // 2. Guest path
    let guestId = cookies["guestId"] || (req.headers["x-guest-id"] as string);
    if (!guestId) {
      guestId = `guest_${crypto.randomUUID()}`;
      res.cookie("guestId", guestId, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      });
    }

    if (redis) {
      const redisKey = `guest:${guestId}`;
      const countStr = await redis.get(redisKey);
      const count = countStr ? parseInt(countStr, 10) : 0;

      if (count >= 5) {
        res.status(403).json({
          success: false,
          error: {
            code: "GUEST_LIMIT_EXCEEDED",
            message:
              "Guest limit reached (5 scans). Please log in to continue scanning.",
          },
        });
        return;
      }
    }

    (req as any).user = { guestId, isGuest: true };
    next();
  } catch (error) {
    logger.error({ err: error }, "Auth & limit check failed");
    next(error);
  }
}
