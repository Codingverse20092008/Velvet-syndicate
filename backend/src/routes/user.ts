import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { getUserFromRequest } from '../lib/auth-express';
import { getActiveOrder, getRecommendations, getUserStats, updateUserProfile } from '../services/user.service';

const router = Router();

// Validation schema for profile update
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number').nullable().optional(),
  address: z.string().min(10, 'Address must be at least 10 characters').max(500, 'Address is too long').nullable().optional(),
  avatar: z.string().regex(/^data:image\/[a-zA-Z]+;base64,/, 'Invalid image format').nullable().optional(),
});

const bankDetailsSchema = z.object({
  bankAccountNo: z.string().min(9, 'Account number must be at least 9 digits').max(18, 'Account number too long').regex(/^\d+$/, 'Account number must contain only digits').nullable(),
  bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g. SBIN0001234)').nullable(),
});

// PATCH /api/user/profile - Update user profile
router.patch('/profile', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  
  // Validate request body
  const parsed = updateProfileSchema.parse(req.body);
  
  // Update profile
  const updatedUser = await updateUserProfile(user.id, {
    name: parsed.name,
    phone: parsed.phone || null,
    address: parsed.address || null,
    avatar: parsed.avatar || null,
  });

  return successResponse(res, { 
    message: 'Profile updated successfully',
    user: updatedUser 
  });
}));

// GET /api/user/profile - Get user profile
router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  
  return successResponse(res, { 
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar,
      role: user.role,
      bankAccountNo: (user as any).bankAccountNo ?? null,
      bankIfsc: (user as any).bankIfsc ?? null,
      createdAt: user.createdAt,
    }
  });
}));

// PATCH /api/user/bank-details - Save bank details for refunds
router.patch('/bank-details', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const parsed = bankDetailsSchema.parse(req.body);

  const updatedUser = await updateUserProfile(user.id, {
    name: user.name,
    phone: user.phone,
    address: user.address,
    avatar: user.avatar,
    bankAccountNo: parsed.bankAccountNo,
    bankIfsc: parsed.bankIfsc,
  });

  return successResponse(res, {
    message: 'Bank details saved successfully',
    user: updatedUser,
  });
}));

// GET /api/user/stats - Retention and loyalty stats
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const stats = await getUserStats(user.id);

  // Hide loyalty points from admin users
  if (user.role === 'admin') {
    stats.loyaltyPoints = 0;
  }

  return successResponse(res, { stats });
}));

// GET /api/user/active-order - Latest active order for banner/tracking
router.get('/active-order', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const activeOrder = await getActiveOrder(user.id);

  return successResponse(res, { activeOrder });
}));

// GET /api/user/recommendations - Buy again + may also like
router.get('/recommendations', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 6), 1), 12);
  const recommendations = await getRecommendations(user.id, limit);

  return successResponse(res, { recommendations });
}));

export default router;
