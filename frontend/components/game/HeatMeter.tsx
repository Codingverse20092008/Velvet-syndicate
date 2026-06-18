'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { type HeatTier, thermometerFill, tierProgress, HEAT_TIERS } from '@/lib/weatherUtils'

interface HeatMeterProps {
  temp: number
  tier: HeatTier
  city: string
  loading: boolean
}

const TIER_COLORS: Record<string, string> = {
  'Meltdown':   '#FF3300',
  'Inferno':    '#FF6600',
  'Heatwave':   '#FF9900',
  'Scorcher':   '#FFCC00',
  'Chill Zone': '#4A7D9C',
}

const TIER_GLOW: Record<string, string> = {
  'Meltdown':   'rgba(255,51,0,0.6)',
  'Inferno':    'rgba(255,102,0,0.5)',
  'Heatwave':   'rgba(255,153,0,0.4)',
  'Scorcher':   'rgba(255,204,0,0.3)',
  'Chill Zone': 'rgba(74,125,156,0.2)',
}

export function HeatMeter({ temp, tier, city, loading }: HeatMeterProps) {
  const fill = thermometerFill(temp)
  const progress = tierProgress(temp)
  const color = TIER_COLORS[tier.label] ?? '#FF9900'
  const glow = TIER_GLOW[tier.label] ?? 'rgba(255,153,0,0.3)'

  // Find next tier info
  const tierIndex = HEAT_TIERS.findIndex((t) => t.label === tier.label)
  const nextTier = tierIndex > 0 ? HEAT_TIERS[tierIndex - 1] : null

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{ background: `radial-gradient(ellipse at 50% 120%, ${glow} 0%, transparent 70%)` }}
      />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
        {/* Thermometer SVG */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Heat Level</p>
          <div className="relative w-14 h-64 flex items-end justify-center">
            {/* Tube background */}
            <svg viewBox="0 0 56 256" className="absolute inset-0 w-full h-full">
              {/* Tube track */}
              <rect x="20" y="8" width="16" height="208" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              {/* Bulb */}
              <circle cx="28" cy="232" r="18" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

              {/* Mercury fill (animated) */}
              <motion.rect
                x="22"
                y={8 + (1 - fill) * 200}
                width="12"
                rx="6"
                height={fill * 200 + 8}
                fill={color}
                initial={{ height: 0, y: 216 }}
                animate={{ height: fill * 200 + 8, y: 8 + (1 - fill) * 200 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                style={{ filter: `drop-shadow(0 0 6px ${color})` }}
              />
              {/* Bulb fill */}
              <motion.circle
                cx="28"
                cy="232"
                r="14"
                fill={color}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                style={{ filter: `drop-shadow(0 0 8px ${color})` }}
              />

              {/* Tier tick marks */}
              {[35, 38, 41, 44].map((t) => {
                const y = 8 + (1 - t / 50) * 200
                return (
                  <g key={t}>
                    <line x1="36" y1={y} x2="44" y2={y} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                    <text x="46" y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="sans-serif">{t}°</text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Temp display */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            {loading ? (
              <div className="h-10 w-16 rounded-lg bg-white/5 animate-pulse" />
            ) : (
              <p className="text-4xl font-semibold" style={{ color }}>
                {temp}°C
              </p>
            )}
            <p className="text-[10px] uppercase tracking-[0.28em] text-velvet-muted mt-1">{city}</p>
          </motion.div>
        </div>

        {/* Right side: tier info */}
        <div className="flex-1 space-y-6">
          {/* Active tier badge */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-3">Active Tier</p>
            <div
              className="inline-flex items-center gap-3 rounded-full px-5 py-3 border"
              style={{ borderColor: `${color}40`, background: `${color}10` }}
            >
              <span className="text-2xl">{tier.emoji}</span>
              <span className="text-lg font-semibold" style={{ color }}>{tier.label}</span>
            </div>
          </motion.div>

          {/* Reward for this tier */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-[10px] uppercase tracking-[0.28em] text-velvet-muted">XP Today</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: tier.xp > 0 ? color : undefined }}>
                {tier.xp > 0 ? `+${tier.xp}` : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-[10px] uppercase tracking-[0.28em] text-velvet-muted">Vault Coins</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: tier.coins > 0 ? '#D4C4B0' : undefined }}>
                {tier.coins > 0 ? `+${tier.coins}` : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase tracking-[0.28em] text-velvet-muted">Crate Chance</p>
              <p className="mt-2 text-2xl font-semibold text-amber-300">
                {tier.label === 'Meltdown' ? '🎁 25% Premium' : tier.label === 'Inferno' ? '📦 Mystery' : tier.label === 'Heatwave' ? '📦 10%' : '—'}
              </p>
            </div>
          </div>

          {/* Progress to next tier */}
          {nextTier && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-[0.24em] text-velvet-muted">
                <span>Progress to {nextTier.label}</span>
                <span>{nextTier.minTemp}°C needed</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.6 }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
