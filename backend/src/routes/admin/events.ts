import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/api-handler-express';
import { successResponse } from '../../lib/api-response-express';
import { getUserFromRequest } from '../../lib/auth-express';
import { dbClient } from '../../lib/db';
import crypto from 'crypto';

const router = Router();

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

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

const getToday = (): string => new Date().toISOString().slice(0, 10);

// In-memory event config store
let eventConfigCache: any = null;
let eventChallengesCache: Record<string, any[]> = {};
let eventBadgesCache: Record<string, any[]> = {};
let eventLeaderboardFrozen: Record<string, boolean> = {};
let eventLeaderboardArchived: Record<string, boolean> = {};
let jotoGoromTiersCache: any = null;

const VALID_EVENT_STATUSES = ['draft', 'active', 'paused', 'ended'] as const;

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['paused', 'ended'],
  paused: ['active', 'ended'],
  ended: [],
};

function getDefaultEventConfig(): any {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() + 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 30);

  return {
    status: 'draft',
    name: 'Joto Gorom',
    description: 'A fiery seasonal event where the heat rises with every purchase and quiz!',
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    eventType: 'joto-gorom',
    rules: {
      earnHeatPoints: true,
      meltdownMechanic: true,
      heatwaveShopperChallenge: true,
    },
    rewards: {
      participation: { xp: 50, coins: 25 },
      topRankBonus: { xp: 500, coins: 200, crate: 'premium' },
    },
  };
}

function getDefaultJotoGoromTiers(): any[] {
  return [
    { minTemp: 0, maxTemp: 20, label: 'Cool', xpReward: 5, coinReward: 2, heatPointReward: 1, mysteryCrateChance: 0.02, premiumCrateChance: 0 },
    { minTemp: 21, maxTemp: 25, label: 'Warm', xpReward: 10, coinReward: 5, heatPointReward: 2, mysteryCrateChance: 0.05, premiumCrateChance: 0 },
    { minTemp: 26, maxTemp: 30, label: 'Hot', xpReward: 15, coinReward: 8, heatPointReward: 3, mysteryCrateChance: 0.08, premiumCrateChance: 0.01 },
    { minTemp: 31, maxTemp: 35, label: 'Very Hot', xpReward: 20, coinReward: 10, heatPointReward: 5, mysteryCrateChance: 0.10, premiumCrateChance: 0.02 },
    { minTemp: 36, maxTemp: 50, label: 'Extreme', xpReward: 30, coinReward: 15, heatPointReward: 8, mysteryCrateChance: 0.15, premiumCrateChance: 0.05 },
  ];
}

async function loadEventConfigFromDb(): Promise<any> {
  try {
    const result = await dbClient.execute(
      `SELECT config_value FROM admin_config WHERE config_key = 'event_config' LIMIT 1`
    );
    if (result.rows.length > 0) {
      return JSON.parse((result.rows[0] as any).config_value);
    }
  } catch {
    // Table may not exist
  }
  return null;
}

async function saveEventConfigToDb(config: any): Promise<void> {
  const json = JSON.stringify(config);
  try {
    await dbClient.execute(`
      INSERT INTO admin_config (id, config_key, config_value, updated_at)
      VALUES (${esc(crypto.randomUUID())}, 'event_config', ${esc(json)}, ${esc(getToday())})
      ON CONFLICT(config_key) DO UPDATE SET config_value = ${esc(json)}, updated_at = ${esc(getToday())}
    `);
  } catch {
    // Table may not exist
  }
}

async function loadTiersFromDb(): Promise<any> {
  try {
    const result = await dbClient.execute(
      `SELECT config_value FROM admin_config WHERE config_key = 'joto_gorom_tiers' LIMIT 1`
    );
    if (result.rows.length > 0) {
      return JSON.parse((result.rows[0] as any).config_value);
    }
  } catch {
    // Table may not exist
  }
  return null;
}

