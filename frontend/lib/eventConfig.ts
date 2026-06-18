// ─── Seasonal Event Engine Configuration ──────────────────────────────────────

export interface ChallengeConfig {
  id: string
  emoji: string
  title: string
  description: string
  xp: number
  heatPoints: number
  type: 'quiz' | 'explorer' | 'hunter' | 'wishlist' | 'collection' | 'shopper' | 'purchase_mission' | 'poll' | 'streak'
  requirementValue?: number
  link?: string
  linkLabel?: string
}

export interface BadgeConfig {
  id: string
  name: string
  emoji: string
  description: string
  requirement: string
}

export interface CrateReward {
  type: 'coins' | 'xp' | 'shipping' | 'coupon' | 'badge' | 'access' | 'crate'
  value: any // e.g., amount, coupon code, badge ID
  label: string
}

export interface RarityConfig {
  label: string
  color: string
  probability: number // e.g., 0.60, 0.25, 0.10, 0.05
  rewards: CrateReward[]
}

export interface PurchaseMissionConfig {
  id: string
  title: string
  requirementType: 'items' | 'spend'
  requirementValue: number
  rewardXp: number
  rewardCrate?: 'mystery' | 'premium' | null
  rewardBadge?: string | null
}

export interface SeasonalEventConfig {
  id: string
  name: string
  tagline: string
  description: string
  theme: {
    primaryColor: string // CSS color
    accentColor: string  // CSS color
    glowGradient: (tempOrProgress: number) => string
    badgeBorderColor: string
    badgeBgColor: string
  }
  challenges: ChallengeConfig[]
  badges: BadgeConfig[]
  xpRules: {
    baseLevels: Record<number, number>
    multipliers: { tempMin: number; multiplier: number }[]
  }
  crates: {
    probabilities: Record<'common' | 'rare' | 'epic' | 'legendary', number>
    rewards: Record<'common' | 'rare' | 'epic' | 'legendary', CrateReward[]>
  }
  prediction: {
    options: string[]
    correctXp: number
    oneTierOffXp: number
    incorrectXp: number
  }
  commerce: {
    purchaseBonus: { tempMin: number; coins: number; heatPoints: number }[]
    missions: PurchaseMissionConfig[]
  }
}

// Fixed base levels up to level 10
export const BASE_LEVELS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 250,
  4: 500,
  5: 850,
  6: 1300,
  7: 1900,
  8: 2600,
  9: 3400,
  10: 4500,
}

/** Returns the cumulative XP required to reach a specific level */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0
  if (level <= 10) return BASE_LEVELS[level]
  
  // For level > 10, Next Level XP = Current Level XP * 1.25
  let xp = BASE_LEVELS[10]
  for (let l = 11; l <= level; l++) {
    xp = Math.round(xp * 1.25)
  }
  return xp
}

/** Returns the level for a given amount of cumulative XP */
export function getLevelForXp(xp: number): number {
  let level = 1
  while (true) {
    const requiredXp = getXpForLevel(level + 1)
    if (xp >= requiredXp) {
      level++
    } else {
      break
    }
  }
  return level
}

