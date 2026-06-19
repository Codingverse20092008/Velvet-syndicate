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

const getAdminUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = await getUserFromRequest(req);
    const role = (user as any)?.role;
    if (!user || (role !== 'admin' && role !== 'super_admin')) {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return null;
    }
    return user;
  } catch {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return null;
  }
};

async function logAudit(admin: any, action: string, details: string, oldValue?: any, newValue?: any): Promise<void> {
  try {
    await dbClient.execute(`
      INSERT INTO admin_audit_log (id, admin_id, admin_name, admin_email, action, details, old_value, new_value, created_at)
      VALUES (${esc(crypto.randomUUID())}, ${esc(admin?.id || 'unknown')}, ${esc(admin?.name || 'unknown')}, ${esc(admin?.email || 'unknown')}, ${esc(action)}, ${esc(details)}, ${esc(oldValue !== undefined ? JSON.stringify(oldValue) : null)}, ${esc(newValue !== undefined ? JSON.stringify(newValue) : null)}, ${esc(new Date().toISOString())})
    `);
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

const getToday = (): string => new Date().toISOString().slice(0, 10);

// In-memory config store (backed by vault_config table when available)
let rewardConfigCache: any = null;
let crateConfigCache: any = null;

function getDefaultRewardConfig() {
  return {
    mcqXp: 10,
    fillBlankXp: 15,
    dailyLoginXp: 5,
    dailyLoginCoins: 10,
    streakRewards: [
      { day: 3, xp: 25, coins: 10 },
      { day: 7, xp: 50, coins: 25 },
      { day: 14, xp: 0, coins: 0 },
      { day: 30, xp: 0, coins: 0 },
      { day: 60, xp: 0, coins: 0 },
      { day: 100, xp: 0, coins: 0 },
    ],
    purchaseRewards: {
      xpMultiplier: 0.1,
      coinsPerAmount: 0.025,
    },
    referralRewards: {
      xp: 20,
      coins: 100,
    },
  };
}

function getDefaultCrateConfig() {
  return {
    basic: {
      common: { min: 0, max: 0.65 },
      uncommon: { min: 0.65, max: 0.90 },
      rare: { min: 0.90, max: 0.99 },
      legendary: { min: 0.99, max: 1.0 },
      rewards: {
        common: [
          { type: 'xp', value: 25, label: '25 XP', probability: 0.30 },
          { type: 'xp', value: 50, label: '50 XP', probability: 0.25 },
          { type: 'coins', value: 25, label: '25 Coins', probability: 0.20 },
        ],
        uncommon: [
          { type: 'coupon', value: '5_PERCENT', label: '5% Coupon', probability: 0.15 },
          { type: 'shipping', value: true, label: 'Free Shipping', probability: 0.08 },
        ],
        rare: [
          { type: 'badge_fragment', value: 'rare_badge', label: 'Rare Badge Fragment', probability: 0.02 },
        ],
        legendary: [],
      },
    },
    premium: {
      common: { min: 0, max: 0.50 },
      uncommon: { min: 0.50, max: 0.80 },
      rare: { min: 0.80, max: 0.95 },
      legendary: { min: 0.95, max: 1.0 },
      rewards: {
        common: [
          { type: 'xp', value: 100, label: '100 XP', probability: 0.25 },
          { type: 'coins', value: 100, label: '100 Coins', probability: 0.25 },
        ],
        uncommon: [
          { type: 'coupon', value: '10_PERCENT', label: '10% Coupon', probability: 0.20 },
        ],
        rare: [
          { type: 'access', value: 'early_access', label: 'Early Access Pass', probability: 0.15 },
          { type: 'badge', value: 'exclusive_badge', label: 'Exclusive Badge', probability: 0.10 },
        ],
        legendary: [
          { type: 'streak_token', value: 1, label: 'Bonus Streak Token', probability: 0.05 },
        ],
      },
    },
  };
}

async function loadRewardConfigFromDb(): Promise<any> {
  try {
    const result = await dbClient.execute(
      `SELECT config_value FROM vault_config WHERE config_key = 'reward_config' LIMIT 1`
    );
    if (result.rows.length > 0) {
      return JSON.parse((result.rows[0] as any).config_value);
    }
  } catch {
    // Table may not exist yet
  }
  return null;
}

async function saveRewardConfigToDb(config: any): Promise<void> {
  const json = JSON.stringify(config);
  try {
    await dbClient.execute(`
      INSERT INTO vault_config (id, config_key, config_value, updated_at)
      VALUES (${esc(crypto.randomUUID())}, 'reward_config', ${esc(json)}, ${esc(getToday())})
      ON CONFLICT(config_key) DO UPDATE SET config_value = ${esc(json)}, updated_at = ${esc(getToday())}
    `);
  } catch {
    // Table may not exist - just cache in memory
  }
}

async function loadCrateConfigFromDb(): Promise<any> {
  try {
    const result = await dbClient.execute(
      `SELECT config_value FROM vault_config WHERE config_key = 'crate_config' LIMIT 1`
    );
    if (result.rows.length > 0) {
      return JSON.parse((result.rows[0] as any).config_value);
    }
  } catch {
    // Table may not exist yet
  }
  return null;
}

async function saveCrateConfigToDb(config: any): Promise<void> {
  const json = JSON.stringify(config);
  try {
    await dbClient.execute(`
      INSERT INTO vault_config (id, config_key, config_value, updated_at)
      VALUES (${esc(crypto.randomUUID())}, 'crate_config', ${esc(json)}, ${esc(getToday())})
      ON CONFLICT(config_key) DO UPDATE SET config_value = ${esc(json)}, updated_at = ${esc(getToday())}
    `);
  } catch {
    // Table may not exist - just cache in memory
  }
}

// GET /overview
router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    const today = getToday();

    const [totalResult, activeResult, xpCoinsResult, cratesResult, badgesResult, quizResult, streakResult] = await Promise.all([
      dbClient.execute('SELECT COUNT(*) AS count FROM vault_users'),
      dbClient.execute(`SELECT COUNT(*) AS count FROM vault_users WHERE last_activity_date = ${esc(today)}`),
      dbClient.execute('SELECT COALESCE(SUM(total_xp_earned), 0) AS xp, COALESCE(SUM(total_coins_earned), 0) AS coins FROM vault_users'),
      dbClient.execute('SELECT COALESCE(SUM(crates_opened), 0) AS count FROM vault_users'),
      dbClient.execute('SELECT COUNT(*) AS count FROM vault_user_badges'),
      dbClient.execute(`SELECT COUNT(*) AS count FROM vault_quiz_attempts WHERE date(answered_at) = ${esc(today)}`),
      dbClient.execute('SELECT COALESCE(AVG(streak_days), 0) AS avg_streak FROM vault_users'),
    ]);

    return successResponse(res, {
      totalUsers: Number((totalResult.rows[0] as any).count),
      activeToday: Number((activeResult.rows[0] as any).count),
      totalXpEarned: Number((xpCoinsResult.rows[0] as any).xp),
      totalCoinsEarned: Number((xpCoinsResult.rows[0] as any).coins),
      cratesOpened: Number((cratesResult.rows[0] as any).count),
      badgesUnlocked: Number((badgesResult.rows[0] as any).count),
      quizAttemptsToday: Number((quizResult.rows[0] as any).count),
      avgDailyStreak: Math.round(Number((streakResult.rows[0] as any).avg_streak) * 100) / 100,
    });
  } catch (error) {
    console.error('Failed to fetch vault overview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vault overview' });
  }
}));

