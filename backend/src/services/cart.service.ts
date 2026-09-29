import { eq, and, desc } from 'drizzle-orm';
import { db, dbClient } from '../lib/db';
import { cart, cartItems, products, productSizes, productVariants, abandonedCarts } from '../lib/schema';
import { NotFoundError, ValidationError, AppError } from '../lib/errors';
import crypto from 'node:crypto';
import { invalidateCartCache } from '../lib/cache';
import { logger } from '../lib/logger';

const MAX_ITEM_QUANTITY = 10;

export async function getCartWithItems(userId: string) {
  const cartRecord = await db.query.cart.findFirst({
    where: eq(cart.userId, userId),
    with: {
      items: {
        with: {
          product: true,
          variant: {
            with: {
              images: true
            }
          }
        },
      },
    },
  });

  if (!cartRecord) {
    return { items: [], total: 0 }; 
  }

  // Map and calculate totals with joined data
  const items = cartRecord.items.map((item) => {
    const originalPrice = Number(item.product.price ?? 0);
    const salePercentage = Number(item.product.salePercentage || 0);
    const isOnSale = Boolean(item.product.isOnSale);
    const price = isOnSale && salePercentage > 0
      ? Math.max(0, Math.round(originalPrice * (1 - salePercentage / 100)))
      : originalPrice;

    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      size: item.size,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price,
        imageUrl: item.product.imageUrl,
      },
      variant: {
        id: item.variant.id,
        name: item.variant.name,
        color: item.variant.color,
        images: item.variant.images,
      }
    };
  });

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return { id: cartRecord.id, items, total };
}

export async function addToCart(
  userId: string,
  productId: string,
  variantId: string,
  size: string,
  quantity: number = 1
) {
  if (quantity <= 0) throw new ValidationError('Quantity must be positive');
  if (quantity > MAX_ITEM_QUANTITY) throw new ValidationError(`Max ${MAX_ITEM_QUANTITY} items allowed per product`);

  return await db.transaction(async (tx) => {
    // 1. Verify product and variant relationship
    const variant = await tx.query.productVariants.findFirst({
      where: and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)),
    });
    if (!variant) throw new NotFoundError('Variant not found for this product');

    // 2. Verify variant and size/stock within transaction
    const sizeRecord = await tx.query.productSizes.findFirst({
      where: and(eq(productSizes.variantId, variantId), eq(productSizes.size, size)),
    });
    if (!sizeRecord) throw new NotFoundError('Size selection is invalid for this variant');
    if (sizeRecord.stock <= 0) throw new ValidationError('Item is out of stock');

    // 3. Get or Create Cart (UPSERT to handle concurrency)
    await tx.insert(cart).values({ id: crypto.randomUUID(), userId }).onConflictDoNothing();
    
    const userCart = await tx.query.cart.findFirst({
      where: eq(cart.userId, userId),
    });

    if (!userCart) throw new AppError('Failed to initialize cart', 500);


    const existingItem = await tx.query.cartItems.findFirst({
      where: and(
        eq(cartItems.cartId, userCart.id),
        eq(cartItems.productId, productId),
        eq(cartItems.variantId, variantId),
        eq(cartItems.size, size)
      ),
    });

    let newQuantity: number;

    if (existingItem) {
      // Update existing item quantity
      newQuantity = existingItem.quantity + quantity;
      await tx.update(cartItems)
        .set({ quantity: newQuantity })
        .where(eq(cartItems.id, existingItem.id));
    } else {
      // Insert new item
      newQuantity = quantity;
      await tx.insert(cartItems).values({
        id: crypto.randomUUID(),
        cartId: userCart.id,
        productId,
        variantId,
        size,
        quantity,
      });
    }

    // Increment Cart Version
    await tx.update(cart)
      .set({ version: userCart.version + 1 })
      .where(eq(cart.id, userCart.id));

    // 5. Validate quantity limits
    if (newQuantity > MAX_ITEM_QUANTITY) {
      throw new ValidationError(`Total quantity cannot exceed ${MAX_ITEM_QUANTITY} units`);
    }

    if (newQuantity > sizeRecord.stock) {
      throw new ValidationError(`Insufficient stock. Only ${sizeRecord.stock} items remaining.`);
    }


    await invalidateCartCache(userId);
    logger.info({ userId, productId, size, quantity: newQuantity }, 'Cart updated (transactional)');
    
    return { success: true };
  });
}

