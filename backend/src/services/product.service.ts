import { eq, and, asc, desc, inArray, sql } from 'drizzle-orm';
import { db, dbClient } from '../lib/db';
import { products, productSizes, type Product, type ProductSize } from '../lib/schema';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors';
import { CACHE_KEYS, CACHE_TTL, setCachedProducts, getCachedProducts, invalidateProductsCache } from '../lib/cache';
import { logger } from '../lib/logger';

const BRAND_MAP: Record<string, string[]> = {
  'nike': ['nike', 'jordan', 'nike sb'],
  'jordan': ['jordan', 'nike'],
  'adidas': ['adidas', 'yeezy'],
  'yeezy': ['yeezy', 'adidas'],
  'puma': ['puma'],
};

export interface ProductVariantWithData {
  id: string;
  productId: string;
  name: string;
  color: string;
  slug: string | null;
  images: { id: string; imageUrl: string }[];
  sizes: { id: string; size: string; stock: number }[];
}

export interface ProductWithVariants {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  imageUrl: string;
  brand: string;
  category: string;
  featured: boolean;
  createdAt: string;
  variants: ProductVariantWithData[];
}

export interface ProductFilters {
  category?: string;
  featured?: boolean;
  sort?: 'createdAt' | 'price-asc' | 'price-desc' | 'name';
  limit?: number;
  offset?: number;
  search?: string;
}

export interface PaginatedProducts {
  products: ProductWithVariants[];
  total: number;
  limit: number;
  offset: number;
}