// GET /reward-config
router.get('/reward-config', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    if (!rewardConfigCache) {
      const dbConfig = await loadRewardConfigFromDb();
      rewardConfigCache = dbConfig || getDefaultRewardConfig();
    }
    return successResponse(res, { config: rewardConfigCache });
  } catch (error) {
    console.error('Failed to fetch reward config:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reward config' });
  }
}));

// POST /reward-config
const rewardConfigSchema = z.object({
  mcqXp: z.number().int().min(0),
  fillBlankXp: z.number().int().min(0),
  dailyLoginXp: z.number().int().min(0),
  dailyLoginCoins: z.number().int().min(0),
  streakRewards: z.array(z.object({
    day: z.number().int().min(1),
    xp: z.number().int().min(0),
    coins: z.number().int().min(0),
  })),
  purchaseRewards: z.object({
    xpMultiplier: z.number().min(0),
    coinsPerAmount: z.number().min(0),
  }),
  referralRewards: z.object({
    xp: z.number().int().min(0),
    coins: z.number().int().min(0),
  }),
});

router.post('/reward-config', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    const parsed = rewardConfigSchema.parse(req.body);
    const previous = rewardConfigCache;
    rewardConfigCache = parsed;
    await saveRewardConfigToDb(parsed);
    await logAudit(admin, 'UPDATE_REWARD_CONFIG', 'Reward economy config updated', previous, parsed);
    return successResponse(res, { message: 'Reward config updated', config: parsed });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid config', details: error.issues });
    }
    console.error('Failed to save reward config:', error);
    res.status(500).json({ success: false, error: 'Failed to save reward config' });
  }
}));

