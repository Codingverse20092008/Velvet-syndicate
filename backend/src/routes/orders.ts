import { Router, Request, Response } from 'express';
import { createOrder, getOrdersByUserId, getOrderById, getOrderIntentStatus } from '../services/order.service';
import { getUserFromRequest } from '../lib/auth-express';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { z } from 'zod';
import { checkRateLimit } from '../lib/rate-limit';
import { RateLimitError } from '../lib/errors';

const router = Router();

const createOrderSchema = z.object({
  addressId: z.string().uuid('Invalid address ID'),
  paymentMethod: z.literal('COD').optional().default('COD'),
  idempotencyKey: z.string().min(8, 'Idempotency key is required'),
  expectedVersion: z.number().optional(),
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
  };
}

// GET /api/orders
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const orders = await getOrdersByUserId(user.id);

  return successResponse(res, { orders: orders.map(mapOrderForClient) });
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
