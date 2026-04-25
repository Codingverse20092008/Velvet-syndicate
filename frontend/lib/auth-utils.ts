import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getTokensFromCookies, verifyAccessToken, authenticateUser } from './auth';
import { UnauthorizedError } from './errors';

export async function getUserFromRequest(req: NextRequest) {
  const cookieStore = await cookies();
  const tokens = getTokensFromCookies(cookieStore.toString());

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

export async function getCurrentUser(req: NextRequest): Promise<{ id: string; email: string; role: string } | null> {
  try {
    const cookieStore = await cookies();
    const tokens = getTokensFromCookies(cookieStore.toString());

    if (!tokens.accessToken) {
      return null;
    }

    const payload = verifyAccessToken(tokens.accessToken);
    return authenticateUser(payload);
  } catch {
    return null;
  }
}
