import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { getUserFromRequest } from '../lib/auth-express';
import { updateUserProfile } from '../services/user.service';

const router = Router();

// Validation schema for profile update
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number').nullable().optional(),
  address: z.string().min(10, 'Address must be at least 10 characters').max(500, 'Address is too long').nullable().optional(),
  avatar: z.string().regex(/^data:image\/[a-zA-Z]+;base64,/, 'Invalid image format').nullable().optional(),
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
      createdAt: user.createdAt,
    }
  });
}));

export default router;
