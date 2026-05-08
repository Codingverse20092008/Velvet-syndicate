import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/api-handler-express';
import { successResponse } from '../../lib/api-response-express';
import { getUserFromRequest } from '../../lib/auth-express';
import { cacheGet, cacheSet } from '../../lib/redis';
import { z } from 'zod';

const router = Router();

const SETTINGS_KEY = 'admin:settings';

const settingsSchema = z.object({
  freeShippingThreshold: z.number().default(0),
  standardShippingFee: z.number().default(20),
  deliveryEstimate: z.string().default('7-8'),
  enableCOD: z.boolean().default(true),
  codVerificationRequired: z.boolean().default(false),
  maxCODOrderValue: z.number().default(50000),
  // Social Proof Settings
  enableSocialProof: z.boolean().default(true),
  minVisitors: z.number().default(480),
  maxVisitors: z.number().default(712),
  activityInterval: z.number().default(90), // in seconds
});

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

// Default settings
const defaultSettings = {
  freeShippingThreshold: 0,
  standardShippingFee: 20,
  deliveryEstimate: '7-8',
  enableCOD: true,
  codVerificationRequired: false,
  maxCODOrderValue: 50000,
  enableSocialProof: true,
  minVisitors: 480,
  maxVisitors: 712,
  activityInterval: 90,
};

// GET /api/admin/settings - Get settings
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const cached = await cacheGet<string>(SETTINGS_KEY);
    if (cached) {
      return successResponse(res, { data: JSON.parse(cached) });
    }

    return successResponse(res, { data: defaultSettings });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
}));

// POST /api/admin/settings - Save settings
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const parsed = settingsSchema.parse(req.body);
    
    // Save to cache
    await cacheSet(SETTINGS_KEY, JSON.stringify(parsed), 86400); // 24 hours
    
    return successResponse(res, { 
      message: 'Settings saved successfully',
      data: parsed 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid settings data',
        details: error.issues 
      });
    }
    console.error('Failed to save settings:', error);
    res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
}));

// Public endpoint to get shipping settings (for frontend checkout)
router.get('/public/shipping', asyncHandler(async (req: Request, res: Response) => {
  try {
    const cached = await cacheGet<string>(SETTINGS_KEY);
    const settings = cached ? JSON.parse(cached) : defaultSettings;

    return successResponse(res, { 
      shippingFee: settings.standardShippingFee,
      deliveryEstimate: settings.deliveryEstimate,
      freeShippingThreshold: settings.freeShippingThreshold,
    });
  } catch (error) {
    console.error('Failed to fetch public settings:', error);
    // Return defaults on error
    return successResponse(res, { 
      shippingFee: 20,
      deliveryEstimate: '7-8',
      freeShippingThreshold: 0,
    });
  }
}));

// Public endpoint to get social proof settings
router.get('/public/social-proof', asyncHandler(async (req: Request, res: Response) => {
  try {
    const cached = await cacheGet<string>(SETTINGS_KEY);
    const settings = cached ? JSON.parse(cached) : defaultSettings;

    return successResponse(res, { 
      enabled: settings.enableSocialProof ?? true,
      minVisitors: settings.minVisitors ?? 480,
      maxVisitors: settings.maxVisitors ?? 712,
      activityInterval: settings.activityInterval ?? 90,
    });
  } catch (error) {
    console.error('Failed to fetch public social proof settings:', error);
    return successResponse(res, { 
      enabled: true,
      minVisitors: 480,
      maxVisitors: 712,
      activityInterval: 90,
    });
  }
}));

export default router;
