import { cacheGet, cacheSet, cacheDelete, cacheInvalidatePattern } from './redis';
import { logger } from './logger';

export const CACHE_KEYS = {
  PRODUCTS_LIST: 'products:list',
  PRODUCTS_FEATURED: 'products:featured',
  PRODUCT_BY_SLUG: (slug: string) => `product:${slug}`,
  CART: (userId: string) => `cart:${userId}`,
} as const;

export const CACHE_TTL = {
  PRODUCTS: 60,
  FEATURED: 60,
  PRODUCT_DETAIL: 60,
  CART: 30,
} as const;

export async function getCachedProducts<T>(key: string): Promise<T | null> {
  try {
    return await cacheGet<T>(key);
  } catch (err) {
    logger.error({ err, key }, 'Cache get failed');
    return null;
  }
}

export async function setCachedProducts<T>(key: string, data: T, ttl = CACHE_TTL.PRODUCTS): Promise<void> {
  try {
    await cacheSet(key, data, ttl);
  } catch (err) {
    logger.error({ err, key }, 'Cache set failed');
  }
}

export async function invalidateProductsCache(): Promise<void> {
  try {
    await cacheInvalidatePattern('products:*');
    await cacheInvalidatePattern('product:*');
  } catch (err) {
    logger.error({ err }, 'Cache invalidation failed');
  }
}

export async function invalidateCartCache(userId: string): Promise<void> {
  try {
    await cacheDelete(CACHE_KEYS.CART(userId));
  } catch (err) {
    logger.error({ err, userId }, 'Cart cache invalidation failed');
  }
}