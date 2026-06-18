import { logger } from '../lib/logger';

export const XP_DAILY_LIMIT = 200;
export const COINS_DAILY_LIMIT = 60;
export const BASIC_CRATE_DAILY_LIMIT = 2;
export const PREMIUM_CRATE_DAILY_LIMIT = 1;

const BADGE_DEFINITIONS: Record<string, { name: string; description: string; emoji: string; category: string; rarity: string }> = {
  'vault-rookie': { name: 'Vault Rookie', description: 'Reach Level 2', emoji: '🌱', category: 'progression', rarity: 'common' },
  'quiz-master': { name: 'Quiz Master', description: '100 Correct Answers', emoji: '🧠', category: 'quiz', rarity: 'rare' },
  'streak-warrior': { name: 'Streak Warrior', description: '30-Day Streak', emoji: '🔥', category: 'streak', rarity: 'epic' },
  'vault-legend': { name: 'Vault Legend', description: '500 Correct Answers', emoji: '👑', category: 'quiz', rarity: 'legendary' },
  'collector': { name: 'Collector', description: 'Open 50 Crates', emoji: '📦', category: 'crate', rarity: 'rare' },
  'vault-elite': { name: 'Vault Elite', description: 'Reach Level 10', emoji: '💎', category: 'progression', rarity: 'epic' },
  'exclusive_badge': { name: 'Exclusive Badge', description: 'Unlocked from Premium Crate', emoji: '⭐', category: 'crate', rarity: 'legendary' },
};

const HIDDEN_REWARDS: Record<number, { rewardType: string; rewardLabel: string; rewardValue?: number }> = {
  50: { rewardType: 'crate', rewardLabel: 'Secret Crate', rewardValue: 0 },
  100: { rewardType: 'badge', rewardLabel: 'Rare Badge', rewardValue: 0 },
  250: { rewardType: 'crate', rewardLabel: 'Premium Crate', rewardValue: 0 },
  500: { rewardType: 'badge', rewardLabel: 'Vault Legend Title', rewardValue: 0 },
};

const MAX_COINS_WALLET = 999999;

export const LEVELS: Record<number, { xpRequired: number; rewardType: string; rewardValue?: number; rewardId?: string; rewardLabel: string }> = {
  1: { xpRequired: 0, rewardType: 'none', rewardLabel: 'Welcome' },
  2: { xpRequired: 100, rewardType: 'badge', rewardId: 'vault-rookie', rewardLabel: 'Vault Rookie Badge' },
  3: { xpRequired: 250, rewardType: 'coins', rewardValue: 50, rewardLabel: '50 Coins' },
  4: { xpRequired: 500, rewardType: 'crate', rewardId: 'basic', rewardLabel: 'Basic Mystery Crate' },
  5: { xpRequired: 1000, rewardType: 'coupon', rewardId: '5_PERCENT', rewardLabel: '5% Coupon' },
  6: { xpRequired: 1750, rewardType: 'coins', rewardValue: 100, rewardLabel: '100 Coins' },
  7: { xpRequired: 2750, rewardType: 'shipping', rewardLabel: 'Free Shipping Reward' },
  8: { xpRequired: 4000, rewardType: 'crate', rewardId: 'premium', rewardLabel: 'Premium Mystery Crate' },
  9: { xpRequired: 5500, rewardType: 'access', rewardLabel: 'Early Access Pass' },
  10: { xpRequired: 7500, rewardType: 'badge', rewardId: 'vault-elite', rewardLabel: 'Vault Elite Badge + Exclusive Frame' },
};

export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 10) return LEVELS[level].xpRequired;
  let xp = LEVELS[10].xpRequired;
  for (let l = 11; l <= level; l++) {
    xp = Math.round(xp * 1.25);
  }
  return xp;
}

export function getLevelForXp(xp: number): number {
  let level = 1;
  while (true) {
    const requiredXp = getXpForLevel(level + 1);
    if (xp >= requiredXp) level++;
    else break;
  }
  return level;
}

