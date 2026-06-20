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

// ─── Crate Tables Initialization ─────────────────────────────────────
async function ensureCrateTables(): Promise<void> {
  try {
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS vault_crate_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        crate_type TEXT NOT NULL CHECK(crate_type IN ('basic', 'premium', 'event', 'seasonal')),
        cost INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        reward_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `);
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS vault_crate_rewards (
        id TEXT PRIMARY KEY,
        crate_id TEXT NOT NULL REFERENCES vault_crate_types(id) ON DELETE CASCADE,
        reward_type TEXT NOT NULL,
        reward_value TEXT,
        reward_name TEXT NOT NULL DEFAULT '',
        probability REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `);
  } catch (e) {
    console.error('Failed to ensure crate tables:', e);
  }
}

// GET /overview
router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  try {
    const today = getToday();

    let totalUsers = 0, activeToday = 0, totalXpEarned = 0, totalCoinsEarned = 0;
    let cratesOpened = 0, badgesUnlocked = 0, quizAttemptsToday = 0, avgDailyStreak = 0;

    try {
      const totalResult = await dbClient.execute('SELECT COUNT(*) AS count FROM vault_users');
      totalUsers = Number((totalResult.rows[0] as any).count) || 0;
    } catch { /* ignore */ }

    try {
      const activeResult = await dbClient.execute(`SELECT COUNT(*) AS count FROM vault_users WHERE last_activity_date = ${esc(today)}`);
      activeToday = Number((activeResult.rows[0] as any).count) || 0;
    } catch { /* ignore */ }

    try {
      const xpCoinsResult = await dbClient.execute('SELECT COALESCE(SUM(total_xp_earned), 0) AS xp, COALESCE(SUM(total_coins_earned), 0) AS coins FROM vault_users');
      totalXpEarned = Number((xpCoinsResult.rows[0] as any).xp) || 0;
      totalCoinsEarned = Number((xpCoinsResult.rows[0] as any).coins) || 0;
    } catch { /* ignore */ }

    try {
      const cratesResult = await dbClient.execute('SELECT COALESCE(SUM(crates_opened), 0) AS count FROM vault_users');
      cratesOpened = Number((cratesResult.rows[0] as any).count) || 0;
    } catch { /* ignore */ }

    try {
      const badgesResult = await dbClient.execute('SELECT COUNT(*) AS count FROM vault_user_badges');
      badgesUnlocked = Number((badgesResult.rows[0] as any).count) || 0;
    } catch { /* ignore */ }

    try {
      const quizResult = await dbClient.execute(`SELECT COUNT(*) AS count FROM vault_quiz_attempts WHERE date(answered_at) = ${esc(today)}`);
      quizAttemptsToday = Number((quizResult.rows[0] as any).count) || 0;
    } catch { /* ignore */ }

    try {
      const streakResult = await dbClient.execute('SELECT COALESCE(AVG(streak_days), 0) AS avg_streak FROM vault_users');
      avgDailyStreak = Math.round(Number((streakResult.rows[0] as any).avg_streak) * 100) / 100;
    } catch { /* ignore */ }

    return successResponse(res, {
      totalVaultUsers: totalUsers,
      activeToday,
      totalXpEarned,
      totalCoinsEarned,
      cratesOpened,
      badgesUnlocked,
      quizAttemptsToday,
      avgDailyStreak,
    });
  } catch (error) {
    console.error('Failed to fetch vault overview:', error);
    return successResponse(res, { totalVaultUsers: 0, activeToday: 0, totalXpEarned: 0, totalCoinsEarned: 0, cratesOpened: 0, badgesUnlocked: 0, quizAttemptsToday: 0, avgDailyStreak: 0 });
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
    return successResponse(res, rewardConfigCache);
  } catch (error) {
    console.error('Failed to fetch reward config:', error);
    return successResponse(res, getDefaultRewardConfig());
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
    return successResponse(res, crateConfigCache);
  } catch (error) {
    console.error('Failed to fetch crate config:', error);
    return successResponse(res, getDefaultCrateConfig());
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
    return successResponse(res, result.rows);
  } catch (error) {
    console.error('Failed to fetch badges:', error);
    return successResponse(res, []);
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
    return successResponse(res, result.rows);
  } catch (error) {
    console.error('Failed to fetch badge stats:', error);
    return successResponse(res, []);
  }
}));

