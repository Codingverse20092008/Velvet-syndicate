'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'

export function PointsWallet() {
  const { points, streakDays, lastSessionEarned, lastSessionBonus } = useGameStore()

  return (
    <section className="rounded-[2rem] border border-white/10 bg-velvet-card/70 p-8 shadow-2xl shadow-black/10 backdrop-blur-xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-velvet-muted">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Velvet Vault
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-velvet-muted">Points wallet</p>
            <h2 className="mt-2 text-4xl font-heading uppercase tracking-[0.04em] text-velvet-white">
              {points} pts
            </h2>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-black/50 p-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Streak</p>
            <p className="mt-2 text-2xl font-semibold text-velvet-white">{streakDays}d</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/50 p-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Last session</p>
            <p className="mt-2 text-2xl font-semibold text-velvet-white">{lastSessionEarned} pts</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/50 p-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Bonus</p>
            <p className="mt-2 text-2xl font-semibold text-velvet-white">{lastSessionBonus} pts</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-velvet-muted">
          Play challenges every day to keep your streak active. Redeem points for exclusive deals, free shipping, and early-access drops.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/game/challenge"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-3 text-[10px] uppercase tracking-[0.24em] text-velvet-white transition hover:border-white/30 hover:bg-white/15"
          >
            Start challenge
          </Link>
          <Link
            href="/game/rewards"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-6 py-3 text-[10px] uppercase tracking-[0.24em] text-velvet-white transition hover:border-white/30 hover:bg-white/10"
          >
            View rewards
          </Link>
        </div>
      </div>
    </section>
  )
}