export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const CRATE_REWARD_POOLS = {
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

export function rollCrateReward(crateType: 'basic' | 'premium'): { reward: { type: string; value: any; label: string }; rarity: string } {
  const pool = CRATE_REWARD_POOLS[crateType];
  const roll = Math.random();

  let rarity: string;
  if (roll < pool.common.max) rarity = 'common';
  else if (roll < pool.uncommon.max) rarity = 'uncommon';
  else if (roll < pool.rare.max) rarity = 'rare';
  else rarity = 'legendary';

  const rarityRewards = pool.rewards[rarity as keyof typeof pool.rewards];
  if (!rarityRewards || rarityRewards.length === 0) {
    return rollCrateReward(crateType);
  }

  const rewardRoll = Math.random();
  let cumulative = 0;
  for (const r of rarityRewards) {
    cumulative += r.probability / rarityRewards.reduce((s, rr) => s + rr.probability, 0);
    if (rewardRoll <= cumulative) {
      return { reward: { type: r.type, value: r.value, label: r.label }, rarity };
    }
  }

  return { reward: rarityRewards[0], rarity };
}

const STREAK_REWARDS: Record<number, { xp: number; coins: number; crate?: string; badge?: string }> = {
  3: { xp: 25, coins: 10 },
  7: { xp: 50, coins: 25 },
  14: { xp: 0, coins: 0, crate: 'basic' },
  30: { xp: 0, coins: 0, badge: 'streak-warrior' },
  60: { xp: 0, coins: 0, crate: 'premium' },
  100: { xp: 0, coins: 0, badge: 'vault-legend' },
};



export interface VaultUserState {
  xp: number;
  level: number;
  vaultCoins: number;
  streakDays: number;
  lastActivityDate: string | null;
  lastLoginDate: string | null;
  lastLoginClaim: string | null;
  bonusStreakTokens: number;
  correctAnswers: number;
  cratesOpened: number;
  dailyXpEarned: number;
  dailyCoinsEarned: number;
  dailyResetDate: string | null;
  dailyBasicCratesOpened: number;
  dailyPremiumCratesOpened: number;
  dailyCouponsUsed: number;
  totalXpEarned: number;
  totalCoinsEarned: number;
  leaderboardScore: number;
}

export function createDefaultVaultState(): VaultUserState {
  return {
    xp: 0,
    level: 1,
    vaultCoins: 0,
    streakDays: 0,
    lastActivityDate: null,
    lastLoginDate: null,
    lastLoginClaim: null,
    bonusStreakTokens: 0,
    correctAnswers: 0,
    cratesOpened: 0,
    dailyXpEarned: 0,
    dailyCoinsEarned: 0,
    dailyResetDate: null,
    dailyBasicCratesOpened: 0,
    dailyPremiumCratesOpened: 0,
    dailyCouponsUsed: 0,
    totalXpEarned: 0,
    totalCoinsEarned: 0,
    leaderboardScore: 0,
  };
}

export function checkDailyReset(state: VaultUserState): VaultUserState {
  const today = getTodayDate();
  if (state.dailyResetDate !== today) {
    return {
      ...state,
      dailyXpEarned: 0,
      dailyCoinsEarned: 0,
      dailyBasicCratesOpened: 0,
      dailyPremiumCratesOpened: 0,
      dailyCouponsUsed: 0,
      dailyResetDate: today,
    };
  }
  return state;
}

function checkStreak(state: VaultUserState, activityDate: string): { streakDays: number; streakBroken: boolean } {
  const lastDate = state.lastActivityDate;
  if (!lastDate) return { streakDays: 1, streakBroken: false };

  const last = new Date(lastDate);
  const today = new Date(activityDate);
  const diffMs = today.getTime() - last.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 0) return { streakDays: state.streakDays, streakBroken: false };
  if (diffDays === 1) return { streakDays: state.streakDays + 1, streakBroken: false };

  if (state.bonusStreakTokens > 0) {
    return { streakDays: state.streakDays + 1, streakBroken: false };
  }

  return { streakDays: 1, streakBroken: true };
}

export interface RewardResult {
  success: boolean;
  xpAwarded: number;
  coinsAwarded: number;
  leveledUp: boolean;
  newLevel: number;
  pendingLevelRewards: number[];
  streakMilestone?: { day: number; reward: { xp: number; coins: number; crate?: string; badge?: string } } | null;
  hiddenReward?: { condition: number; rewardLabel: string } | null;
  error?: string;
}

