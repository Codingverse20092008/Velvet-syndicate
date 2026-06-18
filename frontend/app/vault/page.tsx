'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Gift, ShieldCheck, Trophy, Zap, Coins,
  Flame, Star, Lock, CheckCircle2, Package, ShoppingBag,
  CreditCard, BadgePercent, Truck, Key, Gem, Medal,
  X, Award, ScrollText,
} from 'lucide-react'
import { useVaultStore, getLevelForXp, getXpForLevel, LEVELS } from '@/lib/vault-store'
import { CrateOpeningModal } from '@/components/game/CrateOpeningModal'
import { XPProgression } from '@/components/game/XPProgression'

const REWARD_SHOP_ITEMS = {
  basic: [
    { id: 'xp-boost-50', title: '50 XP Boost', description: 'Instantly earn 50 progression XP', cost: 100, icon: Zap, category: 'basic' },
    { id: 'profile-frame', title: 'Profile Frame', description: 'Unlock an exclusive profile frame', cost: 150, icon: Medal, category: 'basic' },
    { id: 'title-unlock', title: 'Title Unlock', description: 'Unlock a unique display title', cost: 200, icon: ScrollText, category: 'basic' },
    { id: 'coupon-5', title: '5% Coupon', description: 'Get 5% off on your next order', cost: 300, icon: BadgePercent, category: 'basic' },
  ],
  mid: [
    { id: 'free-shipping', title: 'Free Shipping', description: 'Free shipping on your next order', cost: 500, icon: Truck, category: 'mid' },
    { id: 'basic-crate', title: 'Basic Mystery Crate', description: 'Open a mystery crate for random rewards', cost: 600, icon: Package, category: 'mid' },
    { id: 'coupon-10', title: '10% Coupon (Selected)', description: '10% off on selected products only', cost: 800, icon: BadgePercent, category: 'mid' },
    { id: 'early-access', title: 'Early Access Pass', description: 'Get early access to new drops', cost: 900, icon: Key, category: 'mid' },
  ],
  premium: [
    { id: 'double-xp-day', title: 'Double XP Day', description: 'Earn 2x XP for 24 hours', cost: 1200, icon: Zap, category: 'premium' },
    { id: 'premium-crate', title: 'Premium Mystery Crate', description: 'Open a premium crate with better rewards', cost: 1500, icon: Gem, category: 'premium' },
    { id: 'exclusive-badge', title: 'Exclusive Badge', description: 'Unlock a limited-edition badge', cost: 2000, icon: Award, category: 'premium' },
    { id: 'vip-drop-access', title: 'VIP Drop Access', description: 'Get VIP access to exclusive drops', cost: 2500, icon: Star, category: 'premium' },
  ],
}

const BADGE_DISPLAY: Record<string, { name: string; emoji: string; description: string }> = {
  'vault-rookie': { name: 'Vault Rookie', emoji: '🌱', description: 'Reach Level 2' },
  'quiz-master': { name: 'Quiz Master', emoji: '🧠', description: '100 Correct Answers' },
  'streak-warrior': { name: 'Streak Warrior', emoji: '🔥', description: '30-Day Streak' },
  'vault-legend': { name: 'Vault Legend', emoji: '👑', description: '500 Correct Answers' },
  'collector': { name: 'Collector', emoji: '📦', description: 'Open 50 Crates' },
  'vault-elite': { name: 'Vault Elite', emoji: '💎', description: 'Reach Level 10' },
  'exclusive_badge': { name: 'Exclusive', emoji: '⭐', description: 'Premium Crate Reward' },
}

const STREAK_DISPLAY: Record<number, { label: string; reward: string }> = {
  3: { label: '3 Days', reward: '25 XP + 10 Coins' },
  7: { label: '7 Days', reward: '50 XP + 25 Coins' },
  14: { label: '14 Days', reward: 'Basic Mystery Crate' },
  30: { label: '30 Days', reward: 'Exclusive Badge' },
  60: { label: '60 Days', reward: 'Premium Mystery Crate' },
  100: { label: '100 Days', reward: 'VIP Title + Profile Frame' },
}