async function saveTiersToDb(tiers: any): Promise<void> {
  const json = JSON.stringify(tiers);
  try {
    await dbClient.execute(`
      INSERT INTO admin_config (id, config_key, config_value, updated_at)
      VALUES (${esc(crypto.randomUUID())}, 'joto_gorom_tiers', ${esc(json)}, ${esc(getToday())})
      ON CONFLICT(config_key) DO UPDATE SET config_value = ${esc(json)}, updated_at = ${esc(getToday())}
    `);
  } catch {
    // Table may not exist
  }
}

// GET /overview
router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const config = eventConfigCache || (await loadEventConfigFromDb()) || getDefaultEventConfig();
    const activeEvent = config.status === 'active' ? (config.eventType || 'joto-gorom') : null;

    let totalParticipants = 0;
    let totalEventXp = 0;
    let totalHeatPoints = 0;
    let totalCratesDistributed = 0;
    let eventRevenue = 0;
    let conversionRate = 0;

    if (activeEvent) {
      try {
        const participantsResult = await dbClient.execute('SELECT COUNT(DISTINCT user_id) AS count FROM vault_quiz_attempts');
        totalParticipants = Number((participantsResult.rows[0] as any).count) || 0;
      } catch {
        totalParticipants = 0;
      }

      try {
        const xpResult = await dbClient.execute('SELECT COALESCE(SUM(xp_awarded), 0) AS total FROM vault_quiz_attempts');
        totalEventXp = Number((xpResult.rows[0] as any).total) || 0;
      } catch {
        totalEventXp = 0;
      }

      try {
        const cratesResult = await dbClient.execute('SELECT COALESCE(COUNT(*), 0) AS count FROM vault_crate_open_log');
        totalCratesDistributed = Number((cratesResult.rows[0] as any).count) || 0;
      } catch {
        totalCratesDistributed = 0;
      }
    }

    return successResponse(res, {
      activeEvent,
      totalParticipants,
      totalEventXp,
      totalHeatPoints,
      totalCratesDistributed,
      eventRevenue,
      conversionRate,
    });
  } catch (error) {
    console.error('Failed to fetch event overview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch event overview' });
  }
}));

// GET /config
router.get('/config', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    if (!eventConfigCache) {
      const dbConfig = await loadEventConfigFromDb();
      eventConfigCache = dbConfig || getDefaultEventConfig();
    }
    return successResponse(res, { config: eventConfigCache });
  } catch (error) {
    console.error('Failed to fetch event config:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch event config' });
  }
}));

const eventConfigSchema = z.object({
  status: z.enum(VALID_EVENT_STATUSES).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  eventType: z.string().min(1).max(50).optional(),
  rules: z.record(z.string(), z.boolean()).optional(),
  rewards: z.record(z.string(), z.any()).optional(),
});

// POST /config
router.post('/config', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const data = eventConfigSchema.parse(req.body);
    const existing = eventConfigCache || (await loadEventConfigFromDb()) || getDefaultEventConfig();
    const merged = { ...existing, ...data };
    eventConfigCache = merged;
    await saveEventConfigToDb(merged);
    return successResponse(res, { message: 'Event config updated', config: merged });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid config', details: error.issues });
    }
    console.error('Failed to save event config:', error);
    res.status(500).json({ success: false, error: 'Failed to save event config' });
  }
}));

const statusUpdateSchema = z.object({
  status: z.enum(VALID_EVENT_STATUSES),
});

// PATCH /:eventId/status
router.patch('/:eventId/status', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const { eventId } = req.params;
    const { status } = statusUpdateSchema.parse(req.body);

    const config = eventConfigCache || (await loadEventConfigFromDb()) || getDefaultEventConfig();
    const currentStatus = config.status || 'draft';

    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition from '${currentStatus}' to '${status}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
      });
    }

    config.status = status;
    eventConfigCache = config;
    await saveEventConfigToDb(config);

    return successResponse(res, {
      message: `Event ${eventId} status changed to ${status}`,
      eventId,
      status,
      previousStatus: currentStatus,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid status', details: error.issues });
    }
    console.error('Failed to update event status:', error);
    res.status(500).json({ success: false, error: 'Failed to update event status' });
  }
}));