export function processXpReward(
  state: VaultUserState,
  xpAmount: number,
): { state: VaultUserState; leveledUp: boolean; newLevel: number; pendingRewards: number[] } {
  state = checkDailyReset(state);
  const remainingXp = Math.max(0, XP_DAILY_LIMIT - state.dailyXpEarned);
  const actualXp = Math.min(xpAmount, remainingXp);

  if (actualXp <= 0) return { state, leveledUp: false, newLevel: state.level, pendingRewards: [] };

  const prevLevel = state.level;
  const newXp = state.xp + actualXp;
  const newLevel = getLevelForXp(newXp);
  const leveledUp = newLevel > prevLevel;

  const pendingRewards: number[] = [];
  if (leveledUp) {
    for (let l = prevLevel + 1; l <= newLevel; l++) {
      if (LEVELS[l] && LEVELS[l].rewardType !== 'none') {
        pendingRewards.push(l);
      }
    }
  }

  state = {
    ...state,
    xp: newXp,
    level: newLevel,
    dailyXpEarned: state.dailyXpEarned + actualXp,
    totalXpEarned: state.totalXpEarned + actualXp,
    lastActivityDate: getTodayDate(),
  };

  return { state, leveledUp, newLevel, pendingRewards };
}

export function processCoinReward(
  state: VaultUserState,
  amount: number,
): { state: VaultUserState; actualAwarded: number } {
  state = checkDailyReset(state);
  const remaining = Math.max(0, COINS_DAILY_LIMIT - state.dailyCoinsEarned);
  const actual = Math.min(amount, remaining);
  const newBalance = Math.min(state.vaultCoins + actual, MAX_COINS_WALLET);
  const actualAwarded = newBalance - state.vaultCoins;

  state = {
    ...state,
    vaultCoins: newBalance,
    dailyCoinsEarned: state.dailyCoinsEarned + actualAwarded,
    totalCoinsEarned: state.totalCoinsEarned + actualAwarded,
  };

  return { state, actualAwarded };
}

export function processMcqAnswer(
  state: VaultUserState,
  isCorrect: boolean,
  isFirstCorrect: boolean,
): RewardResult & { state: VaultUserState } {
  if (!isCorrect) {
    return {
      success: false,
      xpAwarded: 0,
      coinsAwarded: 0,
      leveledUp: false,
      newLevel: state.level,
      pendingLevelRewards: [],
      state,
    };
  }

  if (!isFirstCorrect) {
    return {
      success: false,
      xpAwarded: 0,
      coinsAwarded: 0,
      leveledUp: false,
      newLevel: state.level,
      pendingLevelRewards: [],
      state,
    };
  }

  state = { ...state, correctAnswers: state.correctAnswers + 1 };
  const xpResult = processXpReward(state, 10);
  state = xpResult.state;
  const hiddenReward = checkHiddenRewards(state.correctAnswers);

  return {
    success: true,
    xpAwarded: 10,
    coinsAwarded: 0,
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    pendingLevelRewards: xpResult.pendingRewards,
    state,
    hiddenReward,
  };
}

export function processFillBlanksAnswer(
  state: VaultUserState,
  isCorrect: boolean,
  isFirstCorrect: boolean,
): RewardResult & { state: VaultUserState } {
  if (!isCorrect || !isFirstCorrect) {
    return {
      success: false,
      xpAwarded: 0,
      coinsAwarded: 0,
      leveledUp: false,
      newLevel: state.level,
      pendingLevelRewards: [],
      state,
    };
  }

  state = { ...state, correctAnswers: state.correctAnswers + 1 };
  const xpResult = processXpReward(state, 15);
  state = xpResult.state;
  const hiddenReward = checkHiddenRewards(state.correctAnswers);

  return {
    success: true,
    xpAwarded: 15,
    coinsAwarded: 0,
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    pendingLevelRewards: xpResult.pendingRewards,
    state,
    hiddenReward,
  };
}

export function processDailyQuiz(
  state: VaultUserState,
  alreadyCompleted: boolean,
): RewardResult & { state: VaultUserState } {
  if (alreadyCompleted) {
    return {
      success: false,
      xpAwarded: 0,
      coinsAwarded: 0,
      leveledUp: false,
      newLevel: state.level,
      pendingLevelRewards: [],
      state,
      error: 'Daily quiz already completed today',
    };
  }

  const xpResult = processXpReward(state, 50);
  state = xpResult.state;

  return {
    success: true,
    xpAwarded: 50,
    coinsAwarded: 0,
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    pendingLevelRewards: xpResult.pendingRewards,
    state,
  };
}

