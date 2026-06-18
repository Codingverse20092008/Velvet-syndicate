'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { useAuthStore } from '@/store/authStore'

const COMMUNITY_PLAYERS = [
  { name: 'Arjun S.',    city: 'Delhi',     hp: 2840 },
  { name: 'Priya K.',    city: 'Chennai',   hp: 2610 },
  { name: 'Rohit M.',    city: 'Mumbai',    hp: 2490 },
  { name: 'Sneha D.',    city: 'Kolkata',   hp: 2310 },
  { name: 'Vivek R.',    city: 'Hyderabad', hp: 2150 },
  { name: 'Ankita B.',   city: 'Pune',      hp: 1980 },
  { name: 'Karan J.',    city: 'Jaipur',    hp: 1740 },
  { name: 'Divya N.',    city: 'Nagpur',    hp: 1560 },
  { name: 'Farhan A.',   city: 'Lucknow',   hp: 1320 },
  { name: 'Meera T.',    city: 'Bhopal',    hp: 1080 },
]

const RANK_STYLE: Record<number, { color: string; icon: string }> = {
  1: { color: 'text-amber-400', icon: '🥇' },
  2: { color: 'text-slate-300', icon: '🥈' },
  3: { color: 'text-amber-700', icon: '🥉' },
}

export function HeatLeaderboard() {
  const heatPoints = useGameStore((s) => s.heatPoints)
  const user = useAuthStore((s) => s.user)
  const userName = user?.name ?? 'You'

  const board = useMemo(() => {
    const userEntry = { name: userName, city: 'Your City', hp: heatPoints, isUser: true }
    const community = COMMUNITY_PLAYERS.map((p) => ({ ...p, isUser: false }))
    const all = [...community, userEntry].sort((a, b) => b.hp - a.hp)
    return all.map((p, i) => ({ ...p, rank: i + 1 }))
  }, [heatPoints, userName])

  const userEntry = board.find((p) => p.isUser)

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Community</p>
          <h3 className="mt-2 text-2xl font-heading uppercase tracking-wide text-velvet-white">
            Heatwave Leaderboard
          </h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-300">
            Rank #{userEntry?.rank ?? '—'}
          </span>
        </div>
      </div>

      {/* Your stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.24em] text-velvet-muted">Your Rank</p>
          <p className="mt-2 text-2xl font-semibold text-velvet-white">#{userEntry?.rank ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.24em] text-velvet-muted">Heat Points</p>
          <p className="mt-2 text-2xl font-semibold text-orange-300">{heatPoints}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.24em] text-velvet-muted">Total Players</p>
          <p className="mt-2 text-2xl font-semibold text-velvet-white">{board.length}</p>
        </div>
      </div>

      {/* Leaderboard table */}
      <div className="space-y-2">
        {board.map((entry, i) => {
          const rankStyle = RANK_STYLE[entry.rank]
          const isUser = entry.isUser
          return (
            <motion.div
              key={`${entry.name}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-4 rounded-2xl border px-4 py-3 transition-all ${
                isUser
                  ? 'border-orange-500/40 bg-orange-500/10 shadow-md shadow-orange-500/10'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {/* Rank */}
              <div className={`w-8 text-center font-semibold shrink-0 ${rankStyle?.color ?? 'text-velvet-muted'}`}>
                {rankStyle?.icon ?? `#${entry.rank}`}
              </div>

              {/* Name + city */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isUser ? 'text-orange-300' : 'text-velvet-white'}`}>
                  {entry.name} {isUser && '(You)'}
                </p>
                <p className="text-[10px] text-velvet-muted">{entry.city}</p>
              </div>

              {/* Heat Points */}
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${isUser ? 'text-orange-300' : 'text-velvet-muted'}`}>
                  {entry.hp.toLocaleString()}
                </p>
                <p className="text-[10px] text-velvet-muted/60 uppercase tracking-[0.2em]">HP</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      <p className="text-[10px] text-center text-velvet-muted/50 uppercase tracking-[0.24em]">
        Leaderboard resets at end of event · Heat Points earned from check-ins & challenges
      </p>
    </div>
  )
}
