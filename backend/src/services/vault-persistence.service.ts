import crypto from 'crypto';
import { dbClient } from '../lib/db';
import { createDefaultVaultState, getTodayDate, getWeekStart, getMonthStart, calculateLeaderboardScore, LEVELS } from './vault.service';
import type { VaultUserState } from './vault.service';

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

export async function getUserVault(userId: string): Promise<VaultUserState> {
  const result = await dbClient.execute(
    `SELECT * FROM vault_users WHERE user_id = ${esc(userId)} LIMIT 1`
  );
  if (result.rows.length > 0) {
    const r = result.rows[0] as any;
    return {
      xp: r.xp ?? 0,
      level: r.level ?? 1,
      vaultCoins: r.vault_coins ?? 0,
      streakDays: r.streak_days ?? 0,
      lastActivityDate: r.last_activity_date ?? null,
      lastLoginDate: r.last_login_date ?? null,
      lastLoginClaim: r.last_login_claim ?? null,
      bonusStreakTokens: r.bonus_streak_tokens ?? 0,
      correctAnswers: r.correct_answers ?? 0,
      cratesOpened: r.crates_opened ?? 0,
      dailyXpEarned: r.daily_xp_earned ?? 0,
      dailyCoinsEarned: r.daily_coins_earned ?? 0,
      dailyResetDate: r.daily_reset_date ?? null,
      totalXpEarned: r.total_xp_earned ?? 0,
      totalCoinsEarned: r.total_coins_earned ?? 0,
      leaderboardScore: r.leaderboard_score ?? 0,
      dailyBasicCratesOpened: 0,
      dailyPremiumCratesOpened: 0,
      dailyCouponsUsed: 0,
    };
  }
  return createDefaultVaultState();
}

export async function saveUserVault(userId: string, state: VaultUserState): Promise<void> {
  const today = getTodayDate();
  const score = calculateLeaderboardScore(
    state.totalXpEarned,
    state.totalCoinsEarned,
    state.cratesOpened
  );

  const id = crypto.randomUUID();
  await dbClient.execute(`
    INSERT INTO vault_users (id, user_id, xp, level, vault_coins, total_xp_earned, total_coins_earned,
      streak_days, last_activity_date, last_login_date, last_login_claim,
      bonus_streak_tokens, correct_answers, crates_opened,
      daily_xp_earned, daily_coins_earned, daily_reset_date, leaderboard_score, updated_at)
    VALUES (${esc(id)}, ${esc(userId)}, ${esc(state.xp)}, ${esc(state.level)}, ${esc(state.vaultCoins)},
      ${esc(state.totalXpEarned)}, ${esc(state.totalCoinsEarned)},
      ${esc(state.streakDays)}, ${esc(state.lastActivityDate)}, ${esc(state.lastLoginDate)}, ${esc(state.lastLoginClaim)},
      ${esc(state.bonusStreakTokens)}, ${esc(state.correctAnswers)}, ${esc(state.cratesOpened)},
      ${esc(state.dailyXpEarned)}, ${esc(state.dailyCoinsEarned)}, ${esc(state.dailyResetDate)},
      ${esc(score)}, ${esc(today)})
    ON CONFLICT(user_id) DO UPDATE SET
      xp = ${esc(state.xp)},
      level = ${esc(state.level)},
      vault_coins = ${esc(state.vaultCoins)},
      total_xp_earned = ${esc(state.totalXpEarned)},
      total_coins_earned = ${esc(state.totalCoinsEarned)},
      streak_days = ${esc(state.streakDays)},
      last_activity_date = ${esc(state.lastActivityDate)},
      last_login_date = ${esc(state.lastLoginDate)},
      last_login_claim = ${esc(state.lastLoginClaim)},
      bonus_streak_tokens = ${esc(state.bonusStreakTokens)},
      correct_answers = ${esc(state.correctAnswers)},
      crates_opened = ${esc(state.cratesOpened)},
      daily_xp_earned = ${esc(state.dailyXpEarned)},
      daily_coins_earned = ${esc(state.dailyCoinsEarned)},
      daily_reset_date = ${esc(state.dailyResetDate)},
      leaderboard_score = ${esc(score)},
      updated_at = ${esc(today)}
  `);
}

