import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { logger } from './logger';
import { recordFailedAdminAttempt, clearFailedAdminAttempts } from './rate-limiter';

/**
 * Reusable helper to protect admin routes
 * Checks for x-admin-secret header and compares it with ADMIN_SECRET environment variable
 */
export async function requireAdmin(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = request.headers.get('x-admin-secret');

  // Server configuration check
  if (!adminSecret) {
    logger.error('CRITICAL: ADMIN_SECRET is not defined in environment variables.');
    return {
      authorized: false,
      response: errorResponse('Server configuration error', 'INTERNAL_ERROR', 500),
    };
  }

  // Validate secret length (must be at least 32 characters for security)
  if (adminSecret.length < 32) {
    logger.error(
      'CRITICAL: ADMIN_SECRET is too short. Must be at least 32 characters for production security.'
    );
    return {
      authorized: false,
      response: errorResponse('Server configuration error', 'INTERNAL_ERROR', 500),
    };
  }

  // Check provided secret
  if (!providedSecret || providedSecret !== adminSecret) {
    // Record failed attempt for rate limiting
    const ip =
      request.ip ??
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      'unknown';
    recordFailedAdminAttempt(ip);

    logger.warn(
      {
        ip,
        providedSecret: providedSecret ? '[REDACTED]' : 'missing',
      },
      'Unauthorized admin access attempt'
    );

    return {
      authorized: false,
      response: errorResponse('Unauthorized: Invalid or missing admin secret', 'UNAUTHORIZED', 401),
    };
  }

  // Successful authentication - clear failed attempts
  const ip =
    request.ip ??
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'unknown';
  clearFailedAdminAttempts(ip);

  return { authorized: true };
}

/**
 * Generate a cryptographically secure admin secret
 * Use this to generate a new secret for production deployment
 */
export function generateAdminSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}