export function processDailyLogin(
  state: VaultUserState,
): RewardResult & { state: VaultUserState; coinResult: { actualAwarded: number } } {
  const today = getTodayDate();
  if (state.lastLoginClaim === today) {
    const coinResult = { actualAwarded: 0 };
    return {
      success: false,
      xpAwarded: 0,
      coinsAwarded: 0,
      leveledUp: false,
      newLevel: state.level,
      pendingLevelRewards: [],
      state,
      coinResult,
      error: 'Daily login already claimed today',
    };
  }

  state = { ...state, lastLoginDate: today, lastLoginClaim: today };

  const streakResult = checkStreak(state, today);
  state.streakDays = streakResult.streakDays;

  const xpResult = processXpReward(state, 20);
  state = xpResult.state;

  const coinResult = processCoinReward(state, 5);
  state = coinResult.state;

  const streakMilestone = getStreakMilestone(state.streakDays);
  if (streakMilestone) {
    const msXpResult = processXpReward(state, streakMilestone.xp);
    state = msXpResult.state;
    const msCoinResult = processCoinReward(state, streakMilestone.coins);
    state = msCoinResult.state;
  }

  return {
    success: true,
    xpAwarded: 20 + (streakMilestone?.xp || 0),
    coinsAwarded: 5 + (streakMilestone?.coins || 0),
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    pendingLevelRewards: xpResult.pendingRewards,
    streakMilestone: streakMilestone ? { day: state.streakDays, reward: streakMilestone } : null,
    state,
    coinResult,
  };
}

export function processQuizCompletion(
  state: VaultUserState,
  alreadyClaimed: boolean,
): RewardResult & { state: VaultUserState } {
  if (alreadyClaimed) {
    return {
      success: false,
      xpAwarded: 0,
      coinsAwarded: 0,
      leveledUp: false,
      newLevel: state.level,
      pendingLevelRewards: [],
      state,
      error: 'Quiz set already claimed',
    };
  }

  const coinResult = processCoinReward(state, 10);
  state = coinResult.state;

  return {
    success: true,
    xpAwarded: 0,
    coinsAwarded: coinResult.actualAwarded,
    leveledUp: false,
    newLevel: state.level,
    pendingLevelRewards: [],
    state,
  };
}

export function processReferral(
  state: VaultUserState,
  isUnique: boolean,
  isSelfReferral: boolean,
): RewardResult & { state: VaultUserState } {
  if (isSelfReferral || !isUnique) {
    return {
      success: false,
      xpAwarded: 0,
      coinsAwarded: 0,
      leveledUp: false,
      newLevel: state.level,
      pendingLevelRewards: [],
      state,
      error: isSelfReferral ? 'Self-referrals are not allowed' : 'Referral already used',
    };
  }

  const coinResult = processCoinReward(state, 100);
  state = coinResult.state;

  return {
    success: true,
    xpAwarded: 0,
    coinsAwarded: coinResult.actualAwarded,
    leveledUp: false,
    newLevel: state.level,
    pendingLevelRewards: [],
    state,
  };
}

function checkHiddenRewards(correctAnswers: number): { condition: number; rewardLabel: string } | null {
  const threshold = Object.keys(HIDDEN_REWARDS).map(Number).sort((a, b) => a - b);
  for (const t of threshold) {
    if (correctAnswers === t) {
      return { condition: t, rewardLabel: HIDDEN_REWARDS[t].rewardLabel };
    }
  }
  return null;
}

function getStreakMilestone(streakDays: number): { xp: number; coins: number; crate?: string; badge?: string } | null {
  return STREAK_REWARDS[streakDays] || null;
}

export function processCrateOpen(
  state: VaultUserState,
  crateType: 'basic' | 'premium',
): {
  success: boolean;
  reward: { type: string; value: any; label: string } | null;
  rarity: string;
  state: VaultUserState;
  error?: string;
} {
  state = checkDailyReset(state);

  if (crateType === 'basic' && state.dailyBasicCratesOpened >= BASIC_CRATE_DAILY_LIMIT) {
    return { success: false, reward: null, rarity: '', state, error: 'Daily basic crate limit reached' };
  }
  if (crateType === 'premium' && state.dailyPremiumCratesOpened >= PREMIUM_CRATE_DAILY_LIMIT) {
    return { success: false, reward: null, rarity: '', state, error: 'Daily premium crate limit reached' };
  }

  const result = rollCrateReward(crateType);
  const { reward, rarity } = result;

  if (reward.type === 'xp') {
    const xpRes = processXpReward(state, reward.value);
    state = xpRes.state;
  } else if (reward.type === 'coins') {
    const coinRes = processCoinReward(state, reward.value);
    state = coinRes.state;
  }

  state = {
    ...state,
    cratesOpened: state.cratesOpened + 1,
    dailyBasicCratesOpened: crateType === 'basic' ? state.dailyBasicCratesOpened + 1 : state.dailyBasicCratesOpened,
    dailyPremiumCratesOpened: crateType === 'premium' ? state.dailyPremiumCratesOpened + 1 : state.dailyPremiumCratesOpened,
  };

  return { success: true, reward, rarity, state };
}

