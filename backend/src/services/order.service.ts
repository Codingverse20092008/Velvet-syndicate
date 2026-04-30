import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { orders, orderItems, cart, cartItems, productSizes, addresses, orderIntents } from '../lib/schema';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors';
import { invalidateCartCache } from '../lib/cache';
import { logger } from '../lib/logger';
import { orderQueue } from '../lib/queue';
import { getRequestId } from '../lib/context';
import crypto from 'node:crypto';

/**
 * 📥 PRODUCER: createOrder
 * Validates basic state and pushes the order to a distributed queue.
 * Handles backpressure and distributed idempotency locking.
 */
export async function createOrder(
  userId: string,
  addressId: string,
  paymentMethod: string = 'COD',
  idempotencyKey?: string,
  expectedVersion?: number
) {
  if (!idempotencyKey) {
    throw new ValidationError('Idempotency key is required');
  }

  const requestId = getRequestId() || 'system';

  // 1. QUICK IDEMPOTENCY CHECK (Pre-queue)
  const existingOrder = await db.query.orders.findFirst({
    where: eq(orders.idempotencyKey, idempotencyKey)
  });

  if (existingOrder) {
    return {
      id: existingOrder.id,
      status: existingOrder.status,
      alreadyExists: true,
      fromQueue: false
    };
  }

  // 🛡️ DUAL PERSISTENCE: Record Intent in DB BEFORE Enqueueing
  // This ensures that even if Redis fails/evicts, the order request is NOT lost.
  await db.insert(orderIntents).values({
    id: idempotencyKey,
    userId,
    status: 'QUEUED',
    data: JSON.stringify({ addressId, paymentMethod, expectedVersion, requestId }),
  }).onConflictDoNothing();

  // 3. PUSH TO DISTRIBUTED QUEUE WITH PRIORITY (Fallback to sync if Queue disabled)
  if (!orderQueue) {
    logger.info({ userId }, '🔄 Falling back to synchronous order processing (Redis Queue disabled)');
    const result = await createOrderInDB(
      userId,
      addressId,
      paymentMethod,
      idempotencyKey,
      expectedVersion,
      'sync-processed',
      requestId
    );
    return {
      id: result.id,
      status: 'CONFIRMED',
      message: 'Order processed synchronously',
      alreadyExists: result.alreadyExists || false,
      fromQueue: false
    };
  }

  // 2. BACKPRESSURE GUARD: Check queue size to prevent system overload
  const jobCounts = await orderQueue.getJobCounts('waiting', 'active');
  const totalBacklog = jobCounts.waiting + jobCounts.active;
  
  if (totalBacklog > 1000) {
    logger.warn({ totalBacklog }, '💥 SYSTEM BUSY: Order queue threshold exceeded');
    throw new Error('System is currently busy. Please try again in a moment.');
  }

  // 3. PUSH TO DISTRIBUTED QUEUE
  const job = await orderQueue.add(`order-${idempotencyKey}`, {
    userId,
    addressId,
    paymentMethod,
    idempotencyKey,
    expectedVersion,
    requestId
  }, {
    jobId: idempotencyKey,
    priority: 10,
  });

  logger.info({ jobId: job.id, userId, totalBacklog }, '📥 Order queued for processing');

  return {
    jobId: job.id,
    status: 'PENDING',
    message: 'Order is being processed',
    alreadyExists: false,
    fromQueue: true
  };
}

/**
 * 🛠️ CONSUMER: createOrderInDB
 * Atomic transaction handling, stock deduction with optimistic locking,
 * and final order commitment.
 */
