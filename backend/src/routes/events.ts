import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { getUserFromRequest } from '../lib/auth-express';
import * as eventService from '../services/event.service';

const router = Router();

const trackEventSchema = z.object({
  eventType: z.string().min(1).max(50),
  metadata: z.record(z.string(), z.any()).optional(),
});

// POST /api/events - Track an event (fire-and-forget style)
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const data = trackEventSchema.parse(req.body);
  
  // Get userId if authenticated (optional)
  let userId: string | undefined;
  try {
    const user = await getUserFromRequest(req);
    userId = user?.id;
  } catch {
    // Not authenticated - track anonymously
  }

  // Fire event tracking (non-blocking - don't await)
  eventService.trackEvent(data.eventType, data.metadata, userId).catch(() => {
    // Silently fail - never block the response
  });

  // Respond immediately
  return successResponse(res, { tracked: true });
}));

export default router;