// GET /:eventId/analytics
router.get('/:eventId/analytics', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const { eventId } = req.params;

    let participants = 0;
    let dailyClaims = 0;
    let avgHeatStreak = 0;
    let cratesOpened = 0;
    let meltdownClaims = 0;
    let eventPurchases = 0;
    let heatwaveShopperCompletions = 0;
    let revenueGenerated = 0;

    try {
      const pResult = await dbClient.execute('SELECT COUNT(DISTINCT user_id) AS count FROM vault_quiz_attempts');
      participants = Number((pResult.rows[0] as any).count) || 0;
    } catch { /* ignore */ }

    try {
      const dcResult = await dbClient.execute('SELECT COUNT(*) AS count FROM vault_crate_open_log');
      dailyClaims = Number((dcResult.rows[0] as any).count) || 0;
    } catch { /* ignore */ }

    try {
      const sResult = await dbClient.execute('SELECT COALESCE(AVG(streak_days), 0) AS avg FROM vault_users');
      avgHeatStreak = Math.round(Number((sResult.rows[0] as any).avg) * 100) / 100;
    } catch { /* ignore */ }

    try {
      const coResult = await dbClient.execute('SELECT COALESCE(SUM(crates_opened), 0) AS count FROM vault_users');
      cratesOpened = Number((coResult.rows[0] as any).count) || 0;
    } catch { /* ignore */ }

    return successResponse(res, {
      participants,
      dailyClaims,
      avgHeatStreak,
      cratesOpened,
      meltdownClaims,
      eventPurchases,
      heatwaveShopperCompletions,
      revenueGenerated,
    });
  } catch (error) {
    console.error('Failed to fetch event analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch event analytics' });
  }
}));

// GET /joto-gorom/tiers
router.get('/joto-gorom/tiers', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    if (!jotoGoromTiersCache) {
      const dbTiers = await loadTiersFromDb();
      jotoGoromTiersCache = dbTiers || getDefaultJotoGoromTiers();
    }
    return successResponse(res, { tiers: jotoGoromTiersCache });
  } catch (error) {
    console.error('Failed to fetch tiers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tiers' });
  }
}));

const tierSchema = z.object({
  minTemp: z.number(),
  maxTemp: z.number(),
  label: z.string().min(1),
  xpReward: z.number().int().min(0),
  coinReward: z.number().int().min(0),
  heatPointReward: z.number().int().min(0),
  mysteryCrateChance: z.number().min(0).max(1),
  premiumCrateChance: z.number().min(0).max(1),
});

const tiersArraySchema = z.array(tierSchema);

// POST /joto-gorom/tiers
router.post('/joto-gorom/tiers', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const tiers = tiersArraySchema.parse(req.body);

    // Validate no overlapping temperature ranges
    const sorted = [...tiers].sort((a, b) => a.minTemp - b.minTemp);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].minTemp <= sorted[i - 1].maxTemp) {
        return res.status(400).json({
          success: false,
          error: `Overlapping temperature ranges: ${sorted[i - 1].label} (${sorted[i - 1].minTemp}-${sorted[i - 1].maxTemp}) and ${sorted[i].label} (${sorted[i].minTemp}-${sorted[i].maxTemp})`,
        });
      }
    }

    jotoGoromTiersCache = tiers;
    await saveTiersToDb(tiers);
    return successResponse(res, { message: 'Tiers updated', tiers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid tier data', details: error.issues });
    }
    console.error('Failed to save tiers:', error);
    res.status(500).json({ success: false, error: 'Failed to save tiers' });
  }
}));

// GET /:eventId/challenges
router.get('/:eventId/challenges', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const { eventId } = req.params;
    const challenges = eventChallengesCache[eventId] || [];
    return successResponse(res, { challenges });
  } catch (error) {
    console.error('Failed to fetch challenges:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch challenges' });
  }
}));

const challengeSchema = z.object({
  id: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  xp: z.number().int().min(0),
  heatPoints: z.number().int().min(0),
  type: z.string().min(1),
  requirementValue: z.number().int().min(0),
  disabled: z.boolean().optional().default(false),
});

