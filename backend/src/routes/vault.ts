import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { asyncHandler } from '../lib/api-handler-express';
import { successResponse } from '../lib/api-response-express';
import { getUserFromRequest } from '../lib/auth-express';
import { dbClient } from '../lib/db';
import {
  getUserVault,
  saveUserVault,
  getQuizAttempt,
  recordQuizAttempt,
  getDailyActivity,
  upsertDailyActivity,
  getLeaderboard,
  getUserBadges,
  awardBadge,
  recordCrateOpen,
  getCrateHistory,
  getPendingRewards,
  addPendingReward,
  claimPendingReward,
  getOrderReward,
  recordOrderReward,
  checkHiddenRewardUnlocked,
  unlockHiddenReward,
} from '../services/vault-persistence.service';
import {
  checkDailyReset,
  processMcqAnswer,
  processFillBlanksAnswer,
  processDailyQuiz,
  processDailyLogin,
  processQuizCompletion,
  processReferral,
  processCrateOpen,
  processLevelRewardClaim,
  processPurchaseReward,
  processProductDiscovery,
  getLevelForXp,
  getXpForLevel,
  LEVELS,
  getTodayDate,
} from '../services/vault.service';

const router = Router();

const mcqSubmitSchema = z.object({
  quizId: z.string(),
  answer: z.string(),
  correctAnswer: z.string(),
});

const fillBlanksSchema = z.object({
  quizId: z.string(),
  answer: z.string(),
  acceptedAnswers: z.array(z.string()),
});

const quizCompleteSchema = z.object({
  quizSetId: z.string(),
});

const crateOpenSchema = z.object({
  crateType: z.enum(['basic', 'premium']),
});

const claimLevelSchema = z.object({
  level: z.number().int().min(1).max(100),
});

const claimRewardSchema = z.object({
  rewardId: z.string(),
});

const orderRewardSchema = z.object({
  orderId: z.string(),
  orderAmount: z.number().positive(),
});

const productDiscoverySchema = z.object({
  challengeType: z.enum(['product_explorer', 'wishlist_builder', 'new_arrival_hunter', 'collection_explorer']),
  requirementMet: z.boolean(),
});

const streakTokenSchema = z.object({
  action: z.enum(['use', 'add']),
  amount: z.number().int().min(1).max(3).optional().default(1),
});

async function processLevelUps(userId: string, pendingLevelRewards: number[]) {
  for (const level of pendingLevelRewards) {
    const lvlConfig = LEVELS[level];
    if (lvlConfig && lvlConfig.rewardType !== 'none') {
      await addPendingReward(userId, level, lvlConfig.rewardType, lvlConfig.rewardLabel, lvlConfig.rewardValue);
    }
  }
}

// GET /api/vault/state - Get current vault state
router.get('/state', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const state = await getUserVault(user.id);
  const today = getTodayDate();
  const dailyActivity = await getDailyActivity(user.id, today);
  const pendingRewards = await getPendingRewards(user.id);
  const badges = await getUserBadges(user.id);

  return successResponse(res, {
    state: {
      ...state,
      dailyResetDate: today,
    },
    dailyActivity: dailyActivity || {
      date: today,
      xpEarned: state.dailyXpEarned,
      coinsEarned: state.dailyCoinsEarned,
      loginClaimed: state.lastLoginClaim === today,
      dailyQuizCompleted: false,
    },
    pendingRewards,
    badges,
    levelConfig: {
      currentLevel: getLevelForXp(state.xp),
      currentXp: state.xp,
      nextLevelXp: getXpForLevel(getLevelForXp(state.xp) + 1),
      progress: state.xp - getXpForLevel(getLevelForXp(state.xp)),
      nextProgress: getXpForLevel(getLevelForXp(state.xp) + 1) - getXpForLevel(getLevelForXp(state.xp)),
    },
    limits: {
      dailyXpMax: 200,
      dailyXpRemaining: Math.max(0, 200 - state.dailyXpEarned),
      dailyCoinsMax: 60,
      dailyCoinsRemaining: Math.max(0, 60 - state.dailyCoinsEarned),
    },
  });
}));

