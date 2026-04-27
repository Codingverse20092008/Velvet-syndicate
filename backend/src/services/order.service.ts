import { eq, and, desc } from 'drizzle-orm';
import { db } from '../lib/db';
import { orders, orderItems, cart, cartItems, productSizes, addresses } from '../lib/schema';
import { NotFoundError, ValidationError } from '../lib/errors';
import { invalidateCartCache } from '../lib/cache';
import { logger } from '../lib/logger';

export async function createOrder(
  userId: string,
  addressId: string, // Changed from shippingAddress string to addressId
  paymentMethod: string = 'COD',
  idempotencyKey?: string,
  expectedVersion?: number
) {
  // Check for existing order with the same idempotency key
  if (idempotencyKey) {
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.idempotencyKey, idempotencyKey)
    });
    if (existingOrder) {
      logger.info({ idempotencyKey, orderId: existingOrder.id }, 'Returning existing order for idempotency key');
      return { id: existingOrder.id, total: existingOrder.totalAmount, alreadyExists: true };
    }
  }

  // 0. Fetch the address to create a snapshot
  const address = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
  });

  if (!address) {
    throw new ValidationError('Invalid shipping address selected');
  }

  // Create a snapshot of the address
  const addressSnapshot = JSON.stringify({
    name: address.name,
    phone: address.phone,
    street: address.street,
    city: address.city,
    state: address.state,
    pincode: address.pincode
  });

  return await db.transaction(async (tx) => {
    // 1. Get cart with items and products
    const userCart = await tx.query.cart.findFirst({
      where: eq(cart.userId, userId),
      with: {
        items: {
          with: {
            product: {
              with: {
                variants: true
              }
            }
          }
        }
      }
    });

    if (!userCart || userCart.items.length === 0) {
      throw new ValidationError('Cart is empty');
    }

    if (expectedVersion !== undefined && userCart.version !== expectedVersion) {
      throw new ValidationError('Cart has been modified. Please refresh and try again.');
    }

    let totalAmount = 0;
    const orderId = crypto.randomUUID();

    // 2. Validate stock and calculate total
    for (const item of userCart.items) {
      const sizeRecord = await tx.query.productSizes.findFirst({
        where: and(eq(productSizes.variantId, item.variantId), eq(productSizes.size, item.size)),
      });

      if (!sizeRecord || sizeRecord.stock < item.quantity) {
        throw new ValidationError(`Insufficient stock for ${item.product.name} (${item.size})`);
      }

      // 3. Deduct stock
      await tx
        .update(productSizes)
        .set({ stock: sizeRecord.stock - item.quantity })
        .where(eq(productSizes.id, sizeRecord.id));

      totalAmount += item.product.price * item.quantity;
    }

    // 4. Create Order with snapshot
    await tx.insert(orders).values({
      id: orderId,
      userId,
      totalAmount,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod,
      shippingAddress: addressSnapshot, // Store snapshot
      idempotencyKey,
    });

    // 5. Create Order Items with snapshots
    await tx.insert(orderItems).values(
      userCart.items.map((item) => ({
        id: crypto.randomUUID(),
        orderId,
        productId: item.productId,
        productName: item.product.name,
        productPrice: item.product.price,
        quantity: item.quantity,
        size: item.size,
        variantId: item.variantId,
        imageUrl: item.product.imageUrl
      }))
    );

    // 6. Clear Cart
    await tx.delete(cartItems).where(eq(cartItems.cartId, userCart.id));

    await invalidateCartCache(userId);
    logger.info({ orderId, userId, totalAmount }, 'Order created successfully');

    return { id: orderId, total: totalAmount };
  });
}

export async function getOrdersByUserId(userId: string) {
  return await db.query.orders.findMany({
    where: eq(orders.userId, userId),
    orderBy: desc(orders.createdAt),
    with: {
      items: true
    }
  });
}

export async function getOrderById(orderId: string, userId?: string) {
  return await db.query.orders.findFirst({
    where: userId ? and(eq(orders.id, orderId), eq(orders.userId, userId)) : eq(orders.id, orderId),
    with: {
      items: true
    }
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'FAILED',
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) throw new NotFoundError('Order');

  await db.update(orders)
    .set({ 
      status,
      paymentStatus: paymentStatus || order.paymentStatus,
      updatedAt: new Date().toISOString() 
    })
    .where(eq(orders.id, orderId));

  logger.info({ orderId, status }, 'Order status updated');
  return getOrderById(orderId);
}