export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  const { category, featured, sort = 'createdAt', limit = 50, offset = 0, search } = filters;

  // Search queries skip cache — they are user-specific and low-frequency
  const cacheKey = `${CACHE_KEYS.PRODUCTS_LIST}:${JSON.stringify(filters)}`;
  if (!search) {
    const cached = await getCachedProducts<PaginatedProducts>(cacheKey);
    if (cached) return cached;
  }

  const conditions = [];
  if (category) conditions.push(eq(products.category, category));
  if (featured !== undefined) conditions.push(eq(products.featured, featured));

  // --- Strict search: name only, with ranked results ---
  // Ranking: exact match (3) > starts-with (2) > contains (1)
  // We run a raw SQL query for search so we can ORDER BY relevance rank
  if (search) {
    const q = search.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!q) return { products: [], total: 0, limit, offset };

    // Ignore very short tokens to reduce noise
    const tokens = q.split(' ').filter(t => t.length >= 2);
    if (tokens.length === 0) return { products: [], total: 0, limit, offset };

    const searchLimit = 6;
    const ecosystemBrands = tokens.length === 1 ? (BRAND_MAP[tokens[0]] || []) : [];
    
    const scoreSqlParts: string[] = [];
    const whereSqlParts: string[] = [];
    const scoreArgs: any[] = [];
    const whereArgs: any[] = [];

    // Each token contributes to the score with refined weights
    tokens.forEach(token => {
      const starts = `${token}%`;
      const contains = `%${token}%`;
      
      scoreSqlParts.push(`(
        CASE WHEN LOWER(COALESCE(brand, '')) = ? THEN 60 ELSE 0 END +
        CASE WHEN LOWER(name) LIKE ? THEN 80 ELSE 0 END +
        CASE WHEN LOWER(name) LIKE ? THEN 40 ELSE 0 END +
        CASE WHEN LOWER(COALESCE(brand, '')) LIKE ? THEN 20 ELSE 0 END
      )`);
      scoreArgs.push(token, starts, contains, contains);
      
      whereSqlParts.push(`(LOWER(name) LIKE ? OR LOWER(COALESCE(brand, '')) LIKE ?)`);
      whereArgs.push(contains, contains);
    });

    // Ecosystem bonus for single token searches
    if (ecosystemBrands.length > 0) {
      const placeholders = ecosystemBrands.map(() => '?').join(', ');
      scoreSqlParts.push(`(CASE WHEN LOWER(COALESCE(brand, '')) IN (${placeholders}) THEN 30 ELSE 0 END)`);
      scoreArgs.push(...ecosystemBrands);
      whereSqlParts.push(`(LOWER(COALESCE(brand, '')) IN (${placeholders}))`);
      whereArgs.push(...ecosystemBrands);
    }

    const scoreSql = scoreSqlParts.join(' + ');
    const whereSql = whereSqlParts.join(' OR ');

    // Use CTE + Window Function for robust de-duplication (pick best variant per name)
    const searchResult = await dbClient.execute({
      sql: `
        WITH scored AS (
          SELECT id, name, (${scoreSql}) as score 
          FROM products 
          WHERE ${whereSql}
        ),
        deduped AS (
          SELECT id, name, score, 
                 ROW_NUMBER() OVER (PARTITION BY name ORDER BY score DESC) as rn
          FROM scored
        )
        SELECT id, name, score 
        FROM deduped 
        WHERE rn = 1 AND score > 0
        ORDER BY score DESC, LENGTH(name) ASC
        LIMIT ? OFFSET ?
      `,
      args: [...scoreArgs, ...whereArgs, searchLimit, offset],
    });

    const rawResults = searchResult.rows as unknown as { id: string; score: number }[];

    if (rawResults.length === 0) {
      return { products: [], total: 0, limit, offset };
    }

    const ids = rawResults.map((r) => r.id);

    // Fetch full product data with variants
    const fullProducts = await db.query.products.findMany({
      where: inArray(products.id, ids),
      with: {
        variants: {
          with: { images: true, sizes: true },
        },
      },
    });

    // Re-apply score order
    const scoreMap = new Map(rawResults.map((r) => [r.id, Number(r.score)]));
    const sorted = fullProducts.sort(
      (a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0)
    );

    // Count for pagination (accounting for GROUP BY name)
    const countResult = await dbClient.execute({
      sql: `
        SELECT COUNT(DISTINCT name) as count 
        FROM products 
        WHERE ${whereSql}
      `,
      args: whereArgs,
    });
    const total = Number((countResult.rows[0] as any)?.count ?? 0);

    return { products: sorted as any[], total, limit: searchLimit, offset };
  }
  // --- End search block ---

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy;
  switch (sort) {
    case 'price-asc': orderBy = asc(products.price); break;
    case 'price-desc': orderBy = desc(products.price); break;
    case 'name': orderBy = asc(products.name); break;
    default: orderBy = desc(products.createdAt);
  }

  const allProducts = await db.query.products.findMany({
    where: whereClause,
    orderBy,
    limit,
    offset,
    with: {
      variants: {
        with: {
          images: true,
          sizes: true,
        }
      }
    }
  });

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause);
  const total = Number(countResult[0].count);

  const paginated: PaginatedProducts = {
    products: allProducts as any[],
    total,
    limit,
    offset
  };

  await setCachedProducts(cacheKey, paginated, CACHE_TTL.PRODUCTS);
  return paginated;
}

export async function getFeaturedProducts(): Promise<ProductWithVariants[]> {
  const cacheKey = CACHE_KEYS.PRODUCTS_FEATURED;
  const cached = await getCachedProducts<ProductWithVariants[]>(cacheKey);
  if (cached) return cached;

  const featuredProducts = await db.query.products.findMany({
    where: eq(products.featured, true),
    orderBy: desc(products.createdAt),
    limit: 10,
    with: {
      variants: {
        with: {
          images: true,
          sizes: true,
        }
      }
    }
  });

  await setCachedProducts(cacheKey, featuredProducts as any[], CACHE_TTL.FEATURED);
  return featuredProducts as any[];
}

export async function getProductBySlug(slug: string): Promise<ProductWithVariants> {
  const cacheKey = CACHE_KEYS.PRODUCT_BY_SLUG(slug);
  const cached = await getCachedProducts<ProductWithVariants>(cacheKey);
  if (cached) return cached;

  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      variants: {
        with: {
          images: true,
          sizes: true,
        }
      }
    }
  });

  if (!product) throw new NotFoundError('Product');

  await setCachedProducts(cacheKey, product as any, CACHE_TTL.PRODUCT_DETAIL);
  return product as any;
}

