import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const WINDOW_SECONDS = Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 60);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 60);

let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  const client = new Redis(process.env.REDIS_URL);
  client.on('error', () => {
    if (redis === client) redis = null;
  });
  redis = client;
}

const memoryStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(key: string) {
  const now = Math.floor(Date.now() / 1000);
  const window = WINDOW_SECONDS;

  if (redis) {
    try {
      const redisKey = `rl:${key}`;
      const tx = redis.multi();
      tx.incr(redisKey);
      tx.expire(redisKey, window);
      const res = await tx.exec();
      const count = Number(res?.[0]?.[1] || 0);
      const remaining = Math.max(0, MAX_REQUESTS - count);
      const reset = now + window;
      return { allowed: count <= MAX_REQUESTS, remaining, reset };
    } catch {
      redis.disconnect();
      redis = null;
    }
  }

  const existing = memoryStore.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + window });
    return {
      allowed: 1 <= MAX_REQUESTS,
      remaining: MAX_REQUESTS - 1,
      reset: now + window,
    };
  }

  existing.count += 1;
  memoryStore.set(key, existing);
  return {
    allowed: existing.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - existing.count),
    reset: existing.resetAt,
  };
}

export async function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = (
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      'local'
    )
      .split(',')[0]
      .trim();

    const rl = await checkRateLimit(ip);
    if (!rl.allowed) {
      const retryAfter = rl.reset - Math.floor(Date.now() / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter,
        },
      });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}
