import { eq, and, desc } from 'drizzle-orm';
import { db } from '../lib/db';
import { orders, orderItems, cart, cartItems, productSizes } from '../lib/schema';
import { NotFoundError, ValidationError } from '../lib/errors';
import { invalidateCartCache } from '../lib/cache';
import { logger } from '../lib/logger';

export async function createOrder(
  userId: string,
  shippingAddress: string
) {
  return await db.transaction(async (tx) => {
    // 1. Get cart with items and products using relations
    const userCart = await tx.query.cart.findFirst({
      where: eq(cart.userId, userId),
      with: {
        items: {
          with: {
            product: true
          }
        }
      }
    });

    if (!userCart || userCart.items.length === 0) {
      throw new ValidationError('Cart is empty');
    }

    let total = 0;
    const orderId = crypto.randomUUID();

    // 2. Validate stock and calculate total
    for (const item of userCart.items) {
      const sizeRecord = await tx.query.productSizes.findFirst({
        where: and(eq(productSizes.productId, item.productId), eq(productSizes.size, item.size)),
      });

      if (!sizeRecord || sizeRecord.stock < item.quantity) {
        throw new ValidationError(`Insufficient stock for ${item.product.name} (${item.size})`);
      }

      // 3. Deduct stock
      await tx
        .update(productSizes)
        .set({ stock: sizeRecord.stock - item.quantity })
        .where(eq(productSizes.id, sizeRecord.id));

      total += item.product.price * item.quantity;
    }

    // 4. Create Order
    await tx.insert(orders).values({
      id: orderId,
      userId,
      total,
      status: 'pending',
      paymentStatus: 'pending',
      shippingAddress,
    });

    // 5. Create Order Items
    await tx.insert(orderItems).values(
      userCart.items.map((item) => ({
        id: crypto.randomUUID(),
        orderId,
        productId: item.productId,
        productName: item.product.name,
        productPrice: item.product.price,
        quantity: item.quantity,
        size: item.size,
      }))
    );

    // 6. Clear Cart
    await tx.delete(cartItems).where(eq(cartItems.cartId, userCart.id));

    await invalidateCartCache(userId);
    logger.info({ orderId, userId, total }, 'Order created successfully');

    return { id: orderId, total };
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
  status: any,
  paymentStatus?: any
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