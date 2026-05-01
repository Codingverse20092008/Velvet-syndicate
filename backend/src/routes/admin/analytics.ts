import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/api-handler-express';
import { successResponse } from '../../lib/api-response-express';
import { getUserFromRequest } from '../../lib/auth-express';
import * as analyticsService from '../../services/analytics.service';
import * as feedbackService from '../../services/feedback.service';

const router = Router();

// Admin middleware - check if user is admin
const requireAdmin = async (req: Request, res: Response): Promise<boolean> => {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user as any).role !== 'admin') {
      console.log('Analytics middleware: Not admin', user?.role);
      res.status(403).json({ success: false, error: 'Admin access required' });
      return false;
    }
    return true;
  } catch (err) {
    console.error('Analytics middleware auth failed:', err);
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

// GET /api/admin/analytics/funnel
router.get('/funnel', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  const funnel = await analyticsService.getFunnelAnalytics();
  return successResponse(res, { funnel });
}));

// GET /api/admin/analytics/product-insights
router.get('/product-insights', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  const insights = await analyticsService.getProductInsights();
  return successResponse(res, { productInsights: insights });
}));

// GET /api/admin/analytics/feedback-summary
router.get('/feedback-summary', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  const summary = await feedbackService.getFeedbackSummary();
  return successResponse(res, { feedbackSummary: summary });
}));

export default router;
