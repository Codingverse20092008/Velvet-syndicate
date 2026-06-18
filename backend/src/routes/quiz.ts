import { Router, Request, Response } from 'express';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { db } from '../lib/db';
import { quizzes } from '../lib/schema';
import { sql } from 'drizzle-orm';
import { quizScheduler } from '../scripts/quiz-scheduler';
import { logger } from '../lib/logger';

const router = Router();

// GET /api/quiz — Serve up to 5 random quizzes from today's generated pool
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const requestedLimit = parseInt(req.query.limit as string) || 5;
  const limit = Math.min(Math.max(requestedLimit, 1), 5);

  // Fetch random quizzes from today's batch
  const results = await db
    .select()
    .from(quizzes)
    .where(sql`generated_date = ${today}`)
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  // If no quizzes generated today yet, fall back to most recently generated
  const quizPool = results.length > 0
    ? results
    : await db
        .select()
        .from(quizzes)
        .orderBy(sql`RANDOM()`)
        .limit(limit);

  const formatted = quizPool.map((q) => ({
    id: q.id,
    title: q.title,
    prompt: q.prompt,
    options: JSON.parse(q.options) as string[],
    answerIndex: q.answerIndex,
    points: q.points,
  }));

  return successResponse(res, {
    quizzes: formatted,
    total: formatted.length,
    generatedDate: today,
    usingFallback: results.length === 0 && quizPool.length > 0,
  });
}));

// GET /api/quiz/status — Scheduler status check
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(quizzes)
    .where(sql`generated_date = ${today}`);

  const todayCount = countResult[0]?.count ?? 0;

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(quizzes);

  const totalCount = totalResult[0]?.count ?? 0;

  return successResponse(res, {
    scheduler: quizScheduler.getStatus(),
    todayQuizCount: todayCount,
    totalQuizCount: totalCount,
    date: today,
  });
}));

// POST /api/quiz/trigger — Manually trigger quiz generation (admin use only)
router.post('/trigger', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Manual quiz generation trigger requested');
  // Run in background — don't await
  quizScheduler.triggerNow().catch((err) =>
    logger.error({ err }, 'Manual quiz trigger failed')
  );
  return successResponse(res, { message: 'Quiz generation started in background — check /api/quiz/status for progress' });
}));

export default router;
