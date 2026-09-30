import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { env } from '../lib/env';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { users, type User, type NewUser } from '../lib/schema';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../lib/errors';
import { hashPassword, verifyPassword, createSession, revokeSession, TokenPair } from '../lib/auth';
import { logger } from '../lib/logger';
import { createDefaultVaultState } from './vault.service';
import { saveUserVault } from './vault-persistence.service';

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
  phone?: string | null;
  address?: string | null;
  googleId?: string | null;
  createdAt?: string;
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
      emailVerified: true,
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

  if (!user.passwordHash) {
    throw new UnauthorizedError('This account was created with Google. Please sign in with Google.');
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  return createSession(user.id);
}

export async function authenticateGoogleUser(credential: string): Promise<{ user: SafeUser; tokens: TokenPair }> {
  if (!credential) {
    throw new ValidationError('Google credential is required');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || '278713684404-d4modf2abjjegfr6g5vptpmmibgpg3l4.apps.googleusercontent.com';
  const client = new OAuth2Client(clientId);

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'Google ID token verification failed');
    throw new UnauthorizedError('Invalid Google credential');
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.sub) {
    throw new UnauthorizedError('Invalid Google credential payload');
  }

  const { sub, email, name, picture } = payload;
  const normalizedEmail = email.toLowerCase();

  // 1. Check if user exists by googleId
  let user = await db.query.users.findFirst({
    where: eq(users.googleId, sub),
  });

  // 2. If user exists with same email but no googleId, update user record with googleId: sub
  if (!user) {
    const existingByEmail = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existingByEmail) {
      const [updated] = await db
        .update(users)
        .set({
          googleId: sub,
          avatar: existingByEmail.avatar || picture || null,
          emailVerified: true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, existingByEmail.id))
        .returning();
      user = updated;
      logger.info({ userId: user.id, email: user.email }, 'Linked existing user with Google ID');
    }
  }

  // 3. If user doesn't exist, create a new user:
  //    - name: extracted name or default
  //    - email: extracted email
  //    - googleId: sub
  //    - role: 'user'
  //    - avatar: picture
  //    - Auto-assign ₹150 Syndicate Welcome credits in wallet/stats
  if (!user) {
    const userId = crypto.randomUUID();
    const userName = name || email.split('@')[0] || 'Syndicate Member';

    const [createdUser] = await db
      .insert(users)
      .values({
        id: userId,
        name: userName,
        email: normalizedEmail,
        googleId: sub,
        role: 'user',
        avatar: picture || null,
        emailVerified: true,
      })
      .returning();

    user = createdUser;
    logger.info({ userId: user.id, email: user.email }, 'New user created via Google OAuth');

    // Auto-assign ₹150 Syndicate Welcome credits in wallet/stats
    try {
      const defaultState = createDefaultVaultState();
      defaultState.vaultCoins = 150;
      defaultState.totalCoinsEarned = 150;
      await saveUserVault(user.id, defaultState);
      logger.info({ userId: user.id }, 'Assigned ₹150 Syndicate Welcome credits to new Google user');
    } catch (vaultErr: any) {
      logger.warn({ err: vaultErr?.message, userId: user.id }, 'Non-fatal: Failed to initialize ₹150 welcome credits');
    }
  }

  // 4. Generate standard JWT access & refresh tokens (same as email/password login)
  const tokens = await createSession(user.id);

  const safeUser: SafeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
    address: user.address,
    googleId: user.googleId,
    createdAt: user.createdAt,
  };

  return { user: safeUser, tokens };
}

export async function getUserById(id: string): Promise<SafeUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
    address: user.address,
    googleId: user.googleId,
    createdAt: user.createdAt,
  };
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

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    avatar: updated.avatar,
    phone: updated.phone,
    address: updated.address,
    googleId: updated.googleId,
    createdAt: updated.createdAt,
  };
}

export async function changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) throw new NotFoundError('User');

  if (!user.passwordHash) {
    throw new ValidationError('This account was created with Google. Please use password reset to set a password.');
  }

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