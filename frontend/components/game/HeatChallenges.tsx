'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { EVENTS_CONFIG } from '@/lib/eventConfig'
import Link from 'next/link'

interface HeatChallengesProps {
  temp: number
}

export function HeatChallenges({ temp }: HeatChallengesProps) {
  const { 
    completedChallengesToday, 
    challengeProgress, 
    claimChallenge 
  } = useGameStore()

  const challenges = EVENTS_CONFIG['joto-gorom'].challenges

  // Calculate multiplier: 35°C+: 1.0x, 38°C+: 1.25x, 41°C+: 1.5x, 44°C+: 2.0x
  let multiplier = 1.0
  if (temp >= 44) multiplier = 2.0
  else if (temp >= 41) multiplier = 1.5
  else if (temp >= 38) multiplier = 1.25

  const getProgressInfo = (c: typeof challenges[number]) => {
    if (c.type === 'explorer') {
      const current = challengeProgress.viewedProducts.length
      const required = c.requirementValue || 5
      return {
        text: `Products Viewed: ${current} / ${required}`,
        ready: current >= required
      }
    }
    if (c.type === 'hunter') {
      const current = challengeProgress.newArrivalsTimeSpent
      const required = c.requirementValue || 10
      return {
        text: `Time Spent: ${current}s / ${required}s`,
        ready: current >= required
      }
    }
    if (c.type === 'wishlist') {
      const current = challengeProgress.wishlistedProducts.length
      const required = c.requirementValue || 3
      return {
        text: `Wishlisted: ${current} / ${required}`,
        ready: current >= required
      }
    }
    if (c.type === 'collection') {
      const current = challengeProgress.collectionBrowseTime
      const required = c.requirementValue || 30
      return {
        text: `Browse Time: ${current}s / ${required}s`,
        ready: current >= required
      }
    }
    if (c.type === 'shopper') {
      const ready = challengeProgress.heatwaveOrderPlaced
      return {
        text: ready ? 'Order Placed during Heatwave' : 'Order pending during Heatwave tier',
        ready
      }
    }
    return {
      text: '',
      ready: true // manual complete or other
    }
  }

  const handleClaim = (id: string) => {
    const res = claimChallenge(id, temp)
    if (res.success) {
      // Show local confirmation/celebration (toast handles this globally in parent, but this is a nice safe feedback)
      console.log('Claimed successfully:', res)
    }
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8 space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Event Challenges</p>
        <h3 className="mt-2 text-2xl font-heading uppercase tracking-wide text-velvet-white">
          Heatwave Challenges
        </h3>
        <p className="mt-1 text-sm text-velvet-muted">
          Complete daily event challenges to earn bonus XP and Heat Points. Temperature multiplier ({multiplier}x) is active!
        </p>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {challenges.map((c, i) => {
          const isDone = completedChallengesToday.includes(c.id)
          const prog = getProgressInfo(c)
          const canClaim = prog.ready && !isDone
          const finalXp = Math.round(c.xp * multiplier)

          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-[1.5rem] border p-5 transition-all duration-300 ${
                isDone
                  ? 'border-emerald-500/30 bg-emerald-500/5 opacity-70'
                  : canClaim
                  ? 'border-orange-500/50 bg-orange-500/5 shadow-[0_0_15px_rgba(255,102,0,0.1)]'
                  : 'border-white/10 bg-white/5 hover:border-orange-500/30 hover:bg-orange-500/5'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl shrink-0 mt-0.5">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${isDone ? 'text-emerald-300 line-through' : 'text-velvet-white'}`}>
                        {c.title}
                      </p>
                      <span className="text-[9px] uppercase tracking-[0.24em] text-orange-400 border border-orange-500/30 rounded-full px-2 py-0.5 font-bold">
                        +{Math.round(c.heatPoints * multiplier)} HP
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-velvet-muted">{c.description}</p>
                  
                  {/* Progress display */}
                  {prog.text && !isDone && (
                    <div className="mt-2 text-[10px] text-orange-300 font-medium">
                      Progress: {prog.text}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    {isDone ? (
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.24em] font-semibold">Completed</span>
                      </div>
                    ) : (
                      <>
                        {canClaim ? (
                          <button
                            onClick={() => handleClaim(c.id)}
                            className="text-[10px] uppercase tracking-[0.24em] text-black bg-orange-500 hover:bg-orange-400 font-bold rounded-full px-4 py-2 transition-all shadow-lg shadow-orange-500/20"
                          >
                            Claim Reward (+{finalXp} XP)
                          </button>
                        ) : (
                          <>
                            {c.link && (
                              <Link
                                href={c.link}
                                className="text-[10px] uppercase tracking-[0.24em] text-velvet-white border border-white/20 rounded-full px-3 py-1.5 hover:bg-white/10 transition-colors flex items-center gap-1"
                              >
                                {c.linkLabel || 'Go to task'}
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}
                            {/* Manual fallback option */}
                            <button
                              onClick={() => handleClaim(c.id)}
                              className="text-[10px] uppercase tracking-[0.24em] text-orange-400/60 hover:text-orange-300 transition-colors"
                            >
                              Verify Task
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.28em] text-velvet-muted">
          Completed today: {completedChallengesToday.length} / {challenges.length}
        </p>
        <div className="flex gap-1">
          {challenges.map((c) => (
            <div
              key={c.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                completedChallengesToday.includes(c.id) ? 'bg-emerald-400' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
