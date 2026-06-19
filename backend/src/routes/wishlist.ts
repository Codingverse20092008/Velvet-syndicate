import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse, errorResponse } from '../lib/api-response-express';
import { getUserFromRequest } from '../lib/auth-express';
import { getWishlist, getWishlistCount, addToWishlist, removeFromWishlist, getWishlistProductIds } from '../services/wishlist.service';

const router = Router();

const addWishlistSchema = z.object({
  productId: z.string().min(1),
});

// GET /api/wishlist - Get all wishlist items
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const items = await getWishlist(user.id);
  const count = await getWishlistCount(user.id);
  return successResponse(res, { items, count });
}));

// GET /api/wishlist/ids - Get wishlist product IDs only
router.get('/ids', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const ids = await getWishlistProductIds(user.id);
  return successResponse(res, { ids });
}));

// GET /api/wishlist/count - Get wishlist count
router.get('/count', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const count = await getWishlistCount(user.id);
  return successResponse(res, { count });
}));

// POST /api/wishlist/add - Add product to wishlist
router.post('/add', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { productId } = addWishlistSchema.parse(req.body);

  const existing = await getWishlistProductIds(user.id);
  if (existing.includes(productId)) {
    return successResponse(res, { message: 'Already In Wishlist', alreadyExists: true });
  }

  await addToWishlist(user.id, productId);
  return successResponse(res, { message: 'Added To Wishlist' });
}));

// DELETE /api/wishlist/remove - Remove product from wishlist
router.delete('/remove', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const productId = req.query.productId as string;

  if (!productId) {
    return errorResponse(res, 'Product ID required', 'VALIDATION_ERROR');
  }

  await removeFromWishlist(user.id, productId);
  return successResponse(res, { message: 'Removed From Wishlist' });
}));

export default router;
