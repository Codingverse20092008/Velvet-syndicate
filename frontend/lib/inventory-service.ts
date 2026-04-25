import { db } from './db';
import { productSizes, products } from './schema';
import { and, eq, sql } from 'drizzle-orm';
import { NotFoundError, ValidationError, AppError } from './errors';
import { logger } from './logger';
import { logStockChange, logAudit } from './services/audit.service';

/**
 * Get stock level for a product size
 */
export async function getStockLevel(productId: string, size: string): Promise<number> {
  const entry = await db.query.productSizes.findFirst({
    where: and(eq(productSizes.productId, productId), eq(productSizes.size, size)),
  });

  return entry?.stock ?? 0;
}

/**
 * Check if a product has stock available for a specific size
 */
export async function checkStock(productId: string, size: string, quantity: number = 1): Promise<boolean> {
  const entry = await db.query.productSizes.findFirst({
    where: and(eq(productSizes.productId, productId), eq(productSizes.size, size)),
  });

  return (entry?.stock ?? 0) >= quantity;
}

/**
 * PRODUCTION-GRADE STOCK DEDUCTION
 *
 * Uses a database transaction to ensure atomicity and prevent race conditions.
 * Includes multiple safety checks to prevent negative stock.
 */
export async function deductStock(
  productId: string,
  size: string,
  quantity: number,
  reason: string,
  userId?: string
): Promise<{ success: boolean; newStock?: number; error?: string }> {
  if (quantity <= 0) {
    throw new ValidationError('Quantity must be positive');
  }

  try {
    return await db.transaction(async (tx) => {
      // 1. Fetch current stock
      const entry = await tx.query.productSizes.findFirst({
        where: and(eq(productSizes.productId, productId), eq(productSizes.size, size)),
      });

      if (!entry) {
        throw new NotFoundError(`Product size configuration: ${productId} | ${size}`);
      }

      const oldStock = entry.stock;

      // 2. Validate availability
      if (oldStock < quantity) {
        throw new ValidationError(
          `Insufficient stock for size ${size}. Requested: ${quantity}, Available: ${oldStock}`
        );
      }

      // 3. Atomically update stock with CHECK constraint
      // The WHERE clause includes the stock check as a final safety against race conditions
      const result = await tx
        .update(productSizes)
        .set({
          stock: sql`${productSizes.stock} - ${quantity}`,
        })
        .where(
          and(
            eq(productSizes.productId, productId),
            eq(productSizes.size, size),
            sql`${productSizes.stock} >= ${quantity}`
          )
        )
        .returning();

      if (result.length === 0) {
        // This happens if another process modified stock between SELECT and UPDATE
        throw new AppError('Stock deduction failed due to concurrent modification. Please try again.', 409);
      }

      const newStock = result[0].stock;

      // 4. Log audit entry (non-blocking, won't rollback)
      await logStockChange(productId, size, oldStock, newStock, reason, userId);

      // 5. Check for low stock and log warning
      if (newStock < 5) {
        await logAudit('STOCK_LOW', productId, {
          size,
          newStock,
          threshold: 5,
        });
      }

      logger.info(
        { productId, size, oldStock, newStock, quantity, reason },
        'Stock deducted successfully'
      );

      return { success: true, newStock };
    });
  } catch (error) {
    logger.error({ productId, size, quantity, error }, 'Stock deduction failed');
    return { success: false, error: String(error) };
  }
}

/**
 * Adjust stock level (increase or decrease) with audit logging
 */
export async function adjustStock(
  productId: string,
  size: string,
  adjustment: number,
  reason: string,
  userId?: string
): Promise<{ success: boolean; newStock?: number; error?: string }> {
  if (adjustment === 0) {
    throw new ValidationError('Adjustment must be non-zero');
  }

  try {
    return await db.transaction(async (tx) => {
      const entry = await tx.query.productSizes.findFirst({
        where: and(eq(productSizes.productId, productId), eq(productSizes.size, size)),
      });

      if (!entry) {
        throw new NotFoundError(`Product size configuration: ${productId} | ${size}`);
      }

      const oldStock = entry.stock;
      const newStock = oldStock + adjustment;

      // Prevent negative stock
      if (newStock < 0) {
        throw new ValidationError(
          `Stock adjustment would result in negative stock. Current: ${oldStock}, Adjustment: ${adjustment}`
        );
      }

      await tx
        .update(productSizes)
        .set({ stock: newStock })
        .where(and(eq(productSizes.productId, productId), eq(productSizes.size, size)));

      // Log audit entry
      await logStockChange(productId, size, oldStock, newStock, reason, userId);

      logger.info(
        { productId, size, oldStock, newStock, adjustment, reason },
        'Stock adjusted'
      );

      return { success: true, newStock };
    });
  } catch (error) {
    logger.error({ productId, size, adjustment, error }, 'Stock adjustment failed');
    return { success: false, error: String(error) };
  }
}

/**
 * Set stock level directly (for admin restocking)
 */
export async function setStockLevel(
  productId: string,
  size: string,
  newStock: number,
  reason: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  if (newStock < 0) {
    throw new ValidationError('Stock cannot be negative');
  }

  try {
    return await db.transaction(async (tx) => {
      const entry = await tx.query.productSizes.findFirst({
        where: and(eq(productSizes.productId, productId), eq(productSizes.size, size)),
      });

      if (!entry) {
        throw new NotFoundError(`Product size configuration: ${productId} | ${size}`);
      }

      const oldStock = entry.stock;

      await tx
        .update(productSizes)
        .set({ stock: newStock })
        .where(and(eq(productSizes.productId, productId), eq(productSizes.size, size)));

      // Log audit entry
      await logStockChange(productId, size, oldStock, newStock, reason, userId);

      logger.info(
        { productId, size, oldStock, newStock, reason },
        'Stock level set'
      );

      return { success: true };
    });
  } catch (error) {
    logger.error({ productId, size, newStock, error }, 'Set stock level failed');
    return { success: false, error: String(error) };
  }
}

/**
 * Bulk stock check for multiple products/sizes
 */
export async function bulkStockCheck(
  items: Array<{ productId: string; size: string; quantity: number }>
): Promise<{ available: boolean; unavailableItems?: string[] }> {
  const unavailableItems: string[] = [];

  for (const item of items) {
    const stock = await getStockLevel(item.productId, item.size);
    if (stock < item.quantity) {
      unavailableItems.push(`${item.productId}:${item.size}`);
    }
  }

  return {
    available: unavailableItems.length === 0,
    unavailableItems: unavailableItems.length > 0 ? unavailableItems : undefined,
  };
}