export async function updateCartItemQuantity(
  userId: string,
  cartItemId: string,
  quantity: number
) {
  if (quantity < 0) throw new ValidationError('Quantity cannot be negative');
  if (quantity > MAX_ITEM_QUANTITY) throw new ValidationError(`Max ${MAX_ITEM_QUANTITY} items allowed`);

  return await db.transaction(async (tx) => {
    const userCart = await tx.query.cart.findFirst({ where: eq(cart.userId, userId) });
    if (!userCart) throw new NotFoundError('Cart');

    const item = await tx.query.cartItems.findFirst({
      where: and(eq(cartItems.id, cartItemId), eq(cartItems.cartId, userCart.id)),
    });
    if (!item) throw new NotFoundError('Cart item');

    if (quantity === 0) {
      await tx.delete(cartItems).where(eq(cartItems.id, cartItemId));
      await tx.update(cart)
        .set({ version: userCart.version + 1 })
        .where(eq(cart.id, userCart.id));
      await invalidateCartCache(userId);
      return { success: true, removed: true };
    }

    // Check stock again for update
    const sizeRecord = await tx.query.productSizes.findFirst({
      where: and(eq(productSizes.variantId, item.variantId), eq(productSizes.size, item.size)),
    });

    if (!sizeRecord || sizeRecord.stock < quantity) {
      throw new ValidationError(`Insufficient stock. Only ${sizeRecord?.stock || 0} available.`);
    }

    await tx
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, cartItemId));

    await tx.update(cart)
      .set({ version: userCart.version + 1 })
      .where(eq(cart.id, userCart.id));

    await invalidateCartCache(userId);
    return { success: true };
  });
}

export async function removeFromCart(userId: string, cartItemId: string) {
  await db.transaction(async (tx) => {
    const userCart = await tx.query.cart.findFirst({ where: eq(cart.userId, userId) });
    if (!userCart) throw new NotFoundError('Cart');

    await tx.delete(cartItems).where(
      and(eq(cartItems.id, cartItemId), eq(cartItems.cartId, userCart.id))
    );

    await tx.update(cart)
      .set({ version: userCart.version + 1 })
      .where(eq(cart.id, userCart.id));
  });

  await invalidateCartCache(userId);
}

export async function clearCart(userId: string) {
  const userCart = await db.query.cart.findFirst({ where: eq(cart.userId, userId) });
  if (!userCart) return;

  await db.delete(cartItems).where(eq(cartItems.cartId, userCart.id));
  await db.update(cart).set({ version: userCart.version + 1 }).where(eq(cart.id, userCart.id));
  await invalidateCartCache(userId);
}

// ─── Abandoned Cart Recovery System ──────────────────────────────────
export interface AbandonedCartPayload {
  email?: string | null;
  phone?: string | null;
  items: any[];
  totalAmount: number;
  recovered?: boolean;
}

let isAbandonedTableChecked = false;

// In-memory fallback cache
const inMemoryAbandonedCarts: Map<string, any> = new Map();

