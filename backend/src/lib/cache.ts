import { cacheGet, cacheSet, cacheDelete, cacheInvalidatePattern } from './redis';
import { logger } from './logger';
import { withTimeout } from './timeout';

const CACHE_TIMEOUT_MS = 2000; // Never wait longer than 2s for cache

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
    return await withTimeout(cacheGet<T>(key), CACHE_TIMEOUT_MS, `cache:get:${key}`);
  } catch (err) {
    logger.error({ err, key }, 'Cache get failed (timeout or error)');
    return null;
  }
}

export async function setCachedProducts<T>(key: string, data: T, ttl = CACHE_TTL.PRODUCTS): Promise<void> {
  try {
    await withTimeout(cacheSet(key, data, ttl), CACHE_TIMEOUT_MS, `cache:set:${key}`);
  } catch (err) {
    logger.error({ err, key }, 'Cache set failed (timeout or error)');
  }
}

export async function invalidateProductsCache(): Promise<void> {
  try {
    await withTimeout(
      Promise.all([
        cacheInvalidatePattern('products:*'),
        cacheInvalidatePattern('product:*'),
      ]),
      CACHE_TIMEOUT_MS,
      'cache:invalidate:products'
    );
    logger.info('Products cache invalidated');
  } catch (err) {
    logger.error({ err }, 'Cache invalidation failed (timeout or error)');
  }
}

export async function invalidateCartCache(userId: string): Promise<void> {
  try {
    await withTimeout(cacheDelete(CACHE_KEYS.CART(userId)), CACHE_TIMEOUT_MS, `cache:del:cart:${userId}`);
  } catch (err) {
    logger.error({ err, userId }, 'Cart cache invalidation failed (timeout or error)');
  }
}