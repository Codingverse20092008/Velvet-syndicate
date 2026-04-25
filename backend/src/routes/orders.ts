import { Router, Request, Response } from 'express';
import { createOrder, getOrdersByUserId } from '../services/order.service';
import { getUserFromRequest } from '../lib/auth-express';
import { asyncHandler } from '../lib/api-handler-express';
import { ValidationError } from '../lib/errors';
import { successResponse } from '../lib/api-response-express';

const router = Router();

// GET /api/orders
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const orders = await getOrdersByUserId(user.id);

  return successResponse(res, { orders });
}));

// POST /api/orders
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { shippingAddress } = req.body;

  if (!shippingAddress || typeof shippingAddress !== 'string') {
    throw new ValidationError('Shipping address is required');
  }

  const order = await createOrder(user.id, shippingAddress);

  return successResponse(res, { order }, 201);
}));


export default router;