const HIDDEN_REWARDS_DISPLAY = [
  { answers: 50, reward: 'Secret Crate' },
  { answers: 100, reward: 'Rare Badge' },
  { answers: 250, reward: 'Premium Crate' },
  { answers: 500, reward: 'Vault Legend Title' },
]

export default function VaultPage() {
  const {
    xp, vaultCoins, streakDays, level, bonusStreakTokens,
    correctAnswers, cratesOpened, ownedBadges,
    pendingLevelRewards, dailyXpEarned, dailyCoinsEarned,
    dailyQuizCompleted, lastLoginClaim, crateHistory,
    unlockedHiddenRewards, checkDailyReset,
    addXp, addCoins, claimDailyLogin, claimLevelReward,
    openCrate, processPurchaseReward, processProductDiscovery,
    getLimits, getLeaderboardScore,
  } = useVaultStore()

  checkDailyReset()
  const today = new Date().toISOString().slice(0, 10)
  const limits = getLimits()
  const levelProg = getLevelForXp(xp)
  const nextLevelXp = getXpForLevel(levelProg + 1)
  const currentLevelXpStart = getXpForLevel(levelProg)
  const progressInLevel = xp - currentLevelXpStart
  const neededForNext = nextLevelXp - currentLevelXpStart
  const progressPct = neededForNext > 0 ? Math.min((progressInLevel / neededForNext) * 100, 100) : 100

  const [activeTab, setActiveTab] = useState<'dashboard' | 'shop' | 'leaderboard' | 'badges'>('dashboard')
  const [claimMsg, setClaimMsg] = useState<string | null>(null)
  const [showCrate, setShowCrate] = useState<'basic' | 'premium' | null>(null)
  const [shopMessage, setShopMessage] = useState<string | null>(null)

  const showMessage = (msg: string) => {
    setClaimMsg(msg)
    setTimeout(() => setClaimMsg(null), 4000)
  }

  const handleDailyLogin = () => {
    const res = claimDailyLogin()
    if (res.success) {
      showMessage(`+${res.xpAwarded} XP & +${res.coinsAwarded} Coins from daily login!`)
    } else {
      showMessage('Daily login already claimed today')
    }
  }

  const handleClaimLevel = (lvl: number) => {
    const res = claimLevelReward(lvl)
    if (res.success && res.reward) {
      showMessage(`Claimed Level ${lvl}: ${res.reward.label}`)
    }
  }

  const handleBuyItem = (item: typeof REWARD_SHOP_ITEMS.basic[0]) => {
    if (vaultCoins < item.cost) {
      setShopMessage('Not enough Vault Coins!')
      setTimeout(() => setShopMessage(null), 3000)
      return
    }
    addCoins(-item.cost)
    if (item.id === 'xp-boost-50') addXp(50)
    if (item.id === 'basic-crate') setShowCrate('basic')
    if (item.id === 'premium-crate') setShowCrate('premium')
    setShopMessage(`Purchased ${item.title}!`)
    setTimeout(() => setShopMessage(null), 3000)
  }

  const pendingUnclaimed = pendingLevelRewards.filter(r => !r.claimed)
  const leaderboardScore = getLeaderboardScore()

  const allItems = [...REWARD_SHOP_ITEMS.basic, ...REWARD_SHOP_ITEMS.mid, ...REWARD_SHOP_ITEMS.premium]
  const hiddenUnlocked = unlockedHiddenRewards.map(r => {
    const num = parseInt(r)
    const h = HIDDEN_REWARDS_DISPLAY.find(h => h.answers === num)
    return h || null
  }).filter(Boolean)

  return (
    <main className="min-h-screen bg-velvet-black px-4 py-16 sm:px-6 md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Velvet Vault</p>
            <h1 className="mt-2 text-4xl font-heading uppercase tracking-[0.04em] text-velvet-white flex items-center gap-3">
              <Gem className="w-8 h-8 text-amber-400" />
              Reward Economy
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3 text-right">
              <p className="text-[9px] uppercase tracking-[0.3em] text-velvet-muted">Vault Coins</p>
              <p className="text-2xl font-bold text-amber-400 flex items-center gap-2 mt-1">
                <Coins className="w-5 h-5" />
                {vaultCoins.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-3 text-right">
              <p className="text-[9px] uppercase tracking-[0.3em] text-velvet-muted">Level</p>
              <p className="text-2xl font-bold text-velvet-white">{levelProg}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {(['dashboard', 'shop', 'leaderboard', 'badges'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-full text-[10px] uppercase tracking-[0.24em] font-bold transition-all ${
                activeTab === tab
                  ? 'bg-velvet-white text-velvet-black'
                  : 'bg-white/5 text-velvet-muted hover:text-velvet-white border border-white/10'
              }`}
            >
              {tab === 'dashboard' && '📊 Dashboard'}
              {tab === 'shop' && '🛒 Reward Shop'}
              {tab === 'leaderboard' && '🏆 Leaderboard'}
              {tab === 'badges' && '🎖️ Badges'}
            </button>
          ))}
        </div>

        {/* Toast Message */}
        <AnimatePresence>
          {claimMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-sm text-emerald-300"
            >
              {claimMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== DASHBOARD TAB ===== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">

            {/* Daily Limits Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-[9px] uppercase tracking-[0.2em] text-velvet-muted">XP Today</p>
                <p className="text-lg font-bold text-orange-400 mt-1">{limits.dailyXpRemaining}/{200} left</p>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${((200 - limits.dailyXpRemaining) / 200) * 100}%` }} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-[9px] uppercase tracking-[0.2em] text-velvet-muted">Coins Today</p>
                <p className="text-lg font-bold text-amber-400 mt-1">{limits.dailyCoinsRemaining}/{60} left</p>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${((60 - limits.dailyCoinsRemaining) / 60) * 100}%` }} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-[9px] uppercase tracking-[0.2em] text-velvet-muted">Basic Crates</p>
                <p className="text-lg font-bold text-blue-400 mt-1">{limits.basicCratesRemaining}/2 left</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-[9px] uppercase tracking-[0.2em] text-velvet-muted">Premium Crates</p>
                <p className="text-lg font-bold text-purple-400 mt-1">{limits.premiumCratesRemaining}/1 left</p>
              </div>
            </div>

            {/* XP Progress */}
            <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Progression</p>
                  <h3 className="mt-1 text-2xl font-heading text-velvet-white">Level {levelProg}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs text-velvet-muted">{xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</p>
                  <p className="text-xs text-velvet-muted mt-1">Total XP Earned: {useVaultStore.getState().totalXpEarned.toLocaleString()}</p>
                </div>
              </div>
              <div className="h-4 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-velvet-muted">
                <span>Level {levelProg}</span>
                <span>{neededForNext - progressInLevel} XP to Level {levelProg + 1}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button
                onClick={handleDailyLogin}
                className={`rounded-2xl border p-5 text-center transition-all ${
                  lastLoginClaim === today
                    ? 'border-emerald-500/20 bg-emerald-500/10 opacity-60'
                    : 'border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20'
                }`}
              >
                <p className="text-2xl mb-2">{lastLoginClaim === today ? '✅' : '📅'}</p>
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-velvet-white">
                  {lastLoginClaim === today ? 'Claimed' : 'Daily Login'}
                </p>
                <p className="text-[10px] text-velvet-muted mt-1">+5 Coins +20 XP</p>
              </button>

              <button
                onClick={() => setShowCrate('basic')}
                disabled={limits.basicCratesRemaining <= 0}
                className={`rounded-2xl border p-5 text-center transition-all ${
                  limits.basicCratesRemaining <= 0
                    ? 'border-white/5 bg-black/20 opacity-40'
                    : 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
                }`}
              >
                <p className="text-2xl mb-2">📦</p>
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-velvet-white">Basic Crate</p>
                <p className="text-[10px] text-velvet-muted mt-1">{limits.basicCratesRemaining}/2</p>
              </button>

              <button
                onClick={() => setShowCrate('premium')}
                disabled={limits.premiumCratesRemaining <= 0}
                className={`rounded-2xl border p-5 text-center transition-all ${
                  limits.premiumCratesRemaining <= 0
                    ? 'border-white/5 bg-black/20 opacity-40'
                    : 'border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20'
                }`}
              >
                <p className="text-2xl mb-2">🎁</p>
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-velvet-white">Premium Crate</p>
                <p className="text-[10px] text-velvet-muted mt-1">{limits.premiumCratesRemaining}/1</p>
              </button>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-center">
                <p className="text-2xl mb-2">🔥</p>
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-velvet-white">{streakDays} Day Streak</p>
                <p className="text-[10px] text-velvet-muted mt-1">{bonusStreakTokens} Streak Tokens</p>
              </div>
            </div>

            {/* Pending Level Rewards */}
            {pendingUnclaimed.length > 0 && (
              <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300 font-bold">🎁 Pending Level Rewards</p>
                <div className="grid gap-3">
                  {pendingUnclaimed.map(r => (
                    <div key={r.level} className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-black/40 p-4">
                      <div>
                        <p className="text-sm font-semibold text-velvet-white">Level {r.level} Reward</p>
                        <p className="text-xs text-velvet-muted">{r.rewardLabel}</p>
                      </div>
                      <button
                        onClick={() => handleClaimLevel(r.level)}
                        className="px-5 py-2.5 rounded-full bg-amber-500 text-black text-[9px] uppercase tracking-[0.2em] font-bold hover:bg-amber-400 transition-all"
                      >
                        Claim
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Streak Milestones */}
            <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">🔥 Streak Milestones</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(STREAK_DISPLAY).map(([day, info]) => {
                  const d = parseInt(day)
                  const reached = streakDays >= d
                  return (
                    <div key={day} className={`rounded-xl border p-3 text-center ${
                      reached ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/5 bg-black/20 opacity-50'
                    }`}>
                      <p className={`text-lg font-bold ${reached ? 'text-amber-400' : 'text-velvet-muted'}`}>{day}d</p>
                      <p className="text-[8px] text-velvet-muted mt-1">{info.reward}</p>
                      {reached && <p className="text-[9px] text-emerald-400 mt-1">✅</p>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Hidden Rewards Progress */}
            <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">🤫 Hidden Rewards Progress</p>
              <div className="grid gap-3">
                {HIDDEN_REWARDS_DISPLAY.map(h => {
                  const unlocked = unlockedHiddenRewards.includes(h.answers.toString())
                  const progress = Math.min(correctAnswers / h.answers * 100, 100)
                  return (
                    <div key={h.answers} className={`rounded-xl border p-4 ${
                      unlocked ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5 bg-black/20'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs font-semibold text-velvet-white">{unlocked ? '🔓' : '🔒'} {h.reward}</p>
                          <p className="text-[10px] text-velvet-muted">{correctAnswers}/{h.answers} correct answers</p>
                        </div>
                        {unlocked && <span className="text-emerald-400 text-sm">✅ Unlocked</span>}
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Crate History */}
            {crateHistory.length > 0 && (
              <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
                <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">📦 Recent Crate Opens</p>
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {crateHistory.slice(0, 10).map(h => (
                    <div key={h.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{h.crateType === 'premium' ? '🎁' : '📦'}</span>
                        <div>
                          <p className="text-xs text-velvet-white">{h.rewardLabel}</p>
                          <p className="text-[9px] text-velvet-muted capitalize">{h.rarity}</p>
                        </div>
                      </div>
                      <p className="text-[9px] text-velvet-muted">{h.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== REWARD SHOP TAB ===== */}
        {activeTab === 'shop' && (
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-white/10 bg-velvet-card/70 p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Spend Your Coins</p>
                  <h2 className="mt-2 text-3xl font-heading text-velvet-white">Reward Shop</h2>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-velvet-muted">Balance</p>
                  <p className="text-xl font-bold text-amber-400 flex items-center gap-2 mt-1">
                    <Coins className="w-4 h-4" /> {vaultCoins.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-velvet-muted max-w-2xl">
                Spend Vault Coins on exclusive rewards. New items added regularly.
              </p>
            </div>

            {shopMessage && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-sm text-emerald-300">
                {shopMessage}
              </div>
            )}

            {/* Basic Rewards */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">Basic Rewards</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {REWARD_SHOP_ITEMS.basic.map(item => (
                  <ShopItem key={item.id} item={item} coins={vaultCoins} onBuy={handleBuyItem} />
                ))}
              </div>
            </div>

            {/* Mid-Tier Rewards */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">Mid-Tier Rewards</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {REWARD_SHOP_ITEMS.mid.map(item => (
                  <ShopItem key={item.id} item={item} coins={vaultCoins} onBuy={handleBuyItem} />
                ))}
              </div>
            </div>

            {/* Premium Rewards */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">Premium Rewards</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {REWARD_SHOP_ITEMS.premium.map(item => (
                  <ShopItem key={item.id} item={item} coins={vaultCoins} onBuy={handleBuyItem} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== LEADERBOARD TAB ===== */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-white/10 bg-velvet-card/70 p-8">
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Compete & Earn</p>
              <h2 className="mt-2 text-3xl font-heading text-velvet-white">Leaderboard</h2>
              <p className="mt-4 text-sm text-velvet-muted max-w-2xl">
                Leaderboard Score = XP Earned + Coins Earned + (Crates Opened × 10). Weekly & Monthly resets.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Score Breakdown */}
              <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8">
                <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">Your Score</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/30">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-orange-400" />
                      <span className="text-sm text-velvet-white">Total XP Earned</span>
                    </div>
                    <span className="text-lg font-bold text-orange-400">{useVaultStore.getState().totalXpEarned.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/30">
                    <div className="flex items-center gap-3">
                      <Coins className="w-5 h-5 text-amber-400" />
                      <span className="text-sm text-velvet-white">Total Coins Earned</span>
                    </div>
                    <span className="text-lg font-bold text-amber-400">{useVaultStore.getState().totalCoinsEarned.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/30">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-velvet-white">Crates Opened × 10</span>
                    </div>
                    <span className="text-lg font-bold text-blue-400">{(cratesOpened * 10).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-amber-300" />
                      <span className="text-sm font-bold text-velvet-white">Total Leaderboard Score</span>
                    </div>
                    <span className="text-xl font-bold text-amber-300">{leaderboardScore.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Weekly / Monthly Rewards */}
              <div className="space-y-4">
                <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-2">Weekly Reset</p>
                  <p className="text-xl font-heading text-velvet-white mb-4">Every Monday</p>
                  <div className="space-y-3">
                    {[
                      { rank: 'Top 10', reward: 'Exclusive Frame' },
                      { rank: 'Top 3', reward: '100 Coins' },
                      { rank: 'Rank 1', reward: '250 Coins' },
                    ].map(r => (
                      <div key={r.rank} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/30">
                        <span className="text-xs text-velvet-muted">{r.rank}</span>
                        <span className="text-xs font-semibold text-velvet-white">{r.reward}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-2">Monthly Reset</p>
                  <p className="text-xl font-heading text-velvet-white mb-4">1st of Month</p>
                  <div className="space-y-3">
                    {[
                      { rank: 'Top 10', reward: 'Premium Badge' },
                      { rank: 'Top 3', reward: '5% Coupon' },
                      { rank: 'Rank 1', reward: '₹100 Coupon' },
                    ].map(r => (
                      <div key={r.rank} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/30">
                        <span className="text-xs text-velvet-muted">{r.rank}</span>
                        <span className="text-xs font-semibold text-velvet-white">{r.reward}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== BADGES TAB ===== */}
        {activeTab === 'badges' && (
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-white/10 bg-velvet-card/70 p-8">
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Collect Them All</p>
              <h2 className="mt-2 text-3xl font-heading text-velvet-white">Badges & Achievements</h2>
              <p className="mt-4 text-sm text-velvet-muted max-w-2xl">
                Badges are permanent and cannot be removed or traded. Each badge represents a unique achievement.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(BADGE_DISPLAY).map(([id, badge]) => {
                const hasBadge = ownedBadges.includes(id)
                return (
                  <div
                    key={id}
                    className={`rounded-2xl border p-6 text-center transition-all ${
                      hasBadge
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-white/5 bg-black/20 opacity-60'
                    }`}
                  >
                    <p className="text-4xl mb-3">{hasBadge ? badge.emoji : '🔒'}</p>
                    <p className={`text-sm font-semibold ${hasBadge ? 'text-velvet-white' : 'text-velvet-muted'}`}>
                      {badge.name}
                    </p>
                    <p className="text-[10px] text-velvet-muted mt-1">{badge.description}</p>
                    {hasBadge && (
                      <span className="inline-block mt-2 text-[9px] uppercase tracking-[0.2em] text-emerald-400 font-bold">
                        ✅ Unlocked
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* All Badge Definitions */}
            <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-4">📋 How to Unlock</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { badge: 'Vault Rookie', unlock: 'Reach Level 2' },
                  { badge: 'Quiz Master', unlock: '100 Correct Answers' },
                  { badge: 'Streak Warrior', unlock: '30-Day Streak' },
                  { badge: 'Vault Legend', unlock: '500 Correct Answers' },
                  { badge: 'Collector', unlock: 'Open 50 Crates' },
                  { badge: 'Vault Elite', unlock: 'Reach Level 10' },
                ].map(b => (
                  <div key={b.badge} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-black/30">
                    <span className="text-lg">📌</span>
                    <div>
                      <p className="text-xs font-semibold text-velvet-white">{b.badge}</p>
                      <p className="text-[9px] text-velvet-muted">{b.unlock}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Crate Opening Modal */}
      <CrateOpeningModal
        isOpen={showCrate !== null}
        onClose={() => setShowCrate(null)}
        crateType={showCrate === 'premium' ? 'premium' : 'mystery'}
      />
    </main>
  )
}

function ShopItem({ item, coins, onBuy }: {
  item: { id: string; title: string; description: string; cost: number; icon: any; category: string }
  coins: number
  onBuy: (item: any) => void
}) {
  const canAfford = coins >= item.cost
  const Icon = item.icon

  return (
    <div className={`rounded-2xl border p-5 flex flex-col justify-between ${
      canAfford ? 'border-white/10 bg-black/40 hover:border-white/20' : 'border-white/5 bg-black/20 opacity-50'
    } transition-all`}>
      <div>
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-velvet-muted" />
        </div>
        <p className="text-sm font-semibold text-velvet-white">{item.title}</p>
        <p className="text-[10px] text-velvet-muted mt-1 leading-relaxed">{item.description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-amber-400">
          <Coins className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">{item.cost.toLocaleString()}</span>
        </div>
        <button
          onClick={() => onBuy(item)}
          disabled={!canAfford}
          className={`px-4 py-2 rounded-full text-[8px] uppercase tracking-[0.2em] font-bold transition-all ${
            canAfford
              ? 'bg-velvet-white text-velvet-black hover:bg-white/90'
              : 'bg-white/5 text-velvet-muted cursor-not-allowed'
          }`}
        >
          {canAfford ? 'Buy' : 'Locked'}
        </button>
      </div>
    </div>
  )
}
