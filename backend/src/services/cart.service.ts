import { eq, and } from 'drizzle-orm';
import { db } from '../lib/db';
import { cart, cartItems, products, productSizes, productVariants } from '../lib/schema';
import { NotFoundError, ValidationError, AppError } from '../lib/errors';
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
  const items = cartRecord.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    size: item.size,
    quantity: item.quantity,
    product: {
      id: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      price: item.product.price,
      imageUrl: item.product.imageUrl,
    },
    variant: {
      id: item.variant.id,
      name: item.variant.name,
      color: item.variant.color,
      images: item.variant.images,
    }
  }));

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
  });

  await invalidateCartCache(userId);
}

export async function clearCart(userId: string) {
  const userCart = await db.query.cart.findFirst({ where: eq(cart.userId, userId) });
  if (!userCart) return;

  await db.delete(cartItems).where(eq(cartItems.cartId, userCart.id));
  await invalidateCartCache(userId);
}