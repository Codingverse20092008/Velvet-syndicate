'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Trophy, CheckCircle2, Lock, Gift, Award } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { getLevelForXp, getXpForLevel } from '@/lib/eventConfig'

export function XPProgression() {
  const { xp, levelClaims, claimLevelReward } = useGameStore()
  const [claimToast, setClaimToast] = useState<string | null>(null)

  const currentLevel = getLevelForXp(xp)
  const currentLevelXpStart = getXpForLevel(currentLevel)
  const nextLevelXpStart = getXpForLevel(currentLevel + 1)
  
  const xpInCurrentLevel = xp - currentLevelXpStart
  const xpNeededForNextLevel = nextLevelXpStart - currentLevelXpStart
  const progressPercent = Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100)

  // Generate milestone list from levels 2 to 10 + next level
  const levelsToShow = Array.from({ length: 9 }).map((_, i) => i + 2) // Level 2 to 10
  
  const handleClaim = (lvl: number) => {
    const res = claimLevelReward(lvl)
    if (res.success) {
      setClaimToast(`Claimed Level ${lvl} Reward: ${res.rewardLabel}`)
      setTimeout(() => setClaimToast(null), 5000)
    }
  }

  const getRewardDescription = (lvl: number) => {
    if (lvl === 2) return '10% Off Coupon & 20 Coins'
    if (lvl === 3) return 'Mystery Crate & 30 Coins'
    if (lvl === 4) return 'Free Shipping Coupon & 50 Coins'
    if (lvl === 5) return 'Vault Legend Profile Badge & 75 Coins'
    if (lvl === 6) return 'Premium Crate & 100 Coins'
    if (lvl === 7) return 'Early Access Pass & 150 Coins'
    if (lvl === 8) return '20% Off Coupon & 200 Coins'
    if (lvl === 9) return 'Premium Crate & 250 Coins'
    if (lvl === 10) return 'Legend Badge, Crate & 300 Coins'
    return `${lvl * 25} Coins & Event Crate`
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8 space-y-6 relative overflow-hidden">
      
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Season Level Progression</p>
        <h3 className="mt-2 text-2xl font-heading uppercase tracking-wide text-velvet-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-300" />
          XP Economy & Level Rewards
        </h3>
        <p className="mt-1 text-sm text-velvet-muted">
          Earn XP from forecasts, purchases, daily check-ins, and challenges to level up and claim exclusive prizes.
        </p>
      </div>

      {claimToast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 text-center"
        >
          {claimToast}
        </motion.div>
      )}

      {/* Progress Bar Container */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-velvet-muted">Current Rank</p>
            <p className="text-2xl font-heading text-velvet-white uppercase mt-0.5">Level {currentLevel}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-velvet-muted">XP Progress</p>
            <p className="text-sm font-semibold text-orange-400 mt-0.5">
              {xp} / {nextLevelXpStart} XP
            </p>
          </div>
        </div>

        {/* Outer Bar */}
        <div className="relative h-4 rounded-full bg-white/10 overflow-hidden flex items-center">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          <span className="absolute right-4 text-[9px] font-bold text-velvet-white leading-none">
            {Math.round(progressPercent)}%
          </span>
        </div>

        <div className="flex justify-between text-[10px] text-velvet-muted">
          <span>Level {currentLevel} ({currentLevelXpStart} XP)</span>
          <span>{nextLevelXpStart - xp} XP needed for Level {currentLevel + 1}</span>
        </div>
      </div>

      {/* Level Milestones List */}
      <div className="space-y-3">
        <h4 className="font-heading text-xs uppercase tracking-widest text-velvet-white">Level Milestone Rewards</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {levelsToShow.map((lvl) => {
            const hasLeveled = currentLevel >= lvl
            const claimed = levelClaims.includes(lvl)
            const rewardLabel = getRewardDescription(lvl)

            return (
              <div
                key={lvl}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  claimed
                    ? 'border-emerald-500/20 bg-emerald-500/5 opacity-60'
                    : hasLeveled
                    ? 'border-orange-500/40 bg-orange-500/10 shadow-[0_0_10px_rgba(255,102,0,0.05)]'
                    : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-heading text-xs font-bold border ${
                    hasLeveled ? 'border-orange-500/30 text-orange-400 bg-orange-500/5' : 'border-white/5 text-velvet-muted'
                  }`}>
                    L{lvl}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${hasLeveled ? 'text-velvet-white' : 'text-velvet-muted'}`}>
                      {hasLeveled ? 'Milestone Reached' : `Level ${lvl} Unlock`}
                    </p>
                    <p className="text-[10px] text-velvet-muted/80 leading-normal">{rewardLabel}</p>
                  </div>
                </div>

                <div>
                  {claimed ? (
                    <div className="flex items-center gap-1 text-emerald-400 text-[10px] uppercase tracking-wider font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                    </div>
                  ) : hasLeveled ? (
                    <button
                      onClick={() => handleClaim(lvl)}
                      className="px-3 py-1.5 rounded-full font-heading text-[8px] uppercase tracking-widest bg-orange-500 hover:bg-orange-400 text-black font-bold transition-all shadow-md shadow-orange-500/10"
                    >
                      Claim
                    </button>
                  ) : (
                    <div className="text-velvet-muted/40 p-1">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