// POST /:eventId/challenges
router.post('/:eventId/challenges', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const { eventId } = req.params;
    const data = challengeSchema.parse(req.body);

    if (!eventChallengesCache[eventId]) {
      eventChallengesCache[eventId] = [];
    }

    const existingIdx = eventChallengesCache[eventId].findIndex((c: any) => c.id === data.id);
    if (existingIdx >= 0) {
      eventChallengesCache[eventId][existingIdx] = data;
    } else {
      eventChallengesCache[eventId].push(data);
    }

    return successResponse(res, { message: 'Challenge saved', challenge: data }, existingIdx >= 0 ? 200 : 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid challenge data', details: error.issues });
    }
    console.error('Failed to save challenge:', error);
    res.status(500).json({ success: false, error: 'Failed to save challenge' });
  }
}));

const updateChallengeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  xp: z.number().int().min(0).optional(),
  heatPoints: z.number().int().min(0).optional(),
  type: z.string().min(1).optional(),
  requirementValue: z.number().int().min(0).optional(),
  disabled: z.boolean().optional(),
});

// PATCH /:eventId/challenges/:challengeId
router.patch('/:eventId/challenges/:challengeId', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const { eventId, challengeId } = req.params;
    const data = updateChallengeSchema.parse(req.body);

    const challenges = eventChallengesCache[eventId] || [];
    const idx = challenges.findIndex((c: any) => c.id === challengeId);

    if (idx < 0) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    challenges[idx] = { ...challenges[idx], ...data };
    eventChallengesCache[eventId] = challenges;

    return successResponse(res, { message: 'Challenge updated', challenge: challenges[idx] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid challenge data', details: error.issues });
    }
    console.error('Failed to update challenge:', error);
    res.status(500).json({ success: false, error: 'Failed to update challenge' });
  }
}));

// GET /:eventId/badges
router.get('/:eventId/badges', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const { eventId } = req.params;
    const badges = eventBadgesCache[eventId] || [];

    // Also fetch from vault_badges table
    try {
      const result = await dbClient.execute('SELECT * FROM vault_badges ORDER BY badge_id ASC');
      return successResponse(res, { badges: result.rows, eventBadges: badges });
    } catch {
      return successResponse(res, { badges, eventBadges: badges });
    }
  } catch (error) {
    console.error('Failed to fetch event badges:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch event badges' });
  }
}));

const updateEventBadgeSchema = z.object({
  requirement: z.number().int().min(0).optional(),
  description: z.string().optional(),
  disabled: z.boolean().optional(),
});

// PATCH /:eventId/badges/:badgeId
router.patch('/:eventId/badges/:badgeId', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const { eventId, badgeId } = req.params;
    const data = updateEventBadgeSchema.parse(req.body);

    if (!eventBadgesCache[eventId]) {
      eventBadgesCache[eventId] = [];
    }

    const existingIdx = eventBadgesCache[eventId].findIndex((b: any) => b.badge_id === badgeId);
    if (existingIdx >= 0) {
      eventBadgesCache[eventId][existingIdx] = { ...eventBadgesCache[eventId][existingIdx], ...data };
    } else {
      eventBadgesCache[eventId].push({ badge_id: badgeId, ...data, requirement: data.requirement || 0 });
    }

    return successResponse(res, { message: 'Badge requirement updated' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid badge data', details: error.issues });
    }
    console.error('Failed to update event badge:', error);
    res.status(500).json({ success: false, error: 'Failed to update event badge' });
  }
}));

// GET /:eventId/leaderboard
router.get('/:eventId/leaderboard', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const { eventId } = req.params;

    const result = await dbClient.execute(`
      SELECT vu.user_id, u.name, vu.leaderboard_score AS score, vu.level, vu.xp, vu.streak_days
      FROM vault_users vu
      JOIN users u ON u.id = vu.user_id
      ORDER BY vu.leaderboard_score DESC
      LIMIT 100
    `);

    const leaderboard = result.rows.map((row: any, index: number) => ({
      rank: index + 1,
      userId: row.user_id,
      name: row.name,
      score: row.score,
      level: row.level,
      xp: row.xp,
      streakDays: row.streak_days,
    }));

    return successResponse(res, {
      eventId,
      leaderboard,
      isFrozen: !!eventLeaderboardFrozen[eventId],
      isArchived: !!eventLeaderboardArchived[eventId],
    });
  } catch (error) {
    console.error('Failed to fetch event leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch event leaderboard' });
  }
}));

