import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { orderItems, orders, products, users } from '../lib/schema';
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

export interface UserActiveOrder {
  id: string;
  status: string;
  total: number;
  createdAt: string;
}

export interface UserStats {
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  lastOrderDate: string | null;
  lastOrderStatus: string | null;
  lastActivity: string | null;
  activeOrder: UserActiveOrder | null;
}

export interface RecommendationProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  brand: string;
  imageUrl: string;
}

export interface UserRecommendations {
  buyAgain: RecommendationProduct[];
  mayAlsoLike: RecommendationProduct[];
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

function mapRecommendationProduct(product: any): RecommendationProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price ?? 0),
    brand: product.brand,
    imageUrl: product.imageUrl,
  };
}

export async function getActiveOrder(userId: string): Promise<UserActiveOrder | null> {
  const active = await db.query.orders.findFirst({
    where: and(
      eq(orders.userId, userId),
      inArray(orders.status, ['PENDING', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY'])
    ),
    orderBy: desc(orders.createdAt),
    columns: {
      id: true,
      status: true,
      totalAmount: true,
      createdAt: true,
    },
  });

  if (!active) return null;

  return {
    id: active.id,
    status: active.status,
    total: Number(active.totalAmount ?? 0),
    createdAt: active.createdAt,
  };
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const [aggregates] = await db
    .select({
      totalOrders: sql<number>`count(*)`,
      totalSpent: sql<number>`coalesce(sum(case when ${orders.status} in ('CONFIRMED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED') then ${orders.totalAmount} else 0 end), 0)`,
      lastOrderDate: sql<string | null>`max(${orders.createdAt})`,
    })
    .from(orders)
    .where(eq(orders.userId, userId));

  const latestOrder = await db.query.orders.findFirst({
    where: eq(orders.userId, userId),
    orderBy: desc(orders.createdAt),
    columns: {
      status: true,
      createdAt: true,
    },
  });

  const profile = await getUserById(userId);
  const activeOrder = await getActiveOrder(userId);
  const totalSpent = Number(aggregates?.totalSpent ?? 0);
  const lastOrderDate = aggregates?.lastOrderDate ?? null;

  return {
    totalOrders: Number(aggregates?.totalOrders ?? 0),
    totalSpent,
    loyaltyPoints: Math.floor(totalSpent / 100),
    lastOrderDate,
    lastOrderStatus: latestOrder?.status ?? null,
    lastActivity: lastOrderDate ?? profile?.createdAt ?? null,
    activeOrder,
  };
}

export async function getRecommendations(userId: string, limit = 6): Promise<UserRecommendations> {
  const userOrderItems = await db
    .select({
      productId: orderItems.productId,
      createdAt: orders.createdAt,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.userId, userId),
        ne(orders.status, 'CANCELLED'),
        ne(orders.status, 'FAILED')
      )
    )
    .orderBy(desc(orders.createdAt))
    .limit(200);

  const recentDistinctProductIds = Array.from(
    new Set(userOrderItems.map((entry) => entry.productId))
  ).slice(0, Math.max(4, limit));

  const buyAgainProducts = recentDistinctProductIds.length
    ? await db.query.products.findMany({
        where: and(inArray(products.id, recentDistinctProductIds), eq(products.isVisible, true)),
        columns: {
          id: true,
          name: true,
          slug: true,
          price: true,
          brand: true,
          imageUrl: true,
        },
      })
    : [];

  const buyAgainSorted = recentDistinctProductIds
    .map((productId) => buyAgainProducts.find((p) => p.id === productId))
    .filter(Boolean)
    .slice(0, limit) as RecommendationProduct[];

  const seenProductIds = buyAgainSorted.map((p) => p.id);
  const preferredBrands = Array.from(new Set(buyAgainSorted.map((p) => p.brand))).slice(0, 4);

  const mayAlsoLike = preferredBrands.length
    ? await db.query.products.findMany({
        where: and(
          inArray(products.brand, preferredBrands),
          eq(products.isVisible, true)
        ),
        orderBy: desc(products.createdAt),
        limit: limit * 2,
        columns: {
          id: true,
          name: true,
          slug: true,
          price: true,
          brand: true,
          imageUrl: true,
        },
      })
    : await db.query.products.findMany({
        where: eq(products.isVisible, true),
        orderBy: desc(products.createdAt),
        limit,
        columns: {
          id: true,
          name: true,
          slug: true,
          price: true,
          brand: true,
          imageUrl: true,
        },
      });

  const dedupedMayAlsoLike = mayAlsoLike
    .filter((product) => !seenProductIds.includes(product.id))
    .slice(0, limit)
    .map(mapRecommendationProduct);

  return {
    buyAgain: buyAgainSorted.map(mapRecommendationProduct),
    mayAlsoLike: dedupedMayAlsoLike,
  };
}
