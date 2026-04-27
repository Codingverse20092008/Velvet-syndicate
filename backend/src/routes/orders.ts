import { Router, Request, Response } from 'express';
import { createOrder, getOrdersByUserId, getOrderById } from '../services/order.service';
import { getUserFromRequest } from '../lib/auth-express';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { ValidationError } from '../lib/errors';
import { z } from 'zod';

const router = Router();

const createOrderSchema = z.object({
  addressId: z.string().uuid('Invalid address ID'),
  paymentMethod: z.string().optional(),
  idempotencyKey: z.string().optional(),
  expectedVersion: z.number().optional(),
});

// GET /api/orders
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const orders = await getOrdersByUserId(user.id);

  return successResponse(res, { orders });
}));

// GET /api/orders/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const order = await getOrderById(req.params.id, user.id);
  
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  return successResponse(res, { order });
}));

// POST /api/orders
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const data = createOrderSchema.parse(req.body);
  
  const order = await createOrder(
    user.id,
    data.addressId,
    data.paymentMethod,
    data.idempotencyKey,
    data.expectedVersion
  );

  return successResponse(res, { order, message: 'Order placed successfully' }, 201);
}));


export default router;
