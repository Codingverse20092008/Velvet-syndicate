'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Activity, Zap, Coins, Package, Award, GraduationCap, Flame } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1]

interface VaultOverview {
  totalVaultUsers: number
  activeToday: number
  totalXpEarned: number
  totalCoinsEarned: number
  cratesOpened: number
  badgesUnlocked: number
  quizAttemptsToday: number
  avgDailyStreak: number
}

const statCards = [
  { key: 'totalVaultUsers', label: 'Total Vault Users', icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { key: 'activeToday', label: 'Active Today', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'totalXpEarned', label: 'Total XP Earned', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { key: 'totalCoinsEarned', label: 'Total Coins Earned', icon: Coins, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'cratesOpened', label: 'Crates Opened', icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { key: 'badgesUnlocked', label: 'Badges Unlocked', icon: Award, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { key: 'quizAttemptsToday', label: 'Quiz Attempts Today', icon: GraduationCap, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { key: 'avgDailyStreak', label: 'Avg Daily Streak', icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10' },
]

export default function VelvetVaultDashboardPage() {
  const [data, setData] = useState<VaultOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/velvet-vault/overview')
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data)
        else setError(d.error || 'Failed to load overview')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <h1 className="font-heading text-3xl text-velvet-white tracking-tight">Velvet Vault Admin</h1>
        <p className="text-sm text-velvet-muted mt-2">Manage vault systems</p>
      </motion.div>

      {error && (
        <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon
          const value = data ? (data as any)[card.key] : 0
          const display = typeof value === 'number' ? value.toLocaleString() : value
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.5, ease: EASE }}
              className="bg-velvet-card border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted">{card.label}</div>
                  <div className="text-3xl font-heading text-velvet-white mt-2">{display ?? 0}</div>
                </div>
                <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon className={card.color} size={20} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
