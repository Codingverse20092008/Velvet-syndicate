import { Router, Request, Response } from 'express';
import {
  createOrder,
  getOrdersByUserId,
  getOrderById,
  getOrderIntentStatus,
  requestOrderCancellation,
} from '../services/order.service';
import { getUserFromRequest } from '../lib/auth-express';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { z } from 'zod';
import { checkRateLimit } from '../lib/rate-limit';
import { checkoutLimiter, razorpayLimiter } from '../middleware/rate-limiter';
import { RateLimitError, NotFoundError, ValidationError } from '../lib/errors';
import { db, dbClient } from '../lib/db';
import { orders, orderItems, productSizes, cart, cartItems, addresses } from '../lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../lib/env';
import { logger } from '../lib/logger';

const router = Router();

const createOrderSchema = z.object({
  addressId: z.string().uuid('Invalid address ID'),
  paymentMethod: z.enum(['COD', 'UPI', 'NET_BANKING', 'CARD', 'RAZORPAY']).optional().default('COD'),
  idempotencyKey: z.string().min(8, 'Idempotency key is required'),
  expectedVersion: z.number().optional(),
  rewardId: z.string().optional(),
});

const createRazorpayOrderSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().optional().default('INR'),
  receipt: z.string().optional(),
});

const verifyRazorpaySchema = z.object({
  razorpay_order_id: z.string().min(1, 'razorpay_order_id is required'),
  razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
  razorpay_signature: z.string().min(1, 'razorpay_signature is required'),
  orderPayload: z.object({
    addressId: z.string().optional(),
    totalAmount: z.number().optional(),
    appliedVaultCredits: z.number().optional(),
    rewardId: z.string().optional(),
    items: z.array(z.any()).optional(),
  }).optional(),
});

const cancelOrderSchema = z.object({
  reason: z.enum([
    'Changed my mind',
    'Ordered by mistake',
    'Found a better price',
    'Need to change size',
    'Need to change address',
    'Delivery will take too long',
    'Payment issue',
    'Duplicate order',
    'Product no longer needed',
    'Other reason',
  ]),
});

const returnExchangeSchema = z.object({
  type: z.enum(['RETURN', 'EXCHANGE']),
  reason: z.enum([
    'Wrong size received',
    'Product is defective or damaged',
    'Product does not match description',
    'Wrong product delivered',
    'Sizing issue - too small',
    'Sizing issue - too large',
    'Quality not as expected',
    'Changed my mind',
    'Found a better price elsewhere',
    'Other reason',
  ]),
});

function parseAddressSnapshot(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function mapOrderForClient(order: any) {
  return {
    id: order.id,
    status: order.status,
    total: Number(order.totalAmount ?? 0),
    totalAmount: Number(order.totalAmount ?? 0),
    createdAt: order.createdAt,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentId: order.paymentId ?? null,
    addressSnapshot: parseAddressSnapshot(order.shippingAddress),
    shippingAddress: order.shippingAddress,
    items: order.items ?? [],
    returnStatus: order.returnStatus ?? 'NONE',
    returnReason: order.returnReason ?? null,
  };
}

// GET /api/orders
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const orderList = await getOrdersByUserId(user.id);

  return successResponse(res, { orders: orderList.map(mapOrderForClient) });
}));

// GET /api/orders/status/:jobId
// 🔍 JOB TRACKING: Allows clients to poll for completion of async checkout
router.get('/status/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { jobId } = req.params;
  const status = await getOrderIntentStatus(jobId, user.id);
  return successResponse(res, {
    ...status,
    order: status.order ? mapOrderForClient(status.order) : null,
  });
}));

// GET /api/orders/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const order = await getOrderById(req.params.id, user.id);
  
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  return successResponse(res, { order: mapOrderForClient(order) });
}));