export const EVENTS_CONFIG: Record<string, SeasonalEventConfig> = {
  'joto-gorom': {
    id: 'joto-gorom',
    name: 'Joto Gorom Toto Char',
    tagline: 'The Heat Is Real. The Rewards Are Too.',
    description: 'The hotter it gets where you are, the more opportunities unlock inside Velvet Vault. Check in daily, complete challenges, and collect exclusive badges.',
    theme: {
      primaryColor: '#FF6600',
      accentColor: '#FFCC00',
      glowGradient: (temp: number) => {
        if (temp >= 44) return 'radial-gradient(ellipse at 50% 0%, rgba(255,51,0,0.08) 0%, transparent 60%)'
        if (temp >= 41) return 'radial-gradient(ellipse at 50% 0%, rgba(255,102,0,0.07) 0%, transparent 60%)'
        if (temp >= 38) return 'radial-gradient(ellipse at 50% 0%, rgba(255,153,0,0.06) 0%, transparent 60%)'
        if (temp >= 35) return 'radial-gradient(ellipse at 50% 0%, rgba(255,204,0,0.04) 0%, transparent 55%)'
        return 'transparent'
      },
      badgeBorderColor: 'border-orange-500/25',
      badgeBgColor: 'bg-gradient-to-br from-orange-950/30 via-black/60 to-black/80',
    },
    challenges: [
      {
        id: 'hc-quiz',
        emoji: '🧠',
        title: 'Style Quiz Master',
        description: 'Complete 3 style quizzes in the Velvet Vault Challenge.',
        xp: 30,
        heatPoints: 50,
        type: 'quiz',
        link: '/game/challenge',
        linkLabel: 'Go to Challenge',
      },
      {
        id: 'hc-explore',
        emoji: '👟',
        title: 'Product Explorer',
        description: 'View 5 unique products in the store.',
        xp: 15,
        heatPoints: 30,
        type: 'explorer',
        link: '/collection',
        linkLabel: 'Explore Collection',
        requirementValue: 5,
      },
      {
        id: 'hc-hunter',
        emoji: '🆕',
        title: 'New Arrival Hunter',
        description: 'Visit the New Arrivals page for at least 10 seconds.',
        xp: 20,
        heatPoints: 40,
        type: 'hunter',
        link: '/collection?new=true',
        linkLabel: 'New Arrivals',
        requirementValue: 10,
      },
      {
        id: 'hc-wishlist',
        emoji: '❤️',
        title: 'Wishlist Builder',
        description: 'Add 3 products to your wishlist.',
        xp: 25,
        heatPoints: 45,
        type: 'wishlist',
        link: '/collection',
        linkLabel: 'Add to Wishlist',
        requirementValue: 3,
      },
      {
        id: 'hc-collection',
        emoji: '📁',
        title: 'Collection Explorer',
        description: 'Browse a collection page for at least 30 seconds.',
        xp: 15,
        heatPoints: 30,
        type: 'collection',
        link: '/collection',
        linkLabel: 'Browse Collections',
        requirementValue: 30,
      },
      {
        id: 'hc-shopper',
        emoji: '🛍️',
        title: 'Heatwave Shopper',
        description: 'Place an order during an active Heatwave or Meltdown tier (38°C+).',
        xp: 75,
        heatPoints: 150,
        type: 'shopper',
        link: '/collection',
        linkLabel: 'Shop Now',
      },
      {
        id: 'hc-poll',
        emoji: '🗳️',
        title: 'Summer Fit Poll',
        description: 'Share your summer fit choice — which silhouette rules in the heat?',
        xp: 25,
        heatPoints: 40,
        type: 'poll',
      },
      {
        id: 'hc-streak',
        emoji: '🔥',
        title: 'Heat Streak Keeper',
        description: 'Maintain your daily heat check-in for 3 consecutive days.',
        xp: 40,
        heatPoints: 60,
        type: 'streak',
        requirementValue: 3,
      },
    ],
    badges: [
      { id: 'heat-rookie', name: 'Heat Rookie', emoji: '🌱', description: 'Unlock on your first check-in.', requirement: 'First Heat Claim' },
      { id: 'heat-hunter', name: 'Heat Hunter', emoji: '🏹', description: 'Unlock on maintaining a 7-day heat streak.', requirement: '7-Day Heat Streak' },
      { id: 'heatwave-survivor', name: 'Heatwave Survivor', emoji: '🏜️', description: 'Claim a reward during Heatwave temperature tier (38°C+).', requirement: 'Claim Reward During Heatwave Tier' },
      { id: 'sun-chaser', name: 'Sun Chaser', emoji: '☀️', description: 'Unlock on maintaining a 30-day heat streak.', requirement: '30-Day Streak' },
      { id: 'meltdown-master', name: 'Meltdown Master', emoji: '🌋', description: 'Successfully claim Meltdown rewards 5 separate times.', requirement: 'Claim Meltdown Reward 5 Times' },
      { id: 'vault-legend', name: 'Vault Legend', emoji: '👑', description: 'Reach Level 25 in the Velvet Vault seasonal progression.', requirement: 'Reach Level 25' },
      { id: 'og-participant', name: 'OG Participant', emoji: '🏆', description: 'Participated in Joto Gorom Toto Char 2026 for 14 unique days.', requirement: 'Participate 14 Unique Days' },
      { id: 'heatwave-survivor-top100', name: 'Heatwave Survivor', emoji: '🏜️', description: 'Finished in the Top 100 of the Joto Gorom Toto Char leaderboard.', requirement: 'Top 100 at Event End' },
      { id: 'exclusive-event-frame', name: 'Exclusive Event Frame', emoji: '🖼️', description: 'Finished in the Top 25 of the Joto Gorom Toto Char leaderboard.', requirement: 'Top 25 at Event End' },
      { id: 'premium-event-badge', name: 'Premium Event Badge', emoji: '💎', description: 'Finished in the Top 10 of the Joto Gorom Toto Char leaderboard.', requirement: 'Top 10 at Event End' },
      { id: 'king-of-the-heat', name: 'King Of The Heat 2026', emoji: '👑', description: 'Ranked #1 on the Joto Gorom Toto Char leaderboard.', requirement: 'Rank 1 at Event End' },
    ],
    xpRules: {
      baseLevels: BASE_LEVELS,
      multipliers: [
        { tempMin: 44, multiplier: 2.0 },
        { tempMin: 41, multiplier: 1.5 },
        { tempMin: 38, multiplier: 1.25 },
        { tempMin: 0, multiplier: 1.0 },
      ]
    },
    crates: {
      probabilities: {
        common: 0.65,
        rare: 0.25,
        epic: 0.08,
        legendary: 0.02,
      },
      rewards: {
        common: [
          { type: 'coins', value: 10, label: '10 Coins' },
          { type: 'coins', value: 20, label: '20 Coins' },
          { type: 'xp', value: 25, label: '25 XP' },
        ],
        rare: [
          { type: 'xp', value: 50, label: '50 XP' },
          { type: 'shipping', value: true, label: 'Free Shipping' },
          { type: 'coins', value: 50, label: '50 Coins' },
        ],
        epic: [
          { type: 'coupon', value: 'HOT10', label: '10% Coupon' },
          { type: 'coins', value: 100, label: '100 Coins' },
          { type: 'crate', value: 'premium', label: 'Premium Crate' },
        ],
        legendary: [
          { type: 'badge', value: 'exclusive-event-badge', label: 'Exclusive Event Badge' },
          { type: 'badge', value: 'heat-king-title', label: 'Heat King Title' },
          { type: 'access', value: 'EARLY_DROP', label: 'Early Access Pass' },
          { type: 'badge', value: 'golden-event-frame', label: 'Golden Event Profile Frame' },
        ],
      }
    },
    prediction: {
      options: ['35°C', '38°C', '41°C', '44°C+'],
      correctXp: 50,
      oneTierOffXp: 20,
      incorrectXp: 5,
    },
    commerce: {
      purchaseBonus: [
        { tempMin: 44, coins: 50, heatPoints: 30 },
        { tempMin: 41, coins: 30, heatPoints: 20 },
        { tempMin: 38, coins: 15, heatPoints: 10 },
      ],
      missions: [
        { id: 'pm-buy1', title: 'Buy 1 item during event', requirementType: 'items', requirementValue: 1, rewardXp: 25, rewardCrate: 'mystery' },
        { id: 'pm-buy3', title: 'Buy 3 items during event', requirementType: 'items', requirementValue: 3, rewardXp: 75, rewardCrate: 'premium' },
        { id: 'pm-spend2000', title: 'Spend ₹2000 during event', requirementType: 'spend', requirementValue: 2000, rewardXp: 100, rewardCrate: 'mystery' },
      ]
    }
  },
  'monsoon': {
    id: 'monsoon',
    name: 'Monsoon Madness',
    tagline: 'When It Rains, We Pour Rewards.',
    description: 'Track the rain in your city! Claim rainy day drops, complete storm missions, and stay hydrated inside Velvet Vault.',
    theme: {
      primaryColor: '#0066CC',
      accentColor: '#3399FF',
      glowGradient: (progress: number) => 'radial-gradient(ellipse at 50% 0%, rgba(0,102,204,0.06) 0%, transparent 60%)',
      badgeBorderColor: 'border-blue-500/25',
      badgeBgColor: 'bg-gradient-to-br from-blue-950/30 via-black/60 to-black/80',
    },
    challenges: [],
    badges: [],
    xpRules: { baseLevels: BASE_LEVELS, multipliers: [{ tempMin: 0, multiplier: 1.0 }] },
    crates: { probabilities: { common: 0.6, rare: 0.25, epic: 0.1, legendary: 0.05 }, rewards: { common: [], rare: [], epic: [], legendary: [] } },
    prediction: { options: [], correctXp: 0, oneTierOffXp: 0, incorrectXp: 0 },
    commerce: { purchaseBonus: [], missions: [] }
  },
  'pujo': {
    id: 'pujo',
    name: 'Pujo Rush',
    tagline: 'Festive Fits, Epic Rewards.',
    description: 'Celebrate the festive season with Velvet Vault. Unlock ethnic styles, claim pujo tokens, and complete pandal-hopping challenges.',
    theme: {
      primaryColor: '#CC0055',
      accentColor: '#FF3388',
      glowGradient: (progress: number) => 'radial-gradient(ellipse at 50% 0%, rgba(204,0,85,0.06) 0%, transparent 60%)',
      badgeBorderColor: 'border-pink-500/25',
      badgeBgColor: 'bg-gradient-to-br from-pink-950/30 via-black/60 to-black/80',
    },
    challenges: [],
    badges: [],
    xpRules: { baseLevels: BASE_LEVELS, multipliers: [{ tempMin: 0, multiplier: 1.0 }] },
    crates: { probabilities: { common: 0.6, rare: 0.25, epic: 0.1, legendary: 0.05 }, rewards: { common: [], rare: [], epic: [], legendary: [] } },
    prediction: { options: [], correctXp: 0, oneTierOffXp: 0, incorrectXp: 0 },
    commerce: { purchaseBonus: [], missions: [] }
  },
  'winter': {
    id: 'winter',
    name: 'Winter Vault',
    tagline: 'Chill Out with Exclusive Drops.',
    description: 'As the temperature drops, the vault heats up. Claim frost rewards, survive the winter storm, and unlock cozy street fashion.',
    theme: {
      primaryColor: '#00CCCC',
      accentColor: '#33FFFF',
      glowGradient: (progress: number) => 'radial-gradient(ellipse at 50% 0%, rgba(0,204,204,0.06) 0%, transparent 60%)',
      badgeBorderColor: 'border-cyan-500/25',
      badgeBgColor: 'bg-gradient-to-br from-cyan-950/30 via-black/60 to-black/80',
    },
    challenges: [],
    badges: [],
    xpRules: { baseLevels: BASE_LEVELS, multipliers: [{ tempMin: 0, multiplier: 1.0 }] },
    crates: { probabilities: { common: 0.6, rare: 0.25, epic: 0.1, legendary: 0.05 }, rewards: { common: [], rare: [], epic: [], legendary: [] } },
    prediction: { options: [], correctXp: 0, oneTierOffXp: 0, incorrectXp: 0 },
    commerce: { purchaseBonus: [], missions: [] }
  }
}