// GET /leaderboards
router.get('/leaderboards', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;

  const period = (req.query.period as string) || 'weekly';
  try {
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

    return successResponse(res, leaderboard);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return successResponse(res, []);
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
    return successResponse(res, resets);
  } catch (error) {
    console.error('Failed to fetch reset history:', error);
    return successResponse(res, []);
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

// ─── Crate Management ─────────────────────────────────────────────────

const createCrateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  crateType: z.enum(['basic', 'premium', 'event', 'seasonal']),
  cost: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const updateCrateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  crateType: z.enum(['basic', 'premium', 'event', 'seasonal']).optional(),
  cost: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const createRewardSchema = z.object({
  rewardType: z.string().min(1),
  rewardValue: z.string().optional().default(''),
  rewardName: z.string().min(1).max(200),
  probability: z.number().min(0).max(100),
});

const updateRewardSchema = z.object({
  rewardType: z.string().min(1).optional(),
  rewardValue: z.string().optional(),
  rewardName: z.string().min(1).max(200).optional(),
  probability: z.number().min(0).max(100).optional(),
});

// GET /crates/ensure-tables - Ensure crate tables exist
router.get('/crates/ensure-tables', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  await ensureCrateTables();
  return successResponse(res, { message: 'Crate tables ensured' });
}));

// GET /crates - List all crate types
router.get('/crates', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  await ensureCrateTables();

  try {
    const result = await dbClient.execute(`
      SELECT ct.*, COUNT(cr.id) as reward_count
      FROM vault_crate_types ct
      LEFT JOIN vault_crate_rewards cr ON cr.crate_id = ct.id
      GROUP BY ct.id
      ORDER BY ct.created_at DESC
    `);
    const crates = (result.rows || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      crateType: r.crate_type,
      cost: r.cost,
      isActive: r.is_active === 1,
      rewardCount: r.reward_count || 0,
      createdAt: r.created_at,
    }));
    return successResponse(res, { crates });
  } catch (error) {
    console.error('Failed to fetch crates:', error);
    return successResponse(res, { crates: [] });
  }
}));

// POST /crates - Create a new crate type
router.post('/crates', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  await ensureCrateTables();

  try {
    const data = createCrateSchema.parse(req.body);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await dbClient.execute(`
      INSERT INTO vault_crate_types (id, name, description, crate_type, cost, is_active, created_at, updated_at)
      VALUES (${esc(id)}, ${esc(data.name)}, ${esc(data.description)}, ${esc(data.crateType)}, ${esc(data.cost)}, ${esc(data.isActive ? 1 : 0)}, ${esc(now)}, ${esc(now)})
    `);

    await logAudit(admin, 'CREATE_CRATE', `Crate ${data.name} created`, null, data);
    return successResponse(res, {
      message: 'Crate created',
      crate: { id, ...data, rewardCount: 0, createdAt: now },
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid crate data', details: error.issues });
    }
    console.error('Failed to create crate:', error);
    res.status(500).json({ success: false, error: 'Failed to create crate' });
  }
}));

