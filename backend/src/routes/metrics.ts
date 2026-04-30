import { Router, Request, Response } from 'express';
import { getSystemMetrics, retryFailedJobs } from '../services/metrics.service';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { getUserFromRequest } from '../lib/auth-express';
import { ForbiddenError } from '../lib/errors';

const router = Router();

/**
 * 🔐 ADMIN GUARD
 * Centralized admin verification for metrics and recovery endpoints.
 */
async function requireAdmin(req: Request) {
  const user = await getUserFromRequest(req);
  if (user.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }
  return user;
}

// 📈 GET /api/metrics
// Restricted to Admins for observability
router.get(
  '/', 
  asyncHandler(async (req: Request, res: Response) => {
    await requireAdmin(req);
    const metrics = await getSystemMetrics();
    return successResponse(res, { metrics });
  })
);

// 🩹 POST /api/metrics/recovery/retry
// Force retry all failed jobs
router.post(
  '/recovery/retry',
  asyncHandler(async (req: Request, res: Response) => {
    await requireAdmin(req);
    const result = await retryFailedJobs();
    return successResponse(res, result);
  })
);

export default router;
