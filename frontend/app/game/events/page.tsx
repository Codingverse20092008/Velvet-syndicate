'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, Lock, Flame } from 'lucide-react'

const EVENTS = [
  {
    id: 'joto-gorom',
    name: 'Joto Gorom Toto Char',
    tagline: 'The Heat Is Real. The Rewards Are Too.',
    description:
      'Earn bonus XP, Vault Coins, Mystery Crates, and exclusive badges based on the real-world temperature in your city. The hotter it gets, the more you unlock.',
    emoji: '🔥',
    status: 'active' as const,
    href: '/game/events/joto-gorom',
    accent: '#FF6600',
    accentDim: 'rgba(255,102,0,0.12)',
    accentBorder: 'rgba(255,102,0,0.3)',
  },
  {
    id: 'monsoon-madness',
    name: 'Monsoon Madness',
    tagline: 'When The Rain Falls, The Points Flow.',
    description:
      'Earn rewards based on rainfall intensity in your city. The heavier the rain, the bigger the drops inside Velvet Vault.',
    emoji: '🌧️',
    status: 'soon' as const,
    href: '#',
    accent: '#4A7D9C',
    accentDim: 'rgba(74,125,156,0.08)',
    accentBorder: 'rgba(74,125,156,0.2)',
  },
  {
    id: 'pujo-rush',
    name: 'Pujo Rush',
    tagline: 'Celebrate the Season. Earn the Drops.',
    description:
      'A festive event tied to Durga Puja season. Special limited-edition badges, bonus XP, and exclusive seasonal rewards.',
    emoji: '🪔',
    status: 'soon' as const,
    href: '#',
    accent: '#D4C4B0',
    accentDim: 'rgba(212,196,176,0.07)',
    accentBorder: 'rgba(212,196,176,0.18)',
  },
  {
    id: 'winter-vault',
    name: 'Winter Vault',
    tagline: 'Cold Outside. Hot Rewards Inside.',
    description:
      'The coldest months unlock the warmest rewards. Earn points for layering up and sharing your winter fits.',
    emoji: '❄️',
    status: 'soon' as const,
    href: '#',
    accent: '#94C5E0',
    accentDim: 'rgba(148,197,224,0.07)',
    accentBorder: 'rgba(148,197,224,0.18)',
  },
]

export default function SeasonalEventsPage() {
  return (
    <main className="min-h-screen bg-velvet-black px-4 py-16 sm:px-6 md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl space-y-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-velvet-muted">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Velvet Vault
          </div>
          <h1 className="font-heading text-5xl sm:text-6xl xl:text-7xl uppercase tracking-[0.04em] text-velvet-white leading-tight">
            Seasonal Events
          </h1>
          <p className="max-w-2xl text-base leading-7 text-velvet-muted sm:text-lg">
            Limited-time events inside Velvet Vault. Each season brings new challenges, exclusive rewards, and community milestones tied to the real world.
          </p>
        </motion.div>

        {/* Events grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {EVENTS.map((event, i) => {
            const isActive = event.status === 'active'
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.6 }}
              >
                <Link
                  href={event.href}
                  className={`group block rounded-[2rem] border p-8 transition-all duration-500 ${
                    isActive
                      ? 'hover:scale-[1.01] hover:shadow-2xl'
                      : 'cursor-default'
                  }`}
                  style={{
                    borderColor: event.accentBorder,
                    background: event.accentDim,
                  }}
                  onClick={!isActive ? (e) => e.preventDefault() : undefined}
                >
                  <div className="space-y-5">
                    {/* Status badge + emoji */}
                    <div className="flex items-center justify-between">
                      <span className="text-5xl">{event.emoji}</span>
                      {isActive ? (
                        <div className="flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5">
                          <Flame className="h-3.5 w-3.5 text-orange-400 animate-pulse" />
                          <span className="text-[10px] uppercase tracking-[0.28em] text-orange-300 font-semibold">
                            Active Now
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                          <Lock className="h-3.5 w-3.5 text-velvet-muted" />
                          <span className="text-[10px] uppercase tracking-[0.28em] text-velvet-muted">
                            Coming Soon
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name + tagline */}
                    <div>
                      <h2
                        className="font-heading text-3xl uppercase tracking-[0.04em] leading-tight"
                        style={{ color: isActive ? event.accent : 'rgba(255,255,255,0.6)' }}
                      >
                        {event.name}
                      </h2>
                      <p
                        className="mt-2 text-sm font-medium italic"
                        style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}
                      >
                        {event.tagline}
                      </p>
                    </div>

                    <p className={`text-sm leading-7 ${isActive ? 'text-velvet-muted' : 'text-velvet-muted/40'}`}>
                      {event.description}
                    </p>

                    {isActive && (
                      <div
                        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[10px] uppercase tracking-[0.28em] font-semibold transition-all duration-300 group-hover:gap-3"
                        style={{ background: event.accent, color: '#000' }}
                      >
                        Enter Event
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Back to vault */}
        <div className="text-center">
          <Link
            href="/game"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-transparent px-8 py-4 text-[10px] uppercase tracking-[0.28em] text-velvet-white transition hover:border-white/30 hover:bg-white/10"
          >
            ← Back to Velvet Vault
          </Link>
        </div>
      </div>
    </main>
  )
}
