import { Redis } from '@upstash/redis';
import { env } from './env';
import { logger } from './logger';

let redis: Redis | null = null;

if (env.REDIS_URL && env.REDIS_TOKEN) {
  redis = new Redis({
    url: env.REDIS_URL,
    token: env.REDIS_TOKEN,
  });
  logger.info('Redis connected');
} else {
  logger.warn('Redis not configured - caching disabled');
}

export { redis };

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get<T>(key);
    return data;
  } catch (err) {
    logger.error({ err, key }, 'Redis GET failed');
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds = 60
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch (err) {
    logger.error({ err, key }, 'Redis SET failed');
  }
}

export async function cacheDelete(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    logger.error({ err, key }, 'Redis DEL failed');
  }
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.error({ err, pattern }, 'Redis invalidate pattern failed');
  }
}