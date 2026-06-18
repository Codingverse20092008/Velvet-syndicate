import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from './api'

const today = () => new Date().toISOString().slice(0, 10)
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10)

const XP_DAILY_LIMIT = 200
const COINS_DAILY_LIMIT = 60
const MAX_COINS_WALLET = 999999
const BASIC_CRATE_DAILY_LIMIT = 2
const PREMIUM_CRATE_DAILY_LIMIT = 1

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
}

export function getXpForLevel(level: number): number {
  if (level <= 1) return 0
  if (level <= 10) return LEVELS[level].xpRequired
  let xp = LEVELS[10].xpRequired
  for (let l = 11; l <= level; l++) {
    xp = Math.round(xp * 1.25)
  }
  return xp
}

export function getLevelForXp(xp: number): number {
  let level = 1
  while (true) {
    if (xp >= getXpForLevel(level + 1)) level++
    else break
  }
  return level
}

const STREAK_REWARDS: Record<number, { xp: number; coins: number; crate?: 'basic' | 'premium'; badge?: string }> = {
  3: { xp: 25, coins: 10 },
  7: { xp: 50, coins: 25 },
  14: { xp: 0, coins: 0, crate: 'basic' },
  30: { xp: 0, coins: 0, badge: 'streak-warrior' },
  60: { xp: 0, coins: 0, crate: 'premium' },
  100: { xp: 0, coins: 0, badge: 'vault-legend' },
}

const HIDDEN_REWARDS: Record<number, { rewardType: string; rewardLabel: string }> = {
  50: { rewardType: 'crate', rewardLabel: 'Secret Crate' },
  100: { rewardType: 'badge', rewardLabel: 'Rare Badge' },
  250: { rewardType: 'crate', rewardLabel: 'Premium Crate' },
  500: { rewardType: 'badge', rewardLabel: 'Vault Legend Title' },
}

export type RewardType = 'xp' | 'coins' | 'coupon' | 'shipping' | 'badge' | 'crate' | 'access' | 'badge_fragment' | 'streak_token'

export interface VaultState {
  xp: number
  level: number
  vaultCoins: number
  streakDays: number
  lastActivityDate: string | null
  lastLoginDate: string | null
  lastLoginClaim: string | null
  bonusStreakTokens: number
  correctAnswers: number
  cratesOpened: number
  totalXpEarned: number
  totalCoinsEarned: number
  dailyXpEarned: number
  dailyCoinsEarned: number
  dailyBasicCratesOpened: number
  dailyPremiumCratesOpened: number
  dailyCouponsUsed: number
  dailyResetDate: string | null
  dailyQuizCompleted: boolean
  pendingLevelRewards: { level: number; rewardType: string; rewardLabel: string; claimed: boolean }[]
  ownedBadges: string[]
  crateHistory: { id: string; crateType: 'basic' | 'premium'; rewardLabel: string; rarity: string; date: string }[]
  unlockedHiddenRewards: string[]
  processedOrderIds: string[]
  claimedChallenges: string[]
}

interface VaultActions {
  checkDailyReset: () => void
  getLevelProgress: () => { currentLevel: number; currentXp: number; nextLevelXp: number; progressPercent: number }
  addXp: (amount: number) => { leveledUp: boolean; newLevel: number; pendingRewards: number[] }
  addCoins: (amount: number) => number
  processMcqAnswer: (isCorrect: boolean, isFirstCorrect: boolean) => { success: boolean; xpAwarded: number; hiddenReward?: { condition: number; rewardLabel: string } | null }
  processFillBlanksAnswer: (isCorrect: boolean, isFirstCorrect: boolean) => { success: boolean; xpAwarded: number; hiddenReward?: { condition: number; rewardLabel: string } | null }
  processDailyQuiz: () => { success: boolean; xpAwarded: number }
  claimDailyLogin: () => { success: boolean; xpAwarded: number; coinsAwarded: number; streakMilestone?: { day: number; reward: { xp: number; coins: number; crate?: string; badge?: string } } | null }
  claimQuizCompletion: () => { success: boolean; coinsAwarded: number }
  openCrate: (crateType: 'basic' | 'premium') => { success: boolean; reward: { type: RewardType; value: any; label: string } | null; rarity: string }
  claimLevelReward: (level: number) => { success: boolean; reward: { type: string; value?: number; id?: string; label: string } | null }
  processPurchaseReward: (orderAmount: number) => { xpAwarded: number; coinsAwarded: number; crateAwarded: string | null }
  processProductDiscovery: (challengeType: string, requirementMet: boolean) => { success: boolean; xpAwarded: number }
  checkStreak: (activityDate: string) => { streakDays: number; streakBroken: boolean }
  useStreakToken: () => boolean
  addStreakToken: (amount?: number) => void
  resetDaily: () => void
  getLeaderboardScore: () => number
  getLimits: () => { dailyXpRemaining: number; dailyCoinsRemaining: number; basicCratesRemaining: number; premiumCratesRemaining: number }
}