// GET /api/orders/:orderId/download-pdf
router.get('/:orderId/download-pdf', asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  // 1. Check if order exists in DB
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return res.status(403).json({
      success: false,
      message: 'Payment required to unlock this e-book.',
    });
  }

  // 2. Verify payment status
  const isPaid =
    order.paymentStatus === 'PAID' ||
    (order.status === 'CONFIRMED' && order.paymentMethod === 'RAZORPAY');

  if (!isPaid) {
    return res.status(403).json({
      success: false,
      message: 'Payment required to unlock this e-book.',
    });
  }

  // 3. Verify order items include prod_digital_sem3_cs or digital computer guide
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const hasDigitalProduct = items.some(
    (item) =>
      item.productId === 'prod_digital_sem3_cs' ||
      item.productName.toLowerCase().includes('computer application') ||
      item.productName.toLowerCase().includes('wbchse')
  );

  if (!hasDigitalProduct) {
    return res.status(403).json({
      success: false,
      message: 'Payment required to unlock this e-book.',
    });
  }

  // 4. Resolve file path
  const pdfPath = path.join(process.cwd(), 'storage', 'ebooks', 'edutips-sem3-computer.pdf');

  if (!fs.existsSync(pdfPath)) {
    logger.error({ pdfPath }, 'Digital PDF asset file not found on disk');
    return res.status(500).json({
      success: false,
      message: 'Digital asset file unavailable. Please contact concierge.',
    });
  }

  const stat = fs.statSync(pdfPath);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', 'attachment; filename="EduTips-HS-Sem3-Computer.pdf"');

  const fileStream = fs.createReadStream(pdfPath);
  fileStream.pipe(res);
}));

// POST /api/orders/:id/cancel-request
router.post('/:id/cancel-request', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const data = cancelOrderSchema.parse(req.body);
  const order = await requestOrderCancellation(req.params.id, user.id, data.reason);

  return successResponse(res, {
    order: order ? mapOrderForClient(order) : null,
    message: 'Cancellation request submitted',
  });
}));

// POST /api/orders/:id/return-exchange-request
router.post('/:id/return-exchange-request', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const data = returnExchangeSchema.parse(req.body);

  // Find the order
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, req.params.id), eq(orders.userId, user.id)))
    .limit(1);

  if (!order) throw new NotFoundError('Order');

  // Only allow return/exchange on DELIVERED orders
  if (order.status !== 'DELIVERED') {
    throw new ValidationError('Return/Exchange can only be requested for delivered orders.');
  }

  // Only allow if no existing return/exchange pending
  if (order.returnStatus !== 'NONE') {
    throw new ValidationError(`A ${order.returnStatus.toLowerCase().replace('_', ' ')} is already in progress.`);
  }

  const newStatus = data.type === 'RETURN' ? 'RETURN_REQUESTED' : 'EXCHANGE_REQUESTED';

  await db
    .update(orders)
    .set({
      returnStatus: newStatus as any,
      returnReason: data.reason,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, req.params.id));

  const [updated] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);

  return successResponse(res, {
    order: mapOrderForClient(updated),
    message: `${data.type === 'RETURN' ? 'Return' : 'Exchange'} request submitted successfully.`,
  });
}));

// POST /api/orders
router.post('/', checkoutLimiter, asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) {
    const { allowed } = await checkRateLimit(`orders:create:${user.id}`, { max: 30, window: 900 });
    if (!allowed) throw new RateLimitError('Too many checkout attempts. Please try again in a few minutes.');
  }

  const data = createOrderSchema.parse(req.body);

  const order = await createOrder(
    user.id,
    data.addressId,
    data.paymentMethod,
    data.idempotencyKey,
    data.expectedVersion,
    data.rewardId
  );

  const statusCode = ('alreadyExists' in order && order.alreadyExists) ? 200 : 201;
  return successResponse(res, { order, message: 'Order is being processed' }, statusCode);
}));

// POST /api/orders/razorpay/create
router.post('/razorpay/create', razorpayLimiter, asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const data = createRazorpayOrderSchema.parse(req.body);

  const key_id = env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_live_TiJnNaOV7SSj5c';
  const key_secret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || 'Hbjbk0cTJpmWG4ACMPCDHiv2';

  const receipt = data.receipt || `rcpt_${Date.now()}_${user.id.slice(0, 8)}`;
  const amountInPaise = Math.round(data.amount * 100);

  try {
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: data.currency || 'INR',
      receipt,
    });

    return successResponse(res, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    logger.warn({ err: err?.message || err }, 'Razorpay API order creation failed');
    // If in development or invalid credentials, fallback to test order so developer testing never blocks
    if (process.env.NODE_ENV !== 'production' || err?.statusCode === 401) {
      const fallbackOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
      logger.info({ fallbackOrderId }, 'Using dev fallback Razorpay order ID');
      return successResponse(res, {
        orderId: fallbackOrderId,
        amount: amountInPaise,
        currency: data.currency || 'INR',
      });
    }
    throw err;
  }
}));

