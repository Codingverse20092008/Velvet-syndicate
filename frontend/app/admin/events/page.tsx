'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarDays, Thermometer, Users, Zap, Award, Gift, DollarSign, TrendingUp, BarChart3, Layers, ArrowRight, Clock } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1]

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  paused: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  ended: 'bg-red-500/20 text-red-300 border-red-500/30',
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['paused', 'ended'],
  paused: ['active', 'ended'],
  ended: [],
}

const FUTURE_EVENTS = [
  { id: 'monsoon', name: 'Monsoon Madness', tagline: 'When It Rains, We Pour Rewards.', emoji: '🌧️', color: 'from-blue-500/10 to-blue-600/5', iconColor: 'text-blue-400' },
  { id: 'pujo', name: 'Pujo Rush', tagline: 'Festive Fits, Epic Rewards.', emoji: '🎭', color: 'from-pink-500/10 to-pink-600/5', iconColor: 'text-pink-400' },
  { id: 'winter', name: 'Winter Vault', tagline: 'Chill Out with Exclusive Drops.', emoji: '❄️', color: 'from-cyan-500/10 to-cyan-600/5', iconColor: 'text-cyan-400' },
]

interface EventOverview {
  id: string
  name: string
  status: string
  startDate: string
  endDate: string
  participants: number
  totalXp: number
  totalHeat: number
  cratesDistributed: number
  revenue: number
  conversionRate: number
  activeChallenges: number
  totalBadges: number
}

export default function EventsDashboardPage() {
  const [overview, setOverview] = useState<EventOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetch('/api/admin/events/overview').then(r => r.json()),
      fetch('/api/admin/events/config').then(r => r.json()),
    ])
      .then(([overviewRes]) => {
        if (overviewRes.success) setOverview(overviewRes.data)
        else setError('Failed to load overview')
      })
      .catch(() => setError('Failed to load event data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const updateStatus = async (status: string) => {
    if (!overview) return
    try {
      const res = await fetch(`/api/admin/events/${overview.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) fetchData()
    } catch { /* ignore */ }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" /></div>

  if (error) return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <h1 className="font-heading text-3xl text-velvet-white tracking-tight">Seasonal Events</h1>
        <p className="text-sm text-velvet-muted mt-2">Manage event campaigns, challenges, and rewards.</p>
      </motion.div>
      <div className="rounded-2xl bg-velvet-card border border-red-400/20 p-8 text-center">
        <p className="text-red-300 text-sm">{error}</p>
        <button onClick={fetchData} className="mt-4 bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-6 py-3">Retry</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <h1 className="font-heading text-3xl text-velvet-white tracking-tight">Seasonal Events</h1>
        <p className="text-sm text-velvet-muted mt-2">Manage event campaigns, challenges, and rewards.</p>
      </motion.div>

      {overview && (
        <>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="rounded-2xl bg-velvet-card border border-white/10 p-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                  <Thermometer className="text-orange-400" size={28} />
                </div>
                <div>
                  <h2 className="font-heading text-2xl text-velvet-white tracking-tight">{overview.name}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.15em] font-bold border ${STATUS_COLORS[overview.status] || STATUS_COLORS.draft}`}>
                      {overview.status}
                    </span>
                    <span className="text-xs text-velvet-muted flex items-center gap-1.5">
                      <CalendarDays size={12} />
                      {overview.startDate} &mdash; {overview.endDate}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {STATUS_TRANSITIONS[overview.status]?.map(status => (
                  <button key={status} onClick={() => updateStatus(status)}
                    className="bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-2.5 hover:opacity-80 transition-opacity"
                  >
                    Set {status}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: 'Total Participants', value: overview.participants.toLocaleString(), icon: Users, color: 'text-blue-400 bg-blue-500/10' },
              { label: 'Total Event XP', value: overview.totalXp.toLocaleString(), icon: Zap, color: 'text-yellow-400 bg-yellow-500/10' },
              { label: 'Total Heat Points', value: overview.totalHeat.toLocaleString(), icon: Thermometer, color: 'text-orange-400 bg-orange-500/10' },
              { label: 'Crates Distributed', value: overview.cratesDistributed.toLocaleString(), icon: Gift, color: 'text-purple-400 bg-purple-500/10' },
              { label: 'Event Revenue', value: `₹${overview.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10' },
              { label: 'Conversion Rate', value: `${overview.conversionRate}%`, icon: TrendingUp, color: 'text-cyan-400 bg-cyan-500/10' },
              { label: 'Active Challenges', value: overview.activeChallenges.toString(), icon: BarChart3, color: 'text-pink-400 bg-pink-500/10' },
              { label: 'Total Badges', value: overview.totalBadges.toString(), icon: Award, color: 'text-amber-400 bg-amber-500/10' },
            ].map((stat, i) => (
              <div key={stat.label} className="rounded-2xl bg-velvet-card border border-white/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted">{stat.label}</span>
                  <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon size={16} />
                  </div>
                </div>
                <div className="font-heading text-2xl text-velvet-white tracking-tight">{stat.value}</div>
              </div>
            ))}
          </motion.div>
        </>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: EASE }}>
        <h2 className="font-heading text-xl text-velvet-white tracking-tight mb-4">Future Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FUTURE_EVENTS.map((event, i) => (
            <Link key={event.id} href={`/admin/events/${event.id}`}>
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05, ease: EASE }}
                className="rounded-2xl bg-velvet-card border border-white/10 p-6 hover:border-white/20 transition-colors group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${event.color} flex items-center justify-center`}>
                    <span className="text-2xl">{event.emoji}</span>
                  </div>
                  <ArrowRight size={18} className="text-velvet-muted group-hover:text-velvet-white transition-colors" />
                </div>
                <h3 className="font-heading text-lg text-velvet-white mb-1">{event.name}</h3>
                <p className="text-xs text-velvet-muted mb-4">{event.tagline}</p>
                <div className="text-[10px] uppercase tracking-[0.2em] text-velvet-accent font-bold">Configure</div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