export type VaultStore = VaultState & VaultActions

function checkStreakImpl(state: VaultState, activityDate: string): { streakDays: number; streakBroken: boolean } {
  const lastDate = state.lastActivityDate
  if (!lastDate) return { streakDays: 1, streakBroken: false }

  const last = new Date(lastDate + 'T00:00:00')
  const today = new Date(activityDate + 'T00:00:00')
  const diffMs = today.getTime() - last.getTime()
  const diffDays = Math.round(diffMs / 86400000)

  if (diffDays === 0) return { streakDays: state.streakDays, streakBroken: false }
  if (diffDays === 1) return { streakDays: state.streakDays + 1, streakBroken: false }

  if (state.bonusStreakTokens > 0) {
    return { streakDays: state.streakDays + 1, streakBroken: false }
  }

  return { streakDays: 1, streakBroken: true }
}

function getStreakMilestone(streakDays: number): { day: number; reward: { xp: number; coins: number; crate?: string; badge?: string } } | null {
  const reward = STREAK_REWARDS[streakDays]
  if (!reward) return null
  return { day: streakDays, reward }
}

function checkHiddenReward(correctAnswers: number): { condition: number; rewardLabel: string } | null {
  const thresholds = Object.keys(HIDDEN_REWARDS).map(Number).sort((a, b) => a - b)
  for (const t of thresholds) {
    if (correctAnswers === t) {
      return { condition: t, rewardLabel: HIDDEN_REWARDS[t].rewardLabel }
    }
  }
  return null
}

const CRATE_REWARD_POOLS = {
  basic: {
    rewards: [
      { type: 'xp' as RewardType, value: 25, label: '25 XP', probability: 0.30, rarity: 'common' },
      { type: 'xp' as RewardType, value: 50, label: '50 XP', probability: 0.25, rarity: 'common' },
      { type: 'coins' as RewardType, value: 25, label: '25 Coins', probability: 0.20, rarity: 'common' },
      { type: 'coupon' as RewardType, value: '5_PERCENT', label: '5% Coupon', probability: 0.15, rarity: 'uncommon' },
      { type: 'shipping' as RewardType, value: true, label: 'Free Shipping', probability: 0.08, rarity: 'rare' },
      { type: 'badge_fragment' as RewardType, value: 'rare_badge', label: 'Rare Badge Fragment', probability: 0.02, rarity: 'legendary' },
    ],
  },
  premium: {
    rewards: [
      { type: 'xp' as RewardType, value: 100, label: '100 XP', probability: 0.25, rarity: 'common' },
      { type: 'coins' as RewardType, value: 100, label: '100 Coins', probability: 0.25, rarity: 'common' },
      { type: 'coupon' as RewardType, value: '10_PERCENT', label: '10% Coupon', probability: 0.20, rarity: 'uncommon' },
      { type: 'access' as RewardType, value: 'early_access', label: 'Early Access Pass', probability: 0.15, rarity: 'rare' },
      { type: 'badge' as RewardType, value: 'exclusive_badge', label: 'Exclusive Badge', probability: 0.10, rarity: 'rare' },
      { type: 'streak_token' as RewardType, value: 1, label: 'Bonus Streak Token', probability: 0.05, rarity: 'legendary' },
    ],
  },
}

function rollCrateReward(crateType: 'basic' | 'premium'): { reward: { type: RewardType; value: any; label: string }; rarity: string } {
  const pool = CRATE_REWARD_POOLS[crateType]
  const roll = Math.random()
  let cumulative = 0
  for (const r of pool.rewards) {
    cumulative += r.probability
    if (roll <= cumulative) {
      return { reward: { type: r.type, value: r.value, label: r.label }, rarity: r.rarity }
    }
  }
  return { reward: pool.rewards[pool.rewards.length - 1], rarity: pool.rewards[pool.rewards.length - 1].rarity }
}