// GET /crates/:id - Get a single crate type with rewards
router.get('/crates/:id', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  await ensureCrateTables();

  try {
    const crateResult = await dbClient.execute(
      `SELECT * FROM vault_crate_types WHERE id = ${esc(req.params.id)} LIMIT 1`
    );
    if ((crateResult.rows || []).length === 0) {
      return res.status(404).json({ success: false, error: 'Crate not found' });
    }
    const r = (crateResult.rows as any[])[0];
    const rewardsResult = await dbClient.execute(
      `SELECT * FROM vault_crate_rewards WHERE crate_id = ${esc(req.params.id)} ORDER BY created_at ASC`
    );
    const rewards = ((rewardsResult.rows || []) as any[]).map((r: any) => ({
      id: r.id,
      crateId: r.crate_id,
      rewardType: r.reward_type,
      rewardValue: r.reward_value || '',
      rewardName: r.reward_name || '',
      probability: r.probability,
    }));
    const crate: any = {
      id: r.id,
      name: r.name,
      description: r.description || '',
      crateType: r.crate_type,
      cost: r.cost,
      isActive: r.is_active === 1,
      createdAt: r.created_at,
      rewardCount: rewards.length,
    };

    return successResponse(res, { crate, rewards });
  } catch (error) {
    console.error('Failed to fetch crate:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch crate' });
  }
}));

// PATCH /crates/:id - Update a crate type
router.patch('/crates/:id', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  await ensureCrateTables();

  try {
    const data = updateCrateSchema.parse(req.body);
    const setClauses = Object.entries({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.crateType !== undefined && { crate_type: data.crateType }),
      ...(data.cost !== undefined && { cost: data.cost }),
      ...(data.isActive !== undefined && { is_active: data.isActive ? 1 : 0 }),
    }).map(([key, val]) => `${key} = ${esc(val)}`).join(', ');
    const now = new Date().toISOString();

    if (!setClauses) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const prevResult = await dbClient.execute(
      `SELECT * FROM vault_crate_types WHERE id = ${esc(req.params.id)} LIMIT 1`
    );
    const previous = (prevResult.rows || []).length > 0 ? (prevResult.rows as any[])[0] : null;

    await dbClient.execute(`
      UPDATE vault_crate_types SET ${setClauses}, updated_at = ${esc(now)} WHERE id = ${esc(req.params.id)}
    `);

    await logAudit(admin, 'UPDATE_CRATE', `Crate ${req.params.id} updated`, previous, data);
    return successResponse(res, { message: 'Crate updated' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid crate data', details: error.issues });
    }
    console.error('Failed to update crate:', error);
    res.status(500).json({ success: false, error: 'Failed to update crate' });
  }
}));

// DELETE /crates/:id - Delete a crate type
router.delete('/crates/:id', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  await ensureCrateTables();

  try {
    const prevResult = await dbClient.execute(
      `SELECT * FROM vault_crate_types WHERE id = ${esc(req.params.id)} LIMIT 1`
    );
    const previous = (prevResult.rows || []).length > 0 ? (prevResult.rows as any[])[0] : null;

    await dbClient.execute(`DELETE FROM vault_crate_types WHERE id = ${esc(req.params.id)}`);
    // Rewards cascade delete via FK constraint

    await logAudit(admin, 'DELETE_CRATE', `Crate ${req.params.id} deleted`, previous, null);
    return successResponse(res, { message: 'Crate deleted' });
  } catch (error) {
    console.error('Failed to delete crate:', error);
    res.status(500).json({ success: false, error: 'Failed to delete crate' });
  }
}));

// PATCH /crates/:id/toggle - Toggle crate active status
router.patch('/crates/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  await ensureCrateTables();

  try {
    const result = await dbClient.execute(
      `SELECT is_active FROM vault_crate_types WHERE id = ${esc(req.params.id)} LIMIT 1`
    );
    if ((result.rows || []).length === 0) {
      return res.status(404).json({ success: false, error: 'Crate not found' });
    }
    const current = (result.rows as any[])[0].is_active;
    const newStatus = current === 1 ? 0 : 1;
    const now = new Date().toISOString();

    await dbClient.execute(`
      UPDATE vault_crate_types SET is_active = ${esc(newStatus)}, updated_at = ${esc(now)}
      WHERE id = ${esc(req.params.id)}
    `);

    await logAudit(admin, 'TOGGLE_CRATE', `Crate ${req.params.id} ${newStatus ? 'enabled' : 'disabled'}`, null, { isActive: newStatus === 1 });
    return successResponse(res, { message: newStatus ? 'Crate enabled' : 'Crate disabled', isActive: newStatus === 1 });
  } catch (error) {
    console.error('Failed to toggle crate:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle crate' });
  }
}));