// POST /api/vault/mcq - Submit MCQ answer
router.post('/mcq', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { quizId, answer, correctAnswer } = mcqSubmitSchema.parse(req.body);

  const isCorrect = answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  const previousAttempt = await getQuizAttempt(user.id, 'mcq', quizId);

  const state = await getUserVault(user.id);
  const result = processMcqAnswer(state, isCorrect, previousAttempt === null && isCorrect);

  await saveUserVault(user.id, result.state);
  await recordQuizAttempt(user.id, 'mcq', quizId, isCorrect, result.xpAwarded, result.xpAwarded > 0);

  if (result.hiddenReward) {
    const alreadyUnlocked = await checkHiddenRewardUnlocked(user.id, result.hiddenReward.condition.toString());
    if (!alreadyUnlocked) {
      await unlockHiddenReward(user.id, result.hiddenReward.condition.toString(), result.hiddenReward.rewardLabel);
    }
  }

  await processLevelUps(user.id, result.pendingLevelRewards);

  return successResponse(res, {
    correct: isCorrect,
    ...result,
    hiddenReward: result.hiddenReward || null,
  });
}));

// POST /api/vault/fill-blanks - Submit Fill-in-the-blank answer
router.post('/fill-blanks', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { quizId, answer, acceptedAnswers } = fillBlanksSchema.parse(req.body);

  const isCorrect = acceptedAnswers.some(a => a.trim().toLowerCase() === answer.trim().toLowerCase());
  const previousAttempt = await getQuizAttempt(user.id, 'fill_blanks', quizId);

  const state = await getUserVault(user.id);
  const result = processFillBlanksAnswer(state, isCorrect, previousAttempt === null && isCorrect);

  await saveUserVault(user.id, result.state);
  await recordQuizAttempt(user.id, 'fill_blanks', quizId, isCorrect, result.xpAwarded, result.xpAwarded > 0);

  if (result.hiddenReward) {
    const alreadyUnlocked = await checkHiddenRewardUnlocked(user.id, result.hiddenReward.condition.toString());
    if (!alreadyUnlocked) {
      await unlockHiddenReward(user.id, result.hiddenReward.condition.toString(), result.hiddenReward.rewardLabel);
    }
  }

  await processLevelUps(user.id, result.pendingLevelRewards);

  return successResponse(res, {
    correct: isCorrect,
    ...result,
    hiddenReward: result.hiddenReward || null,
  });
}));

// POST /api/vault/daily-quiz - Complete daily quiz
router.post('/daily-quiz', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const today = getTodayDate();
  const dailyActivity = await getDailyActivity(user.id, today);
  const alreadyCompleted = dailyActivity?.dailyQuizCompleted === 1;

  const state = await getUserVault(user.id);
  const result = processDailyQuiz(state, alreadyCompleted || false);

  if (result.success) {
    await saveUserVault(user.id, result.state);
    await upsertDailyActivity(user.id, today, { dailyQuizCompleted: true, quizzesCompleted: ((dailyActivity as any)?.quizzesCompleted || 0) + 1 });
    await processLevelUps(user.id, result.pendingLevelRewards);
  }

  return successResponse(res, result);
}));

// POST /api/vault/daily-login - Claim daily login reward
router.post('/daily-login', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const state = await getUserVault(user.id);
  const result = processDailyLogin(state);

  if (result.success) {
    await saveUserVault(user.id, result.state);
    await processLevelUps(user.id, result.pendingLevelRewards);

    if (result.streakMilestone?.reward.badge) {
      await awardBadge(user.id, result.streakMilestone.reward.badge);
    }
  }

  return successResponse(res, result);
}));

// POST /api/vault/quiz-completion - Complete a quiz set
router.post('/quiz-completion', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { quizSetId } = quizCompleteSchema.parse(req.body);
  const today = getTodayDate();
  const dailyActivity = await getDailyActivity(user.id, today);
  const alreadyClaimed = (dailyActivity as any)?.quizClaimed === 1;

  const state = await getUserVault(user.id);
  const result = processQuizCompletion(state, alreadyClaimed || false);

  if (result.success) {
    await saveUserVault(user.id, result.state);
    await upsertDailyActivity(user.id, today, { quizClaimed: true });
  }

  return successResponse(res, result);
}));

// POST /api/vault/referral
router.post('/referral', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { referredUserId } = req.body;

  const isSelfReferral = referredUserId === user.id;
  const state = await getUserVault(user.id);
  const result = processReferral(state, true, isSelfReferral);

  if (result.success) {
    await saveUserVault(user.id, result.state);
  }

  return successResponse(res, result);
}));

