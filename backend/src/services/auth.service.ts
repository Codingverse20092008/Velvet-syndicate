import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { env } from '../lib/env';
import crypto from 'node:crypto';
import { users, type User, type NewUser } from '../lib/schema';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../lib/errors';
import { hashPassword, verifyPassword, createSession, revokeSession, TokenPair } from '../lib/auth';
import { logger } from '../lib/logger';

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function createUser(data: { name: string; email: string; password: string }): Promise<SafeUser> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email.toLowerCase()),
  });

  if (existing) {
    throw new ConflictError('Email already registered');
  }

  if (!data.name || data.name.length < 2) {
    throw new ValidationError('Name must be at least 2 characters');
  }

  if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
    throw new ValidationError('Invalid email format');
  }

  if (!data.password || data.password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  const hashedPassword = await hashPassword(data.password);
  const userId = crypto.randomUUID();

  const [user] = await db
    .insert(users)
    .values({
      id: userId,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: hashedPassword,
      emailVerified: false,
    })
    .returning();

  logger.info({ userId, email: user.email }, 'User created');

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function authenticateUser(email: string, password: string): Promise<TokenPair> {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Block unverified users from logging in
  if (!user.emailVerified) {
    throw new UnauthorizedError('Please verify your email first. Check your inbox for the OTP.');
  }

  return createSession(user.id);
}

export async function getUserById(id: string): Promise<SafeUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  return user ?? null;
}

export async function updateUser(id: string, data: { name?: string }): Promise<SafeUser> {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) throw new NotFoundError('User');

  const [updated] = await db
    .update(users)
    .set({ name: data.name, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id))
    .returning();

  logger.info({ userId: id }, 'User updated');

  return { id: updated.id, email: updated.email, name: updated.name, role: updated.role };
}

export async function changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) throw new NotFoundError('User');

  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  if (newPassword.length < 8) {
    throw new ValidationError('New password must be at least 8 characters');
  }

  const hashedPassword = await hashPassword(newPassword);

  await db
    .update(users)
    .set({ passwordHash: hashedPassword, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id));

  logger.info({ userId: id }, 'Password changed');
}

export async function logout(userId: string): Promise<void> {
  await revokeSession(userId);
}