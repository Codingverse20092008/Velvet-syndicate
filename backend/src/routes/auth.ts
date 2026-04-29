import { Router, Request, Response } from 'express';
import { registerSchema, loginSchema } from '../lib/schemas';
import { createUser, authenticateUser as authenticateUserSvc, logout } from '../services/auth.service';
import { refreshSession, setAuthCookiesExpress, clearAuthCookiesExpress } from '../lib/auth';
import { getUserFromRequest, getRefreshTokenFromRequest } from '../lib/auth-express';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { UnauthorizedError } from '../lib/errors';
import { logger } from '../lib/logger';

const router = Router();

// POST /api/auth/signup
router.post('/signup', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body;
  const parsed = registerSchema.parse(body);

  const user = await createUser({
    name: parsed.name,
    email: parsed.email,
    password: parsed.password,
  });

  return successResponse(res, { user }, 201);
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


export default router;
