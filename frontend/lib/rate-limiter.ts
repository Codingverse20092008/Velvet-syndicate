import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { logger } from './logger';

interface RateLimitConfig {
  max: number;
  window: number; // in seconds
}

interface RateLimitRecord {
  count: number;
  firstRequest: number;
}

// In-memory store for rate limiting
// For distributed systems, use Redis instead
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((record, key) => {
    if (now - record.firstRequest > 5 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

/**
 * Throws a RateLimitError if the request exceeds limits
 */
export async function checkRequestRateLimit(request: NextRequest, _type: string = 'api'): Promise<void> {
  const { limited } = await rateLimit(request);
  if (limited) {
    const { RateLimitError } = await import('./errors');
    throw new RateLimitError();
  }
}

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = { max: 50, window: 60 }
): Promise<{ limited: boolean; response?: NextResponse }> {
  const { max, window: windowSeconds } = config;
  const windowMs = windowSeconds * 1000;

  // Get client identifier (IP address or user ID if authenticated)
  const ip =
    request.ip ??
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'unknown';

  // Create a unique key for this endpoint + IP combination
  const pathname = new URL(request.url).pathname;
  const key = `${pathname}:${ip}`;

  const now = Date.now();
  let record = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!record || now - record.firstRequest > windowMs) {
    record = {
      count: 1,
      firstRequest: now,
    };
    rateLimitStore.set(key, record);
  } else {
    record.count++;
    rateLimitStore.set(key, record);
  }

  // Check if limit exceeded
  if (record.count > max) {
    logger.warn(
      {
        ip,
        pathname,
        count: record.count,
        max,
        window: windowSeconds,
      },
      'Rate limit exceeded'
    );

    return {
      limited: true,
      response: errorResponse(
        'Too many requests',
        'RATE_LIMITED',
        429,
        {
          headers: {
            'Retry-After': String(Math.ceil((record.firstRequest + windowMs - now) / 1000)),
            'X-RateLimit-Limit': String(max),
            'X-RateLimit-Remaining': '0',
          },
        }
      ),
    };
  }

  return {
    limited: false,
  };
}

/**
 * Rate limiter specifically for admin endpoints
 * Stricter limits and tracks failed attempts
 */
const adminFailedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export async function rateLimitAdmin(request: NextRequest): Promise<{ limited: boolean; response?: NextResponse }> {
  const ip =
    request.ip ??
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const pathname = new URL(request.url).pathname;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 10; // Max 10 admin requests per minute

  // Track failed auth attempts separately
  const failedRecord = adminFailedAttempts.get(ip);
  if (failedRecord && now - failedRecord.lastAttempt < windowMs) {
    if (failedRecord.count >= maxAttempts * 2) {
      // Stricter limit for repeated failures
      logger.warn(
        {
          ip,
          pathname,
          failedAttempts: failedRecord.count,
        },
        'Admin rate limit exceeded - possible brute force'
      );

      return {
        limited: true,
        response: errorResponse(
          'Too many failed attempts. Try again later.',
          'RATE_LIMITED',
          429
        ),
      };
    }
  } else if (!failedRecord || now - failedRecord.lastAttempt > windowMs) {
    adminFailedAttempts.delete(ip);
  }


  // Apply normal rate limiting
  return rateLimit(request, { max: 30, window: 60 });
}

/**
 * Record a failed admin authentication attempt
 */
export function recordFailedAdminAttempt(ip: string): void {
  const now = Date.now();
  const record = adminFailedAttempts.get(ip) ?? { count: 0, lastAttempt: now };
  record.count++;
  record.lastAttempt = now;
  adminFailedAttempts.set(ip, record);

  logger.warn(
    {
      ip,
      failedAttempts: record.count,
    },
    'Failed admin authentication attempt'
  );
}

/**
 * Clear failed attempts for an IP (call on successful auth)
 */
export function clearFailedAdminAttempts(ip: string): void {
  adminFailedAttempts.delete(ip);
}
