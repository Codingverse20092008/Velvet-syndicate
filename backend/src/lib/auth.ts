import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { Response as ExpressResponse } from 'express';
import { env } from './env';
import { db } from './db';
import { sessions, users } from './schema';
import { eq, and, gt } from 'drizzle-orm';
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

  // FIXED: Check for VALID sessions (expiresAt > now), not expired ones
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.userId, payload.userId),
      gt(sessions.expiresAt, new Date().toISOString())
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
  // For cross-domain auth: sameSite must be 'none' and secure must be true
  const sameSite = isProduction ? 'None' : 'Lax';
  const secure = isProduction ? 'Secure' : '';

  res.headers.append(
    'Set-Cookie',
    `access_token=${tokens.accessToken}; HttpOnly; ${secure}; SameSite=${sameSite}; Path=/; Max-Age=900`
  );
  res.headers.append(
    'Set-Cookie',
    `refresh_token=${tokens.refreshToken}; HttpOnly; ${secure}; SameSite=${sameSite}; Path=/; Max-Age=604800`
  );
}

export function clearAuthCookies(res: globalThis.Response): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = isProduction ? 'None' : 'Lax';
  const secure = isProduction ? 'Secure' : '';

  res.headers.append(
    'Set-Cookie',
    `access_token=; HttpOnly; ${secure}; SameSite=${sameSite}; Path=/; Max-Age=0`
  );
  res.headers.append(
    'Set-Cookie',
    `refresh_token=; HttpOnly; ${secure}; SameSite=${sameSite}; Path=/; Max-Age=0`
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
  name?: string;
  phone?: string | null;
  address?: string | null;
  avatar?: string | null;
  createdAt?: string;
}

export function authenticateUser(payload: JWTPayload, userData?: Partial<AuthUser>): AuthUser {
  if (!payload.userId || !payload.email || !payload.role) {
    throw new UnauthorizedError('Invalid token payload');
  }
  return {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
    ...userData,
  };
}

// Express-compatible cookie functions
// HYBRID AUTH: Only refresh token in cookie, access token returned in body + Authorization header
export function setAuthCookiesExpress(res: ExpressResponse, tokens: TokenPair): void {
  const isProduction = process.env.NODE_ENV === 'production';
  // 🔴 CRITICAL FOR CROSS-DOMAIN: sameSite must be 'none' and secure must be true
  const sameSite = 'none'; // Always 'none' for cross-domain (Vercel → Render)
  const secure = true; // Always true when sameSite is 'none'

  logger.info({ isProduction, sameSite, secure }, 'Setting auth cookies with cross-domain config');

  // Set refresh token in HTTP-only cookie
  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: secure, // 🔴 MUST be true for cross-domain
    sameSite: sameSite, // 🔴 MUST be 'none' for cross-domain
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain: isProduction ? undefined : undefined,
  });

  // Also set access token in cookie for redundant auth (fallback)
  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: secure,
    sameSite: sameSite,
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
}

// Set access token in cookie only when needed (legacy support)
export function setAccessTokenCookieExpress(res: ExpressResponse, accessToken: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = isProduction ? 'none' : 'lax';

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: sameSite,
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
}

export function clearAuthCookiesExpress(res: ExpressResponse): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = isProduction ? 'none' : 'lax';

  res.clearCookie('refresh_token', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: sameSite
  });
  res.clearCookie('access_token', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: sameSite
  });
}