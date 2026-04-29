import { eq, and, asc, desc, inArray, sql, gte, lte, lt } from 'drizzle-orm';
import { db, dbClient } from '../lib/db';
import { products, productVariants, productVariantImages, productSizes } from '../lib/schema';
import { ProductFilters } from '../services/product.service';

export class ProductRepository {
  async findMany(filters: ProductFilters) {
    const { 
      category, 
      gender, 
      subcategory, 
      brand,
      minPrice,
      maxPrice,
      featured, 
      sort = 'createdAt', 
      limit = 50, 
      offset = 0,
      cursor
    } = filters;

    const conditions = [];
    conditions.push(eq(products.isVisible, true));
    if (category) conditions.push(eq(products.category, category));
    if (gender) conditions.push(eq(products.gender, gender));
    if (subcategory) conditions.push(eq(products.productType, subcategory));
    if (brand) conditions.push(eq(products.brand, brand));
    if (minPrice !== undefined) conditions.push(gte(products.price, minPrice));
    if (maxPrice !== undefined) conditions.push(lte(products.price, maxPrice));
    if (featured !== undefined) conditions.push(eq(products.featured, featured));

    // Cursor-based pagination (Enterprise Level)
    if (cursor && sort === 'createdAt') {
      conditions.push(lt(products.createdAt, cursor));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderBy;
    switch (sort) {
      case 'price-asc': orderBy = asc(products.price); break;
      case 'price-desc': orderBy = desc(products.price); break;
      case 'name': orderBy = asc(products.name); break;
      default: orderBy = desc(products.createdAt);
    }

    const result = await db.query.products.findMany({
      where: whereClause,
      orderBy,
      limit: limit + 1, // Fetch one more to check for next page
      offset: cursor ? 0 : offset,
      with: {
        variants: {
          with: {
            images: true,
            sizes: true,
          }
        }
      }
    });

    const hasNextPage = result.length > limit;
    const items = hasNextPage ? result.slice(0, limit) : result;
    const nextCursor = hasNextPage && sort === 'createdAt' ? items[items.length - 1].createdAt : null;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);

    return {
      items,
      total: Number(countResult[0].count),
      nextCursor,
      hasNextPage
    };
  }

  async findBySlug(slug: string) {
    return await db.query.products.findFirst({
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
  }

  async findFeatured(limit = 10) {
    return await db.query.products.findMany({
      where: and(eq(products.featured, true), eq(products.isVisible, true)),
      orderBy: desc(products.createdAt),
      limit,
      with: {
        variants: {
          with: {
            images: true,
            sizes: true,
          }
        }
      }
    });
  }

  async searchRaw(q: string, tokens: string[], limit: number, offset: number) {
    const searchPattern = `%${q}%`;
    const whereSql = `
      (LOWER(name) LIKE ?) OR 
      (LOWER(brand) LIKE ?) OR
      (${tokens.map(() => `LOWER(name) LIKE ?`).join(' OR ')})
    `;
    const whereArgs = [searchPattern, searchPattern, ...tokens.map(t => `%${t}%`)];

    // Using raw SQL for relevance ranking
    const rawResults = await dbClient.execute({
      sql: `
        SELECT id, name, brand, slug, price, image_url,
          (CASE 
            WHEN LOWER(name) = ? THEN 3
            WHEN LOWER(name) LIKE ? THEN 2
            ELSE 1
          END) as score
        FROM products 
        WHERE is_visible = 1 AND (${whereSql})
        ORDER BY score DESC, created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [q, `${q}%`, ...whereArgs, limit, offset],
    });

    const ids = rawResults.rows.map((r: any) => r.id as string);
    if (ids.length === 0) return { items: [], total: 0 };

    const items = await db.query.products.findMany({
      where: inArray(products.id, ids),
      with: {
        variants: {
          with: { images: true, sizes: true },
        },
      },
    });

    // Re-apply score order
    const scoreMap = new Map(rawResults.rows.map((r: any) => [r.id, Number(r.score)]));
    const sorted = items.sort(
      (a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0)
    );

    const countResult = await dbClient.execute({
      sql: `
        SELECT COUNT(DISTINCT name) as count 
        FROM products 
        WHERE is_visible = 1 AND (${whereSql})
      `,
      args: whereArgs,
    });

    return {
      items: sorted,
      total: Number((countResult.rows[0] as any)?.count ?? 0)
    };
  }
}

export const productRepository = new ProductRepository();
