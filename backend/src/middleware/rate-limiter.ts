import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import IORedis from 'ioredis';
import { env } from '../lib/env';
import { logger } from '../lib/logger';

const client = new IORedis(env.REDIS_URL || 'redis://localhost:6379');

client.on('error', (err) => {
  logger.error({ err }, 'Redis Rate Limiter Connection Error');
});

/**
 * 🛡️ ENTERPRISE RATE LIMITER (Redis-backed)
 * Synchronizes limits across multiple backend instances.
 */
export const createLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: options.message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // @ts-expect-error - Compatibility between ioredis versions
      sendCommand: async (...args: string[]) => {
        try {
          return await client.call(args[0], ...args.slice(1));
        } catch (err) {
          logger.error({ err }, 'Redis Rate Limiter Command Failed - Failing Open');
          // Return a dummy value that allows the request to proceed (fail-open strategy)
          return null; 
        }
      },
      prefix: `rl:${options.keyPrefix}:`,
    }),
  });
};

// 1. General API Limiter (100 req/min)
export const globalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again in a minute.',
  keyPrefix: 'global',
});

// 2. Auth Limiter (5 req/15min)
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
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