// POST /api/vault/crate/open - Open a crate
router.post('/crate/open', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { crateType } = crateOpenSchema.parse(req.body);

  const state = await getUserVault(user.id);
  const result = processCrateOpen(state, crateType);

  if (result.success && result.reward) {
    await saveUserVault(user.id, result.state);
    await recordCrateOpen(user.id, crateType, result.reward.label, result.rarity);

    if (result.reward.type === 'badge') {
      await awardBadge(user.id, result.reward.value);
    }
  }

  return successResponse(res, result);
}));

// GET /api/vault/crate/history - Crate opening history
router.get('/crate/history', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const history = await getCrateHistory(user.id);
  return successResponse(res, { history });
}));

// GET /api/vault/level/rewards - Get pending level rewards
router.get('/level/rewards', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const pendingRewards = await getPendingRewards(user.id);
  return successResponse(res, { pendingRewards });
}));

// POST /api/vault/level/claim - Claim a level reward
router.post('/level/claim', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { level } = claimLevelSchema.parse(req.body);

  const state = await getUserVault(user.id);
  const pendingRewards = await getPendingRewards(user.id);
  const alreadyClaimed = !pendingRewards.some((r: any) => r.level === level);

  const result = processLevelRewardClaim(state, level, alreadyClaimed);

  if (result.success) {
    await saveUserVault(user.id, result.state);

    if (result.reward?.type === 'badge' && result.reward.id) {
      await awardBadge(user.id, result.reward.id);
    }

    const pendingReward = pendingRewards.find((r: any) => r.level === level);
    if (pendingReward) {
      await claimPendingReward((pendingReward as any).id, user.id);
    }
  }

  return successResponse(res, result);
}));

// POST /api/vault/order/reward - Process purchase reward
router.post('/order/reward', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { orderId, orderAmount } = orderRewardSchema.parse(req.body);

  const existingReward = await getOrderReward(orderId);
  const alreadyProcessed = existingReward !== null;

  const state = await getUserVault(user.id);
  const result = processPurchaseReward(state, orderAmount, alreadyProcessed);

  if (!alreadyProcessed) {
    await saveUserVault(user.id, result.state);
    await recordOrderReward(user.id, orderId, orderAmount, result.xpAwarded, result.coinsAwarded, result.crateAwarded);
  }

  return successResponse(res, result);
}));

// POST /api/vault/product-discovery - Complete product discovery challenge
router.post('/product-discovery', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { challengeType, requirementMet } = productDiscoverySchema.parse(req.body);

  const state = await getUserVault(user.id);
  const result = processProductDiscovery(state, challengeType, requirementMet, false);

  if (result.success) {
    await saveUserVault(user.id, result.state);
  }

  return successResponse(res, result);
}));

// GET /api/vault/leaderboard - Get leaderboard
router.get('/leaderboard', asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'weekly';
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const leaderboard = await getLeaderboard(period as 'weekly' | 'monthly', limit);
  return successResponse(res, { leaderboard, period });
}));

// GET /api/vault/badges - Get user badges
router.get('/badges', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const badges = await getUserBadges(user.id);
  return successResponse(res, { badges });
}));

// POST /api/vault/streak/token - Use or add streak token
router.post('/streak/token', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const { action, amount } = streakTokenSchema.parse(req.body);

  const state = await getUserVault(user.id);

  if (action === 'add') {
    const newTotal = Math.min((state.bonusStreakTokens || 0) + amount, 3);
    state.bonusStreakTokens = newTotal;
    await saveUserVault(user.id, state);
    return successResponse(res, { bonusStreakTokens: newTotal, message: `${amount} streak token(s) added` });
  }

  if (action === 'use') {
    if ((state.bonusStreakTokens || 0) < amount) {
      return successResponse(res, { success: false, error: 'Not enough streak tokens' });
    }
    state.bonusStreakTokens = (state.bonusStreakTokens || 0) - amount;
    await saveUserVault(user.id, state);
    return successResponse(res, { bonusStreakTokens: state.bonusStreakTokens, message: `${amount} streak token(s) used` });
  }

  return successResponse(res, { bonusStreakTokens: state.bonusStreakTokens || 0 });
}));

// GET /api/vault/hidden-rewards - Get unlocked hidden rewards
router.get('/hidden-rewards', asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  const result = await dbClient.execute(
    `SELECT * FROM vault_user_hidden_rewards WHERE user_id = '${user.id.replace(/'/g, "''")}' ORDER BY unlocked_at DESC`
  );
  return successResponse(res, { hiddenRewards: result.rows });
}));

export default router;
