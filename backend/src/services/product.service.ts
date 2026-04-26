import { eq, and, asc, desc, inArray, sql } from 'drizzle-orm';
import { db, dbClient } from '../lib/db';
import { products, productSizes, type Product, type ProductSize } from '../lib/schema';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors';
import { CACHE_KEYS, CACHE_TTL, setCachedProducts, getCachedProducts, invalidateProductsCache } from '../lib/cache';
import { logger } from '../lib/logger';

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
    const q = search.toLowerCase();
    const exactPattern   = q;
    const startsPattern  = `${q}%`;
    const containsPattern = `%${q}%`;

    const searchLimit = limit === 50 ? 6 : limit; // Override to 6 if it's the default large limit, else respect request

    // Use dbClient.execute() — the correct raw SQL API for Turso/libSQL
    const searchResult = await dbClient.execute({
      sql: `
        SELECT
          p.id,
          CASE
            WHEN LOWER(p.brand) = ? THEN 4
            WHEN LOWER(p.name) = ?   THEN 3
            WHEN LOWER(p.name) LIKE ? THEN 2
            WHEN LOWER(p.name) LIKE ? THEN 1
            ELSE 0
          END AS rank
        FROM products p
        WHERE LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ?
        ORDER BY rank DESC, p.name ASC
        LIMIT ? OFFSET ?
      `,
      args: [exactPattern, exactPattern, startsPattern, containsPattern, containsPattern, containsPattern, searchLimit, offset],
    });
    const rawResults = searchResult.rows as unknown as { id: string; rank: number }[];

    if (rawResults.length === 0) {
      return { products: [], total: 0, limit, offset };
    }

    const ids = rawResults.map((r) => r.id);

    // Fetch full product data with variants for matched IDs
    const fullProducts = await db.query.products.findMany({
      where: inArray(products.id, ids),
      with: {
        variants: {
          with: { images: true, sizes: true },
        },
      },
    });

    // Re-apply rank order from raw results
    const rankMap = new Map(rawResults.map((r) => [r.id, r.rank]));
    const sorted = fullProducts.sort(
      (a, b) => (rankMap.get(b.id) ?? 0) - (rankMap.get(a.id) ?? 0)
    );

    // Count for pagination
    const countResult = await dbClient.execute({
      sql: `SELECT COUNT(*) as count FROM products WHERE LOWER(name) LIKE ? OR LOWER(brand) LIKE ?`,
      args: [containsPattern, containsPattern],
    });
    const total = Number((countResult.rows[0] as any)?.count ?? 0);

    return { products: sorted as any[], total, limit, offset };
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

