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
import { RateLimitError, NotFoundError, ValidationError } from '../lib/errors';
import { db } from '../lib/db';
import { orders } from '../lib/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

const createOrderSchema = z.object({
  addressId: z.string().uuid('Invalid address ID'),
  paymentMethod: z.literal('COD').optional().default('COD'),
  idempotencyKey: z.string().min(8, 'Idempotency key is required'),
  expectedVersion: z.number().optional(),
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
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { allowed } = await checkRateLimit(`orders:create:${user.id}`, { max: 5, window: 3600 });
  if (!allowed) throw new RateLimitError('Too many orders from this account. Please try again later.');

  const data = createOrderSchema.parse(req.body);

  const order = await createOrder(
    user.id,
    data.addressId,
    data.paymentMethod,
    data.idempotencyKey,
    data.expectedVersion
  );

  const statusCode = ('alreadyExists' in order && order.alreadyExists) ? 200 : 201;
  return successResponse(res, { order, message: 'Order is being processed' }, statusCode);
}));

export default router;

