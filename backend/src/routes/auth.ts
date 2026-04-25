import { Router, Request, Response } from 'express';
import { registerSchema, loginSchema, refreshTokenSchema } from '../lib/schemas';
import { createUser, authenticateUser as authenticateUserSvc, logout } from '../services/auth.service';
import { refreshSession, setAuthCookiesExpress, clearAuthCookiesExpress } from '../lib/auth';
import { getUserFromRequest } from '../lib/auth-express';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';

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
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body;
  const parsed = loginSchema.parse(body);

  const tokens = await authenticateUserSvc(parsed.email, parsed.password);

  setAuthCookiesExpress(res, tokens);

  return successResponse(res, { message: 'Login successful' });
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  await logout(user.id);

  clearAuthCookiesExpress(res);

  return successResponse(res, { message: 'Logged out' });
}));

// GET /api/auth/me
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);

  return successResponse(res, { user });
}));

// PUT /api/auth/refresh
router.put('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshTokenSchema.parse(req.body);
  const tokens = await refreshSession(refreshToken);

  setAuthCookiesExpress(res, tokens);

  return successResponse(res, { message: 'Token refreshed' });
}));


export default router;