// POST /crates/:id/rewards - Add a reward to a crate
router.post('/crates/:id/rewards', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  await ensureCrateTables();

  try {
    const data = createRewardSchema.parse(req.body);
    const rewardId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Verify crate exists
    const crateResult = await dbClient.execute(
      `SELECT id FROM vault_crate_types WHERE id = ${esc(req.params.id)} LIMIT 1`
    );
    if ((crateResult.rows || []).length === 0) {
      return res.status(404).json({ success: false, error: 'Crate not found' });
    }

    await dbClient.execute(`
      INSERT INTO vault_crate_rewards (id, crate_id, reward_type, reward_value, reward_name, probability, created_at)
      VALUES (${esc(rewardId)}, ${esc(req.params.id)}, ${esc(data.rewardType)}, ${esc(data.rewardValue || '')}, ${esc(data.rewardName)}, ${esc(data.probability)}, ${esc(now)})
    `);

    // Update reward count
    await dbClient.execute(`
      UPDATE vault_crate_types SET reward_count = (SELECT COUNT(*) FROM vault_crate_rewards WHERE crate_id = ${esc(req.params.id)}), updated_at = ${esc(now)}
      WHERE id = ${esc(req.params.id)}
    `);

    await logAudit(admin, 'ADD_CRATE_REWARD', `Reward ${data.rewardName} added to crate ${req.params.id}`, null, data);
    return successResponse(res, {
      message: 'Reward added',
      reward: { id: rewardId, crateId: req.params.id, ...data },
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid reward data', details: error.issues });
    }
    console.error('Failed to add reward:', error);
    res.status(500).json({ success: false, error: 'Failed to add reward' });
  }
}));

// PATCH /crates/rewards/:rewardId - Update a reward
router.patch('/crates/rewards/:rewardId', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  await ensureCrateTables();

  try {
    const data = updateRewardSchema.parse(req.body);
    const setClauses = Object.entries({
      ...(data.rewardType !== undefined && { reward_type: data.rewardType }),
      ...(data.rewardValue !== undefined && { reward_value: data.rewardValue }),
      ...(data.rewardName !== undefined && { reward_name: data.rewardName }),
      ...(data.probability !== undefined && { probability: data.probability }),
    }).map(([key, val]) => `${key} = ${esc(val)}`).join(', ');

    if (!setClauses) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const prevResult = await dbClient.execute(
      `SELECT * FROM vault_crate_rewards WHERE id = ${esc(req.params.rewardId)} LIMIT 1`
    );
    if ((prevResult.rows || []).length === 0) {
      return res.status(404).json({ success: false, error: 'Reward not found' });
    }

    await dbClient.execute(`
      UPDATE vault_crate_rewards SET ${setClauses} WHERE id = ${esc(req.params.rewardId)}
    `);

    await logAudit(admin, 'UPDATE_CRATE_REWARD', `Reward ${req.params.rewardId} updated`, null, data);
    return successResponse(res, { message: 'Reward updated' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid reward data', details: error.issues });
    }
    console.error('Failed to update reward:', error);
    res.status(500).json({ success: false, error: 'Failed to update reward' });
  }
}));

// DELETE /crates/rewards/:rewardId - Delete a reward
router.delete('/crates/rewards/:rewardId', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  await ensureCrateTables();

  try {
    const prevResult = await dbClient.execute(
      `SELECT crate_id FROM vault_crate_rewards WHERE id = ${esc(req.params.rewardId)} LIMIT 1`
    );
    if ((prevResult.rows || []).length === 0) {
      return res.status(404).json({ success: false, error: 'Reward not found' });
    }
    const crateId = (prevResult.rows as any[])[0].crate_id;
    const now = new Date().toISOString();

    await dbClient.execute(`DELETE FROM vault_crate_rewards WHERE id = ${esc(req.params.rewardId)}`);

    // Update reward count
    await dbClient.execute(`
      UPDATE vault_crate_types SET reward_count = (SELECT COUNT(*) FROM vault_crate_rewards WHERE crate_id = ${esc(crateId)}), updated_at = ${esc(now)}
      WHERE id = ${esc(crateId)}
    `);

    await logAudit(admin, 'DELETE_CRATE_REWARD', `Reward ${req.params.rewardId} deleted`, null, null);
    return successResponse(res, { message: 'Reward deleted' });
  } catch (error) {
    console.error('Failed to delete reward:', error);
    res.status(500).json({ success: false, error: 'Failed to delete reward' });
  }
}));

