import { db } from '../lib/db';
import { feedback } from '../lib/schema';
import { logger } from '../lib/logger';
import crypto from 'node:crypto';

export async function submitFeedback(data: {
  userId?: string;
  message: string;
  rating?: string;
  page?: string;
}) {
  try {
    await db.insert(feedback).values({
      id: crypto.randomUUID(),
      userId: data.userId || null,
      message: data.message,
      rating: data.rating || null,
      page: data.page || null,
    });
    return { success: true };
  } catch (error) {
    logger.error({ error, data }, 'Failed to submit feedback');
    throw error;
  }
}

export async function getAllFeedback(limit = 50) {
  try {
    return await db.query.feedback.findMany({
      orderBy: (feedback, { desc }) => [desc(feedback.createdAt)],
      limit,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch feedback');
    throw error;
  }
}

export async function getFeedbackSummary() {
  try {
    const allFeedback = await db.query.feedback.findMany();
    
    const total = allFeedback.length;
    const withRating = allFeedback.filter(f => f.rating);
    const avgRating = withRating.length > 0 
      ? withRating.reduce((sum, f) => sum + parseInt(f.rating || '0'), 0) / withRating.length 
      : 0;
    
    const ratingDistribution = {
      5: allFeedback.filter(f => f.rating === '5').length,
      4: allFeedback.filter(f => f.rating === '4').length,
      3: allFeedback.filter(f => f.rating === '3').length,
      2: allFeedback.filter(f => f.rating === '2').length,
      1: allFeedback.filter(f => f.rating === '1').length,
    };

    const recentFeedback = allFeedback.slice(0, 10);

    return {
      total,
      avgRating: Math.round(avgRating * 10) / 10,
      ratingDistribution,
      recentFeedback,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to fetch feedback summary');
    throw error;
  }
}
