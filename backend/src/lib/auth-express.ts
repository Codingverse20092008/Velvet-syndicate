import { Request } from 'express';
import { getTokensFromCookies, verifyAccessToken, authenticateUser, JWTPayload } from './auth';
import { UnauthorizedError } from './errors';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export async function getUserFromRequest(req: Request): Promise<AuthUser> {
  const cookieHeader = req.headers.cookie || '';
  const tokens = getTokensFromCookies(cookieHeader);

  if (!tokens.accessToken) {
    throw new UnauthorizedError('Authentication required');
  }

  try {
    const payload = verifyAccessToken(tokens.accessToken);
    return authenticateUser(payload);
  } catch (error) {
    throw new UnauthorizedError('Session expired or invalid');
  }
}
