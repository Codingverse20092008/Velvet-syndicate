import { eq, and, desc, inArray, sql, lt } from 'drizzle-orm';
import { db, dbClient } from '../lib/db';
import { orders, orderItems, cart, cartItems, productSizes, addresses, orderIntents } from '../lib/schema';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors';
import { invalidateCartCache } from '../lib/cache';
import { logger } from '../lib/logger';
import { orderQueue } from '../lib/queue';
import { getRequestId } from '../lib/context';
import crypto from 'node:crypto';

type OrderIntentStatus =
  | 'RECEIVED'
  | 'READY_FOR_QUEUE'
  | 'ENQUEUED'
  | 'PROCESSING'
  | 'PROCESSING_STALE'
  | 'COMPLETED'
  | 'FAILED_RETRYABLE'
  | 'FAILED_FINAL'
  | 'QUEUED'
  | 'FAILED';

type SnapshotOrderLine = {
  cartItemId: string;
  productId: string;
  variantId: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  productName: string;
  imageUrl: string | null;
};

type SnapshotAddress = {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
};

type OrderPayload = {
  schemaVersion: 1;
  intentId: string;
  idempotencyKey: string;
  requestId: string;
  userId: string;
  paymentMethod: string;
  createdAt: string;
  cartId: string;
  cartVersion: number;
  addressSnapshot: SnapshotAddress;
  totals: {
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    grandTotal: number;
  };
  lines: SnapshotOrderLine[];
  metadata: {
    expectedVersion?: number;
  };
};

type EnqueueResult = {
  enqueued: boolean;
  reason?: string;
};

let orderPersistenceReady: Promise<void> | null = null;

export async function ensureOrderPersistenceCompatibility() {
  if (orderPersistenceReady) return orderPersistenceReady;

  orderPersistenceReady = (async () => {
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS order_intents (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'READY_FOR_QUEUE',
        error TEXT,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
        updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
      )
    `);
    await dbClient.execute('CREATE INDEX IF NOT EXISTS order_intents_user_id_idx ON order_intents(user_id)');
    await dbClient.execute('CREATE INDEX IF NOT EXISTS order_intents_status_idx ON order_intents(status)');
    await dbClient.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_idx
      ON orders(idempotency_key)
      WHERE idempotency_key IS NOT NULL AND idempotency_key <> ''
    `);
  })().catch((err) => {
    orderPersistenceReady = null;
    throw err;
  });

  return orderPersistenceReady;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeIntentStatus(status: string): OrderIntentStatus {
  if (status === 'QUEUED') return 'READY_FOR_QUEUE';
  if (status === 'FAILED') return 'FAILED_RETRYABLE';
  return status as OrderIntentStatus;
}

function shouldAllowClaim(status: OrderIntentStatus) {
  return ['ENQUEUED', 'READY_FOR_QUEUE', 'RECEIVED', 'PROCESSING_STALE', 'FAILED_RETRYABLE', 'QUEUED', 'FAILED'].includes(status);
}

function classifyFailure(error: unknown): 'FAILED_FINAL' | 'FAILED_RETRYABLE' {
  if (error instanceof ValidationError || error instanceof ConflictError) {
    return 'FAILED_FINAL';
  }
  return 'FAILED_RETRYABLE';
}

function parsePayload(raw: string): OrderPayload {
  try {
    const parsed = JSON.parse(raw) as OrderPayload;
    if (!parsed?.intentId || !parsed?.idempotencyKey || !Array.isArray(parsed?.lines)) {
      throw new Error('invalid payload');
    }
    return parsed;
  } catch {
    throw new ValidationError('Invalid order intent payload');
  }
}

