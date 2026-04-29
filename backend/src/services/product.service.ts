import { ProductRepository, productRepository } from '../repositories/product.repository';
import { NotFoundError } from '../lib/errors';
import { CACHE_KEYS, CACHE_TTL, setCachedProducts, getCachedProducts, invalidateProductsCache } from '../lib/cache';
import { logger } from '../lib/logger';
import { isFeatureEnabled } from '../lib/feature-flags';

export type Gender = 'men' | 'women';
export type Subcategory = 'casual' | 'walking' | 'jogging' | 'running' | 'sports' | 'sneakers';

export interface ProductFilters {
  category?: string;
  gender?: Gender;
  subcategory?: Subcategory;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  sort?: 'createdAt' | 'price-asc' | 'price-desc' | 'name';
  limit?: number;
  offset?: number;
  cursor?: string;
  search?: string;
}

export interface PaginatedProducts {
  products: any[];
  total: number;
  limit: number;
  offset: number;
  nextCursor?: string | null;
  hasNextPage: boolean;
}

export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  const startTime = Date.now();
  const { search, limit = 50, offset = 0 } = filters;

  // Search queries skip cache
  const cacheKey = `${CACHE_KEYS.PRODUCTS_LIST}:${JSON.stringify(filters)}`;
  if (!search) {
    const cached = await getCachedProducts<PaginatedProducts>(cacheKey);
    if (cached) {
      logger.info({ filters, duration: Date.now() - startTime, cache: 'hit' }, 'PRODUCT_FETCH');
      return cached;
    }
  }

  let result;
  if (search) {
    const q = search.toLowerCase().trim().replace(/\s+/g, ' ');
    const tokens = q.split(' ').filter(t => t.length >= 2);
    
    // Enterprise Pattern: Feature Flagged experimental logic
    if (isFeatureEnabled('RANKED_SEARCH')) {
      result = await productRepository.searchRaw(q, tokens, limit, offset);
    } else {
      // Fallback to simple findMany with name filter if flag is off
      result = await productRepository.findMany({ ...filters, search: q });
    }
  } else {
    result = await productRepository.findMany(filters);
  }

  const response: PaginatedProducts = {
    products: result.items,
    total: result.total,
    limit,
    offset,
    nextCursor: (result as any).nextCursor,
    hasNextPage: (result as any).hasNextPage ?? false
  };

  if (!search) {
    await setCachedProducts(cacheKey, response, CACHE_TTL.PRODUCTS);
  }

  logger.info({ 
    filters, 
    duration: Date.now() - startTime, 
    cache: 'miss',
    count: result.items.length,
    total: result.total
  }, 'PRODUCT_FETCH');

  return response;
}

export async function getFeaturedProducts(): Promise<any[]> {
  const cacheKey = CACHE_KEYS.PRODUCTS_FEATURED;
  const cached = await getCachedProducts<any[]>(cacheKey);
  if (cached) return cached;

  const products = await productRepository.findFeatured();
  await setCachedProducts(cacheKey, products, CACHE_TTL.FEATURED);
  return products;
}

export async function getProductBySlug(slug: string): Promise<any> {
  const cacheKey = CACHE_KEYS.PRODUCT_BY_SLUG(slug);
  const cached = await getCachedProducts<any>(cacheKey);
  if (cached) return cached;

  const product = await productRepository.findBySlug(slug);
  if (!product) throw new NotFoundError('Product not found');

  await setCachedProducts(cacheKey, product, CACHE_TTL.PRODUCT_DETAIL);
  return product;
}

export { invalidateProductsCache };
