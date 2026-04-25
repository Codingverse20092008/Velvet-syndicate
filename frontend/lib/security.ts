import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { logger } from './logger';
import { env } from './env';

// Helmet-inspired security headers
export const securityHeaders = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // XSS protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Required for Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  // Strict Transport Security (HSTS) - only in production
  ...(env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  }),
  // Cross-Origin policies
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

// Apply security headers to response
export function applySecurityHeaders(res: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      res.headers.set(key, value);
    }
  });
  return res;
}

// CORS configuration
interface CorsConfig {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

const defaultCorsConfig: CorsConfig = {
  origin: env.APP_URL,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// CORS middleware
export function corsMiddleware(
  req: NextRequest,
  config: CorsConfig = defaultCorsConfig
): NextResponse | null {
  const origin = req.headers.get('origin');
  const allowedOrigins = Array.isArray(config.origin)
    ? config.origin
    : [config.origin || env.APP_URL];

  // Check if origin is allowed
  const isAllowed = origin ? allowedOrigins.some((allowed) =>
    allowed === '*' || allowed === origin || origin.endsWith(allowed.replace('*', ''))
  ) : true;

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });

    res.headers.set('Access-Control-Allow-Origin', isAllowed ? (origin || allowedOrigins[0]) : allowedOrigins[0]);
    res.headers.set('Access-Control-Allow-Methods', config.methods?.join(', ') || defaultCorsConfig.methods!.join(', '));
    res.headers.set('Access-Control-Allow-Headers', config.allowedHeaders?.join(', ') || defaultCorsConfig.allowedHeaders!.join(', '));

    if (config.credentials) {
      res.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    if (config.maxAge) {
      res.headers.set('Access-Control-Max-Age', config.maxAge.toString());
    }

    return res;
  }

  return null;
}

// CSRF Token generation and validation
const CSRF_SECRET = env.JWT_SECRET.slice(0, 32);

export function generateCsrfToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  const token = `${timestamp}:${random}:${hashToken(timestamp + random)}`;
  return Buffer.from(token).toString('base64url');
}

function hashToken(token: string): string {
  // Simple hash - in production use crypto
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function validateCsrfToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const [timestamp, random, hash] = decoded.split(':');

    if (!timestamp || !random || !hash) return false;

    // Check if token is not too old (1 hour)
    const tokenTime = parseInt(timestamp, 36);
    if (Date.now() - tokenTime > 3600000) return false;

    // Validate hash
    const expectedHash = hashToken(timestamp + random);
    return hash === expectedHash;
  } catch {
    return false;
  }
}

// CSRF middleware for state-changing operations
export function csrfMiddleware(req: NextRequest): NextResponse | null {
  // Only check for state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return null;
  }

  const csrfToken =
    req.headers.get('x-csrf-token') ||
    req.headers.get('x-xsrf-token') ||
    req.cookies.get('csrf_token')?.value;

  if (!csrfToken || !validateCsrfToken(csrfToken)) {
    logger.warn({
      method: req.method,
      path: new URL(req.url).pathname,
      ip: req.headers.get('x-forwarded-for'),
    }, 'CSRF validation failed');

    return errorResponse('CSRF token invalid or missing', 'CSRF_ERROR', 403);
  }

  return null;
}

// Security middleware combining all protections
export function securityMiddleware(req: NextRequest): NextResponse | null {
  // Check CORS first
  const corsRes = corsMiddleware(req);
  if (corsRes) return corsRes;

  // Check CSRF for state-changing operations
  const csrfRes = csrfMiddleware(req);
  if (csrfRes) return csrfRes;

  return null;
}

// Rate limiting helpers
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

// Request sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .slice(0, 10000); // Limit length
}

// Security audit logging
export function logSecurityEvent(
  event: string,
  req: NextRequest,
  details?: Record<string, unknown>
): void {
  logger.warn({
    type: 'security_event',
    event,
    ip: getClientIp(req),
    path: new URL(req.url).pathname,
    userAgent: req.headers.get('user-agent'),
    ...details,
  }, `Security event: ${event}`);
}

// Suspicious request detection
export function isSuspiciousRequest(req: NextRequest): boolean {
  const userAgent = req.headers.get('user-agent') || '';
  const path = new URL(req.url).pathname;

  // Check for common bot patterns
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /burpsuite/i,
    /nmap/i,
    /masscan/i,
  ];

  const hasSuspiciousPattern = suspiciousPatterns.some((pattern) =>
    pattern.test(userAgent) || pattern.test(path)
  );

  // Check for path traversal attempts
  const hasPathTraversal = /\.\.[\\/]/.test(path);

  return hasSuspiciousPattern || hasPathTraversal;
}