async function buildOrderSnapshot(
  userId: string,
  addressId: string,
  paymentMethod: string,
  intentId: string,
  idempotencyKey: string,
  requestId: string,
  expectedVersion?: number
): Promise<OrderPayload> {
  const [userCart, address] = await Promise.all([
    db.query.cart.findFirst({
      where: eq(cart.userId, userId),
      with: { items: { with: { product: true } } },
    }),
    db.query.addresses.findFirst({
      where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
    }),
  ]);

  if (!userCart || userCart.items.length === 0) {
    throw new ValidationError('Cart is empty');
  }
  if (!address) {
    throw new ValidationError('Invalid shipping address');
  }

  const lines: SnapshotOrderLine[] = userCart.items.map((item) => {
    const lineTotal = item.product.price * item.quantity;
    return {
      cartItemId: item.id,
      productId: item.productId,
      variantId: item.variantId,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.product.price,
      lineTotal,
      productName: item.product.name,
      imageUrl: item.product.imageUrl ?? null,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  return {
    schemaVersion: 1,
    intentId,
    idempotencyKey,
    requestId,
    userId,
    paymentMethod,
    createdAt: nowIso(),
    cartId: userCart.id,
    cartVersion: userCart.version,
    addressSnapshot: {
      id: address.id,
      name: address.name,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    },
    totals: {
      subtotal,
      shipping: 0,
      tax: 0,
      discount: 0,
      grandTotal: subtotal,
    },
    lines,
    metadata: {
      expectedVersion,
    },
  };
}

async function enqueueIntent(intentId: string, requestId: string): Promise<EnqueueResult> {
  if (!orderQueue) {
    return { enqueued: false, reason: 'QUEUE_UNAVAILABLE' };
  }

  try {
    await orderQueue.add(
      'process-order',
      { intentId, requestId },
      {
        jobId: intentId,
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    await db
      .update(orderIntents)
      .set({ status: 'ENQUEUED', updatedAt: nowIso() })
      .where(
        and(
          eq(orderIntents.id, intentId),
          inArray(orderIntents.status, ['RECEIVED', 'READY_FOR_QUEUE', 'PROCESSING_STALE', 'FAILED_RETRYABLE', 'QUEUED', 'FAILED'])
        )
      );

    return { enqueued: true };
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.includes('Job is already waiting') || msg.includes('Job is already active') || msg.includes('exists')) {
      await db
        .update(orderIntents)
        .set({ status: 'ENQUEUED', updatedAt: nowIso() })
        .where(eq(orderIntents.id, intentId));
      return { enqueued: true };
    }

    logger.error({ intentId, requestId, err: msg }, 'Failed to enqueue order intent');
    return { enqueued: false, reason: 'ENQUEUE_ERROR' };
  }
}

async function getOrderByIdempotencyKey(idempotencyKey: string) {
  return db.query.orders.findFirst({
    where: eq(orders.idempotencyKey, idempotencyKey),
    with: { items: true },
  });
}

/**
 * 📥 PRODUCER: createOrder
 * Captures an immutable snapshot and persists it to WAL before queueing.
 */
export async function createOrder(
  userId: string,
  addressId: string,
  paymentMethod: string = 'COD',
  idempotencyKey?: string,
  expectedVersion?: number
) {
  await ensureOrderPersistenceCompatibility();

  if (!idempotencyKey) {
    throw new ValidationError('Idempotency key is required');
  }

  const requestId = getRequestId() || crypto.randomUUID();

  const existingOrder = await getOrderByIdempotencyKey(idempotencyKey);
  if (existingOrder) {
    return {
      id: existingOrder.id,
      status: existingOrder.status,
      totalAmount: existingOrder.totalAmount,
      alreadyExists: true,
      fromQueue: false,
      requestId,
    };
  }

  let intent = await db.query.orderIntents.findFirst({
    where: eq(orderIntents.id, idempotencyKey),
  });

  if (!intent) {
    const snapshot = await buildOrderSnapshot(
      userId,
      addressId,
      paymentMethod,
      idempotencyKey,
      idempotencyKey,
      requestId,
      expectedVersion
    );

    await db
      .insert(orderIntents)
      .values({
        id: idempotencyKey,
        userId,
        status: 'READY_FOR_QUEUE',
        data: JSON.stringify(snapshot),
      })
      .onConflictDoNothing();

    intent = await db.query.orderIntents.findFirst({
      where: eq(orderIntents.id, idempotencyKey),
    });
  }

  if (!intent) {
    throw new Error('Failed to persist order intent');
  }

  const status = normalizeIntentStatus(intent.status);
  if (status === 'FAILED_FINAL') {
    throw new ValidationError(intent.error || 'Order request cannot be processed');
  }
  if (status === 'COMPLETED') {
    const completed = await getOrderByIdempotencyKey(idempotencyKey);
    if (completed) {
      return {
        id: completed.id,
        status: completed.status,
        totalAmount: completed.totalAmount,
        alreadyExists: true,
        fromQueue: false,
        requestId,
      };
    }
  }

  const enqueueResult = await enqueueIntent(idempotencyKey, requestId);
  if (!enqueueResult.enqueued && !orderQueue) {
    const syncResult = await processOrderIntent(idempotencyKey, 'sync-no-queue', requestId);
    if (syncResult?.id) {
      const alreadyExists = 'alreadyExists' in syncResult ? Boolean(syncResult.alreadyExists) : false;
      return {
        id: syncResult.id,
        status: syncResult.status,
        totalAmount: syncResult.totalAmount,
        alreadyExists,
        fromQueue: false,
        requestId,
      };
    }
  }

  return {
    intentId: idempotencyKey,
    jobId: idempotencyKey,
    status: 'PENDING',
    message: 'Order accepted for processing',
    alreadyExists: false,
    fromQueue: enqueueResult.enqueued,
    requestId,
  };
}

/**
 * 🛠️ CONSUMER: processOrderIntent
 * Uses only immutable payload from WAL for deterministic processing.
 */
export async function processOrderIntent(intentId: string, jobId?: string, requestId?: string) {
  await ensureOrderPersistenceCompatibility();

  const intent = await db.query.orderIntents.findFirst({
    where: eq(orderIntents.id, intentId),
  });

  if (!intent) {
    throw new NotFoundError('Order intent');
  }

  const payload = parsePayload(intent.data);

  const preExistingOrder = await getOrderByIdempotencyKey(payload.idempotencyKey);
  if (preExistingOrder) {
    await db
      .update(orderIntents)
      .set({ status: 'COMPLETED', updatedAt: nowIso(), error: null })
      .where(eq(orderIntents.id, intentId));
    return {
      id: preExistingOrder.id,
      status: preExistingOrder.status,
      totalAmount: preExistingOrder.totalAmount,
      alreadyExists: true,
    };
  }

  const normalized = normalizeIntentStatus(intent.status);
  if (!shouldAllowClaim(normalized)) {
    if (normalized === 'COMPLETED') {
      const completed = await getOrderByIdempotencyKey(payload.idempotencyKey);
      if (!completed) throw new Error('Intent marked completed but order missing');
      return {
        id: completed.id,
        status: completed.status,
        totalAmount: completed.totalAmount,
        alreadyExists: true,
      };
    }
    if (normalized === 'PROCESSING') {
      return {
        id: intentId,
        status: 'PROCESSING',
        alreadyProcessing: true,
      };
    }
    if (normalized === 'FAILED_FINAL') {
      throw new ValidationError(intent.error || 'Order intent is in final failed state');
    }
  }

  const claim = await db
    .update(orderIntents)
    .set({ status: 'PROCESSING', updatedAt: nowIso(), error: null })
    .where(
      and(
        eq(orderIntents.id, intentId),
        inArray(orderIntents.status, ['ENQUEUED', 'READY_FOR_QUEUE', 'RECEIVED', 'PROCESSING_STALE', 'FAILED_RETRYABLE', 'QUEUED', 'FAILED'])
      )
    );

  if (claim.rowsAffected === 0) {
    const latestIntent = await db.query.orderIntents.findFirst({
      where: eq(orderIntents.id, intentId),
    });
    const latestStatus = normalizeIntentStatus(latestIntent?.status || 'PROCESSING');
    if (latestStatus === 'COMPLETED') {
      const completed = await getOrderByIdempotencyKey(payload.idempotencyKey);
      if (!completed) throw new Error('Intent marked completed but order missing');
      return {
        id: completed.id,
        status: completed.status,
        totalAmount: completed.totalAmount,
        alreadyExists: true,
      };
    }
    return {
      id: intentId,
      status: 'PROCESSING',
      alreadyProcessing: true,
    };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const lines = [...payload.lines].sort((a, b) => {
        const keyA = `${a.variantId}:${a.size}`;
        const keyB = `${b.variantId}:${b.size}`;
        return keyA.localeCompare(keyB);
      });

      for (const line of lines) {
        const stockUpdate = await tx
          .update(productSizes)
          .set({ stock: sql`${productSizes.stock} - ${line.quantity}` })
          .where(
            and(
              eq(productSizes.variantId, line.variantId),
              eq(productSizes.size, line.size),
              sql`${productSizes.stock} >= ${line.quantity}`
            )
          );

        if (stockUpdate.rowsAffected === 0) {
          throw new ValidationError(`Insufficient stock for ${line.productName}`);
        }
      }

      const orderId = crypto.randomUUID();

      await tx.insert(orders).values({
        id: orderId,
        userId: payload.userId,
        totalAmount: payload.totals.grandTotal,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        paymentMethod: payload.paymentMethod,
        shippingAddress: JSON.stringify(payload.addressSnapshot),
        idempotencyKey: payload.idempotencyKey,
      });

      for (const line of lines) {
        await tx.insert(orderItems).values({
          id: crypto.randomUUID(),
          orderId,
          productId: line.productId,
          productName: line.productName,
          productPrice: line.unitPrice,
          quantity: line.quantity,
          size: line.size,
          variantId: line.variantId,
          imageUrl: line.imageUrl,
        });
      }

      for (const line of lines) {
        await tx
          .delete(cartItems)
          .where(
            and(
              eq(cartItems.id, line.cartItemId),
              eq(cartItems.variantId, line.variantId),
              eq(cartItems.size, line.size),
              eq(cartItems.quantity, line.quantity)
            )
          );
      }

      await tx
        .update(orderIntents)
        .set({ status: 'COMPLETED', updatedAt: nowIso(), error: null })
        .where(eq(orderIntents.id, intentId));

      return {
        id: orderId,
        status: 'CONFIRMED',
        totalAmount: payload.totals.grandTotal,
      };
    });

    invalidateCartCache(payload.userId).catch(() => {});
    return result;
  } catch (err) {
    const failureStatus = classifyFailure(err);
    await db
      .update(orderIntents)
      .set({
        status: failureStatus,
        error: (err as Error).message,
        updatedAt: nowIso(),
      })
      .where(eq(orderIntents.id, intentId));
    throw err;
  }
}

export async function getOrderIntentStatus(intentId: string, userId: string) {
  await ensureOrderPersistenceCompatibility();

  const intent = await db.query.orderIntents.findFirst({
    where: and(eq(orderIntents.id, intentId), eq(orderIntents.userId, userId)),
  });

  if (!intent) {
    throw new NotFoundError('Order intent');
  }

  const parsed = parsePayload(intent.data);
  const order = await db.query.orders.findFirst({
    where: eq(orders.idempotencyKey, parsed.idempotencyKey),
    with: { items: true },
  });

  if (order) {
    return {
      status: 'completed',
      order,
      intentStatus: normalizeIntentStatus(intent.status),
      error: null,
    };
  }

  const normalized = normalizeIntentStatus(intent.status);
  if (normalized === 'FAILED_FINAL' || normalized === 'FAILED_RETRYABLE') {
    return {
      status: 'failed',
      order: null,
      intentStatus: normalized,
      error: intent.error || 'Order processing failed',
    };
  }

  return {
    status: normalized.toLowerCase(),
    order: null,
    intentStatus: normalized,
    error: null,
  };
}

export async function resetStaleProcessingIntents(staleMs = 2 * 60 * 1000) {
  await ensureOrderPersistenceCompatibility();

  const staleIso = new Date(Date.now() - staleMs).toISOString();
  const staleIntents = await db.query.orderIntents.findMany({
    where: and(eq(orderIntents.status, 'PROCESSING'), lt(orderIntents.updatedAt, staleIso)),
    limit: 100,
  });

  if (staleIntents.length === 0) return [];

  const ids = staleIntents.map((intent) => intent.id);
  await db
    .update(orderIntents)
    .set({
      status: 'PROCESSING_STALE',
      error: 'Recovered from stale processing state',
      updatedAt: nowIso(),
    })
    .where(inArray(orderIntents.id, ids));

  return ids;
}

export async function getOrdersByUserId(userId: string) {
  await ensureOrderPersistenceCompatibility();

  return db.query.orders.findMany({
    where: eq(orders.userId, userId),
    orderBy: [desc(orders.createdAt)],
    with: { items: true }
  });
}

export async function getOrderById(id: string, userId: string) {
  await ensureOrderPersistenceCompatibility();

  return db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.userId, userId)),
    with: { items: true }
  });
}
