import { Router, Request, Response } from 'express';
import { reviewService } from '../services/review.service';
import { asyncHandler } from '../lib/api-handler-express';
import { checkRateLimit } from '../lib/rate-limit';
import { RateLimitError } from '../lib/errors';
import { successResponse } from '../lib/api-response-express';
import { logger } from '../lib/logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  content: z.string().min(10).max(1000),
});

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  title: z.string().optional(),
  content: z.string().min(10).max(1000).optional(),
});

// GET /api/reviews/product/:productId - Get reviews for a product
router.get('/product/:productId', asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { isFake, limit = 20, offset = 0 } = req.query;
  
  const reviews = await reviewService.getProductReviews(productId, {
    isFake: isFake === 'true' ? true : isFake === 'false' ? false : undefined,
    limit: Number(limit),
    offset: Number(offset),
  });
  
  return successResponse(res, reviews);
}));

// GET /api/reviews - Get all reviews (admin only)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { isFake, rating, limit = 50, offset = 0 } = req.query;
  
  const reviews = await reviewService.getAllReviews({
    isFake: isFake === 'true' ? true : isFake === 'false' ? false : undefined,
    rating: rating ? Number(rating) : undefined,
    limit: Number(limit),
    offset: Number(offset),
  });
  
  return successResponse(res, reviews);
}));

// POST /api/reviews - Create a new review (authenticated users only)
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const ip = req.ip || 'anonymous';
  const { allowed } = await checkRateLimit(`reviews:${ip}`);
  if (!allowed) throw new RateLimitError();
  
  const validatedData = createReviewSchema.parse(req.body);
  
  // This would normally come from authentication middleware
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'You must be logged in to leave a review'
    });
  }
  
  const review = await reviewService.createReview({
    ...validatedData,
    userId,
  });
  
  return successResponse(res, { review }, 201);
}));

// PUT /api/reviews/:id - Update a review
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = updateReviewSchema.parse(req.body);
  
  const review = await reviewService.updateReview(id, validatedData);
  
  return successResponse(res, { review });
}));

// DELETE /api/reviews/:id - Delete a review (admin only)
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  await reviewService.deleteReview(id);
  
  return successResponse(res, { success: true });
}));

// POST /api/reviews/:id/helpful - Mark review as helpful
router.post('/:id/helpful', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const ip = req.ip || 'anonymous';
  const { allowed } = await checkRateLimit(`helpful:${ip}`);
  if (!allowed) throw new RateLimitError();
  
  const review = await reviewService.markReviewHelpful(id);
  
  return successResponse(res, { review });
}));

// POST /api/reviews/generate-fake - Generate fake reviews for products due (2-day rule) (admin only)
router.post('/generate-fake', asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.generateFakeReviews();
  
  logger.info({ action: 'Admin triggered scheduled fake review generation', result });
  
  return successResponse(res, result);
}));

// POST /api/reviews/generate-manual - Generate fake reviews for existing products (admin only)
router.post('/generate-manual', asyncHandler(async (req: Request, res: Response) => {
  const { limit = 3 } = req.body;
  const result = await reviewService.generateFakeReviewsForExisting(limit);
  
  logger.info({ action: 'Admin triggered manual fake review generation', result });
  
  return successResponse(res, result);
}));

// POST /api/reviews/generate-for-new - Generate reviews for new products (admin only)
router.post('/generate-for-new', asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.generateReviewsForNewProducts();
  
  logger.info({ action: 'Admin triggered new product review generation', result });
  
  return successResponse(res, result);
}));

export default router;
