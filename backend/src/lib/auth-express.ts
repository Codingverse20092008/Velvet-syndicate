import { Request } from 'express';
import { eq } from 'drizzle-orm';
import { getTokensFromCookies, verifyAccessToken, authenticateUser, JWTPayload } from './auth';
import { UnauthorizedError } from './errors';
import { db } from './db';
import { users } from './schema';

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

export async function getUserFromRequest(req: Request): Promise<AuthUser> {
  const cookieHeader = req.headers.cookie || '';
  const tokens = getTokensFromCookies(cookieHeader);

  if (!tokens.accessToken) {
    throw new UnauthorizedError('Authentication required');
  }

  try {
    const payload = verifyAccessToken(tokens.accessToken);
    
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
      throw new UnauthorizedError('User not found');
    }

    return user[0];
  } catch (error) {
    throw new UnauthorizedError('Session expired or invalid');
  }
}