export function processLevelRewardClaim(
  state: VaultUserState,
  level: number,
  previouslyClaimed: boolean,
): {
  success: boolean;
  reward: { type: string; value?: number; id?: string; label: string } | null;
  state: VaultUserState;
  error?: string;
} {
  if (previouslyClaimed) {
    return { success: false, reward: null, state, error: 'Level reward already claimed' };
  }

  const levelConfig = LEVELS[level];
  if (!levelConfig || levelConfig.rewardType === 'none') {
    return { success: false, reward: null, state, error: 'No reward for this level' };
  }

  if (state.level < level) {
    return { success: false, reward: null, state, error: 'Level not reached yet' };
  }

  if (levelConfig.rewardType === 'coins' && levelConfig.rewardValue) {
    const coinRes = processCoinReward(state, levelConfig.rewardValue);
    state = coinRes.state;
  }

  return {
    success: true,
    reward: { type: levelConfig.rewardType, value: levelConfig.rewardValue, id: levelConfig.rewardId, label: levelConfig.rewardLabel },
    state,
  };
}

export function processCouponUsage(
  state: VaultUserState,
): VaultUserState {
  state = checkDailyReset(state);
  return {
    ...state,
    dailyCouponsUsed: state.dailyCouponsUsed + 1,
  };
}

export function processPurchaseReward(
  state: VaultUserState,
  orderAmount: number,
  alreadyProcessed: boolean,
): {
  xpAwarded: number;
  coinsAwarded: number;
  crateAwarded: string | null;
  premiumCrateChance: boolean;
  state: VaultUserState;
} {
  if (alreadyProcessed) {
    return { xpAwarded: 0, coinsAwarded: 0, crateAwarded: null, premiumCrateChance: false, state };
  }

  let xp = 0;
  let coins = 0;
  let crateAwarded: string | null = null;
  let premiumCrateChance = false;

  if (orderAmount >= 3500) {
    xp = 200;
    coins = 50;
    premiumCrateChance = true;
  } else if (orderAmount >= 2000) {
    xp = 100;
    coins = 50;
  } else if (orderAmount >= 1000) {
    xp = 50;
    coins = 25;
  } else if (orderAmount >= 500) {
    xp = 25;
    coins = 10;
  }

  const xpRes = processXpReward(state, xp);
  state = xpRes.state;

  const coinRes = processCoinReward(state, coins);
  state = coinRes.state;

  if (premiumCrateChance && Math.random() < 0.20) {
    crateAwarded = 'premium';
  }

  return { xpAwarded: xp, coinsAwarded: coinRes.actualAwarded, crateAwarded, premiumCrateChance, state };
}

export function processProductDiscovery(
  state: VaultUserState,
  challengeType: string,
  requirementMet: boolean,
  alreadyCompleted: boolean,
): {
  success: boolean;
  xpAwarded: number;
  state: VaultUserState;
  error?: string;
} {
  if (alreadyCompleted) {
    return { success: false, xpAwarded: 0, state, error: 'Challenge already completed today' };
  }
  if (!requirementMet) {
    return { success: false, xpAwarded: 0, state, error: 'Requirement not met' };
  }

  const xpMap: Record<string, number> = {
    product_explorer: 15,
    wishlist_builder: 25,
    new_arrival_hunter: 20,
    collection_explorer: 15,
  };

  const xpAmount = xpMap[challengeType] || 15;
  const xpRes = processXpReward(state, xpAmount);
  state = xpRes.state;

  return { success: true, xpAwarded: xpRes.leveledUp ? xpAmount : xpAmount, state };
}

export function calculateLeaderboardScore(xp: number, coins: number, challengesCompleted: number): number {
  return xp + coins + (challengesCompleted * 10);
}

export function checkDailyLimits(
  xpAmount: number,
  coinsAmount: number,
  dailyXp: number,
  dailyCoins: number,
): { xpAllowed: number; coinsAllowed: number } {
  const xpAllowed = Math.min(xpAmount, Math.max(0, XP_DAILY_LIMIT - dailyXp));
  const coinsAllowed = Math.min(coinsAmount, Math.max(0, COINS_DAILY_LIMIT - dailyCoins));
  return { xpAllowed, coinsAllowed };
}
