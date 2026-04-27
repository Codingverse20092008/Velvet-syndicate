import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { users } from '../lib/schema';
import { NotFoundError } from '../lib/errors';
import { logger } from '../lib/logger';

interface UpdateProfileData {
  name: string;
  phone: string | null;
  address: string | null;
  avatar: string | null;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  avatar: string | null;
  role: string;
  createdAt: string;
}

export async function updateUserProfile(
  userId: string, 
  data: UpdateProfileData
): Promise<UserProfile> {
  // Check if user exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existingUser.length === 0) {
    throw new NotFoundError('User not found');
  }

  // Check if phone is already used by another user
  if (data.phone) {
    const phoneExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, data.phone))
      .limit(1);

    if (phoneExists.length > 0 && phoneExists[0].id !== userId) {
      throw new Error('This mobile number is already registered');
    }
  }

  // Update user
  await db
    .update(users)
    .set({
      name: data.name,
      phone: data.phone,
      address: data.address,
      avatar: data.avatar,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));

  logger.info({ userId }, 'User profile updated');

  // Return updated user
  const updated = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      address: users.address,
      avatar: users.avatar,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return updated[0];
}

export async function getUserById(userId: string): Promise<UserProfile | null> {
  const user = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      address: users.address,
      avatar: users.avatar,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user.length > 0 ? user[0] : null;
}
