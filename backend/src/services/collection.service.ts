import { db } from '../lib/db';
import { collections, collectionProducts, products } from '../lib/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import crypto from 'node:crypto';
import { NotFoundError } from '../lib/errors';

export interface CollectionItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isVisible: boolean;
  productCount: number;
  createdAt: string;
}

export async function getAdminCollections(): Promise<CollectionItem[]> {
  const rows = await db
    .select({
      id: collections.id,
      name: collections.name,
      slug: collections.slug,
      description: collections.description,
      imageUrl: collections.imageUrl,
      isVisible: collections.isVisible,
      createdAt: collections.createdAt,
      productCount: sql<number>`count(${collectionProducts.id})`,
    })
    .from(collections)
    .leftJoin(collectionProducts, eq(collections.id, collectionProducts.collectionId))
    .groupBy(collections.id)
    .orderBy(desc(collections.createdAt));

  return rows.map(row => ({
    ...row,
    productCount: Number(row.productCount || 0),
  }));
}

export async function createCollection(data: {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  productIds?: string[];
}) {
  const id = crypto.randomUUID();
  
  await db.transaction(async (tx) => {
    await tx.insert(collections).values({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      isVisible: true,
    });

    if (data.productIds && data.productIds.length > 0) {
      for (const productId of data.productIds) {
        await tx.insert(collectionProducts).values({
          id: crypto.randomUUID(),
          collectionId: id,
          productId,
        });
      }
    }
  });

  return id;
}

export async function updateCollection(id: string, data: Partial<{
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isVisible: boolean;
  productIds: string[];
}>) {
  const existing = await db.query.collections.findFirst({
    where: eq(collections.id, id),
  });

  if (!existing) throw new NotFoundError('Collection');

  await db.transaction(async (tx) => {
    const patch: any = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) patch.name = data.name;
    if (data.slug !== undefined) patch.slug = data.slug;
    if (data.description !== undefined) patch.description = data.description;
    if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl;
    if (data.isVisible !== undefined) patch.isVisible = data.isVisible;

    await tx.update(collections).set(patch).where(eq(collections.id, id));

    if (data.productIds !== undefined) {
      // Delete existing mappings
      await tx.delete(collectionProducts).where(eq(collectionProducts.collectionId, id));
      
      // Add new mappings
      for (const productId of data.productIds) {
        await tx.insert(collectionProducts).values({
          id: crypto.randomUUID(),
          collectionId: id,
          productId,
        });
      }
    }
  });

  return true;
}

export async function deleteCollection(id: string) {
  const result = await db.delete(collections).where(eq(collections.id, id));
  return result;
}

export async function getCollectionProducts(id: string) {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      imageUrl: products.imageUrl,
    })
    .from(collectionProducts)
    .innerJoin(products, eq(collectionProducts.productId, products.id))
    .where(eq(collectionProducts.collectionId, id));
  
  return rows;
}
