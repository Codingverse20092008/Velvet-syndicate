import { eq, and } from 'drizzle-orm';
import { db } from '../lib/db';
import { addresses } from '../lib/schema';
import { NotFoundError, UnauthorizedError } from '../lib/errors';
import { logger } from '../lib/logger';
import crypto from 'node:crypto';

export interface CreateAddressData {
  userId: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export async function getAddressesByUserId(userId: string) {
  return await db.query.addresses.findMany({
    where: eq(addresses.userId, userId),
    orderBy: (addresses, { desc }) => [desc(addresses.isDefault), desc(addresses.createdAt)],
  });
}

export async function createAddress(data: CreateAddressData) {
  const addressId = crypto.randomUUID();
  
  // If this is set as default, unset others
  if (data.isDefault) {
    await db.update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.userId, data.userId));
  }

  // Check if this is the first address, if so make it default
  const existingCount = await db.query.addresses.findMany({
    where: eq(addresses.userId, data.userId),
  });

  const isFirstAddress = existingCount.length === 0;

  const [newAddress] = await db.insert(addresses).values({
    id: addressId,
    ...data,
    isDefault: data.isDefault || isFirstAddress,
  }).returning();

  logger.info({ addressId, userId: data.userId }, 'Address created');
  return newAddress;
}

export async function updateAddress(addressId: string, userId: string, data: Partial<CreateAddressData>) {
  const existing = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
  });

  if (!existing) throw new NotFoundError('Address not found');

  if (data.isDefault) {
    await db.update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.userId, userId));
  }

  const [updated] = await db.update(addresses)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(addresses.id, addressId))
    .returning();

  logger.info({ addressId, userId }, 'Address updated');
  return updated;
}

export async function deleteAddress(addressId: string, userId: string) {
  const existing = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
  });

  if (!existing) throw new NotFoundError('Address not found');

  await db.delete(addresses).where(eq(addresses.id, addressId));
  
  // If we deleted the default address, make the most recent one default
  if (existing.isDefault) {
    const latest = await db.query.addresses.findFirst({
      where: eq(addresses.userId, userId),
      orderBy: (addresses, { desc }) => [desc(addresses.createdAt)],
    });
    
    if (latest) {
      await db.update(addresses)
        .set({ isDefault: true })
        .where(eq(addresses.id, latest.id));
    }
  }

  logger.info({ addressId, userId }, 'Address deleted');
}

export async function setDefaultAddress(addressId: string, userId: string) {
  const existing = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
  });

  if (!existing) throw new NotFoundError('Address not found');

  await db.update(addresses)
    .set({ isDefault: false })
    .where(eq(addresses.userId, userId));

  const [updated] = await db.update(addresses)
    .set({ isDefault: true })
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
    .returning();

  if (!updated) throw new NotFoundError('Address not found');

  logger.info({ addressId, userId }, 'Default address updated');
  return updated;
}