export async function recordQuizAttempt(
  userId: string, quizType: string, quizId: string, correct: boolean, xpAwarded: number, isFirstCorrect: boolean
): Promise<void> {
  const id = crypto.randomUUID();
  await dbClient.execute(`
    INSERT INTO vault_quiz_attempts (id, user_id, quiz_type, quiz_id, correct, xp_awarded, is_first_correct)
    VALUES (${esc(id)}, ${esc(userId)}, ${esc(quizType)}, ${esc(quizId)}, ${esc(correct ? 1 : 0)}, ${esc(xpAwarded)}, ${esc(isFirstCorrect ? 1 : 0)})
  `);
}

export async function getQuizAttempt(userId: string, quizType: string, quizId: string): Promise<boolean | null> {
  const result = await dbClient.execute(`
    SELECT correct, is_first_correct FROM vault_quiz_attempts
    WHERE user_id = ${esc(userId)} AND quiz_type = ${esc(quizType)} AND quiz_id = ${esc(quizId)}
    LIMIT 1
  `);
  if (result.rows.length > 0) {
    const row = result.rows[0] as any;
    return row.correct === 1 && row.is_first_correct === 1;
  }
  return null;
}

export async function getDailyActivity(userId: string, date: string): Promise<any | null> {
  const result = await dbClient.execute(`
    SELECT * FROM vault_daily_activity WHERE user_id = ${esc(userId)} AND date = ${esc(date)} LIMIT 1
  `);
  return result.rows.length > 0 ? result.rows[0] as any : null;
}

export async function upsertDailyActivity(
  userId: string, date: string, updates: Record<string, number | boolean>
): Promise<void> {
  const existing = await getDailyActivity(userId, date);
  const setClauses = Object.entries(updates)
    .map(([key, value]) => {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      return `${col} = ${esc(typeof value === 'boolean' ? (value ? 1 : 0) : value)}`;
    })
    .join(', ');

  if (existing) {
    await dbClient.execute(`
      UPDATE vault_daily_activity SET ${setClauses} WHERE user_id = ${esc(userId)} AND date = ${esc(date)}
    `);
  } else {
    const cols = ['id', 'user_id', 'date', ...Object.keys(updates).map(k => k.replace(/([A-Z])/g, '_$1').toLowerCase())];
    const vals = [crypto.randomUUID(), userId, date, ...Object.values(updates).map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v)];
    const placeholders = vals.map(() => '?').join(', ');
    await dbClient.execute({
      sql: `INSERT INTO vault_daily_activity (${cols.join(', ')}) VALUES (${placeholders})`,
      args: vals,
    });
  }
}

export async function getLeaderboard(period: 'weekly' | 'monthly', limit: number = 50): Promise<any[]> {
  const result = await dbClient.execute(`
    SELECT vu.user_id, u.name, u.email, vu.leaderboard_score, vu.xp, vu.level, vu.streak_days, vu.vault_coins
    FROM vault_users vu
    JOIN users u ON u.id = vu.user_id
    ORDER BY vu.leaderboard_score DESC
    LIMIT ${esc(limit)}
  `);
  return result.rows.map((row: any, index: number) => ({
    rank: index + 1,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    score: row.leaderboard_score,
    xp: row.xp,
    level: row.level,
    streakDays: row.streak_days,
    vaultCoins: row.vault_coins,
  }));
}

export async function getUserBadges(userId: string): Promise<any[]> {
  const result = await dbClient.execute(`
    SELECT vb.badge_id, vb.name, vb.description, vb.emoji, vb.rarity, vb.category, vub.unlocked_at, vub.is_displayed
    FROM vault_user_badges vub
    JOIN vault_badges vb ON vb.badge_id = vub.badge_id
    WHERE vub.user_id = ${esc(userId)}
    ORDER BY vub.unlocked_at DESC
  `);
  return result.rows;
}