// GET /crate-config
router.get('/crate-config', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    if (!crateConfigCache) {
      const dbConfig = await loadCrateConfigFromDb();
      crateConfigCache = dbConfig || getDefaultCrateConfig();
    }
    return successResponse(res, { config: crateConfigCache });
  } catch (error) {
    console.error('Failed to fetch crate config:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch crate config' });
  }
}));

// POST /crate-config
router.post('/crate-config', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    const body = req.body;

    // Validate probability totals = 1.0 for each crate type
    for (const crateType of ['basic', 'premium'] as const) {
      const pool = body[crateType];
      if (!pool) {
        return res.status(400).json({ success: false, error: `Missing ${crateType} crate config` });
      }
      const commonRange = pool.common.max - pool.common.min;
      const uncommonRange = pool.uncommon.max - pool.uncommon.min;
      const rareRange = pool.rare.max - pool.rare.min;
      const legendaryRange = pool.legendary.max - pool.legendary.min;
      const total = commonRange + uncommonRange + rareRange + legendaryRange;
      if (Math.abs(total - 1.0) > 0.001) {
        return res.status(400).json({
          success: false,
          error: `Rarity probability ranges for ${crateType} must sum to 1.0 (got ${total})`,
        });
      }
    }

    const previous = crateConfigCache;
    crateConfigCache = body;
    await saveCrateConfigToDb(body);
    await logAudit(admin, 'UPDATE_CRATE_CONFIG', 'Crate config updated', previous, body);
    return successResponse(res, { message: 'Crate config updated', config: body });
  } catch (error) {
    console.error('Failed to save crate config:', error);
    res.status(500).json({ success: false, error: 'Failed to save crate config' });
  }
}));

// GET /badges
router.get('/badges', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    const result = await dbClient.execute('SELECT * FROM vault_badges ORDER BY badge_id ASC');
    return successResponse(res, { badges: result.rows });
  } catch (error) {
    console.error('Failed to fetch badges:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch badges' });
  }
}));

const createBadgeSchema = z.object({
  badgeId: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  emoji: z.string().min(1).max(10),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
  category: z.string().min(1).max(50),
});

// POST /badges
router.post('/badges', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    const data = createBadgeSchema.parse(req.body);
    await dbClient.execute(`
      INSERT INTO vault_badges (badge_id, name, description, emoji, rarity, category)
      VALUES (${esc(data.badgeId)}, ${esc(data.name)}, ${esc(data.description)}, ${esc(data.emoji)}, ${esc(data.rarity)}, ${esc(data.category)})
    `);
    await logAudit(admin, 'CREATE_BADGE', `Badge ${data.badgeId} created`, null, data);
    return successResponse(res, { message: 'Badge created', badge: data }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid badge data', details: error.issues });
    }
    console.error('Failed to create badge:', error);
    res.status(500).json({ success: false, error: 'Failed to create badge' });
  }
}));

const updateBadgeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  emoji: z.string().min(1).max(10).optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional(),
  category: z.string().min(1).max(50).optional(),
});

// PATCH /badges/:badgeId
router.patch('/badges/:badgeId', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    const data = updateBadgeSchema.parse(req.body);
    const { badgeId } = req.params;

    const setClauses = Object.entries(data)
      .map(([key, val]) => {
        const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        return `${col} = ${esc(val)}`;
      })
      .join(', ');

    if (!setClauses) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const prevResult = await dbClient.execute(`SELECT * FROM vault_badges WHERE badge_id = ${esc(badgeId)} LIMIT 1`);
    const previous = prevResult.rows.length > 0 ? prevResult.rows[0] : null;

    await dbClient.execute(`UPDATE vault_badges SET ${setClauses} WHERE badge_id = ${esc(badgeId)}`);

    const result = await dbClient.execute(`SELECT * FROM vault_badges WHERE badge_id = ${esc(badgeId)} LIMIT 1`);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Badge not found' });
    }
    await logAudit(admin, 'UPDATE_BADGE', `Badge ${badgeId} updated`, previous, result.rows[0]);
    return successResponse(res, { message: 'Badge updated', badge: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid badge data', details: error.issues });
    }
    console.error('Failed to update badge:', error);
    res.status(500).json({ success: false, error: 'Failed to update badge' });
  }
}));

