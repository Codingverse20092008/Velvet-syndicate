import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { Response as ExpressResponse } from 'express';
import { env } from './env';
import { db } from './db';
import { sessions, users } from './schema';
import { eq, and, lt } from 'drizzle-orm';
import { logger } from './logger';
import { UnauthorizedError } from './errors';
import { redis } from './redis';

const SALT_ROUNDS = 12;

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateAccessToken(payload: Omit<JWTPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as string,
  } as jwt.SignOptions);
}

export function generateRefreshToken(payload: Omit<JWTPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as string,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JWTPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  if (decoded.type !== 'access') {
    throw new UnauthorizedError('Invalid access token');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): JWTPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  if (decoded.type !== 'refresh') {
    throw new UnauthorizedError('Invalid refresh token');
  }
  return decoded;
}

export function hashToken(token: string): string {
  return bcrypt.hashSync(token, 10);
}

export async function createSession(
  userId: string,
  userAgent?: string,
  ip?: string
): Promise<TokenPair> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new UnauthorizedError('User not found');

  const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id, email: user.email, role: user.role });
  const refreshTokenHash = hashToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId,
    refreshTokenHash,
    userAgent,
    ip,
    expiresAt: expiresAt.toISOString(),
  });

  if (redis) {
    await redis.setex(`session:${userId}`, 604800, '1');
  }

  logger.info({ userId }, 'Session created');
  return { accessToken, refreshToken };
}

export async function refreshSession(oldRefreshToken: string): Promise<TokenPair> {
  const payload = verifyRefreshToken(oldRefreshToken);

  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.userId, payload.userId),
      lt(sessions.expiresAt, new Date().toISOString())
    ),
  });

  if (!session) {
    throw new UnauthorizedError('Session expired or revoked');
  }

  const isValid = bcrypt.compareSync(oldRefreshToken, session.refreshTokenHash);
  if (!isValid) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    throw new UnauthorizedError('Invalid refresh token');
  }

  await db.delete(sessions).where(eq(sessions.id, session.id));

  return createSession(payload.userId);
}

export async function revokeSession(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
  if (redis) {
    await redis.del(`session:${userId}`);
  }
  logger.info({ userId }, 'Session revoked');
}

export async function revokeAllSessions(): Promise<void> {
  await db.delete(sessions);
  logger.info('All sessions revoked');
}

// Web API Response versions (for Next.js compatibility)
export function setAuthCookies(res: globalThis.Response, tokens: TokenPair): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.headers.append(
    'Set-Cookie',
    `access_token=${tokens.accessToken}; HttpOnly; Secure=${isProduction}; SameSite=Strict; Path=/; Max-Age=900`
  );
  res.headers.append(
    'Set-Cookie',
    `refresh_token=${tokens.refreshToken}; HttpOnly; Secure=${isProduction}; SameSite=Strict; Path=/; Max-Age=604800`
  );
}

export function clearAuthCookies(res: globalThis.Response): void {
  res.headers.append(
    'Set-Cookie',
    'access_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
  );
  res.headers.append(
    'Set-Cookie',
    'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
  );
}

export function getTokensFromCookies(cookieHeader: string | null): { accessToken?: string; refreshToken?: string } {
  if (!cookieHeader) return {};

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return {
    accessToken: cookies['access_token'],
    refreshToken: cookies['refresh_token'],
  };
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export function authenticateUser(payload: JWTPayload): AuthUser {
  if (!payload.userId || !payload.email || !payload.role) {
    throw new UnauthorizedError('Invalid token payload');
  }
  return {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
  };
}

// Express-compatible cookie functions
export function setAuthCookiesExpress(res: ExpressResponse, tokens: TokenPair): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

export function clearAuthCookiesExpress(res: ExpressResponse): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}