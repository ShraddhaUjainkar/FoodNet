import Redis from "ioredis";

const WINDOW_SECONDS = Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 60);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 60);

let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  const client = new Redis(process.env.REDIS_URL);
  client.on("error", () => {
    // Use the in-memory limiter when Redis is unavailable.
    if (redis === client) redis = null;
  });
  redis = client;
}

// In-memory fallback
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
