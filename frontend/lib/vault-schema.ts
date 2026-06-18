import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const vaultUsers = sqliteTable('vault_users', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  xp: integer('xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  vaultCoins: integer('vault_coins').notNull().default(0),
  totalXpEarned: integer('total_xp_earned').notNull().default(0),
  totalCoinsEarned: integer('total_coins_earned').notNull().default(0),
  streakDays: integer('streak_days').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastActivityDate: text('last_activity_date'),
  lastLoginDate: text('last_login_date'),
  lastLoginClaim: text('last_login_claim'),
  dailyXpEarned: integer('daily_xp_earned').notNull().default(0),
  dailyCoinsEarned: integer('daily_coins_earned').notNull().default(0),
  dailyResetDate: text('daily_reset_date'),
  bonusStreakTokens: integer('bonus_streak_tokens').notNull().default(0),
  correctAnswers: integer('correct_answers').notNull().default(0),
  cratesOpened: integer('crates_opened').notNull().default(0),
  ordersCompleted: integer('orders_completed').notNull().default(0),
  totalSpent: real('total_spent').notNull().default(0),
  leaderboardScore: real('leaderboard_score').notNull().default(0),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('vault_users_user_id_idx').on(table.userId),
  leaderboardScoreIdx: index('vault_users_leaderboard_score_idx').on(table.leaderboardScore),
  levelIdx: index('vault_users_level_idx').on(table.level),
}));

export const vaultLevels = sqliteTable('vault_levels', {
  id: text('id').primaryKey(),
  level: integer('level').notNull().unique(),
  xpRequired: integer('xp_required').notNull(),
  rewardType: text('reward_type').notNull(),
  rewardValue: integer('reward_value'),
  rewardId: text('reward_id'),
  rewardLabel: text('reward_label').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  levelIdx: uniqueIndex('vault_levels_level_idx').on(table.level),
}));

export const vaultPendingRewards = sqliteTable('vault_pending_rewards', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  level: integer('level').notNull(),
  rewardType: text('reward_type').notNull(),
  rewardValue: integer('reward_value'),
  rewardLabel: text('reward_label').notNull(),
  claimed: integer('claimed', { mode: 'boolean' }).notNull().default(false),
  claimedAt: text('claimed_at'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: index('vault_pending_rewards_user_id_idx').on(table.userId),
}));

