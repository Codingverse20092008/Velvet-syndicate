'use client'

import Link from 'next/link'
import { Sparkles, Gift, ShieldCheck, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PointsWallet } from '@/components/game/PointsWallet'
import { useGameStore } from '@/store/gameStore'

export default function GameHomePage() {
  const points = useGameStore((state) => state.points)

  return (
    <main className="min-h-screen bg-velvet-black px-4 py-16 sm:px-6 md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl space-y-16">
        <section className="grid gap-10 lg:grid-cols-[0.9fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-amber-300/20 bg-amber-200/5 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-amber-100">
              <Sparkles className="h-4 w-4" />
              Velvet Vault
            </div>

            <div className="space-y-6">
              <h1 className="font-heading text-5xl sm:text-6xl xl:text-7xl uppercase tracking-[0.06em] text-velvet-white leading-tight">
                Earn points with daily style challenges.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-velvet-muted sm:text-lg">
                Take quick fashion missions, keep your streak alive, and convert points into shopping offers, free shipping, and early access.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/game/challenge"
                className="inline-flex items-center justify-center rounded-full bg-velvet-white px-10 py-4 text-[10px] uppercase tracking-[0.28em] text-velvet-black transition hover:bg-transparent hover:text-velvet-white border border-velvet-white"
              >
                Play now
              </Link>
              <Link
                href="/game/rewards"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-10 py-4 text-[10px] uppercase tracking-[0.28em] text-velvet-white transition hover:border-white/30 hover:bg-white/10"
              >
                Redeem rewards
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-black/40 p-6 text-sm text-velvet-muted">
                <p className="uppercase tracking-[0.28em] text-velvet-muted text-[10px]">Daily mission</p>
                <p className="mt-3 leading-7 text-velvet-white">Complete three quick style challenges and earn points that apply toward adds-on and offers.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/40 p-6 text-sm text-velvet-muted">
                <p className="uppercase tracking-[0.28em] text-velvet-muted text-[10px]">Shop perks</p>
                <p className="mt-3 leading-7 text-velvet-white">Redeem points for discounts, free shipping, and limited access bundles when you shop Velvet.</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <PointsWallet />
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-velvet-white shadow-lg shadow-black/20">
              <p className="text-sm uppercase tracking-[0.28em] text-velvet-muted">Reward preview</p>
              <div className="mt-6 grid gap-4">
                <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-velvet-muted">10% off</p>
                  <p className="mt-3 text-2xl font-semibold text-velvet-white">100 points</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-velvet-muted">Free shipping</p>
                  <p className="mt-3 text-2xl font-semibold text-velvet-white">200 points</p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3 text-sm text-velvet-muted">
                <Gift className="h-4 w-4 text-amber-300" />
                <p>Current balance: <span className="text-velvet-white">{points} pts</span></p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { title: 'Play daily challenges', description: 'Tap into fast style rounds and earn points on every win.' },
            { title: 'Keep your streak', description: 'Return each day to stack streak bonuses and unlock bigger rewards.' },
            { title: 'Redeem in store', description: 'Use points at checkout or claim exclusive ticketed offers.' },
          ].map((item) => (
            <div key={item.title} className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">{item.title}</p>
              <p className="mt-4 text-sm leading-7 text-velvet-white">{item.description}</p>
            </div>
          ))}
        </section>

        {/* ── Seasonal Events ─────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Limited Time</p>
              <h2 className="mt-2 font-heading text-3xl sm:text-4xl uppercase tracking-[0.04em] text-velvet-white">
                Seasonal Events
              </h2>
            </div>
            <Link
              href="/game/events"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-transparent px-5 py-2.5 text-[10px] uppercase tracking-[0.24em] text-velvet-white transition hover:border-white/30 hover:bg-white/10"
            >
              View All
            </Link>
          </div>

          {/* Active event card */}
          <Link
            href="/game/events/joto-gorom"
            className="group block rounded-[2rem] border border-orange-500/30 bg-gradient-to-br from-orange-950/25 via-black/50 to-black/70 p-8 transition-all duration-500 hover:scale-[1.01] hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10 relative overflow-hidden"
          >
            {/* Background deco text */}
            <div
              className="pointer-events-none absolute -right-4 -top-4 font-heading font-bold leading-none opacity-[0.04] select-none text-[8rem]"
              style={{ color: '#FF6600' }}
              aria-hidden
            >
              🔥
            </div>

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">🔥</span>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-orange-300 font-semibold">
                    Active Now
                  </div>
                </div>
                <h3 className="font-heading text-3xl uppercase tracking-[0.04em] text-orange-400">
                  Joto Gorom Toto Char
                </h3>
                <p className="text-sm italic text-velvet-muted/80">
                  "The Heat Is Real. The Rewards Are Too."
                </p>
                <p className="max-w-lg text-sm leading-7 text-velvet-muted">
                  Earn bonus XP, Vault Coins, Mystery Crates, and exclusive badges based on the real-world temperature in your city.
                  The hotter it gets, the more you unlock — check in daily to build your Heat Streak.
                </p>
              </div>
              <div
                className="inline-flex items-center gap-2 self-start sm:self-center rounded-full px-6 py-3 text-[10px] uppercase tracking-[0.28em] font-semibold transition-all duration-300 group-hover:gap-3 shrink-0"
                style={{ background: '#FF6600', color: '#000' }}
              >
                Enter Event
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </Link>
        </section>

      </div>
    </main>
  )
}
