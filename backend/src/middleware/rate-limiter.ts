import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import IORedis from 'ioredis';
import { env } from '../lib/env';
import { logger } from '../lib/logger';

// Use Redis if configured, otherwise fallback to MemoryStore
const useRedis = env.REDIS_URL && (env.REDIS_URL.startsWith('redis://') || env.REDIS_URL.startsWith('rediss://'));

const client = useRedis 
  ? new IORedis(env.REDIS_URL!) 
  : null;

if (client) {
  client.on('error', (err) => {
    logger.error({ err }, 'Redis Rate Limiter Connection Error - failing over to memory');
  });
}

/**
 * 🛡️ ENTERPRISE RATE LIMITER (Resilient)
 * Uses Redis if available for multi-instance sync, otherwise falls back to memory.
 */
export const createLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
}) => {
  const store = client ? new RedisStore({
    // @ts-expect-error - Compatibility between ioredis versions
    sendCommand: async (...args: string[]) => {
      try {
        if (client.status !== 'ready') return null; // Fail open if not connected
        return await client.call(args[0], ...args.slice(1));
      } catch (err) {
        logger.error({ err }, 'Redis Rate Limiter Command Failed - Failing Open');
        return null; 
      }
    },
    prefix: `rl:${options.keyPrefix}:`,
  }) : undefined; // undefined falls back to in-memory store

  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: options.message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    store,
  });
};

// 1. General API Limiter (100 req/min)
export const globalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again in a minute.',
  keyPrefix: 'global',
});

// 2. Auth Limiter (10 req/15min)
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later.',
  keyPrefix: 'auth',
});

// 3. Checkout Limiter (10 req/hour)
export const checkoutLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many checkout attempts, please try again in an hour.',
  keyPrefix: 'checkout',
});
