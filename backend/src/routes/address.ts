import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { getUserFromRequest } from '../lib/auth-express';
import * as addressService from '../services/address.service';

const router = Router();

const addressSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  street: z.string().min(5, 'Street address is too short'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  isDefault: z.boolean().optional(),
});

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const addresses = await addressService.getAddressesByUserId(user.id);
  return successResponse(res, { addresses });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const data = addressSchema.parse(req.body);
  const address = await addressService.createAddress({ ...data, userId: user.id });
  return successResponse(res, { address, message: 'Address added successfully' });
}));

router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const data = addressSchema.partial().parse(req.body);
  const address = await addressService.updateAddress(req.params.id, user.id, data);
  return successResponse(res, { address, message: 'Address updated successfully' });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  await addressService.deleteAddress(req.params.id, user.id);
  return successResponse(res, { message: 'Address deleted successfully' });
}));

router.post('/:id/default', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const address = await addressService.setDefaultAddress(req.params.id, user.id);
  return successResponse(res, { address, message: 'Default address updated' });
}));

export default router;
