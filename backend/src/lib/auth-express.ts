import { Request } from 'express';
import { eq } from 'drizzle-orm';
import { getTokensFromCookies, verifyAccessToken, authenticateUser, JWTPayload } from './auth';
import { UnauthorizedError } from './errors';
import { db } from './db';
import { users } from './schema';
import { logger } from './logger';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  phone?: string | null;
  address?: string | null;
  avatar?: string | null;
  createdAt?: string;
}

/**
 * Extract access token from request.
 * Priority: 1. Authorization header (Bearer), 2. Cookie (legacy support)
 */
function getAccessTokenFromRequest(req: Request): string | undefined {
  // Priority 1: Authorization header (hybrid auth)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token) {
      logger.debug({ hasHeader: true }, 'Found access token in Authorization header');
      return token;
    }
  }

  // Priority 2: Cookie (legacy support)
  const cookieHeader = req.headers.cookie || '';
  if (cookieHeader) {
    const tokens = getTokensFromCookies(cookieHeader);
    if (tokens.accessToken) {
      logger.debug({ hasCookie: true }, 'Found access token in cookie');
      return tokens.accessToken;
    }
  }

  return undefined;
}

/**
 * Get refresh token from request.
 * Priority: 1. Cookie (primary), 2. Authorization header (Bearer, for refresh endpoint)
 */
function getRefreshTokenFromRequest(req: Request): string | undefined {
  // Priority 1: Refresh token cookie
  const cookieHeader = req.headers.cookie || '';
  if (cookieHeader) {
    const tokens = getTokensFromCookies(cookieHeader);
    if (tokens.refreshToken) {
      logger.debug({ hasCookie: true }, 'Found refresh token in cookie');
      return tokens.refreshToken;
    }
  }

  // Priority 2: Authorization header (for explicit refresh calls)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token) {
      logger.debug({ hasHeader: true }, 'Found refresh token in Authorization header');
      return token;
    }
  }

  return undefined;
}

export async function getUserFromRequest(req: Request): Promise<AuthUser> {
  const accessToken = getAccessTokenFromRequest(req);

  if (!accessToken) {
    logger.warn({ path: req.path, method: req.method }, 'No access token found in request');
    throw new UnauthorizedError('Authentication required');
  }

  try {
    const payload = verifyAccessToken(accessToken);

    // Fetch full user data from database
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        name: users.name,
        phone: users.phone,
        address: users.address,
        avatar: users.avatar,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (user.length === 0) {
      logger.warn({ userId: payload.userId }, 'User not found for valid token');
      throw new UnauthorizedError('User not found');
    }

    logger.debug({ userId: user[0].id, email: user[0].email }, 'User authenticated');
    return user[0];
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    logger.warn({ error: (error as Error).message }, 'Token verification failed');
    throw new UnauthorizedError('Session expired or invalid');
  }
}

export { getRefreshTokenFromRequest };