export const useVaultStore = create<VaultStore>()(
  persist(
    (set, get) => ({
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
      totalXpEarned: 0,
      totalCoinsEarned: 0,
      dailyXpEarned: 0,
      dailyCoinsEarned: 0,
      dailyBasicCratesOpened: 0,
      dailyPremiumCratesOpened: 0,
      dailyCouponsUsed: 0,
      dailyResetDate: null,
      dailyQuizCompleted: false,
      pendingLevelRewards: [],
      ownedBadges: [],
      crateHistory: [],
      unlockedHiddenRewards: [],
      processedOrderIds: [],
      claimedChallenges: [],

      checkDailyReset: () => {
        const state = get()
        const todayDate = today()
        if (state.dailyResetDate !== todayDate) {
          set({
            dailyXpEarned: 0,
            dailyCoinsEarned: 0,
            dailyBasicCratesOpened: 0,
            dailyPremiumCratesOpened: 0,
            dailyCouponsUsed: 0,
            dailyQuizCompleted: false,
            dailyResetDate: todayDate,
          })
        }
      },

      getLevelProgress: () => {
        const state = get()
        state.checkDailyReset()
        const currentLevel = getLevelForXp(state.xp)
        const nextLevelXp = getXpForLevel(currentLevel + 1)
        const currentLevelXpStart = getXpForLevel(currentLevel)
        const progress = state.xp - currentLevelXpStart
        const needed = nextLevelXp - currentLevelXpStart
        return {
          currentLevel,
          currentXp: state.xp,
          nextLevelXp,
          progressPercent: needed > 0 ? Math.min((progress / needed) * 100, 100) : 100,
        }
      },

      addXp: (amount) => {
        const state = get()
        state.checkDailyReset()
        const remaining = Math.max(0, XP_DAILY_LIMIT - state.dailyXpEarned)
        const actual = Math.min(amount, remaining)
        if (actual <= 0) return { leveledUp: false, newLevel: state.level, pendingRewards: [] }

        const prevLevel = getLevelForXp(state.xp)
        const newXp = state.xp + actual
        const newLevel = getLevelForXp(newXp)
        const leveledUp = newLevel > prevLevel

        const pendingRewards: number[] = []
        if (leveledUp) {
          for (let l = prevLevel + 1; l <= newLevel; l++) {
            pendingRewards.push(l)
          }
        }

        set({
          xp: newXp,
          level: newLevel,
          dailyXpEarned: state.dailyXpEarned + actual,
          totalXpEarned: state.totalXpEarned + actual,
          lastActivityDate: today(),
          pendingLevelRewards: [
            ...state.pendingLevelRewards,
            ...pendingRewards.map(l => ({
              level: l,
              rewardType: LEVELS[l]?.rewardType || 'none',
              rewardLabel: LEVELS[l]?.rewardLabel || '',
              claimed: false,
            })),
          ],
        })

        return { leveledUp, newLevel, pendingRewards }
      },

      addCoins: (amount) => {
        const state = get()
        state.checkDailyReset()
        const remaining = Math.max(0, COINS_DAILY_LIMIT - state.dailyCoinsEarned)
        const actual = Math.min(amount, remaining)
        const newBalance = Math.min(state.vaultCoins + actual, MAX_COINS_WALLET)
        const actualAwarded = newBalance - state.vaultCoins

        if (actualAwarded <= 0) return 0

        set({
          vaultCoins: newBalance,
          dailyCoinsEarned: state.dailyCoinsEarned + actualAwarded,
          totalCoinsEarned: state.totalCoinsEarned + actualAwarded,
        })

        return actualAwarded
      },

      processMcqAnswer: (isCorrect, isFirstCorrect) => {
        const state = get()
        if (!isCorrect || !isFirstCorrect) {
          return { success: false, xpAwarded: 0 }
        }

        set({ correctAnswers: state.correctAnswers + 1 })
        const result = get().addXp(10)
        const hiddenReward = checkHiddenReward(state.correctAnswers + 1)

        if (hiddenReward && !state.unlockedHiddenRewards.includes(hiddenReward.condition.toString())) {
          set({ unlockedHiddenRewards: [...state.unlockedHiddenRewards, hiddenReward.condition.toString()] })
        }

        return { success: true, xpAwarded: 10, hiddenReward }
      },

      processFillBlanksAnswer: (isCorrect, isFirstCorrect) => {
        const state = get()
        if (!isCorrect || !isFirstCorrect) {
          return { success: false, xpAwarded: 0 }
        }

        set({ correctAnswers: state.correctAnswers + 1 })
        const result = get().addXp(15)
        const hiddenReward = checkHiddenReward(state.correctAnswers + 1)

        if (hiddenReward && !state.unlockedHiddenRewards.includes(hiddenReward.condition.toString())) {
          set({ unlockedHiddenRewards: [...state.unlockedHiddenRewards, hiddenReward.condition.toString()] })
        }

        return { success: true, xpAwarded: 15, hiddenReward }
      },

      processDailyQuiz: () => {
        const state = get()
        state.checkDailyReset()
        if (state.dailyQuizCompleted) {
          return { success: false, xpAwarded: 0 }
        }

        const result = get().addXp(50)
        set({ dailyQuizCompleted: true })
        return { success: true, xpAwarded: 50 }
      },

      claimDailyLogin: () => {
        const state = get()
        const todayDate = today()
        if (state.lastLoginClaim === todayDate) {
          return { success: false, xpAwarded: 0, coinsAwarded: 0 }
        }

        const streakResult = checkStreakImpl(state, todayDate)
        const xpResult = get().addXp(20)
        const coinsAwarded = get().addCoins(5)
        const streakMilestone = getStreakMilestone(streakResult.streakDays)

        if (streakMilestone) {
          get().addXp(streakMilestone.reward.xp)
          const msCoins = get().addCoins(streakMilestone.reward.coins)
          if (streakMilestone.reward.badge && !state.ownedBadges.includes(streakMilestone.reward.badge)) {
            set({ ownedBadges: [...state.ownedBadges, streakMilestone.reward.badge] })
          }
        }

        set({
          streakDays: streakResult.streakDays,
          lastActivityDate: todayDate,
          lastLoginDate: todayDate,
          lastLoginClaim: todayDate,
        })

        return {
          success: true,
          xpAwarded: 20 + (streakMilestone?.reward.xp || 0),
          coinsAwarded: 5 + (streakMilestone?.reward.coins || 0),
          streakMilestone,
        }
      },

      claimQuizCompletion: () => {
        const state = get()
        const coinsAwarded = get().addCoins(10)
        return { success: coinsAwarded > 0, coinsAwarded }
      },

      openCrate: (crateType) => {
        const state = get()
        state.checkDailyReset()

        if (crateType === 'basic' && state.dailyBasicCratesOpened >= BASIC_CRATE_DAILY_LIMIT) {
          return { success: false, reward: null, rarity: '' }
        }
        if (crateType === 'premium' && state.dailyPremiumCratesOpened >= PREMIUM_CRATE_DAILY_LIMIT) {
          return { success: false, reward: null, rarity: '' }
        }

        const { reward, rarity } = rollCrateReward(crateType)

        if (reward.type === 'xp') {
          get().addXp(reward.value)
        } else if (reward.type === 'coins') {
          get().addCoins(reward.value)
        } else if (reward.type === 'badge' && !state.ownedBadges.includes(reward.value)) {
          set({ ownedBadges: [...state.ownedBadges, reward.value] })
        } else if (reward.type === 'badge' && state.ownedBadges.includes(reward.value)) {
          const convertedCoins = get().addCoins(200)
          return {
            success: true,
            reward: { type: 'coins' as RewardType, value: convertedCoins, label: `${200} Coins (Duplicate Badge Protection)` },
            rarity,
          }
        } else if (reward.type === 'streak_token') {
          set({ bonusStreakTokens: Math.min((state.bonusStreakTokens || 0) + reward.value, 3) })
        }

        const historyEntry = {
          id: crypto.randomUUID(),
          crateType,
          rewardLabel: reward.label,
          rarity,
          date: today(),
        }

        set({
          cratesOpened: state.cratesOpened + 1,
          dailyBasicCratesOpened: crateType === 'basic' ? state.dailyBasicCratesOpened + 1 : state.dailyBasicCratesOpened,
          dailyPremiumCratesOpened: crateType === 'premium' ? state.dailyPremiumCratesOpened + 1 : state.dailyPremiumCratesOpened,
          crateHistory: [historyEntry, ...state.crateHistory].slice(0, 100),
        })

        return { success: true, reward, rarity }
      },

      claimLevelReward: (level) => {
        const state = get()
        const pending = state.pendingLevelRewards.find(r => r.level === level)
        if (!pending || pending.claimed) {
          return { success: false, reward: null }
        }

        const levelConfig = LEVELS[level]
        if (!levelConfig || levelConfig.rewardType === 'none') {
          return { success: false, reward: null }
        }

        if (getLevelForXp(state.xp) < level) {
          return { success: false, reward: null }
        }

        if (levelConfig.rewardType === 'coins' && levelConfig.rewardValue) {
          get().addCoins(levelConfig.rewardValue)
        }

        if (levelConfig.rewardType === 'badge' && levelConfig.rewardId && !state.ownedBadges.includes(levelConfig.rewardId)) {
          set({ ownedBadges: [...state.ownedBadges, levelConfig.rewardId] })
        }

        set({
          pendingLevelRewards: state.pendingLevelRewards.map(r =>
            r.level === level ? { ...r, claimed: true } : r
          ),
        })

        return {
          success: true,
          reward: { type: levelConfig.rewardType, value: levelConfig.rewardValue, id: levelConfig.rewardId, label: levelConfig.rewardLabel },
        }
      },

      processPurchaseReward: (orderAmount) => {
        const state = get()

        let xp = 0
        let coins = 0
        let crateAwarded: string | null = null

        if (orderAmount >= 3500) {
          xp = 200
          coins = 50
          if (Math.random() < 0.20) crateAwarded = 'premium'
        } else if (orderAmount >= 2000) {
          xp = 100
          coins = 50
        } else if (orderAmount >= 1000) {
          xp = 50
          coins = 25
        } else if (orderAmount >= 500) {
          xp = 25
          coins = 10
        }

        if (xp > 0) get().addXp(xp)
        if (coins > 0) get().addCoins(coins)

        return { xpAwarded: xp, coinsAwarded: coins, crateAwarded }
      },

      processProductDiscovery: (challengeType, requirementMet) => {
        const state = get()
        if (state.claimedChallenges.includes(challengeType)) {
          return { success: false, xpAwarded: 0 }
        }
        if (!requirementMet) {
          return { success: false, xpAwarded: 0 }
        }

        const xpMap: Record<string, number> = {
          product_explorer: 15,
          wishlist_builder: 25,
          new_arrival_hunter: 20,
          collection_explorer: 15,
        }

        const xpAmount = xpMap[challengeType] || 15
        get().addXp(xpAmount)
        set({ claimedChallenges: [...state.claimedChallenges, challengeType] })

        return { success: true, xpAwarded: xpAmount }
      },

      checkStreak: (activityDate) => {
        return checkStreakImpl(get(), activityDate)
      },

      useStreakToken: () => {
        const state = get()
        if ((state.bonusStreakTokens || 0) <= 0) return false
        set({ bonusStreakTokens: state.bonusStreakTokens - 1 })
        return true
      },

      addStreakToken: (amount = 1) => {
        const state = get()
        set({ bonusStreakTokens: Math.min((state.bonusStreakTokens || 0) + amount, 3) })
      },

      resetDaily: () => {
        set({
          dailyXpEarned: 0,
          dailyCoinsEarned: 0,
          dailyBasicCratesOpened: 0,
          dailyPremiumCratesOpened: 0,
          dailyCouponsUsed: 0,
          dailyQuizCompleted: false,
          dailyResetDate: today(),
          claimedChallenges: [],
        })
      },

      getLeaderboardScore: () => {
        const state = get()
        return state.totalXpEarned + state.totalCoinsEarned + (state.cratesOpened * 10)
      },

      getLimits: () => {
        const state = get()
        return {
          dailyXpRemaining: Math.max(0, XP_DAILY_LIMIT - state.dailyXpEarned),
          dailyCoinsRemaining: Math.max(0, COINS_DAILY_LIMIT - state.dailyCoinsEarned),
          basicCratesRemaining: Math.max(0, BASIC_CRATE_DAILY_LIMIT - state.dailyBasicCratesOpened),
          premiumCratesRemaining: Math.max(0, PREMIUM_CRATE_DAILY_LIMIT - state.dailyPremiumCratesOpened),
        }
      },
    }),
    {
      name: 'velvet-vault-store',
    }
  )
)
