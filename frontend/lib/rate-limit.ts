import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

/**
 * Basic rate limiter using Upstash Redis
 * window: window in seconds
 * max: max requests in that window
 */
export async function rateLimit(
  identifier: string,
  windowSeconds: number,
  maxRequests: number
): Promise<RateLimitResult> {
  if (!redis) {
    // If no redis is configured, allow the request but log a warning in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Rate limiting is disabled because Redis is not configured.')
    }
    return { success: true, remaining: maxRequests, reset: Date.now() + windowSeconds * 1000 }
  }

  const key = `ratelimit:${identifier}:${windowSeconds}`
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  try {
    // Use a sliding window with sorted sets
    const multi = redis.multi()
    multi.zremrangebyscore(key, 0, now - windowMs)
    multi.zadd(key, { score: now, member: `${now}-${Math.random()}` })
    multi.zcard(key)
    multi.expire(key, windowSeconds)
    
    const results = await multi.exec()
    const count = results[2] as number

    return {
      success: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      reset: now + windowMs,
    }
  } catch (error) {
    console.error('Rate limit error:', error)
    // Fail open in case of Redis issues to not block users
    return { success: true, remaining: 1, reset: now + windowMs }
  }
}
