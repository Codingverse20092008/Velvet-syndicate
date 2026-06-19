import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { inArray } from 'drizzle-orm';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse, errorResponse } from '../lib/api-response-express';
import { getUserFromRequest } from '../lib/auth-express';
import { db } from '../lib/db';
import { products } from '../lib/schema';

const router = Router();

const verifyDiscoverySchema = z.object({
  productIds: z.array(z.string()).min(1),
  challengeType: z.enum(['explorer', 'wishlist']),
});

router.post('/verify-discovery', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return errorResponse(res, 'Authentication required', 'UNAUTHORIZED', 401);
  }

  const { productIds, challengeType } = verifyDiscoverySchema.parse(req.body);

  const uniqueIds = [...new Set(productIds.map(id => id.trim()).filter(Boolean))];
  const requiredCount = challengeType === 'explorer' ? 5 : 3;

  if (uniqueIds.length < requiredCount) {
    return successResponse(res, { valid: false, validCount: uniqueIds.length, required: requiredCount });
  }

  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(inArray(products.id, uniqueIds));

  const validCount = existing.length;
  const valid = validCount >= requiredCount;

  return successResponse(res, { valid, validCount, required: requiredCount });
}));

export default router;
