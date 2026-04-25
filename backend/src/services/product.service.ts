import { eq, and, asc, desc, inArray, sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { products, productSizes, type Product, type ProductSize } from '../lib/schema';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors';
import { CACHE_KEYS, CACHE_TTL, setCachedProducts, getCachedProducts, invalidateProductsCache } from '../lib/cache';
import { logger } from '../lib/logger';

export interface ProductWithSizes {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  featured: boolean;
  createdAt: string;
  sizes: ProductSize[];
}

export interface ProductFilters {
  category?: string;
  featured?: boolean;
  sort?: 'createdAt' | 'price-asc' | 'price-desc' | 'name';
  limit?: number;
  offset?: number;
}

export interface PaginatedProducts {
  products: ProductWithSizes[];
  total: number;
  limit: number;
  offset: number;
}

export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  const { category, featured, sort = 'createdAt', limit = 50, offset = 0 } = filters;

  const cacheKey = `${CACHE_KEYS.PRODUCTS_LIST}:${JSON.stringify(filters)}`;
  const cached = await getCachedProducts<PaginatedProducts>(cacheKey);
  if (cached) return cached;

  const conditions = [];
  if (category) conditions.push(eq(products.category, category));
  if (featured !== undefined) conditions.push(eq(products.featured, featured));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy;
  switch (sort) {
    case 'price-asc': orderBy = asc(products.price); break;
    case 'price-desc': orderBy = desc(products.price); break;
    case 'name': orderBy = asc(products.name); break;
    default: orderBy = desc(products.createdAt);
  }

  // Use 'with' to fetch sizes in a single batch (Drizzle optimizes this)
  const allProducts = await db.query.products.findMany({
    where: whereClause,
    orderBy,
    limit,
    offset,
    with: {
      sizes: true
    }
  });

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause);
  const total = Number(countResult[0].count);

  const paginated: PaginatedProducts = { 
    products: allProducts as ProductWithSizes[], 
    total, 
    limit, 
    offset 
  };
  
  await setCachedProducts(cacheKey, paginated, CACHE_TTL.PRODUCTS);
  return paginated;
}

export async function getFeaturedProducts(): Promise<ProductWithSizes[]> {
  const cacheKey = CACHE_KEYS.PRODUCTS_FEATURED;
  const cached = await getCachedProducts<ProductWithSizes[]>(cacheKey);
  if (cached) return cached;

  const featuredProducts = await db.query.products.findMany({
    where: eq(products.featured, true),
    orderBy: desc(products.createdAt),
    limit: 10,
    with: {
      sizes: true
    }
  });

  await setCachedProducts(cacheKey, featuredProducts as ProductWithSizes[], CACHE_TTL.FEATURED);
  return featuredProducts as ProductWithSizes[];
}

export async function getProductBySlug(slug: string): Promise<ProductWithSizes> {
  const cacheKey = CACHE_KEYS.PRODUCT_BY_SLUG(slug);
  const cached = await getCachedProducts<ProductWithSizes>(cacheKey);
  if (cached) return cached;

  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      sizes: true
    }
  });

  if (!product) throw new NotFoundError('Product');

  await setCachedProducts(cacheKey, product as ProductWithSizes, CACHE_TTL.PRODUCT_DETAIL);
  return product as ProductWithSizes;
}


export async function createProduct(data: {
  name: string;
  slug: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  featured: boolean;
  sizes: { size: string; stock: number }[];
}): Promise<ProductWithSizes> {
  const existing = await db.query.products.findFirst({ where: eq(products.slug, data.slug) });
  if (existing) {
    throw new ConflictError('Product with this slug already exists');
  }

  if (!data.name || !data.slug || !data.price || data.sizes.length === 0) {
    throw new ValidationError('Missing required fields');
  }

  const productId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(products).values({
      id: productId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: data.price,
      imageUrl: data.imageUrl,
      category: data.category,
      featured: data.featured,
    });

    if (data.sizes.length > 0) {
      await tx.insert(productSizes).values(
        data.sizes.map((s) => ({
          id: crypto.randomUUID(),
          productId,
          size: s.size,
          stock: s.stock,
        }))
      );
    }
  });

  await invalidateProductsCache();
  logger.info({ productId, slug: data.slug }, 'Product created');

  return getProductBySlug(data.slug);
}

export async function updateProduct(
  slug: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    category?: string;
    featured?: boolean;
    sizes?: { size: string; stock: number }[];
  }
): Promise<ProductWithSizes> {
  const product = await db.query.products.findFirst({ where: eq(products.slug, slug) });
  if (!product) throw new NotFoundError('Product');

  await db.transaction(async (tx) => {
    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.imageUrl) updateData.imageUrl = data.imageUrl;
    if (data.category) updateData.category = data.category;
    if (data.featured !== undefined) updateData.featured = data.featured;

    await tx.update(products).set(updateData).where(eq(products.slug, slug));

    if (data.sizes) {
      await tx.delete(productSizes).where(eq(productSizes.productId, product.id));
      if (data.sizes.length > 0) {
        await tx.insert(productSizes).values(
          data.sizes.map((s) => ({
            id: crypto.randomUUID(),
            productId: product.id,
            size: s.size,
            stock: s.stock,
          }))
        );
      }
    }
  });

  await invalidateProductsCache();
  logger.info({ productId: product.id }, 'Product updated');

  return getProductBySlug(slug);
}

export async function deleteProduct(slug: string): Promise<void> {
  const product = await db.query.products.findFirst({ where: eq(products.slug, slug) });
  if (!product) throw new NotFoundError('Product');

  await db.delete(products).where(eq(products.slug, slug));
  await invalidateProductsCache();
  logger.info({ productId: product.id }, 'Product deleted');
}

export async function seedProducts(): Promise<{ count: number }> {
  const result = await db.select({ count: sql<number>`count(*)` }).from(products);
  if (Number(result[0].count) > 0) {
    return { count: Number(result[0].count) };
  }

  const seedData = [
    {
      name: 'Obsidian Low',
      slug: 'obsidian-low',
      description: 'Silence made tangible. The Obsidian Low emerges from darkness.',
      price: 425,
      imageUrl: '/products/obsidian-low-1.png',
      category: 'footwear',
      featured: true,
      sizes: [
        { size: '7', stock: 10 }, { size: '8', stock: 15 }, { size: '9', stock: 20 },
        { size: '10', stock: 20 }, { size: '11', stock: 15 }, { size: '12', stock: 10 },
      ],
    },
    {
      name: 'Phantom Runner',
      slug: 'phantom-runner',
      description: 'A shadow in motion. The Phantom Runner borrows from athletic heritage.',
      price: 495,
      imageUrl: '/products/phantom-runner-1.png',
      category: 'footwear',
      featured: true,
      sizes: [
        { size: '7', stock: 8 }, { size: '8', stock: 12 }, { size: '9', stock: 18 },
        { size: '10', stock: 18 }, { size: '11', stock: 12 }, { size: '12', stock: 8 },
      ],
    },
    {
      name: 'Noir High',
      slug: 'noir-high',
      description: 'Elevation without announcement. The Noir High commands space.',
      price: 550,
      imageUrl: '/products/noir-high-1.png',
      category: 'footwear',
      featured: true,
      sizes: [
        { size: '7', stock: 5 }, { size: '8', stock: 10 }, { size: '9', stock: 15 },
        { size: '10', stock: 15 }, { size: '11', stock: 10 }, { size: '12', stock: 5 },
      ],
    },
  ];

  for (const p of seedData) {
    await createProduct(p);
  }

  return { count: seedData.length };
}