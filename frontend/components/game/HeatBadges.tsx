'use client'

import { motion } from 'framer-motion'
import { useGameStore, type HeatBadgeId } from '@/store/gameStore'
import { EVENTS_CONFIG } from '@/lib/eventConfig'

export function HeatBadges() {
  const heatBadges = useGameStore((s) => s.heatBadges)
  const BADGES = EVENTS_CONFIG['joto-gorom'].badges

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8 space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Achievements</p>
        <h3 className="mt-2 text-2xl font-heading uppercase tracking-wide text-velvet-white">
          Heat Badges
        </h3>
        <p className="mt-1 text-sm text-velvet-muted">
          {heatBadges.length} / {BADGES.length} earned
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BADGES.map((badge, i) => {
          const earned = heatBadges.includes(badge.id as any)
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-[1.5rem] border p-5 transition-all duration-300 ${
                earned
                  ? 'border-amber-500/40 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                  : 'border-white/10 bg-white/5 opacity-50'
              }`}
            >
              {/* Earned glow */}
              {earned && (
                <div className="absolute inset-0 rounded-[1.5rem] bg-gradient-to-br from-amber-500/5 to-orange-500/5 pointer-events-none" />
              )}

              <div className="flex items-start gap-4">
                <div
                  className={`text-4xl shrink-0 transition-all duration-300 ${
                    earned ? '' : 'grayscale opacity-40'
                  }`}
                >
                  {earned ? badge.emoji : '🔒'}
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      earned ? 'text-amber-300' : 'text-velvet-muted'
                    }`}
                  >
                    {badge.name}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-velvet-muted/70">
                    {earned ? badge.description : badge.requirement}
                  </p>
                </div>
              </div>

              {earned && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center"
                >
                  <span className="text-[10px] text-black font-bold">✓</span>
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
