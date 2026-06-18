'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, Flame, ArrowLeft, RefreshCw } from 'lucide-react'
import { HeatMeter } from '@/components/game/HeatMeter'
import { HeatCheckIn } from '@/components/game/HeatCheckIn'
import { HeatChallenges } from '@/components/game/HeatChallenges'
import { HeatBadges } from '@/components/game/HeatBadges'
import { HeatLeaderboard } from '@/components/game/HeatLeaderboard'
import { CrateInventory } from '@/components/game/CrateInventory'
import { HeatForecastCard } from '@/components/game/HeatForecastCard'
import { XPProgression } from '@/components/game/XPProgression'
import { HeatEventAnalytics } from '@/components/game/HeatEventAnalytics'
import { useGameStore } from '@/store/gameStore'
import { fetchWeather, getHeatTier, type WeatherData } from '@/lib/weatherUtils'

export default function JotoGoromPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState(false)
  const [claimToast, setClaimToast] = useState<string | null>(null)

  const { heatStreak, heatPoints, heatBadges, lastHeatCheckIn, meltdownClaims, eventParticipationDays, awardHeatBadge, incrementMeltdownClaims } = useGameStore()

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true)
    setWeatherError(false)
    try {
      const data = await fetchWeather()
      setWeather(data)
    } catch {
      setWeatherError(true)
      // Fallback to a reasonable summer temperature
      setWeather({ temp: 36, city: 'Your City', lat: 22.57, lon: 88.36 })
    } finally {
      setWeatherLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWeather()
  }, [loadWeather])

  // Auto-award badges on claim
  const handleClaimed = useCallback(
    (result: { xp: number; coins: number; newStreak: number; milestoneReached: number | null }) => {
      // Heat Rookie — first ever check-in
      if (!heatBadges.includes('heat-rookie')) {
        awardHeatBadge('heat-rookie')
      }

      // Heatwave Survivor — claimed at Heatwave tier+
      if (weather && weather.temp >= 38 && !heatBadges.includes('heatwave-survivor')) {
        awardHeatBadge('heatwave-survivor')
      }

      // Meltdown Master — requires 5 separate Meltdown claims at 44°C+
      if (weather && weather.temp >= 44) {
        incrementMeltdownClaims()
        if (meltdownClaims + 1 >= 5 && !heatBadges.includes('meltdown-master')) {
          awardHeatBadge('meltdown-master')
        }
      }

      // Heat Hunter — 7-day streak
      if (result.newStreak >= 7 && !heatBadges.includes('heat-hunter')) {
        awardHeatBadge('heat-hunter')
      }

      // Sun Chaser — 30-day streak
      if (result.newStreak >= 30 && !heatBadges.includes('sun-chaser')) {
        awardHeatBadge('sun-chaser')
      }

      // OG Participant — 14 unique participation days
      const newParticipationDays = eventParticipationDays.includes(new Date().toISOString().slice(0, 10))
        ? eventParticipationDays
        : [...eventParticipationDays, new Date().toISOString().slice(0, 10)]
      if (newParticipationDays.length >= 14 && !heatBadges.includes('og-participant')) {
        awardHeatBadge('og-participant')
      }

      // Show toast
      const parts: string[] = []
      if (result.xp > 0) parts.push(`+${result.xp} XP`)
      if (result.coins > 0) parts.push(`+${result.coins} Vault Coins`)
      if (result.milestoneReached) parts.push(`🏆 ${result.milestoneReached}-day milestone!`)
      setClaimToast(parts.join(' · '))
      setTimeout(() => setClaimToast(null), 4000)
    },
    [weather, heatBadges, meltdownClaims, eventParticipationDays, awardHeatBadge, incrementMeltdownClaims]
  )

  const tier = getHeatTier(weather?.temp ?? 0)
  const todayStr = new Date().toISOString().slice(0, 10)
  const alreadyClaimedToday = lastHeatCheckIn === todayStr

  return (
    <main className="min-h-screen bg-velvet-black px-4 py-16 sm:px-6 md:px-10 lg:px-16 relative overflow-hidden">
      {/* Ambient background glow based on tier */}
      <div
        className="pointer-events-none fixed inset-0 transition-all duration-2000"
        style={{
          background: weather && weather.temp >= 44
            ? 'radial-gradient(ellipse at 50% 0%, rgba(255,51,0,0.08) 0%, transparent 60%)'
            : weather && weather.temp >= 41
            ? 'radial-gradient(ellipse at 50% 0%, rgba(255,102,0,0.07) 0%, transparent 60%)'
            : weather && weather.temp >= 38
            ? 'radial-gradient(ellipse at 50% 0%, rgba(255,153,0,0.06) 0%, transparent 60%)'
            : weather && weather.temp >= 35
            ? 'radial-gradient(ellipse at 50% 0%, rgba(255,204,0,0.04) 0%, transparent 55%)'
            : 'transparent'
        }}
      />

      <div className="relative mx-auto max-w-7xl space-y-8">

        {/* Breadcrumb nav */}
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-velvet-muted">
          <Link href="/game" className="hover:text-velvet-white transition-colors">Vault</Link>
          <span>/</span>
          <Link href="/game/events" className="hover:text-velvet-white transition-colors">Events</Link>
          <span>/</span>
          <span className="text-orange-400">Joto Gorom Toto Char</span>
        </div>

        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="rounded-[2rem] border border-orange-500/25 bg-gradient-to-br from-orange-950/30 via-black/60 to-black/80 p-8 sm:p-12 relative overflow-hidden"
        >
          {/* Decorative background text */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 text-[10rem] sm:text-[16rem] font-heading font-bold leading-none opacity-[0.025] select-none"
            style={{ color: '#FF6600' }}
            aria-hidden
          >
            38°
          </div>

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-orange-300">
                  <Flame className="h-3.5 w-3.5 animate-pulse" />
                  Seasonal Event · Active
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-velvet-muted">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Velvet Vault
                </div>
              </div>

              <h1 className="font-heading text-4xl sm:text-6xl uppercase tracking-[0.04em] text-velvet-white leading-tight">
                Joto Gorom
                <br />
                <span className="text-orange-400">Toto Char</span>
              </h1>

              <p className="text-lg font-medium italic text-velvet-muted">
                "The Heat Is Real. The Rewards Are Too."
              </p>
              <p className="max-w-lg text-sm leading-7 text-velvet-muted/80">
                The hotter it gets where you are, the more opportunities unlock inside Velvet Vault.
                Check in daily, complete heatwave challenges, climb the leaderboard, and collect exclusive heat badges.
              </p>
            </div>

            {/* Live stats */}
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 shrink-0">
              <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.28em] text-velvet-muted">Heat Streak</p>
                <p className="mt-2 text-3xl font-semibold text-orange-300">🔥 {heatStreak}d</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.28em] text-velvet-muted">Heat Points</p>
                <p className="mt-2 text-3xl font-semibold text-amber-300">{heatPoints}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.28em] text-velvet-muted">Badges</p>
                <p className="mt-2 text-3xl font-semibold text-velvet-white">{heatBadges.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.28em] text-velvet-muted">Status</p>
                <p className="mt-2 text-base font-semibold">
                  {alreadyClaimedToday
                    ? <span className="text-emerald-400">✓ Claimed</span>
                    : <span className="text-orange-300">Pending</span>}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Weather error notice */}
        {weatherError && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-300">
              Could not fetch live temperature — using estimated data. Enable location access for accurate rewards.
            </p>
            <button
              onClick={loadWeather}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-amber-300 hover:text-amber-200 transition-colors shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Heat Meter */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <HeatMeter
            temp={weather?.temp ?? 0}
            tier={tier}
            city={weather?.city ?? '—'}
            loading={weatherLoading}
          />
        </motion.div>

        {/* Daily Check-In */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <HeatCheckIn
            tier={tier}
            temp={weather?.temp ?? 0}
            onClaimed={handleClaimed}
          />
        </motion.div>

        {/* XP Progression + Forecast Card side by side */}
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <XPProgression />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <HeatForecastCard currentTemp={weather?.temp ?? 0} />
          </motion.div>
        </div>

        {/* Challenges + Leaderboard side by side on large screens */}
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <HeatChallenges temp={weather?.temp ?? 0} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <HeatLeaderboard />
          </motion.div>
        </div>

        {/* Crate Inventory + Badges side by side */}
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <CrateInventory />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}>
            <HeatBadges />
          </motion.div>
        </div>

        {/* Event Analytics */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <HeatEventAnalytics />
        </motion.div>

        {/* Only inside Velvet Vault tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 text-center space-y-3"
        >
          <span className="text-4xl">🔥</span>
          <p className="font-heading text-2xl sm:text-3xl uppercase tracking-[0.06em] text-velvet-white">
            The Heat Is Real.
          </p>
          <p className="font-heading text-2xl sm:text-3xl uppercase tracking-[0.06em] text-orange-400">
            The Rewards Are Too.
          </p>
          <p className="text-sm uppercase tracking-[0.28em] text-velvet-muted">
            Only Inside Velvet Vault.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/game/challenge"
              className="inline-flex items-center justify-center rounded-full bg-velvet-white px-8 py-4 text-[10px] uppercase tracking-[0.28em] text-velvet-black hover:bg-transparent hover:text-velvet-white border border-velvet-white transition-all duration-300"
            >
              Play Today's Challenge
            </Link>
            <Link
              href="/game/events"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent px-8 py-4 text-[10px] uppercase tracking-[0.28em] text-velvet-white transition hover:border-white/30 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              All Events
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Claim success toast */}
      {claimToast && (
        <motion.div
          initial={{ opacity: 0, y: 40, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          className="fixed bottom-8 left-1/2 z-50 rounded-full border border-orange-500/40 bg-orange-500/20 px-6 py-4 text-sm font-semibold text-orange-200 shadow-2xl shadow-orange-500/20 backdrop-blur-xl whitespace-nowrap"
        >
          🔥 {claimToast}
        </motion.div>
      )}
    </main>
  )
}