export async function ensureAbandonedCartsTable() {
  if (isAbandonedTableChecked) return;
  try {
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS abandoned_carts (
        id TEXT PRIMARY KEY,
        email TEXT,
        phone TEXT,
        items TEXT NOT NULL,
        total_amount REAL NOT NULL DEFAULT 0,
        recovered INTEGER NOT NULL DEFAULT 0,
        recovered_at TEXT,
        source TEXT DEFAULT 'checkout',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    isAbandonedTableChecked = true;
  } catch (err) {
    logger.warn({ err }, 'Could not ensure abandoned_carts table, using cache/fallback');
  }
}

export async function saveAbandonedCart(payload: AbandonedCartPayload) {
  const email = (payload.email || '').trim().toLowerCase() || null;
  const rawPhone = (payload.phone || '').trim();
  const phone = rawPhone ? rawPhone.replace(/\D/g, '') : null;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const itemsJson = JSON.stringify(items);
  const totalAmount = Number(payload.totalAmount || 0);
  const now = new Date().toISOString();

  // If no contact info, ignore
  if (!email && !phone) {
    return { ignored: true, reason: 'No contact info provided' };
  }

  await ensureAbandonedCartsTable();

  try {
    // Check if an unrecovered record already exists for this phone or email
    let existingId: string | null = null;
    if (phone || email) {
      const condition = phone && email 
        ? 'phone = ? OR email = ?' 
        : phone 
          ? 'phone = ?' 
          : 'email = ?';
      const args = phone && email ? [phone, email] : [phone || email];
      const res = await dbClient.execute({
        sql: `SELECT id FROM abandoned_carts WHERE (${condition}) AND recovered = 0 ORDER BY updated_at DESC LIMIT 1`,
        args: args as any,
      });
      if (res.rows.length > 0) {
        existingId = String(res.rows[0].id);
      }
    }

    if (existingId) {
      await dbClient.execute({
        sql: `UPDATE abandoned_carts 
              SET items = ?, total_amount = ?, email = COALESCE(?, email), phone = COALESCE(?, phone), recovered = ?, updated_at = ? 
              WHERE id = ?`,
        args: [itemsJson, totalAmount, email, phone, payload.recovered ? 1 : 0, now, existingId],
      });
      inMemoryAbandonedCarts.set(existingId, {
        id: existingId,
        email,
        phone,
        items,
        totalAmount,
        recovered: Boolean(payload.recovered),
        updatedAt: now,
      });
      return { id: existingId, updated: true };
    } else {
      const newId = crypto.randomUUID();
      await dbClient.execute({
        sql: `INSERT INTO abandoned_carts (id, email, phone, items, total_amount, recovered, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [newId, email, phone, itemsJson, totalAmount, payload.recovered ? 1 : 0, now, now],
      });
      inMemoryAbandonedCarts.set(newId, {
        id: newId,
        email,
        phone,
        items,
        totalAmount,
        recovered: Boolean(payload.recovered),
        createdAt: now,
        updatedAt: now,
      });
      return { id: newId, created: true };
    }
  } catch (err) {
    logger.error({ err }, 'Error saving abandoned cart to DB, updating in-memory cache');
    const fallbackId = crypto.randomUUID();
    inMemoryAbandonedCarts.set(fallbackId, {
      id: fallbackId,
      email,
      phone,
      items,
      totalAmount,
      recovered: Boolean(payload.recovered),
      createdAt: now,
      updatedAt: now,
    });
    return { id: fallbackId, fallback: true };
  }
}

export async function getAbandonedCarts(options: { limit?: number; offset?: number } = {}) {
  await ensureAbandonedCartsTable();
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  try {
    const res = await dbClient.execute({
      sql: `SELECT * FROM abandoned_carts ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      args: [limit, offset],
    });

    const dbLeads = res.rows.map((row: any) => {
      let parsedItems = [];
      try {
        parsedItems = JSON.parse(String(row.items || '[]'));
      } catch {}
      return {
        id: String(row.id),
        email: row.email ? String(row.email) : null,
        phone: row.phone ? String(row.phone) : null,
        items: parsedItems,
        totalAmount: Number(row.total_amount || 0),
        recovered: Boolean(row.recovered),
        recoveredAt: row.recovered_at ? String(row.recovered_at) : null,
        source: row.source ? String(row.source) : 'checkout',
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
    });

    if (dbLeads.length > 0) return dbLeads;
  } catch (err) {
    logger.error({ err }, 'Failed to fetch abandoned carts from DB, using cache');
  }

  // Fallback to in-memory cache if DB query returns nothing or fails
  return Array.from(inMemoryAbandonedCarts.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function markCartRecovered(id: string, recovered: boolean = true) {
  await ensureAbandonedCartsTable();
  const now = new Date().toISOString();
  try {
    await dbClient.execute({
      sql: `UPDATE abandoned_carts SET recovered = ?, recovered_at = ?, updated_at = ? WHERE id = ?`,
      args: [recovered ? 1 : 0, recovered ? now : null, now, id],
    });
  } catch (err) {
    logger.error({ err }, 'Failed to mark cart recovered in DB');
  }

  const cached = inMemoryAbandonedCarts.get(id);
  if (cached) {
    cached.recovered = recovered;
    cached.recoveredAt = recovered ? now : null;
    cached.updatedAt = now;
  }
}