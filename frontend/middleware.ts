import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { securityMiddleware, applySecurityHeaders, isSuspiciousRequest, logSecurityEvent } from './lib/security';
import { rateLimit } from './lib/rate-limiter';
import { logRequest, logResponse, generateRequestId } from './lib/logger';
import { captureException } from './lib/monitoring';
import { env } from './lib/env';

const PROTECTED_ROUTES = ['/api/cart', '/api/orders', '/api/users'];

// Determine rate limit category based on path
function getRateLimitCategory(pathname: string): 'auth' | 'products' | 'cart' | 'orders' | 'default' {
  if (pathname.startsWith('/api/auth')) return 'auth';
  if (pathname.startsWith('/api/products')) return 'products';
  if (pathname.startsWith('/api/cart')) return 'cart';
  if (pathname.startsWith('/api/orders')) return 'orders';
  return 'default';
}

export async function middleware(req: NextRequest) {
  const startTime = performance.now();
  const { pathname } = req.nextUrl;

  // Generate request ID for tracing
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  // Check for suspicious requests
  if (isSuspiciousRequest(req)) {
    logSecurityEvent('suspicious_request', req, { requestId });
    return errorResponse('Request blocked', 'UNAUTHORIZED', 403);
  }


  // Apply security middleware (CORS, CSRF)
  const securityRes = securityMiddleware(req);
  if (securityRes) {
    return applySecurityHeaders(securityRes);
  }

  // Log request start
  const { childLogger } = logRequest(req, requestId);

  // Check rate limits
  try {
    const rateLimitResult = await rateLimit(req);
    if (rateLimitResult.limited && rateLimitResult.response) {
      return applySecurityHeaders(rateLimitResult.response);
    }

    // Check protected routes
    const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
    let userId: string | undefined;

    if (isProtected) {
      const accessToken = req.cookies.get('access_token')?.value ||
                          req.headers.get('authorization')?.split(' ')[1];

      if (!accessToken) {
        const duration = Math.round(performance.now() - startTime);
        logResponse(childLogger, 401, duration);
        return applySecurityHeaders(
          errorResponse('Authentication required', 'UNAUTHORIZED', 401)
        );
      }

      try {
        const { payload } = await jwtVerify(
          accessToken,
          new TextEncoder().encode(env.JWT_SECRET)
        );
        userId = payload.sub;

        // User specific tracking can be added here if rateLimit is updated to accept it
        if (userId) {
          // currently rateLimit only uses IP, but we can call it again or skip
          // await checkRequestRateLimit(req, category, userId);
        }
      } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        logResponse(childLogger, 401, duration, error as Error);
        return applySecurityHeaders(
          errorResponse('Invalid or expired session', 'UNAUTHORIZED', 401)
        );
      }
    }

    // Continue to handler
    const res = NextResponse.next();

    // Apply security headers
    applySecurityHeaders(res);

    // Rate limit headers are handled internally in lib/rate-limiter.ts when limited

    // Add request ID header for tracing
    res.headers.set('X-Request-Id', requestId);

    // Log response
    const duration = Math.round(performance.now() - startTime);
    logResponse(childLogger, res.status, duration);

    return res;

  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logResponse(childLogger, 429, duration, error as Error);
    captureException(error as Error, { requestId, pathname });

    return applySecurityHeaders(
      errorResponse('Too many requests', 'RATE_LIMITED', 429, { headers: { 'Retry-After': '60' } })
    );
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
