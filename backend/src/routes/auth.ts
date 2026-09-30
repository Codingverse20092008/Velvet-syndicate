import { Router, Request, Response } from 'express';
import { registerSchema, loginSchema } from '../lib/schemas';
import { createUser, authenticateUser as authenticateUserSvc, authenticateGoogleUser, logout } from '../services/auth.service';
import { sendOtp, verifyOtp } from '../services/otp.service';
import { refreshSession, setAuthCookiesExpress, clearAuthCookiesExpress } from '../lib/auth';
import { getUserFromRequest, getRefreshTokenFromRequest } from '../lib/auth-express';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { UnauthorizedError, ValidationError } from '../lib/errors';
import { logger } from '../lib/logger';
import { createLimiter } from '../middleware/rate-limiter';
import { z } from 'zod';

const router = Router();

// ─── OTP-specific rate limiter: 5 requests per 15 minutes per IP ──────────────
const otpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests. Please wait 15 minutes before trying again.',
  keyPrefix: 'otp',
});

// ─── Input schemas ─────────────────────────────────────────────────────────────

const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/auth/signup
// Creates user (emailVerified=false) then immediately fires OTP email
router.post('/signup', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body;
  const parsed = registerSchema.parse(body);

  const user = await createUser({
    name: parsed.name,
    email: parsed.email,
    password: parsed.password,
  });

  // Best-effort OTP send — don't block signup if email delivery fails
  sendOtp(user.email).catch((err) => {
    logger.warn({ err, email: user.email }, 'Failed to send OTP email after signup');
  });

  return successResponse(res, {
    user,
    message: 'Account created. Welcome to Velvet Syndicate.',
  }, 201);
}));

// POST /api/auth/login
// Returns: { accessToken, refreshToken } in body + refresh_token in cookie
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body;
  const parsed = loginSchema.parse(body);

  const tokens = await authenticateUserSvc(parsed.email, parsed.password);

  // Set refresh token in HTTP-only cookie
  setAuthCookiesExpress(res, tokens);

  logger.info({ email: parsed.email }, 'User logged in');

  // Return both tokens in body (frontend stores accessToken in localStorage)
  return successResponse(res, {
    message: 'Login successful',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}));

const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
});

// POST /api/auth/google
// Receives { credential } (Google ID token / JWT from frontend)
router.post('/google', asyncHandler(async (req: Request, res: Response) => {
  const { credential } = googleAuthSchema.parse(req.body);

  const { user, tokens } = await authenticateGoogleUser(credential);

  // Set refresh token and access token in HTTP-only cross-domain cookies
  setAuthCookiesExpress(res, tokens);

  logger.info({ userId: user.id, email: user.email }, 'User authenticated via Google');

  return res.status(200).json({
    success: true,
    token: tokens.accessToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user,
    data: {
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    }
  });
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  // Try to get user from request (may fail if token expired)
  try {
    const user = await getUserFromRequest(req);
    await logout(user.id);
  } catch (err) {
    // User already logged out or token expired - still clear cookies
    logger.warn({ error: (err as Error).message }, 'Logout without valid token');
  }

  clearAuthCookiesExpress(res);

  return successResponse(res, { message: 'Logged out' });
}));

// GET /api/auth/me
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);

  return successResponse(res, { user });
}));

// POST /api/auth/refresh
// Accepts refresh token from cookie or body, returns new access + refresh tokens
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  // Get refresh token from cookie (primary) or body (fallback)
  let refreshToken = getRefreshTokenFromRequest(req);

  // Fallback to body if not in cookie
  if (!refreshToken && req.body?.refreshToken) {
    refreshToken = req.body.refreshToken;
  }

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token required');
  }

  const tokens = await refreshSession(refreshToken);

  // Set new refresh token in cookie
  setAuthCookiesExpress(res, tokens);

  logger.info({ userId: tokens.accessToken }, 'Tokens refreshed');

  // Return both tokens in body
  return successResponse(res, {
    message: 'Token refreshed',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}));

// ─── OTP Routes ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/send-otp
 * Body: { email: string }
 *
 * Generates a fresh 6-digit OTP, stores the hash, emails the user.
 * Rate-limited to 5 requests/15 min.
 *
 * Response 200: { success: true, data: { message: "OTP sent" } }
 * Response 404: user not found
 * Response 429: rate limit exceeded
 */
router.post('/send-otp', otpLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email } = sendOtpSchema.parse(req.body);

  await sendOtp(email);

  logger.info({ email }, 'OTP send requested');

  return successResponse(res, {
    message: 'A verification code has been sent to your email. Valid for 5 minutes.',
  });
}));

/**
 * POST /api/auth/verify-otp
 * Body: { email: string, otp: string }
 *
 * Validates OTP (hash match, expiry, attempt limit).
 * On success: marks user.email_verified = true and deletes the OTP record.
 *
 * Response 200: { success: true, data: { message: "Email verified" } }
 * Response 400: invalid / expired OTP, too many attempts
 * Response 404: user not found
 */
router.post('/verify-otp', otpLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = verifyOtpSchema.parse(req.body);

  await verifyOtp(email, otp);

  logger.info({ email }, 'Email OTP verified successfully');

  return successResponse(res, {
    message: 'Email verified successfully. You can now log in.',
  });
}));

export default router;