// POST /api/orders/razorpay/verify
router.post('/razorpay/verify', razorpayLimiter, asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const data = verifyRazorpaySchema.parse(req.body);

  const key_secret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || 'Hbjbk0cTJpmWG4ACMPCDHiv2';

  // 1. Verify HMAC SHA256 signature using crypto
  const hmac = crypto.createHmac('sha256', key_secret);
  hmac.update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`);
  const generatedSignature = hmac.digest('hex');

  const isDevBypass = process.env.NODE_ENV !== 'production' && data.razorpay_order_id.startsWith('order_');

  if (generatedSignature !== data.razorpay_signature && !isDevBypass) {
    return res.status(400).json({ success: false, message: 'Invalid payment signature' });
  }

  // 2. Idempotency Check
  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, data.razorpay_order_id))
    .limit(1);

  if (existingOrder) {
    return successResponse(res, {
      success: true,
      orderId: existingOrder.id,
      message: 'Order already processed',
    });
  }

  // 3. Resolve Delivery Address
  let addressSnapshot: any = null;
  if (data.orderPayload?.addressId) {
    const [addr] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, data.orderPayload.addressId), eq(addresses.userId, user.id)))
      .limit(1);
    if (addr) {
      addressSnapshot = {
        id: addr.id,
        name: addr.name,
        phone: addr.phone,
        street: addr.street,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
      };
    }
  }

  if (!addressSnapshot) {
    const [userAddr] = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, user.id))
      .limit(1);
    if (userAddr) {
      addressSnapshot = {
        id: userAddr.id,
        name: userAddr.name,
        phone: userAddr.phone,
        street: userAddr.street,
        city: userAddr.city,
        state: userAddr.state,
        pincode: userAddr.pincode,
      };
    } else {
      addressSnapshot = {
        name: user.name || 'Syndicate Member',
        phone: user.phone || '9999999999',
        street: user.address || 'Standard Delivery',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      };
    }
  }

  // 4. Resolve Cart Lines
  const [userCart] = await db
    .select()
    .from(cart)
    .where(eq(cart.userId, user.id))
    .limit(1);

  let rawCartItems: any[] = [];
  if (userCart) {
    rawCartItems = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, userCart.id));
  }

  const lines: any[] = [];
  if (data.orderPayload?.items && Array.isArray(data.orderPayload.items) && data.orderPayload.items.length > 0) {
    for (const item of data.orderPayload.items) {
      lines.push({
        productId: item.productId || item.id,
        productName: item.name || item.productName || 'Velvet Footwear',
        unitPrice: Number(item.price || item.productPrice || 0),
        quantity: Number(item.quantity || 1),
        size: String(item.size || 'UK 9'),
        variantId: item.variantId || null,
        imageUrl: item.image || item.imageUrl || null,
      });
    }
  } else if (rawCartItems.length > 0) {
    for (const item of rawCartItems) {
      lines.push({
        productId: item.productId,
        productName: 'Velvet Footwear',
        unitPrice: 0,
        quantity: item.quantity,
        size: item.size,
        variantId: item.variantId,
        imageUrl: null,
      });
    }
  }

  const orderId = crypto.randomUUID();
  const totalAmount = Number(data.orderPayload?.totalAmount ?? 0);

  await db.transaction(async (tx) => {
    // 1. Insert order with status 'CONFIRMED', paymentStatus 'PAID', paymentMethod 'RAZORPAY'
    await tx.insert(orders).values({
      id: orderId,
      userId: user.id,
      totalAmount,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      paymentMethod: 'RAZORPAY',
      paymentId: data.razorpay_payment_id,
      shippingAddress: JSON.stringify(addressSnapshot),
      idempotencyKey: data.razorpay_order_id,
    });

    // 2. Insert order items
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

      if (line.variantId && line.size) {
        try {
          await tx
            .update(productSizes)
            .set({ stock: sql`${productSizes.stock} - ${line.quantity}` })
            .where(
              and(
                eq(productSizes.variantId, line.variantId),
                eq(productSizes.size, line.size),
                sql`${productSizes.stock} >= ${line.quantity}`
              )
            );
        } catch {}
      }
    }

    // 3. Clear user's server-side cart
    if (userCart) {
      await tx.delete(cartItems).where(eq(cartItems.cartId, userCart.id));
    }
  });

  // 4. Deduct vault credits if applied in orderPayload
  const appliedCredits = Number(data.orderPayload?.appliedVaultCredits ?? 0);
  if (appliedCredits > 0) {
    try {
      await dbClient.execute({
        sql: 'UPDATE vault_users SET vault_coins = MAX(0, vault_coins - ?) WHERE user_id = ?',
        args: [appliedCredits, user.id],
      });
    } catch (err) {
      console.warn('Failed to deduct vault credits after payment:', err);
    }
  }

  return successResponse(res, {
    success: true,
    orderId,
    message: 'Payment verified and order confirmed successfully',
  });
}));

export default router;