// POST /:eventId/leaderboard/freeze
router.post('/:eventId/leaderboard/freeze', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const { eventId } = req.params;
    eventLeaderboardFrozen[eventId] = true;
    return successResponse(res, { message: `Leaderboard frozen for event ${eventId}`, frozen: true });
  } catch (error) {
    console.error('Failed to freeze leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to freeze leaderboard' });
  }
}));

// POST /:eventId/leaderboard/distribute
router.post('/:eventId/leaderboard/distribute', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const { eventId } = req.params;
    const { action } = req.body || {};

    // Top 10 get rewards
    const result = await dbClient.execute(`
      SELECT vu.user_id, vu.leaderboard_score
      FROM vault_users vu
      ORDER BY vu.leaderboard_score DESC
      LIMIT 10
    `);

    const rewardsDistributed = result.rows.map((row: any, index: number) => {
      const rank = index + 1;
      let rewardType = 'coins';
      let rewardValue = 0;
      let rewardLabel = '';

      if (rank === 1) { rewardValue = 500; rewardLabel = '1st Place - 500 Vault Coins'; }
      else if (rank === 2) { rewardValue = 300; rewardLabel = '2nd Place - 300 Vault Coins'; }
      else if (rank === 3) { rewardValue = 200; rewardLabel = '3rd Place - 200 Vault Coins'; }
      else if (rank <= 5) { rewardValue = 100; rewardLabel = `Top 5 - 100 Vault Coins`; }
      else { rewardValue = 50; rewardLabel = `Top 10 - 50 Vault Coins`; }

      return { userId: row.user_id, rank, rewardType, rewardValue, rewardLabel };
    });

    // Insert rewards into pending_rewards
    const inserts = rewardsDistributed.map(r => {
      const id = crypto.randomUUID();
      return dbClient.execute(`
        INSERT INTO vault_pending_rewards (id, user_id, level, reward_type, reward_value, reward_label)
        VALUES (${esc(id)}, ${esc(r.userId)}, 0, ${esc(r.rewardType)}, ${esc(r.rewardValue)}, ${esc(r.rewardLabel)})
      `);
    });

    await Promise.all(inserts);

    eventLeaderboardArchived[eventId] = true;
    eventLeaderboardFrozen[eventId] = false;

    return successResponse(res, {
      message: `Rewards distributed for event ${eventId}`,
      action: action || 'distribute',
      rewardsDistributed: rewardsDistributed.length,
      archived: true,
    });
  } catch (error) {
    console.error('Failed to distribute rewards:', error);
    res.status(500).json({ success: false, error: 'Failed to distribute rewards' });
  }
}));

// GET /:eventId/leaderboard/export
router.get('/:eventId/leaderboard/export', asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = await requireAdmin(req, res);
  if (!isAdmin) return;

  try {
    const { eventId } = req.params;

    const result = await dbClient.execute(`
      SELECT vu.user_id, u.name, u.email, vu.leaderboard_score, vu.level, vu.xp, vu.streak_days, vu.vault_coins
      FROM vault_users vu
      JOIN users u ON u.id = vu.user_id
      ORDER BY vu.leaderboard_score DESC
    `);

    const header = 'Rank,User ID,Name,Email,Score,Level,XP,Streak Days,Vault Coins';
    const rows = result.rows.map((row: any, index: number) =>
      `${index + 1},${row.user_id},${row.name},${row.email},${row.leaderboard_score},${row.level},${row.xp},${row.streak_days},${row.vault_coins}`
    );
    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}-leaderboard-${getToday()}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Failed to export leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to export leaderboard' });
  }
}));

export default router;
