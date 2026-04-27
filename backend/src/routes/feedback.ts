import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { getUserFromRequest } from '../lib/auth-express';
import * as feedbackService from '../services/feedback.service';

const router = Router();

const feedbackSchema = z.object({
  message: z.string().min(1, 'Message is required').max(500, 'Message too long'),
  rating: z.string().optional(),
  page: z.string().optional(),
});

// POST /api/feedback - Submit user feedback
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const data = feedbackSchema.parse(req.body);
  
  // Get userId if authenticated (optional)
  let userId: string | undefined;
  try {
    const user = await getUserFromRequest(req);
    userId = user?.id;
  } catch {
    // Not authenticated - anonymous feedback is allowed
  }

  await feedbackService.submitFeedback({
    userId,
    message: data.message,
    rating: data.rating,
    page: data.page || req.headers.referer,
  });

  return successResponse(res, { message: 'Feedback submitted successfully' });
}));

export default router;