export async function createOrderInDB(
  userId: string,
  addressId: string,
  paymentMethod: string = 'COD',
  idempotencyKey?: string,
  expectedVersion?: number,
  jobId?: string,
  requestId?: string
) {
  if (!idempotencyKey) {
    throw new ValidationError('Idempotency key is required');
  }

  // 🛡️ WORKER IDEMPOTENCY CHECK (Final Line of Defense)
  const existingOrder = await db.query.orders.findFirst({
    where: eq(orders.idempotencyKey, idempotencyKey),
    with: { items: true }
  });

  if (existingOrder) {
    // Sync Intent status
    await db.update(orderIntents)
      .set({ status: 'COMPLETED' })
      .where(eq(orderIntents.id, idempotencyKey));

    return {
      id: existingOrder.id,
      status: existingOrder.status,
      totalAmount: existingOrder.totalAmount,
      alreadyExists: true
    };
  }

  // Update Intent to PROCESSING
  await db.update(orderIntents)
    .set({ status: 'PROCESSING', updatedAt: new Date().toISOString() })
    .where(eq(orderIntents.id, idempotencyKey));

  try {
    return await db.transaction(async (tx) => {
      // 1. FETCH CART
      const userCart = await tx.query.cart.findFirst({
        where: eq(cart.userId, userId),
        with: { items: { with: { product: true } } },
      });

      if (!userCart || userCart.items.length === 0) {
        const lastOrder = await tx.query.orders.findFirst({
          where: eq(orders.userId, userId),
          orderBy: desc(orders.createdAt),
        });

        if (lastOrder && (Date.now() - new Date(lastOrder.createdAt).getTime() < 300000)) {
          return { id: lastOrder.id, alreadyExists: true };
        }
        throw new ValidationError('Cart is empty');
      }

      // 2. ATOMIC VERSION CHECK (Prevention of race conditions)
      if (expectedVersion !== undefined && userCart.version !== expectedVersion) {
        throw new ConflictError('Cart has been modified. Please refresh and try again.');
      }

      // 3. ATOMIC STOCK LOCKING
      for (const item of userCart.items) {
        const result = await tx
          .update(productSizes)
          .set({ stock: sql`${productSizes.stock} - ${item.quantity}` })
          .where(and(
            eq(productSizes.variantId, item.variantId),
            eq(productSizes.size, item.size),
            sql`${productSizes.stock} >= ${item.quantity}`
          ));

        if (result.rowsAffected === 0) {
          throw new ValidationError(`Insufficient stock for ${item.product.name}`);
        }
      }

      // 4. SNAPSHOT ADDRESS
      const address = await tx.query.addresses.findFirst({
        where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
      });
      if (!address) throw new ValidationError('Invalid shipping address');

      const addressSnapshot = JSON.stringify({
        name: address.name,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode
      });

      // 5. CREATE ORDER (With Tracing IDs)
      const orderId = crypto.randomUUID();
      const totalAmount = userCart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

      await tx.insert(orders).values({
        id: orderId,
        userId,
        totalAmount,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        paymentMethod,
        shippingAddress: addressSnapshot,
        idempotencyKey,
        jobId,
        requestId,
      });

      // 6. CREATE ORDER ITEMS
      for (const item of userCart.items) {
        await tx.insert(orderItems).values({
          id: crypto.randomUUID(),
          orderId,
          productId: item.productId,
          productName: item.product.name,
          productPrice: item.product.price,
          quantity: item.quantity,
          size: item.size,
          variantId: item.variantId,
          imageUrl: item.product.imageUrl,
        });
      }

      // 7. CLEAR CART
      await tx.delete(cartItems).where(eq(cartItems.cartId, userCart.id));
      await tx.update(cart).set({ version: userCart.version + 1 }).where(eq(cart.id, userCart.id));

      // 8. UPDATE INTENT STATUS
      await tx.update(orderIntents)
        .set({ status: 'COMPLETED', updatedAt: new Date().toISOString() })
        .where(eq(orderIntents.id, idempotencyKey));

      invalidateCartCache(userId).catch(() => {});

      return { id: orderId, status: 'CONFIRMED', totalAmount };
    });
  } catch (err) {
    await db.update(orderIntents)
      .set({ status: 'FAILED', error: (err as any).message, updatedAt: new Date().toISOString() })
      .where(eq(orderIntents.id, idempotencyKey));
    throw err;
  }
}

export async function getOrdersByUserId(userId: string) {
  return db.query.orders.findMany({
    where: eq(orders.userId, userId),
    orderBy: [desc(orders.createdAt)],
    with: { items: true }
  });
}

export async function getOrderById(id: string, userId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.userId, userId)),
    with: { items: true }
  });
}
