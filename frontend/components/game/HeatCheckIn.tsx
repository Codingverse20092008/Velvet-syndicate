'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, CheckCircle2, Lock } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { type HeatTier } from '@/lib/weatherUtils'

interface HeatCheckInProps {
  tier: HeatTier
  temp: number
  onClaimed: (result: { xp: number; coins: number; streakBonus: number; newStreak: number; milestoneReached: number | null }) => void
}

const STREAK_MILESTONES: { days: number; label: string; reward: string }[] = [
  { days: 3,  label: '3 Day Streak',  reward: '+20 Bonus XP' },
  { days: 7,  label: '7 Day Streak',  reward: 'Mystery Crate' },
  { days: 14, label: '14 Day Streak', reward: '+75 Vault Coins' },
  { days: 30, label: '30 Day Streak', reward: 'Sun Chaser Badge' },
]

function nextMilestone(streak: number) {
  return STREAK_MILESTONES.find((m) => m.days > streak) ?? null
}

export function HeatCheckIn({ tier, temp, onClaimed }: HeatCheckInProps) {
  const { heatStreak, lastHeatCheckIn, claimHeatReward } = useGameStore()
  const [claimed, setClaimed] = useState(false)
  const [result, setResult] = useState<{ xp: number; coins: number; streakBonus: number; newStreak: number; milestoneReached: number | null } | null>(null)

  const todayStr = new Date().toISOString().slice(0, 10)
  const alreadyClaimed = lastHeatCheckIn === todayStr
  const canClaim = tier.xp > 0 && !alreadyClaimed && !claimed

  const milestone = nextMilestone(alreadyClaimed ? heatStreak : heatStreak)
  const streakProgress = milestone
    ? ((alreadyClaimed ? heatStreak : heatStreak) / milestone.days)
    : 1

  const handleClaim = () => {
    if (!canClaim) return
    let effectiveCrate: 'mystery' | 'premium' | null = tier.crate
    if (tier.label === 'Meltdown') {
      effectiveCrate = Math.random() < 0.75 ? 'mystery' : 'premium'
    } else if (tier.label === 'Heatwave') {
      effectiveCrate = Math.random() < 0.10 ? 'mystery' : null
    }
    const res = claimHeatReward(tier.xp, tier.coins, effectiveCrate, tier.hp)
    const claimResult = { xp: tier.xp, coins: tier.coins, ...res }
    setResult(claimResult)
    setClaimed(true)
    onClaimed(claimResult)
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Daily Heat Check-In</p>
          <h3 className="mt-2 text-2xl font-heading uppercase tracking-wide text-velvet-white">
            Claim Today's Heat Reward
          </h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2">
          <Flame className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-semibold text-orange-300">
            {alreadyClaimed || claimed ? (result?.newStreak ?? heatStreak) : heatStreak} day{(heatStreak !== 1) ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Streak progress bar */}
      {milestone && (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-[0.24em] text-velvet-muted">
            <span>Streak to {milestone.label}</span>
            <span>{milestone.reward}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(streakProgress, 1) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-velvet-muted/60">
            <span>{alreadyClaimed || claimed ? (result?.newStreak ?? heatStreak) : heatStreak} / {milestone.days} days</span>
          </div>
        </div>
      )}

      {/* Claim area */}
      <AnimatePresence mode="wait">
        {(alreadyClaimed && !claimed) ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 p-6 flex items-center gap-4"
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">Already claimed today!</p>
              <p className="mt-1 text-sm text-velvet-muted">Come back tomorrow to continue your streak.</p>
            </div>
          </motion.div>
        ) : claimed && result ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="font-semibold text-amber-300">Heat Reward Claimed!</p>
                <p className="text-sm text-velvet-muted">Day {result.newStreak} streak — keep it going!</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {result.xp > 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-velvet-muted">XP Earned</p>
                  <p className="mt-1 text-xl font-semibold text-orange-300">+{result.xp}</p>
                </div>
              )}
              {result.coins > 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-velvet-muted">Vault Coins</p>
                  <p className="mt-1 text-xl font-semibold text-amber-300">+{result.coins}</p>
                </div>
              )}
              {result.streakBonus > 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-amber-400">Streak Bonus</p>
                  <p className="mt-1 text-xl font-semibold text-amber-300">+{result.streakBonus}</p>
                </div>
              )}
            </div>
            {result.milestoneReached && (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-center">
                <p className="text-sm font-semibold text-amber-300">
                  🏆 Milestone Unlocked — {STREAK_MILESTONES.find((m) => m.days === result.milestoneReached)?.reward}
                </p>
              </div>
            )}
          </motion.div>
        ) : tier.xp === 0 ? (
          <motion.div
            key="cold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 flex items-center gap-4"
          >
            <Lock className="h-6 w-6 text-velvet-muted shrink-0" />
            <div>
              <p className="text-sm font-semibold text-velvet-white">Temperature too low</p>
              <p className="mt-1 text-sm text-velvet-muted">
                Your area needs to reach at least 35°C to unlock heat rewards. Current: {temp}°C.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="cta"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleClaim}
            className="w-full rounded-[1.5rem] border border-orange-500/40 bg-gradient-to-r from-orange-600/20 to-amber-600/20 p-6 text-center transition-all hover:from-orange-600/30 hover:to-amber-600/30 hover:border-orange-400/60 active:scale-[0.98] group"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform inline-block">🔥</span>
            <p className="mt-3 text-lg font-semibold text-velvet-white">Claim Today's Heat Reward</p>
            <p className="mt-1 text-sm text-velvet-muted">
              +{tier.xp} XP · +{tier.hp} HP{tier.coins > 0 ? ` · +${tier.coins} Coins` : ''}
            </p>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Streak milestones reference */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STREAK_MILESTONES.map((m) => {
          const currentStreak = claimed ? (result?.newStreak ?? heatStreak) : (alreadyClaimed ? heatStreak : heatStreak)
          const done = currentStreak >= m.days
          return (
            <div
              key={m.days}
              className={`rounded-2xl border p-3 text-center transition-colors ${
                done
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-white/10 bg-black/20'
              }`}
            >
              <p className={`text-[10px] uppercase tracking-[0.24em] ${done ? 'text-amber-400' : 'text-velvet-muted'}`}>
                {m.label}
              </p>
              <p className={`mt-1 text-xs ${done ? 'text-amber-300' : 'text-velvet-muted/60'}`}>
                {done ? '✓ ' : ''}{m.reward}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
