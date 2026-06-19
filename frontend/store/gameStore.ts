import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { EVENTS_CONFIG, getLevelForXp, getXpForLevel } from '@/lib/eventConfig'
import { api } from '@/lib/api'

const today = () => new Date().toISOString().slice(0, 10)
const yesterday = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

// ─── Heat Event Badge IDs ─────────────────────────────────────────────────────
export const HEAT_BADGE_IDS = [
  'heat-rookie',
  'heat-hunter',
  'heatwave-survivor',
  'sun-chaser',
  'meltdown-master',
  'vault-legend',
  'exclusive-shopper',
  'og-participant',
  'heatwave-survivor-top100',
  'exclusive-event-frame',
  'premium-event-badge',
  'king-of-the-heat',
  'exclusive-event-badge',
  'heat-king-title',
  'golden-event-frame',
] as const
export type HeatBadgeId = typeof HEAT_BADGE_IDS[number]

// ─── State Interface ──────────────────────────────────────────────────────────
interface GameState {
  // Existing Velvet Vault fields
  points: number                  // Represents Vault Coins balance
  streakDays: number
  lastPlayedDate: string | null
  totalPointsEarned: number
  redeemedRewards: string[]
  lastSessionEarned: number
  lastSessionBonus: number

  // Heat Event — Joto Gorom Toto Char (Original Fields)
  heatPoints: number            // Separate leaderboard score for this event
  heatStreak: number            // Consecutive daily heat check-in days
  lastHeatCheckIn: string | null// ISO date of last heat check-in
  heatBadges: HeatBadgeId[]    // Earned badge IDs
  heatCratesEarned: number      // Total mystery/premium crates earned (historical count)
  totalHeatXpEarned: number     // Total XP earned from heat rewards

  // New Fields (XP Economy, Crates, Forecast, Challenges, Commerce, Analytics)
  xp: number                    // Total progression XP
  crateInventory: { mystery: number; premium: number }
  crateHistory: { id: string; crateType: 'mystery' | 'premium'; rewardLabel: string; rarity: string; date: string }[]
  levelClaims: number[]         // Levels whose rewards have been claimed
  forecastHistory: { date: string; prediction: string; actualTemp: number | null; evaluated: boolean; rewardXp: number | null; accuracy: number }[]
  todayForecast: string | null
  todayForecastDate: string | null
  dailyCoinsEarned: Record<string, number>
  lastChallengeResetDate: string | null
  completedChallengesToday: string[]
  processedOrderIds: string[]
  challengeProgress: {
    viewedProducts: string[]
    newArrivalsVisitStart: number | null
    newArrivalsTimeSpent: number
    newArrivalsClaimed: boolean
    wishlistedProducts: string[]
    wishlistClaimed: boolean
    collectionBrowseStart: number | null
    collectionBrowseTime: number
    collectionClaimed: boolean
    heatwaveOrderPlaced: boolean
    orderCount: number
    totalSpent: number
  }
  meltdownClaims: number
  eventParticipationDays: string[]
  dailyCratesOpened: { mystery: number; premium: number }
  analytics: {
    totalHeatClaims: number
    totalCratesOpened: number
    xpEarned: number
    productChallengesCompleted: number
    forecastParticipation: number
    meltdownClaims: number
    premiumCratesAwarded: number
    mysteryCratesAwarded: number
    eventParticipationDays: number
    heatwaveShopperCompletions: number
    leaderboardRewardRecipients: number
  }

  // Existing actions
  addPoints: (points: number) => void
  recordSession: (earnedPoints: number) => void
  redeemReward: (id: string, cost: number) => boolean
  resetGameProgress: () => void
  claimHeatReward: (xp: number, coins: number, crate: 'mystery' | 'premium' | null, hp: number) => {
    streakBonus: number
    newStreak: number
    milestoneReached: number | null
  }
  awardHeatBadge: (id: HeatBadgeId) => boolean
  incrementMeltdownClaims: () => void
  distributeLeaderboardRewards: (rank: number) => void

