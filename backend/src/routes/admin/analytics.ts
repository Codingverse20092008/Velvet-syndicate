import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/api-handler-express';
import { successResponse } from '../../lib/api-response-express';
import { getUserFromRequest } from '../../lib/auth-express';
import * as analyticsService from '../../services/analytics.service';

const router = Router();

// Admin middleware - check if user is admin
const requireAdmin = async (req: Request, res: Response): Promise<boolean> => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user as any).role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return false;
  }
};

// GET /api/admin/analytics/overview
router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  const overview = await analyticsService.getAnalyticsOverview();
  return successResponse(res, { analytics: overview });
}));

export default router;