// DELETE /badges/:badgeId
router.delete('/badges/:badgeId', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    const { badgeId } = req.params;
    const prevResult = await dbClient.execute(`SELECT * FROM vault_badges WHERE badge_id = ${esc(badgeId)} LIMIT 1`);
    const previous = prevResult.rows.length > 0 ? prevResult.rows[0] : null;
    await dbClient.execute(`DELETE FROM vault_badges WHERE badge_id = ${esc(badgeId)}`);
    await logAudit(admin, 'DELETE_BADGE', `Badge ${badgeId} deleted`, previous, null);
    return successResponse(res, { message: 'Badge deleted' });
  } catch (error) {
    console.error('Failed to delete badge:', error);
    res.status(500).json({ success: false, error: 'Failed to delete badge' });
  }
}));

// GET /badge-stats
router.get('/badge-stats', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    const result = await dbClient.execute(`
      SELECT vb.badge_id, vb.name, COUNT(vub.id) AS unlock_count
      FROM vault_badges vb
      LEFT JOIN vault_user_badges vub ON vub.badge_id = vb.badge_id
      GROUP BY vb.badge_id, vb.name
      ORDER BY unlock_count DESC
    `);
    return successResponse(res, { badges: result.rows });
  } catch (error) {
    console.error('Failed to fetch badge stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch badge stats' });
  }
}));

// GET /leaderboards
router.get('/leaderboards', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    const period = (req.query.period as string) || 'weekly';
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);

    const result = await dbClient.execute(`
      SELECT vu.user_id, u.name, u.email, vu.leaderboard_score, vu.level, vu.xp, vu.streak_days, vu.vault_coins
      FROM vault_users vu
      JOIN users u ON u.id = vu.user_id
      ORDER BY vu.leaderboard_score DESC
      LIMIT ${esc(limit)}
    `);

    const leaderboard = result.rows.map((row: any, index: number) => ({
      rank: index + 1,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      score: row.leaderboard_score,
      level: row.level,
      xp: row.xp,
      streakDays: row.streak_days,
      vaultCoins: row.vault_coins,
    }));

    return successResponse(res, { period, leaderboard });
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
}));

// POST /leaderboards/reset
router.post('/leaderboards/reset', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    const { period } = req.body;
    if (!period || !['weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ success: false, error: 'Invalid period. Must be weekly or monthly' });
    }

    // Log reset history
    try {
      await dbClient.execute(`
        INSERT INTO vault_leaderboard_resets (id, period, reset_at)
        VALUES (${esc(crypto.randomUUID())}, ${esc(period)}, ${esc(getToday())})
      `);
    } catch {
      // Table may not exist - just log to console
      console.log(`Leaderboard reset: period=${period}, date=${getToday()}`);
    }

    await logAudit(admin, 'RESET_LEADERBOARD', `Leaderboard reset for ${period}`, null, { period });

    // Reset scores
    await dbClient.execute('UPDATE vault_users SET leaderboard_score = 0');

    return successResponse(res, {
      message: `Leaderboard reset for ${period} period`,
      period,
      resetAt: getToday(),
    });
  } catch (error) {
    console.error('Failed to reset leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to reset leaderboard' });
  }
}));

// GET /leaderboards/reset-history
router.get('/leaderboards/reset-history', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    let resets: any[] = [];
    try {
      const result = await dbClient.execute(
        'SELECT id, period, reset_at FROM vault_leaderboard_resets ORDER BY reset_at DESC'
      );
      resets = result.rows;
    } catch {
      // Table may not exist
      resets = [];
    }
    return successResponse(res, { resets });
  } catch (error) {
    console.error('Failed to fetch reset history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reset history' });
  }
}));

// POST /leaderboards/manual-reward
const manualRewardSchema = z.object({
  userId: z.string().min(1),
  rewardType: z.string().min(1),
  rewardValue: z.number().optional(),
  rewardLabel: z.string().min(1),
});

router.post('/leaderboards/manual-reward', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    const data = manualRewardSchema.parse(req.body);
    const id = crypto.randomUUID();

    await dbClient.execute(`
      INSERT INTO vault_pending_rewards (id, user_id, level, reward_type, reward_value, reward_label)
      VALUES (${esc(id)}, ${esc(data.userId)}, 0, ${esc(data.rewardType)}, ${esc(data.rewardValue ?? null)}, ${esc(data.rewardLabel)})
    `);

    await logAudit(admin, 'MANUAL_REWARD', `Manual reward awarded to ${data.userId}`, null, data);
    return successResponse(res, {
      message: 'Manual reward awarded',
      reward: { id, ...data },
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid reward data', details: error.issues });
    }
    console.error('Failed to award manual reward:', error);
    res.status(500).json({ success: false, error: 'Failed to award manual reward' });
  }
}));

export default router;
