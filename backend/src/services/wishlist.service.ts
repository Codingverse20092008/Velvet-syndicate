import crypto from 'crypto';
import { dbClient } from '../lib/db';
import { logger } from '../lib/logger';

let tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  try {
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS wishlist_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `);
    await dbClient.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS wishlist_user_product_idx ON wishlist_items(user_id, product_id)
    `);
    await dbClient.execute(`
      CREATE INDEX IF NOT EXISTS wishlist_user_id_idx ON wishlist_items(user_id)
    `);
    tableEnsured = true;
    logger.info('Wishlist table ensured');
  } catch (err) {
    logger.error({ err }, 'Failed to ensure wishlist table');
  }
}

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  is_on_sale: number | boolean;
  sale_price: number | null;
  sale_percentage: number;
  is_out_of_stock: number | boolean;
}

interface WishlistEntry {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

export async function getWishlist(userId: string): Promise<WishlistItem[]> {
  await ensureTable();
  const result = await dbClient.execute(`
    SELECT wi.*, p.name, p.slug, p.price, p.image_url, p.is_on_sale, p.sale_percentage, p.is_out_of_stock
    FROM wishlist_items wi
    JOIN products p ON wi.product_id = p.id
    WHERE wi.user_id = ${esc(userId)}
    ORDER BY wi.created_at DESC
  `);
  return (result.rows as any[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    createdAt: row.created_at,
    name: row.name,
    slug: row.slug,
    price: row.price,
    image_url: row.image_url,
    is_on_sale: row.is_on_sale,
    sale_price: row.sale_price ?? null,
    sale_percentage: row.sale_percentage,
    is_out_of_stock: row.is_out_of_stock,
  }));
}

export async function getWishlistCount(userId: string): Promise<number> {
  await ensureTable();
  const result = await dbClient.execute(`
    SELECT COUNT(*) as count FROM wishlist_items WHERE user_id = ${esc(userId)}
  `);
  return Number((result.rows[0] as any).count);
}

export async function getWishlistProductIds(userId: string): Promise<string[]> {
  await ensureTable();
  const result = await dbClient.execute(`
    SELECT product_id FROM wishlist_items WHERE user_id = ${esc(userId)}
  `);
  return result.rows.map((r: any) => r.product_id);
}

export async function addToWishlist(userId: string, productId: string): Promise<WishlistEntry> {
  await ensureTable();
  // Check if already exists
  const existing = await dbClient.execute(`
    SELECT id FROM wishlist_items WHERE user_id = ${esc(userId)} AND product_id = ${esc(productId)} LIMIT 1
  `);
  if (existing.rows.length > 0) {
    const row = existing.rows[0] as any;
    return { id: row.id, userId: row.user_id, productId: row.product_id, createdAt: row.created_at };
  }

  const id = crypto.randomUUID();
  await dbClient.execute(`
    INSERT INTO wishlist_items (id, user_id, product_id)
    VALUES (${esc(id)}, ${esc(userId)}, ${esc(productId)})
  `);
  return { id, userId, productId, createdAt: new Date().toISOString() };
}

export async function removeFromWishlist(userId: string, productId: string): Promise<boolean> {
  await ensureTable();
  const result = await dbClient.execute(`
    DELETE FROM wishlist_items WHERE user_id = ${esc(userId)} AND product_id = ${esc(productId)}
  `);
  return (result as any).changes > 0;
}

export async function isInWishlist(userId: string, productId: string): Promise<boolean> {
  await ensureTable();
  const result = await dbClient.execute(`
    SELECT id FROM wishlist_items WHERE user_id = ${esc(userId)} AND product_id = ${esc(productId)} LIMIT 1
  `);
  return result.rows.length > 0;
}