export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
  const existing = await dbClient.execute(`
    SELECT id FROM vault_user_badges WHERE user_id = ${esc(userId)} AND badge_id = ${esc(badgeId)} LIMIT 1
  `);
  if (existing.rows.length > 0) return false;

  const id = crypto.randomUUID();
  await dbClient.execute(`
    INSERT INTO vault_user_badges (id, user_id, badge_id) VALUES (${esc(id)}, ${esc(userId)}, ${esc(badgeId)})
  `);
  return true;
}

export async function recordCrateOpen(userId: string, crateType: string, rewardLabel: string, rarity: string): Promise<void> {
  const id = crypto.randomUUID();
  const today = getTodayDate();
  await dbClient.execute(`
    INSERT INTO vault_crate_open_log (id, user_id, crate_type, reward_label, rarity, date)
    VALUES (${esc(id)}, ${esc(userId)}, ${esc(crateType)}, ${esc(rewardLabel)}, ${esc(rarity)}, ${esc(today)})
  `);
}

export async function getCrateHistory(userId: string, limit: number = 20): Promise<any[]> {
  const result = await dbClient.execute(`
    SELECT crate_type, reward_label, rarity, opened_at, date
    FROM vault_crate_open_log
    WHERE user_id = ${esc(userId)}
    ORDER BY opened_at DESC
    LIMIT ${esc(limit)}
  `);
  return result.rows;
}

export async function getPendingRewards(userId: string): Promise<any[]> {
  const result = await dbClient.execute(`
    SELECT id, level, reward_type, reward_value, reward_label, claimed, created_at
    FROM vault_pending_rewards
    WHERE user_id = ${esc(userId)} AND claimed = 0
    ORDER BY level ASC
  `);
  return result.rows;
}

export async function addPendingReward(
  userId: string, level: number, rewardType: string, rewardLabel: string, rewardValue?: number
): Promise<void> {
  const id = crypto.randomUUID();
  await dbClient.execute(`
    INSERT INTO vault_pending_rewards (id, user_id, level, reward_type, reward_value, reward_label)
    VALUES (${esc(id)}, ${esc(userId)}, ${esc(level)}, ${esc(rewardType)}, ${esc(rewardValue ?? null)}, ${esc(rewardLabel)})
  `);
}

export async function claimPendingReward(rewardId: string, userId: string): Promise<boolean> {
  const today = getTodayDate();
  const result = await dbClient.execute(`
    UPDATE vault_pending_rewards SET claimed = 1, claimed_at = ${esc(today)}
    WHERE id = ${esc(rewardId)} AND user_id = ${esc(userId)} AND claimed = 0
  `);
  return result.rowsAffected > 0;
}

export async function getOrderReward(orderId: string): Promise<any | null> {
  const result = await dbClient.execute(`
    SELECT * FROM vault_order_rewards WHERE order_id = ${esc(orderId)} LIMIT 1
  `);
  return result.rows.length > 0 ? result.rows[0] as any : null;
}

export async function recordOrderReward(
  userId: string, orderId: string, orderAmount: number, xpAwarded: number, coinsAwarded: number, crateAwarded: string | null
): Promise<void> {
  const id = crypto.randomUUID();
  await dbClient.execute(`
    INSERT INTO vault_order_rewards (id, user_id, order_id, order_amount, xp_awarded, coins_awarded, crate_awarded)
    VALUES (${esc(id)}, ${esc(userId)}, ${esc(orderId)}, ${esc(orderAmount)}, ${esc(xpAwarded)}, ${esc(coinsAwarded)}, ${esc(crateAwarded)})
  `);
}

export async function checkHiddenRewardUnlocked(userId: string, condition: string): Promise<any | null> {
  const result = await dbClient.execute(`
    SELECT * FROM vault_user_hidden_rewards WHERE user_id = ${esc(userId)} AND reward_id = ${esc(condition)} LIMIT 1
  `);
  return result.rows.length > 0 ? result.rows[0] as any : null;
}

export async function unlockHiddenReward(userId: string, condition: string, rewardLabel: string): Promise<void> {
  const id = crypto.randomUUID();
  await dbClient.execute(`
    INSERT INTO vault_user_hidden_rewards (id, user_id, reward_id, unlocked_at)
    VALUES (${esc(id)}, ${esc(userId)}, ${esc(condition)}, ${esc(getTodayDate())})
  `);
}