  // New actions
  addXp: (amount: number) => { LeveledUp: boolean; newLevel: number }
  addVaultCoins: (amount: number) => number // respects daily limits
  trackProductView: (productId: string) => void
  trackWishlistAdd: (productId: string) => void
  startNewArrivalsTimer: () => void
  tickNewArrivalsTimer: (seconds: number) => void
  startCollectionBrowseTimer: () => void
  tickCollectionBrowseTimer: (seconds: number) => void
  claimChallenge: (challengeId: string, currentTemp: number) => Promise<{ success: boolean; xp: number; hp: number; error?: string }>
  submitForecast: (prediction: string) => boolean
  evaluateForecasts: (actualTemp: number) => { evaluatedCount: number; totalXpEarned: number }
  claimLevelReward: (level: number) => { success: boolean; rewardLabel: string }
  openCrate: (crateType: 'mystery' | 'premium') => { success: boolean; reward: any; rarity: string }
  recordOrder: (orderId: string, amount: number, currentTemp: number) => { xpAwarded: number; coinsAwarded: number; crateAwarded: string | null; badgeAwarded: string | null }
}

const STREAK_MILESTONES: Record<number, number> = {
  3: 20,
  7: 40,
  14: 75,
  30: 150,
}

// Helper: resets daily progress if date changed
const checkDailyReset = (state: any) => {
  const todayDate = today()
  if (state.lastChallengeResetDate !== todayDate) {
    return {
      lastChallengeResetDate: todayDate,
      completedChallengesToday: [],
      challengeProgress: {
        viewedProducts: [] as string[],
        newArrivalsVisitStart: null,
        newArrivalsTimeSpent: 0,
        newArrivalsClaimed: false,
        wishlistedProducts: (state.challengeProgress?.wishlistedProducts || []) as string[],
        wishlistClaimed: false,
        collectionBrowseStart: null,
        collectionBrowseTime: 0,
        collectionClaimed: false,
        heatwaveOrderPlaced: false,
        orderCount: state.challengeProgress?.orderCount || 0,
        totalSpent: state.challengeProgress?.totalSpent || 0,
      },
      dailyCoinsEarned: {
        ...state.dailyCoinsEarned,
        [todayDate]: 0
      }
    }
  }
  return null
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // ── Existing defaults ──
      points: 0,
      streakDays: 0,
      lastPlayedDate: null,
      totalPointsEarned: 0,
      redeemedRewards: [],
      lastSessionEarned: 0,
      lastSessionBonus: 0,

      // ── Heat event defaults ──
      heatPoints: 0,
      heatStreak: 0,
      lastHeatCheckIn: null,
      heatBadges: [],
      heatCratesEarned: 0,
      totalHeatXpEarned: 0,

      // ── New defaults ──
      xp: 0,
      crateInventory: { mystery: 0, premium: 0 },
      crateHistory: [],
      levelClaims: [],
      forecastHistory: [],
      todayForecast: null,
      todayForecastDate: null,
      dailyCoinsEarned: {},
      lastChallengeResetDate: null,
      completedChallengesToday: [],
      processedOrderIds: [],
      challengeProgress: {
        viewedProducts: [],
        newArrivalsVisitStart: null,
        newArrivalsTimeSpent: 0,
        newArrivalsClaimed: false,
        wishlistedProducts: [],
        wishlistClaimed: false,
        collectionBrowseStart: null,
        collectionBrowseTime: 0,
        collectionClaimed: false,
        heatwaveOrderPlaced: false,
        orderCount: 0,
        totalSpent: 0,
      },
      meltdownClaims: 0,
      eventParticipationDays: [],
      dailyCratesOpened: { mystery: 0, premium: 0 },
      analytics: {
        totalHeatClaims: 0,
        totalCratesOpened: 0,
        xpEarned: 0,
        productChallengesCompleted: 0,
        forecastParticipation: 0,
        meltdownClaims: 0,
        premiumCratesAwarded: 0,
        mysteryCratesAwarded: 0,
        eventParticipationDays: 0,
        heatwaveShopperCompletions: 0,
        leaderboardRewardRecipients: 0,
      },

      // ── Existing actions ──
      addPoints: (points) => {
        if (points <= 0) return
        set((state) => ({
          points: state.points + points,
          totalPointsEarned: state.totalPointsEarned + points,
        }))
      },

      recordSession: (earnedPoints) => {
        const todayDate = today()
        const lastPlayedDate = get().lastPlayedDate
        const nextStreak = lastPlayedDate === todayDate
          ? get().streakDays
          : lastPlayedDate === yesterday()
            ? get().streakDays + 1
            : 1

        const streakBonus = nextStreak >= 3 && lastPlayedDate !== todayDate ? 15 : 0
        const earnedWithBonus = Math.max(0, earnedPoints) + streakBonus

        set((state) => ({
          points: state.points + earnedWithBonus,
          totalPointsEarned: state.totalPointsEarned + earnedWithBonus,
          streakDays: nextStreak,
          lastPlayedDate: todayDate,
          lastSessionEarned: earnedPoints,
          lastSessionBonus: streakBonus,
        }))
      },

      redeemReward: (id, cost) => {
        const state = get()
        if (state.points < cost || state.redeemedRewards.includes(id)) {
          return false
        }
        set((state) => ({
          points: state.points - cost,
          redeemedRewards: [...state.redeemedRewards, id],
        }))
        return true
      },

      resetGameProgress: () => {
        set({
          points: 0,
          streakDays: 0,
          lastPlayedDate: null,
          totalPointsEarned: 0,
          redeemedRewards: [],
          lastSessionEarned: 0,
          lastSessionBonus: 0,
          heatPoints: 0,
          heatStreak: 0,
          lastHeatCheckIn: null,
          heatBadges: [],
          heatCratesEarned: 0,
          totalHeatXpEarned: 0,
          xp: 0,
          crateInventory: { mystery: 0, premium: 0 },
          crateHistory: [],
          levelClaims: [],
          forecastHistory: [],
          todayForecast: null,
          todayForecastDate: null,
          dailyCoinsEarned: {},
          lastChallengeResetDate: null,
          completedChallengesToday: [],
          challengeProgress: {
            viewedProducts: [],
            newArrivalsVisitStart: null,
            newArrivalsTimeSpent: 0,
            newArrivalsClaimed: false,
            wishlistedProducts: [],
            wishlistClaimed: false,
            collectionBrowseStart: null,
            collectionBrowseTime: 0,
            collectionClaimed: false,
            heatwaveOrderPlaced: false,
            orderCount: 0,
            totalSpent: 0,
          },
          meltdownClaims: 0,
          eventParticipationDays: [],
          dailyCratesOpened: { mystery: 0, premium: 0 },
          analytics: {
            totalHeatClaims: 0,
            totalCratesOpened: 0,
            xpEarned: 0,
            productChallengesCompleted: 0,
            forecastParticipation: 0,
            meltdownClaims: 0,
            premiumCratesAwarded: 0,
            mysteryCratesAwarded: 0,
            eventParticipationDays: 0,
            heatwaveShopperCompletions: 0,
            leaderboardRewardRecipients: 0,
          }
        })
      },

      // ── Heat event actions ──
      claimHeatReward: (xp, coins, crate, hp) => {
        const state = get()
        const todayDate = today()

        // Calculate new heat streak
        const newStreak =
          state.lastHeatCheckIn === todayDate
            ? state.heatStreak
            : state.lastHeatCheckIn === yesterday()
              ? state.heatStreak + 1
              : 1

        // Check streak milestone bonus (XP only)
        const milestoneBonus = (STREAK_MILESTONES[newStreak] ?? 0)
        const milestoneReached = STREAK_MILESTONES[newStreak] != null ? newStreak : null

        const totalXp = xp + milestoneBonus
        
        // Award XP and coins via specific functions
        const coinsAwarded = get().addVaultCoins(coins)
        get().addXp(totalXp)

        const nextInv = { ...state.crateInventory }
        const nextDailyCrates = { ...state.dailyCratesOpened }
        if (crate === 'mystery') {
          nextInv.mystery++
          nextDailyCrates.mystery++
        }
        if (crate === 'premium') {
          nextInv.premium++
          nextDailyCrates.premium++
        }

        // Track participation days
        const newParticipationDays = state.eventParticipationDays.includes(todayDate)
          ? state.eventParticipationDays
          : [...state.eventParticipationDays, todayDate]

        set((state) => ({
          heatPoints: state.heatPoints + hp,
          totalHeatXpEarned: state.totalHeatXpEarned + totalXp,
          heatStreak: newStreak,
          lastHeatCheckIn: todayDate,
          heatCratesEarned: state.heatCratesEarned + (crate ? 1 : 0),
          crateInventory: nextInv,
          dailyCratesOpened: nextDailyCrates,
          eventParticipationDays: newParticipationDays,
          analytics: {
            ...state.analytics,
            totalHeatClaims: state.analytics.totalHeatClaims + 1,
            eventParticipationDays: newParticipationDays.length,
            premiumCratesAwarded: state.analytics.premiumCratesAwarded + (crate === 'premium' ? 1 : 0),
            mysteryCratesAwarded: state.analytics.mysteryCratesAwarded + (crate === 'mystery' ? 1 : 0),
          }
        }))

        return { streakBonus: milestoneBonus, newStreak, milestoneReached }
      },

      awardHeatBadge: (id) => {
        const state = get()
        if (state.heatBadges.includes(id)) return false
        set((state) => ({ heatBadges: [...state.heatBadges, id] }))
        return true
      },

      incrementMeltdownClaims: () => {
        set((state) => ({
          meltdownClaims: state.meltdownClaims + 1,
          analytics: {
            ...state.analytics,
            meltdownClaims: state.analytics.meltdownClaims + 1,
          }
        }))
      },

      distributeLeaderboardRewards: (rank) => {
        const state = get()
        const badgesToAward: HeatBadgeId[] = []

        if (rank === 1) {
          badgesToAward.push('king-of-the-heat')
        }
        if (rank <= 10) {
          badgesToAward.push('premium-event-badge')
        }
        if (rank <= 25) {
          badgesToAward.push('exclusive-event-frame')
        }
        if (rank <= 100) {
          badgesToAward.push('heatwave-survivor-top100')
        }

        badgesToAward.forEach((badgeId) => {
          if (!state.heatBadges.includes(badgeId)) {
            get().awardHeatBadge(badgeId)
          }
        })

        if (badgesToAward.length > 0) {
          set((s) => ({
            analytics: {
              ...s.analytics,
              leaderboardRewardRecipients: s.analytics.leaderboardRewardRecipients + 1,
            }
          }))
        }
      },

      // ── New Actions ──
      addXp: (amount) => {
        if (amount <= 0) return { LeveledUp: false, newLevel: getLevelForXp(get().xp) }
        
        const state = get()
        const currentLevel = getLevelForXp(state.xp)
        const newXp = state.xp + amount
        const newLevel = getLevelForXp(newXp)
        const leveledUp = newLevel > currentLevel

        set((s) => ({
          xp: newXp,
          analytics: {
            ...s.analytics,
            xpEarned: s.analytics.xpEarned + amount
          }
        }))

        // Auto-award Vault Legend badge if reaching level 25
        if (newLevel >= 25 && !state.heatBadges.includes('vault-legend')) {
          get().awardHeatBadge('vault-legend')
        }

        return { LeveledUp: leveledUp, newLevel }
      },

      addVaultCoins: (amount) => {
        if (amount <= 0) return 0
        const state = get()
        const todayDate = today()
        
        // Daily limits: Maximum 300 Coins per day
        const dailyEarned = state.dailyCoinsEarned[todayDate] || 0
        const remainingLimit = Math.max(0, 300 - dailyEarned)
        const actualAward = Math.min(amount, remainingLimit)

        if (actualAward <= 0) return 0

        set((s) => ({
          points: s.points + actualAward,
          totalPointsEarned: s.totalPointsEarned + actualAward,
          dailyCoinsEarned: {
            ...s.dailyCoinsEarned,
            [todayDate]: dailyEarned + actualAward
          }
        }))
        return actualAward
      },

      trackProductView: (productId) => {
        const state = get()
        const resetState = checkDailyReset(state)
        const currentProgress = resetState ? resetState.challengeProgress : state.challengeProgress

        const normalizedId = String(productId).trim()
        if (!normalizedId) return
        if (currentProgress.viewedProducts.includes(normalizedId)) return

        const nextViewed = [...currentProgress.viewedProducts, normalizedId].slice(-50)
        set((s) => ({
          ...resetState,
          challengeProgress: {
            ...(resetState ? resetState.challengeProgress : s.challengeProgress),
            viewedProducts: nextViewed
          }
        }))
      },

      trackWishlistAdd: (productId) => {
        const state = get()
        const resetState = checkDailyReset(state)
        const currentProgress = resetState ? resetState.challengeProgress : state.challengeProgress

        const normalizedId = String(productId).trim()
        if (!normalizedId) return
        if (currentProgress.wishlistedProducts.includes(normalizedId)) return

        const nextWishlisted = [...currentProgress.wishlistedProducts, normalizedId].slice(-50)
        set((s) => ({
          ...resetState,
          challengeProgress: {
            ...(resetState ? resetState.challengeProgress : s.challengeProgress),
            wishlistedProducts: nextWishlisted
          }
        }))
      },

      startNewArrivalsTimer: () => {
        set((s) => {
          const resetState = checkDailyReset(s)
          return {
            ...resetState,
            challengeProgress: {
              ...(resetState ? resetState.challengeProgress : s.challengeProgress),
              newArrivalsVisitStart: Date.now()
            }
          }
        })
      },

      tickNewArrivalsTimer: (seconds) => {
        set((s) => {
          const resetState = checkDailyReset(s)
          const currentProgress = resetState ? resetState.challengeProgress : s.challengeProgress
          return {
            ...resetState,
            challengeProgress: {
              ...(resetState ? resetState.challengeProgress : s.challengeProgress),
              newArrivalsTimeSpent: currentProgress.newArrivalsTimeSpent + seconds
            }
          }
        })
      },

      startCollectionBrowseTimer: () => {
        set((s) => {
          const resetState = checkDailyReset(s)
          return {
            ...resetState,
            challengeProgress: {
              ...(resetState ? resetState.challengeProgress : s.challengeProgress),
              collectionBrowseStart: Date.now()
            }
          }
        })
      },

      tickCollectionBrowseTimer: (seconds) => {
        set((s) => {
          const resetState = checkDailyReset(s)
          const currentProgress = resetState ? resetState.challengeProgress : s.challengeProgress
          return {
            ...resetState,
            challengeProgress: {
              ...(resetState ? resetState.challengeProgress : s.challengeProgress),
              collectionBrowseTime: currentProgress.collectionBrowseTime + seconds
            }
          }
        })
      },

      claimChallenge: async (challengeId, currentTemp) => {
        const state = get()
        const resetState = checkDailyReset(state)
        const completed = resetState ? resetState.completedChallengesToday : state.completedChallengesToday
        const currentProgress = resetState ? resetState.challengeProgress : state.challengeProgress

        if (completed.includes(challengeId)) return { success: false, xp: 0, hp: 0 }

        // Find the challenge configuration
        const challenge = EVENTS_CONFIG['joto-gorom'].challenges.find(c => c.id === challengeId)
        if (!challenge) return { success: false, xp: 0, hp: 0 }

        // Validation against stored progress
        let validated = false
        if (challenge.type === 'explorer') {
          validated = currentProgress.viewedProducts.length >= (challenge.requirementValue || 5)
        } else if (challenge.type === 'hunter') {
          validated = currentProgress.newArrivalsTimeSpent >= (challenge.requirementValue || 10)
        } else if (challenge.type === 'wishlist') {
          validated = currentProgress.wishlistedProducts.length >= (challenge.requirementValue || 3)
        } else if (challenge.type === 'collection') {
          validated = currentProgress.collectionBrowseTime >= (challenge.requirementValue || 30)
        } else if (challenge.type === 'shopper') {
          validated = currentProgress.heatwaveOrderPlaced
        } else {
          validated = true
        }

        if (!validated) return { success: false, xp: 0, hp: 0 }

        // Server-side verification for product-based challenges
        if (challenge.type === 'explorer' || challenge.type === 'wishlist') {
          try {
            const productIds = challenge.type === 'explorer'
              ? currentProgress.viewedProducts
              : currentProgress.wishlistedProducts
            const res = await api.post('/challenges/verify-discovery', {
              productIds,
              challengeType: challenge.type,
            })
            const data = await res.json()
            if (!data.success || !data.data?.valid) {
              return { success: false, xp: 0, hp: 0, error: 'Server verification failed' }
            }
          } catch {
            return { success: false, xp: 0, hp: 0, error: 'Verification unavailable' }
          }
        }

        // Multiplier calculation
        let multiplier = 1.0
        if (currentTemp >= 44) multiplier = 2.0
        else if (currentTemp >= 41) multiplier = 1.5
        else if (currentTemp >= 38) multiplier = 1.25

        const finalXp = Math.round(challenge.xp * multiplier)
        const finalHp = Math.round(challenge.heatPoints * multiplier)

        get().addXp(finalXp)
        
        const isHeatwaveShopper = challengeId === 'hc-shopper'
        const todayStr = today()
        const newParticipationDays = state.eventParticipationDays.includes(todayStr)
          ? state.eventParticipationDays
          : [...state.eventParticipationDays, todayStr]

        set((s) => ({
          ...resetState,
          heatPoints: s.heatPoints + finalHp,
          completedChallengesToday: [...(resetState ? resetState.completedChallengesToday : s.completedChallengesToday), challengeId],
          eventParticipationDays: newParticipationDays,
          analytics: {
            ...s.analytics,
            productChallengesCompleted: s.analytics.productChallengesCompleted + 1,
            eventParticipationDays: newParticipationDays.length,
            heatwaveShopperCompletions: s.analytics.heatwaveShopperCompletions + (isHeatwaveShopper ? 1 : 0),
          }
        }))

        return { success: true, xp: finalXp, hp: finalHp }
      },

      submitForecast: (prediction) => {
        const state = get()
        const todayDate = today()
        if (state.todayForecastDate === todayDate) return false // only one prediction per day

        const newParticipationDays = state.eventParticipationDays.includes(todayDate)
          ? state.eventParticipationDays
          : [...state.eventParticipationDays, todayDate]

        const historyItem = {
          date: todayDate,
          prediction,
          actualTemp: null,
          evaluated: false,
          rewardXp: null,
          accuracy: 0
        }

        set((s) => ({
          todayForecast: prediction,
          todayForecastDate: todayDate,
          forecastHistory: [historyItem, ...s.forecastHistory],
          eventParticipationDays: newParticipationDays,
          analytics: {
            ...s.analytics,
            eventParticipationDays: newParticipationDays.length,
            forecastParticipation: s.analytics.forecastParticipation + 1
          }
        }))

        return true
      },

      evaluateForecasts: (actualTemp) => {
        const state = get()
        const todayDate = today()
        let evaluatedCount = 0
        let totalXpEarned = 0

        const nextHistory = state.forecastHistory.map((item) => {
          if (item.evaluated || item.date === todayDate) return item

          // Map predicted string option to tier index
          // Options: '35°C', '38°C', '41°C', '44°C+'
          let predTierIdx = 1
          if (item.prediction === '38°C') predTierIdx = 2
          else if (item.prediction === '41°C') predTierIdx = 3
          else if (item.prediction === '44°C+') predTierIdx = 4

          // Actual tier index based on temperature
          let actualTierIdx = 0
          if (actualTemp >= 44) actualTierIdx = 4
          else if (actualTemp >= 41) actualTierIdx = 3
          else if (actualTemp >= 38) actualTierIdx = 2
          else if (actualTemp >= 35) actualTierIdx = 1

          const diff = Math.abs(predTierIdx - actualTierIdx)
          let rewardXp = 5
          if (diff === 0) rewardXp = 50
          else if (diff === 1) rewardXp = 20

          totalXpEarned += rewardXp
          evaluatedCount++

          // Calculate accuracy percentage
          const totalHistoryEvaluated = state.forecastHistory.filter(h => h.evaluated).length + 1
          const correctCount = state.forecastHistory.filter(h => h.evaluated && h.rewardXp === 50).length + (rewardXp === 50 ? 1 : 0)
          const accuracy = Math.round((correctCount / totalHistoryEvaluated) * 100)

          return {
            ...item,
            actualTemp,
            evaluated: true,
            rewardXp,
            accuracy
          }
        })

        if (evaluatedCount > 0) {
          get().addXp(totalXpEarned)
          set({ forecastHistory: nextHistory })
        }

        return { evaluatedCount, totalXpEarned }
      },

      claimLevelReward: (level) => {
        const state = get()
        if (state.levelClaims.includes(level)) return { success: false, rewardLabel: '' }

        const userLevel = getLevelForXp(state.xp)
        if (userLevel < level) return { success: false, rewardLabel: '' }

        let coins = 0
        let crate: 'mystery' | 'premium' | null = null
        let badge: HeatBadgeId | null = null
        let coupon: string | null = null
        let label = ''

        if (level === 2) {
          coins = 20
          coupon = 'LEVEL2FIT'
          label = '10% Coupon (LEVEL2FIT) & 20 Coins'
        } else if (level === 3) {
          coins = 30
          crate = 'mystery'
          label = 'Mystery Crate & 30 Coins'
        } else if (level === 4) {
          coins = 50
          coupon = 'LEVEL4SHIP'
          label = 'Free Shipping Coupon (LEVEL4SHIP) & 50 Coins'
        } else if (level === 5) {
          coins = 75
          badge = 'vault-legend'
          label = 'Vault Legend Badge & 75 Coins'
        } else if (level === 6) {
          coins = 100
          crate = 'premium'
          label = 'Premium Crate & 100 Coins'
        } else if (level === 7) {
          coins = 150
          coupon = 'LEVEL7EARLY'
          label = 'Early Access Pass & 150 Coins'
        } else if (level === 8) {
          coins = 200
          coupon = 'LEVEL8DROP'
          label = '20% Coupon (LEVEL8DROP) & 200 Coins'
        } else if (level === 9) {
          coins = 250
          crate = 'premium'
          label = 'Premium Crate & 250 Coins'
        } else if (level === 10) {
          coins = 300
          badge = 'vault-legend'
          crate = 'mystery'
          label = 'Vault Legend Badge, Mystery Crate & 300 Coins'
        } else {
          coins = level * 25
          crate = level % 2 === 0 ? 'premium' : 'mystery'
          label = `${coins} Coins & ${crate === 'premium' ? 'Premium Crate' : 'Mystery Crate'}`
        }

        // Apply reward additions
        let actualCoins = 0
        if (coins > 0) {
          actualCoins = get().addVaultCoins(coins)
        }

        const nextInv = { ...state.crateInventory }
        if (crate === 'mystery') nextInv.mystery++
        if (crate === 'premium') nextInv.premium++

        if (badge) {
          get().awardHeatBadge(badge)
        }

        const nextRedeemed = [...state.redeemedRewards]
        if (coupon && !nextRedeemed.includes(coupon)) {
          nextRedeemed.push(coupon)
        }

        set((s) => ({
          levelClaims: [...s.levelClaims, level],
          crateInventory: nextInv,
          redeemedRewards: nextRedeemed
        }))

        return { success: true, rewardLabel: label }
      },

      openCrate: (crateType) => {
        const state = get()
        const inv = state.crateInventory
        const dailyCrates = state.dailyCratesOpened
        const todayDate = today()

        // Daily crate limits
        if (crateType === 'mystery' && dailyCrates.mystery >= 2) return { success: false, reward: null, rarity: '' }
        if (crateType === 'premium' && dailyCrates.premium >= 1) return { success: false, reward: null, rarity: '' }
        if (crateType === 'mystery' && inv.mystery <= 0) return { success: false, reward: null, rarity: '' }
        if (crateType === 'premium' && inv.premium <= 0) return { success: false, reward: null, rarity: '' }

        const nextInv = { ...inv }
        if (crateType === 'mystery') nextInv.mystery--
        else nextInv.premium--

        const nextDailyCrates = { ...dailyCrates }
        if (crateType === 'mystery') nextDailyCrates.mystery++
        else nextDailyCrates.premium++

        // Rarity chances: Legendary 2%, Epic 8%, Rare 25%, Common 65%
        const rand = Math.random()
        let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common'
        if (rand < 0.02) rarity = 'legendary'
        else if (rand < 0.10) rarity = 'epic'
        else if (rand < 0.35) rarity = 'rare'

        const rewardsList = EVENTS_CONFIG['joto-gorom'].crates.rewards[rarity]
        const baseReward = rewardsList[Math.floor(Math.random() * rewardsList.length)]

        let finalRewardLabel = baseReward.label
        let coinsToAward = 0
        let xpToAward = 0
        let crateToAward: 'mystery' | 'premium' | null = null
        let badgeToAward: HeatBadgeId | null = null
        let couponToAward: string | null = null
        let earlyAccessAwarded = false

        // Reward conversion for owned items
        if (baseReward.type === 'badge') {
          if (state.heatBadges.includes(baseReward.value as HeatBadgeId)) {
            const conversion = rarity === 'legendary' ? 250 : rarity === 'epic' ? 100 : 50
            coinsToAward = conversion
            finalRewardLabel = `${conversion} Coins (Duplicate Badge Protection)`
          } else {
            badgeToAward = baseReward.value as HeatBadgeId
          }
        } else if (baseReward.type === 'access') {
          if (state.redeemedRewards.includes('early-access')) {
            coinsToAward = 250
            finalRewardLabel = '250 Coins (Duplicate Early Access Protection)'
          } else {
            earlyAccessAwarded = true
          }
        } else if (baseReward.type === 'coins') {
          coinsToAward = baseReward.value
        } else if (baseReward.type === 'xp') {
          xpToAward = baseReward.value
        } else if (baseReward.type === 'crate') {
          crateToAward = baseReward.value
        } else if (baseReward.type === 'coupon') {
          couponToAward = baseReward.value
        }

        // Apply values
        if (coinsToAward > 0) get().addVaultCoins(coinsToAward)
        if (xpToAward > 0) get().addXp(xpToAward)
        if (crateToAward === 'mystery') nextInv.mystery++
        if (crateToAward === 'premium') nextInv.premium++
        if (badgeToAward) get().awardHeatBadge(badgeToAward)
        
        const nextRedeemed = [...state.redeemedRewards]
        if (couponToAward && !nextRedeemed.includes(couponToAward)) {
          nextRedeemed.push(couponToAward)
        }
        if (earlyAccessAwarded && !nextRedeemed.includes('early-access')) {
          nextRedeemed.push('early-access')
        }

        const historyItem = {
          id: crypto.randomUUID(),
          crateType,
          rewardLabel: finalRewardLabel,
          rarity,
          date: new Date().toLocaleDateString()
        }

        set((s) => ({
          crateInventory: nextInv,
          dailyCratesOpened: nextDailyCrates,
          crateHistory: [historyItem, ...s.crateHistory],
          redeemedRewards: nextRedeemed,
          analytics: {
            ...s.analytics,
            totalCratesOpened: s.analytics.totalCratesOpened + 1
          }
        }))

        return { success: true, reward: { ...baseReward, label: finalRewardLabel }, rarity }
      },

      recordOrder: (orderId, amount, currentTemp) => {
        const state = get()
        
        // Prevent duplicate processing
        if (state.processedOrderIds.includes(orderId)) {
          return { xpAwarded: 0, coinsAwarded: 0, heatPointsAwarded: 0, crateAwarded: null, badgeAwarded: null }
        }

        const newOrderCount = state.challengeProgress.orderCount + 1
        const newTotalSpent = state.challengeProgress.totalSpent + amount
        const todayDate = today()
        
        // Temperature check: is it during heatwave/meltdown (38°C+)
        const activeHeatwave = currentTemp >= 38
        
        let xpAwarded = 0
        let coinsAwarded = 0
        let heatPointsAwarded = 0
        let crateAwarded: 'mystery' | 'premium' | null = null
        let badgeAwarded: HeatBadgeId | null = null

        // XP Awards based on order value:
        // Value ₹1000+: +25 XP
        // Value ₹2000+: +50 XP
        // Value ₹3500+: +100 XP
        if (amount >= 3500) xpAwarded = 100
        else if (amount >= 2000) xpAwarded = 50
        else if (amount >= 1000) xpAwarded = 25

        // Heatwave Purchase Bonus (coins + heat points):
        // 38°C+: 15 Coins, 10 HP
        // 41°C+: 30 Coins, 20 HP
        // 44°C+: 50 Coins, 30 HP + Mystery Crate
        if (activeHeatwave) {
          if (currentTemp >= 44) {
            coinsAwarded = 50
            heatPointsAwarded = 30
            crateAwarded = 'mystery'
          } else if (currentTemp >= 41) {
            coinsAwarded = 30
            heatPointsAwarded = 20
          } else {
            coinsAwarded = 15
            heatPointsAwarded = 10
          }
        }

        // Mission Rewards:
        // Buy 1 item: Mystery Crate
        // 3 Purchases: Premium Crate
        // 5 Purchases: Exclusive Badge ('exclusive-shopper')
        if (!crateAwarded && newOrderCount === 1) crateAwarded = 'mystery'
        else if (newOrderCount === 3) crateAwarded = 'premium'
        else if (newOrderCount === 5) badgeAwarded = 'exclusive-shopper'

        // Apply XP and Coins
        if (xpAwarded > 0) get().addXp(xpAwarded)
        if (coinsAwarded > 0) get().addVaultCoins(coinsAwarded)

        const nextInv = { ...state.crateInventory }
        const nextDailyCrates = { ...state.dailyCratesOpened }
        if (crateAwarded === 'mystery') {
          nextInv.mystery++
          nextDailyCrates.mystery++
        }
        if (crateAwarded === 'premium') {
          nextInv.premium++
          nextDailyCrates.premium++
        }

        if (badgeAwarded) {
          get().awardHeatBadge(badgeAwarded)
        }

        const newParticipationDays = state.eventParticipationDays.includes(todayDate)
          ? state.eventParticipationDays
          : [...state.eventParticipationDays, todayDate]

        set((s) => ({
          crateInventory: nextInv,
          dailyCratesOpened: nextDailyCrates,
          heatPoints: s.heatPoints + heatPointsAwarded,
          processedOrderIds: [...s.processedOrderIds, orderId],
          eventParticipationDays: newParticipationDays,
          challengeProgress: {
            ...s.challengeProgress,
            orderCount: newOrderCount,
            totalSpent: newTotalSpent,
            heatwaveOrderPlaced: activeHeatwave || s.challengeProgress.heatwaveOrderPlaced
          },
          analytics: {
            ...s.analytics,
            meltdownClaims: currentTemp >= 44 ? s.analytics.meltdownClaims + 1 : s.analytics.meltdownClaims,
            eventParticipationDays: newParticipationDays.length,
            premiumCratesAwarded: s.analytics.premiumCratesAwarded + (crateAwarded === 'premium' ? 1 : 0),
            mysteryCratesAwarded: s.analytics.mysteryCratesAwarded + (crateAwarded === 'mystery' ? 1 : 0),
          }
        }))

        return { xpAwarded, coinsAwarded, heatPointsAwarded, crateAwarded, badgeAwarded }
      }
    }),
    {
      name: 'velvet-vault-game-state',
    }
  )
)
