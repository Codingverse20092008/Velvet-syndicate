import { Redis } from '@upstash/redis';
import { env } from './env';
import { RateLimitError } from './errors';

let redis: Redis | null = null;

if (env.REDIS_URL && env.REDIS_TOKEN) {
  redis = new Redis({
    url: env.REDIS_URL,
    token: env.REDIS_TOKEN,
  });
}

export interface RateLimitConfig {
  max: number;
  window: number;
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { max: env.RATE_LIMIT_MAX, window: env.RATE_LIMIT_WINDOW }
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  if (!redis) {
    return { allowed: true, remaining: config.max, reset: Date.now() + config.window * 1000 };
  }

  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowMs = config.window * 1000;

  try {
    await redis.zadd(key, { score: now, member: `${now}:${Math.random()}` });
    await redis.zremrangebyscore(key, 0, now - windowMs);
    const count = await redis.zcard(key);
    await redis.expire(key, config.window);

    const allowed = count <= config.max;
    const remaining = Math.max(0, config.max - count);
    const reset = now + windowMs;

    return { allowed, remaining, reset };
  } catch (err) {
    return { allowed: true, remaining: config.max, reset: now + windowMs };
  }
}

export function rateLimitMiddleware(options?: Partial<RateLimitConfig>) {
  return async (req: Request): Promise<void> => {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const identifier = `${ip}:${userAgent}`;

    const config = {
      max: options?.max ?? env.RATE_LIMIT_MAX,
      window: options?.window ?? env.RATE_LIMIT_WINDOW,
    };

    const { allowed } = await checkRateLimit(identifier, config);

    if (!allowed) {
      throw new RateLimitError('Too many requests');
    }
  };
}