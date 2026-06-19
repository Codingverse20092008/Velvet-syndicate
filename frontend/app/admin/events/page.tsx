'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Thermometer, Users, Zap, Award, Gift, DollarSign, TrendingUp, BarChart3, Layers, Clock } from 'lucide-react'

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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', eventType: '', startDate: '', endDate: '' })

  const createEvent = async () => {
    try {
      const res = await fetch('/api/admin/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (data.success) {
        setShowCreateModal(false)
        setCreateForm({ name: '', description: '', eventType: '', startDate: '', endDate: '' })
        fetchData()
      }
    } catch { /* ignore */ }
  }

  const duplicateEvent = async () => {
    if (!overview) return
    try {
      const res = await fetch(`/api/admin/events/${overview.id}/duplicate`, { method: 'POST' })
      const data = await res.json()
      if (data.success) fetchData()
    } catch { /* ignore */ }
  }

  const fetchData = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetch('/api/admin/events/overview').then(r => r.status === 401 ? null : r.json()),
      fetch('/api/admin/events/config').then(r => r.status === 401 ? null : r.json()),
    ])
      .then(([overviewRes]) => {
        if (overviewRes && overviewRes.success) setOverview(overviewRes.data)
        else if (overviewRes) setError('Failed to load overview')
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-velvet-white tracking-tight">Seasonal Events</h1>
          <p className="text-sm text-velvet-muted mt-2">Manage event campaigns, challenges, and rewards.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-5 py-3 hover:opacity-80 transition-opacity"
        >
          Create Event
        </button>
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
              <div className="flex items-center gap-2 flex-wrap">
                {STATUS_TRANSITIONS[overview.status]?.map(status => (
                  <button key={status} onClick={() => updateStatus(status)}
                    className="bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-2.5 hover:opacity-80 transition-opacity"
                  >
                    Set {status}
                  </button>
                ))}
                <button onClick={duplicateEvent}
                  className="border border-white/20 text-velvet-muted hover:text-velvet-white rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-2.5 hover:border-white/40 transition-all"
                >
                  Duplicate
                </button>
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



      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-8 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-xl text-velvet-white tracking-tight mb-6">Create New Event</h3>
            <div className="space-y-4">
              <input placeholder="Event Name" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white placeholder-velvet-muted focus:outline-none focus:border-white/30" />
              <input placeholder="Event Type (e.g. monsoon-madness)" value={createForm.eventType} onChange={e => setCreateForm(p => ({ ...p, eventType: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white placeholder-velvet-muted focus:outline-none focus:border-white/30" />
              <textarea placeholder="Description" value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white placeholder-velvet-muted focus:outline-none focus:border-white/30" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.15em] text-velvet-muted mb-1 block">Start Date</label>
                  <input type="date" value={createForm.startDate} onChange={e => setCreateForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white focus:outline-none focus:border-white/30" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.15em] text-velvet-muted mb-1 block">End Date</label>
                  <input type="date" value={createForm.endDate} onChange={e => setCreateForm(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white focus:outline-none focus:border-white/30" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-8">
              <button onClick={() => setShowCreateModal(false)}
                className="text-velvet-muted hover:text-velvet-white text-xs uppercase tracking-[0.15em] font-bold px-4 py-2.5 transition-colors">Cancel</button>
              <button onClick={createEvent}
                className="bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-6 py-3 hover:opacity-80 transition-opacity">Create Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