export const vaultBadges = sqliteTable('vault_badges', {
  id: text('id').primaryKey(),
  badgeId: text('badge_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  emoji: text('emoji').notNull(),
  unlockCondition: text('unlock_condition').notNull(),
  unlockValue: integer('unlock_value'),
  category: text('category', { enum: ['progression', 'quiz', 'streak', 'crate', 'vip', 'hidden', 'seasonal', 'commerce'] }).notNull().default('progression'),
  rarity: text('rarity', { enum: ['common', 'rare', 'epic', 'legendary'] }).notNull().default('common'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const vaultUserBadges = sqliteTable('vault_user_badges', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: text('badge_id').notNull().references(() => vaultBadges.badgeId, { onDelete: 'cascade' }),
  unlockedAt: text('unlocked_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  isDisplayed: integer('is_displayed', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  userBadgeIdx: uniqueIndex('vault_user_badges_user_badge_idx').on(table.userId, table.badgeId),
  userIdIdx: index('vault_user_badges_user_id_idx').on(table.userId),
}));

export const vaultCrateTypes = sqliteTable('vault_crate_types', {
  id: text('id').primaryKey(),
  crateId: text('crate_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  cost: integer('cost').notNull(),
  dailyLimit: integer('daily_limit').notNull(),
  maxPerDay: integer('max_per_day').notNull().default(2),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const vaultCrateRewards = sqliteTable('vault_crate_rewards', {
  id: text('id').primaryKey(),
  crateId: text('crate_id').notNull().references(() => vaultCrateTypes.crateId, { onDelete: 'cascade' }),
  rewardType: text('reward_type', { enum: ['xp', 'coins', 'coupon', 'shipping', 'badge', 'crate', 'access', 'badge_fragment'] }).notNull(),
  rewardValue: integer('reward_value'),
  rewardId: text('reward_id'),
  label: text('label').notNull(),
  probability: real('probability').notNull(),
  rarity: text('rarity', { enum: ['common', 'uncommon', 'rare', 'legendary'] }).notNull().default('common'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  crateIdIdx: index('vault_crate_rewards_crate_id_idx').on(table.crateId),
}));

export const vaultUserCrates = sqliteTable('vault_user_crates', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  crateType: text('crate_type').notNull(),
  source: text('source').notNull().default('reward'),
  opened: integer('opened', { mode: 'boolean' }).notNull().default(false),
  openedAt: text('opened_at'),
  rewardLog: text('reward_log'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: index('vault_user_crates_user_id_idx').on(table.userId),
  openedIdx: index('vault_user_crates_opened_idx').on(table.opened),
}));

export const vaultCrateOpenLog = sqliteTable('vault_crate_open_log', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  crateType: text('crate_type').notNull(),
  rewardLabel: text('reward_label').notNull(),
  rarity: text('rarity').notNull(),
  openedAt: text('opened_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  date: text('date').notNull(),
}, (table) => ({
  userIdIdx: index('vault_crate_log_user_id_idx').on(table.userId),
  dateIdx: index('vault_crate_log_date_idx').on(table.date),
}));

export const vaultCoupons = sqliteTable('vault_coupons', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type', { enum: ['percentage', 'fixed', 'shipping'] }).notNull(),
  discountValue: real('discount_value').notNull(),
  label: text('label').notNull(),
  maxActive: integer('max_active').notNull().default(1),
  validDays: integer('valid_days').notNull().default(30),
  applicableProducts: text('applicable_products'),
  isStackable: integer('is_stackable', { mode: 'boolean' }).notNull().default(false),
  source: text('source').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const vaultUserCoupons = sqliteTable('vault_user_coupons', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  couponCode: text('coupon_code').notNull().references(() => vaultCoupons.code, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  used: integer('used', { mode: 'boolean' }).notNull().default(false),
  usedAt: text('used_at'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userCouponIdx: uniqueIndex('vault_user_coupons_user_coupon_idx').on(table.userId, table.couponCode),
  userIdIdx: index('vault_user_coupons_user_id_idx').on(table.userId),
}));

export const vaultStreakHistory = sqliteTable('vault_streak_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  activityDate: text('activity_date').notNull(),
  activityType: text('activity_type', { enum: ['login', 'quiz', 'challenge', 'event'] }).notNull(),
  streakDay: integer('streak_day').notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userDateIdx: uniqueIndex('vault_streak_history_user_date_idx').on(table.userId, table.activityDate),
  userIdIdx: index('vault_streak_history_user_id_idx').on(table.userId),
}));

export const vaultDailyActivity = sqliteTable('vault_daily_activity', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  xpEarned: integer('xp_earned').notNull().default(0),
  coinsEarned: integer('coins_earned').notNull().default(0),
  basicCratesOpened: integer('basic_crates_opened').notNull().default(0),
  premiumCratesOpened: integer('premium_crates_opened').notNull().default(0),
  couponsUsed: integer('coupons_used').notNull().default(0),
  quizzesCompleted: integer('quizzes_completed').notNull().default(0),
  challengesCompleted: integer('challenges_completed').notNull().default(0),
  productsViewed: integer('products_viewed').notNull().default(0),
  loginClaimed: integer('login_claimed', { mode: 'boolean' }).notNull().default(false),
  quizClaimed: integer('quiz_claimed', { mode: 'boolean' }).notNull().default(false),
  dailyQuizCompleted: integer('daily_quiz_completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userDateIdx: uniqueIndex('vault_daily_activity_user_date_idx').on(table.userId, table.date),
  userIdIdx: index('vault_daily_activity_user_id_idx').on(table.userId),
  dateIdx: index('vault_daily_activity_date_idx').on(table.date),
}));

export const vaultLeaderboardWeekly = sqliteTable('vault_leaderboard_weekly', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  weekStart: text('week_start').notNull(),
  weekEnd: text('week_end').notNull(),
  score: real('score').notNull().default(0),
  xpEarned: integer('xp_earned').notNull().default(0),
  coinsEarned: integer('coins_earned').notNull().default(0),
  challengesCompleted: integer('challenges_completed').notNull().default(0),
  rank: integer('rank'),
  rewardClaimed: integer('reward_claimed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userWeekIdx: uniqueIndex('vault_lb_weekly_user_week_idx').on(table.userId, table.weekStart),
  weekScoreIdx: index('vault_lb_weekly_week_score_idx').on(table.weekStart, table.score),
}));

export const vaultLeaderboardMonthly = sqliteTable('vault_leaderboard_monthly', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  monthStart: text('month_start').notNull(),
  monthEnd: text('month_end').notNull(),
  score: real('score').notNull().default(0),
  xpEarned: integer('xp_earned').notNull().default(0),
  coinsEarned: integer('coins_earned').notNull().default(0),
  challengesCompleted: integer('challenges_completed').notNull().default(0),
  rank: integer('rank'),
  rewardClaimed: integer('reward_claimed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userMonthIdx: uniqueIndex('vault_lb_monthly_user_month_idx').on(table.userId, table.monthStart),
  monthScoreIdx: index('vault_lb_monthly_month_score_idx').on(table.monthStart, table.score),
}));

export const vaultHiddenRewards = sqliteTable('vault_hidden_rewards', {
  id: text('id').primaryKey(),
  condition: text('condition').notNull().unique(),
  conditionValue: integer('condition_value').notNull(),
  rewardType: text('reward_type').notNull(),
  rewardValue: integer('reward_value'),
  rewardId: text('reward_id'),
  rewardLabel: text('reward_label').notNull(),
  isSecret: integer('is_secret', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const vaultUserHiddenRewards = sqliteTable('vault_user_hidden_rewards', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rewardId: text('reward_id').notNull().references(() => vaultHiddenRewards.condition, { onDelete: 'cascade' }),
  unlockedAt: text('unlocked_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  claimed: integer('claimed', { mode: 'boolean' }).notNull().default(false),
  claimedAt: text('claimed_at'),
}, (table) => ({
  userRewardIdx: uniqueIndex('vault_user_hidden_rewards_user_reward_idx').on(table.userId, table.rewardId),
  userIdIdx: index('vault_user_hidden_rewards_user_id_idx').on(table.userId),
}));

export const vaultQuizAttempts = sqliteTable('vault_quiz_attempts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  quizType: text('quiz_type', { enum: ['mcq', 'fill_blanks', 'daily_quiz', 'true_false'] }).notNull(),
  quizId: text('quiz_id').notNull(),
  correct: integer('correct', { mode: 'boolean' }).notNull(),
  xpAwarded: integer('xp_awarded').notNull().default(0),
  isFirstCorrect: integer('is_first_correct', { mode: 'boolean' }).notNull().default(false),
  attemptedAt: text('attempted_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userQuizIdx: uniqueIndex('vault_quiz_attempts_user_quiz_idx').on(table.userId, table.quizType, table.quizId),
  userIdIdx: index('vault_quiz_attempts_user_id_idx').on(table.userId),
}));

export const vaultProductDiscovery = sqliteTable('vault_product_discovery', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  challengeType: text('challenge_type', { enum: ['product_explorer', 'wishlist_builder', 'new_arrival_hunter', 'collection_explorer'] }).notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  completedAt: text('completed_at'),
  xpAwarded: integer('xp_awarded').notNull().default(0),
  coinsAwarded: integer('coins_awarded').notNull().default(0),
  data: text('data'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userChallengeIdx: uniqueIndex('vault_product_discovery_user_challenge_idx').on(table.userId, table.challengeType),
  userIdIdx: index('vault_product_discovery_user_id_idx').on(table.userId),
}));

export const vaultOrderRewards = sqliteTable('vault_order_rewards', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  orderId: text('order_id').notNull().unique(),
  orderAmount: real('order_amount').notNull(),
  xpAwarded: integer('xp_awarded').notNull().default(0),
  coinsAwarded: integer('coins_awarded').notNull().default(0),
  crateAwarded: text('crate_awarded'),
  processedAt: text('processed_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => ({
  userIdIdx: index('vault_order_rewards_user_id_idx').on(table.userId),
  orderIdIdx: uniqueIndex('vault_order_rewards_order_id_idx').on(table.orderId),
}));

import { users } from './db-schema';
