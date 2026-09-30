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

const isDev = process.env.NODE_ENV !== 'production';

/**
 * 🛡️ ENTERPRISE RATE LIMITER (Resilient)
 * Uses Redis if available for multi-instance sync, otherwise falls back to memory.
 */
export const createLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
  skip?: (req: any) => boolean;
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
    skip: options.skip,
  });
};

// 1. General API Limiter (1000 req/min in dev, 100 req/min in prod)
export const globalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: isDev ? 1000 : 100,
  message: 'Too many requests, please try again in a minute.',
  keyPrefix: 'global',
  skip: () => isDev,
});

// 2. Auth Limiter (200 req/15min in dev, 15 req/15min in prod)
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 15,
  message: 'Too many login attempts, please try again later.',
  keyPrefix: 'auth',
  skip: () => isDev,
});

// 3. Checkout Limiter
// In development: Bypassed for fast testing and prototyping (100 req / 15 min)
// In production: Relaxed to 30 req / 15 min (replaces restrictive 10 req / hour)
// Never throttles GET requests (order history, shipment polling)
export const checkoutLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 30,
  message: 'Too many checkout attempts, please try again in a few minutes.',
  keyPrefix: 'checkout',
  skip: (req) => {
    if (req.method === 'GET' || req.method === 'OPTIONS') return true;
    if (isDev) return true;
    return false;
  },
});

// 4. Dedicated Razorpay Limiter
export const razorpayLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 30,
  message: 'Too many payment requests, please try again in a few minutes.',
  keyPrefix: 'razorpay',
  skip: (req) => {
    if (req.method === 'OPTIONS') return true;
    if (isDev) return true;
    return false;
  },
});
