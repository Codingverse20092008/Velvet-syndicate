import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { orders, orderItems, cart, cartItems, productSizes, products } from '../schema';
import { NotFoundError, ValidationError, AppError } from '../errors';
import { invalidateCartCache } from '../cache';
import { logger } from '../logger';
import { logAudit, logStockChange } from './audit.service';

const MAX_ORDER_ITEMS = 50;

/**
 * Create an order with full transaction safety
 * All operations are atomic - if any step fails, everything rolls back
 */
export async function createOrder(
  userId: string,
  userName: string,
  phone: string,
  address: string
) {
  return await db.transaction(async (tx) => {
    // 1. Get cart with items and products
    const userCart = await tx.query.cart.findFirst({
      where: eq(cart.userId, userId),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    if (!userCart || userCart.items.length === 0) {
      throw new ValidationError('Cart is empty');
    }

    if (userCart.items.length > MAX_ORDER_ITEMS) {
      throw new ValidationError(`Order cannot exceed ${MAX_ORDER_ITEMS} unique items`);
    }

    let total = 0;
    const orderId = crypto.randomUUID();
    const stockChanges: Array<{ productId: string; size: string; oldStock: number; newStock: number }> = [];

    // 2. Validate stock for ALL items first (fail fast)
    for (const item of userCart.items) {
      const sizeRecord = await tx.query.productSizes.findFirst({
        where: and(
          eq(productSizes.productId, item.productId),
          eq(productSizes.size, item.size)
        ),
      });

      if (!sizeRecord) {
        throw new ValidationError(`Size ${item.size} not available for ${item.product.name}`);
      }

      if (sizeRecord.stock < item.quantity) {
        throw new ValidationError(
          `Insufficient stock for ${item.product.name} (${item.size}). Only ${sizeRecord.stock} available.`
        );
      }
    }

    // 3. Deduct stock and record changes (inside same transaction)
    for (const item of userCart.items) {
      const sizeRecord = await tx.query.productSizes.findFirst({
        where: and(
          eq(productSizes.productId, item.productId),
          eq(productSizes.size, item.size)
        ),
      });

      if (!sizeRecord) {
        // This should never happen due to validation above, but safety first
        throw new AppError(`Stock record disappeared for ${item.product.name} (${item.size})`, 500);
      }

      const oldStock = sizeRecord.stock;
      const newStock = oldStock - item.quantity;

      // Atomic update with CHECK constraint ensures stock never goes negative
      await tx
        .update(productSizes)
        .set({ stock: newStock })
        .where(
          and(
            eq(productSizes.id, sizeRecord.id),
            sql`${productSizes.stock} >= ${item.quantity}`
          )
        );

      // Verify update succeeded (row was actually updated)
      const verifyUpdate = await tx.query.productSizes.findFirst({
        where: eq(productSizes.id, sizeRecord.id),
      });

      if (!verifyUpdate || verifyUpdate.stock !== newStock) {
        throw new AppError('Stock update failed - possible concurrent modification', 409);
      }

      stockChanges.push({
        productId: item.productId,
        size: item.size,
        oldStock,
        newStock,
      });

      total += item.product.price * item.quantity;
    }

    // 4. Create Order
    await tx.insert(orders).values({
      id: orderId,
      userId,
      userName,
      phone,
      address,
      totalAmount: total,
      status: 'PENDING',
    });

    // 5. Create Order Items with price snapshot
    await tx.insert(orderItems).values(
      userCart.items.map((item) => ({
        id: crypto.randomUUID(),
        orderId,
        productId: item.productId,
        productName: item.product.name,
        priceAtPurchase: item.product.price,
        quantity: item.quantity,
        size: item.size,
      }))
    );

    // 6. Clear Cart
    await tx.delete(cartItems).where(eq(cartItems.cartId, userCart.id));

    // 7. Log audit entries (non-blocking, won't rollback on failure)
    await logAudit('ORDER_CREATED', orderId, {
      userId,
      userName,
      phone,
      total,
      itemCount: userCart.items.length,
    });

    // Schedule stock audit logs (async, non-blocking)
    for (const change of stockChanges) {
      await logStockChange(
        change.productId,
        change.size,
        change.oldStock,
        change.newStock,
        `Order ${orderId} created`,
        userId
      );
    }

    await invalidateCartCache(userId);
    logger.info({ orderId, userId, total, itemCount: userCart.items.length }, 'Order created successfully');

    return { id: orderId, total };
  });
}

export async function getOrdersByUserId(userId: string) {
  return await db.query.orders.findMany({
    where: eq(orders.userId, userId),
    orderBy: desc(orders.createdAt),
    with: {
      items: true,
    },
  });
}

export async function getOrderById(orderId: string, userId?: string) {
  const whereClause = userId
    ? and(eq(orders.id, orderId), eq(orders.userId, userId))
    : eq(orders.id, orderId);

  return await db.query.orders.findFirst({
    where: whereClause,
    with: {
      items: true,
    },
  });
}

/**
 * Update order status with audit logging
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED',
  userId?: string
) {
  return await db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.status === status) {
      return order; // No change needed
    }

    const oldStatus = order.status;

    // If cancelling, consider restocking logic here (optional)
    if (status === 'CANCELLED' && oldStatus !== 'CANCELLED') {
      // Optional: Restock items - can be added based on business rules
      logger.info({ orderId, oldStatus, newStatus: status }, 'Order cancelled - restocking may be required');
    }

    await tx
      .update(orders)
      .set({
        status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(orders.id, orderId));

    // Audit log (non-blocking)
    await logAudit('ORDER_STATUS_CHANGE', orderId, {
      oldStatus,
      newStatus: status,
      userId,
    });

    logger.info({ orderId, oldStatus, newStatus: status }, 'Order status updated');

    return await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true },
    });
  });
}

/**
 * Update order payment status
 */
export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded',
  userId?: string
) {
  return await db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    const oldPaymentStatus = order.paymentStatus;

    await tx
      .update(orders)
      .set({
        paymentStatus,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(orders.id, orderId));

    // Audit log
    await logAudit('ORDER_PAYMENT_CHANGE', orderId, {
      oldPaymentStatus,
      newPaymentStatus: paymentStatus,
      userId,
    });

    logger.info({ orderId, oldPaymentStatus, newPaymentStatus: paymentStatus }, 'Order payment status updated');

    return await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true },
    });
  });
}