// GET /crates/analytics/overview - Get crate analytics
router.get('/crates/analytics/overview', asyncHandler(async (req: Request, res: Response) => {
  const admin = await getAdminUser(req, res);
  if (!admin) return;
  await ensureCrateTables();

  try {
    const today = getToday();

    // Total crates opened
    let totalOpened = 0;
    try {
      const totalResult = await dbClient.execute(
        `SELECT COALESCE(SUM(crates_opened), 0) as count FROM vault_users`
      );
      totalOpened = Number((totalResult.rows as any[])[0]?.count || 0);
    } catch { /* ignore */ }

    // Crates opened today
    let openedToday = 0;
    try {
      const todayResult = await dbClient.execute(
        `SELECT COUNT(*) as count FROM vault_crate_open_log WHERE date = ${esc(today)}`
      );
      openedToday = Number((todayResult.rows as any[])[0]?.count || 0);
    } catch { /* ignore */ }

    // Most common reward
    let mostCommonReward = 'N/A';
    try {
      const commonResult = await dbClient.execute(`
        SELECT reward_label, COUNT(*) as count FROM vault_crate_open_log
        GROUP BY reward_label ORDER BY count DESC LIMIT 1
      `);
      if ((commonResult.rows || []).length > 0) {
        mostCommonReward = (commonResult.rows as any[])[0].reward_label;
      }
    } catch { /* ignore */ }

    // Most rare reward (rarest rarity)
    let mostRareReward = 'N/A';
    try {
      const rareResult = await dbClient.execute(`
        SELECT reward_label, rarity FROM vault_crate_open_log
        WHERE rarity IN ('legendary', 'epic', 'rare')
        ORDER BY CASE rarity WHEN 'legendary' THEN 0 WHEN 'epic' THEN 1 WHEN 'rare' THEN 2 END
        LIMIT 1
      `);
      if ((rareResult.rows || []).length > 0) {
        mostRareReward = (rareResult.rows as any[])[0].reward_label;
      }
    } catch { /* ignore */ }

    // Active crate count
    let activeCrates = 0;
    try {
      const activeResult = await dbClient.execute(
        `SELECT COUNT(*) as count FROM vault_crate_types WHERE is_active = 1`
      );
      activeCrates = Number((activeResult.rows as any[])[0]?.count || 0);
    } catch { /* ignore */ }

    // Total crate types
    let totalCrates = 0;
    try {
      const totalCratesResult = await dbClient.execute(
        `SELECT COUNT(*) as count FROM vault_crate_types`
      );
      totalCrates = Number((totalCratesResult.rows as any[])[0]?.count || 0);
    } catch { /* ignore */ }

    // Total rewards across all crates
    let totalRewards = 0;
    try {
      const rewardsResult = await dbClient.execute(
        `SELECT COUNT(*) as count FROM vault_crate_rewards`
      );
      totalRewards = Number((rewardsResult.rows as any[])[0]?.count || 0);
    } catch { /* ignore */ }

    return successResponse(res, {
      totalOpened,
      openedToday,
      mostCommonReward,
      mostRareReward,
      activeCrates,
      totalCrates,
      totalRewards,
    });
  } catch (error) {
    console.error('Failed to fetch crate analytics:', error);
    return successResponse(res, {
      totalOpened: 0,
      openedToday: 0,
      mostCommonReward: 'N/A',
      mostRareReward: 'N/A',
      activeCrates: 0,
      totalCrates: 0,
      totalRewards: 0,
    });
  }
}));

export default router;
