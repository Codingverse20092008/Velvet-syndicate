import { Redis } from '@upstash/redis';
import { env } from './env';
import { logger } from './logger';

let redis: Redis | null = null;
let circuitOpen = false;
let failureCount = 0;
const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT_MS = 30000; // 30 seconds

if (env.REDIS_URL && env.REDIS_TOKEN) {
  redis = new Redis({
    url: env.REDIS_URL,
    token: env.REDIS_TOKEN,
  });
  logger.info('Redis connected');
} else {
  logger.warn('Redis not configured - caching disabled');
}

function tripCircuit() {
  if (circuitOpen) return;
  circuitOpen = true;
  logger.error({ resetIn: RESET_TIMEOUT_MS }, 'Redis Circuit Breaker OPEN - falling back to DB');
  setTimeout(() => {
    circuitOpen = false;
    failureCount = 0;
    logger.info('Redis Circuit Breaker CLOSED - retrying Redis');
  }, RESET_TIMEOUT_MS);
}

export { redis };

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis || circuitOpen) return null;
  try {
    const data = await redis.get<T>(key);
    failureCount = 0; // Success, reset failures
    return data;
  } catch (err) {
    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) tripCircuit();
    logger.error({ err, key, failureCount }, 'Redis GET failed');
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds = 60
): Promise<void> {
  if (!redis || circuitOpen) return;
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    failureCount = 0;
  } catch (err) {
    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) tripCircuit();
    logger.error({ err, key, failureCount }, 'Redis SET failed');
  }
}

export async function cacheDelete(key: string): Promise<void> {
  if (!redis || circuitOpen) return;
  try {
    await redis.del(key);
    failureCount = 0;
  } catch (err) {
    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) tripCircuit();
    logger.error({ err, key, failureCount }, 'Redis DEL failed');
  }
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  if (!redis || circuitOpen) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    failureCount = 0;
  } catch (err) {
    failureCount++;
    if (failureCount >= FAILURE_THRESHOLD) tripCircuit();
    logger.error({ err, pattern, failureCount }, 'Redis invalidate pattern failed');
  }
}

export async function pingRedis(): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}