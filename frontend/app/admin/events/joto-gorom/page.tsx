'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Thermometer, ShieldCheck, Award, Trophy, BarChart3, Plus, Save, Pencil, ToggleLeft, ToggleRight, Trash2, Snowflake, Flame, AlertTriangle, Skull, Users, Gift, Zap, ShoppingBag, DollarSign, TrendingUp, Activity, Star } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1]

const TIER_CONFIG = [
  { id: 'scorcher', label: 'Scorcher', range: '35°C – 37.9°C', icon: Flame, color: 'text-yellow-400', defaultTemp: 35 },
  { id: 'heatwave', label: 'Heatwave', range: '38°C – 40.9°C', icon: AlertTriangle, color: 'text-orange-400', defaultTemp: 38 },
  { id: 'inferno', label: 'Inferno', range: '41°C – 43.9°C', icon: Flame, color: 'text-red-400', defaultTemp: 41 },
  { id: 'meltdown', label: 'Meltdown', range: '44°C+', icon: Skull, color: 'text-red-600', defaultTemp: 44 },
]

const CHALLENGE_TYPES = ['quiz', 'explorer', 'hunter', 'wishlist', 'collection', 'shopper', 'poll', 'streak'] as const

interface TierData {
  tempMin: number
  xp: number
  coins: number
  heatPoints: number
  mysteryCrate: number
  premiumCrate: number
}

interface Challenge {
  id: string
  emoji: string
  title: string
  description: string
  xp: number
  heatPoints: number
  type: string
  requirementValue?: number
  enabled: boolean
}

interface Badge {
  id: string
  emoji: string
  name: string
  description: string
  requirement: string
}

interface LeaderboardEntry {
  rank: number
  userName: string
  score: number
}

interface Analytics {
  participants: number
  dailyClaims: number
  avgHeatStreak: number
  cratesOpened: number
  meltdownClaims: number
  eventPurchases: number
  heatwaveShopperCompletions: number
  revenue: number
}

const emptyChallenge = (): Challenge => ({
  id: '', emoji: '🔥', title: '', description: '', xp: 0, heatPoints: 0, type: 'quiz', requirementValue: undefined, enabled: true,
})

export default function JotoGoromPage() {
  const [tiers, setTiers] = useState<Record<string, TierData>>({})
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('tiers')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newChallenge, setNewChallenge] = useState<Challenge>(emptyChallenge())
  const [editingBadge, setEditingBadge] = useState<string | null>(null)
  const [editRequirement, setEditRequirement] = useState('')
  const [savingTiers, setSavingTiers] = useState(false)
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false)
  const [showDistributeConfirm, setShowDistributeConfirm] = useState(false)

  const fetchAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/admin/events/joto-gorom/tiers').then(r => r.json()),
      fetch('/api/admin/events/joto-gorom/challenges').then(r => r.json()),
      fetch('/api/admin/events/joto-gorom/badges').then(r => r.json()),
      fetch('/api/admin/events/joto-gorom/leaderboard').then(r => r.json()),
      fetch('/api/admin/events/joto-gorom/analytics').then(r => r.json()),
    ])
      .then(([tiersRes, challengesRes, badgesRes, lbRes, analyticsRes]) => {
        if (tiersRes.success) setTiers(tiersRes.data)
        if (challengesRes.success) setChallenges(challengesRes.data)
        if (badgesRes.success) setBadges(badgesRes.data)
        if (lbRes.success) setLeaderboard(lbRes.data)
        if (analyticsRes.success) setAnalytics(analyticsRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const updateTier = (tierId: string, field: keyof TierData, value: number) => {
    setTiers(prev => ({ ...prev, [tierId]: { ...prev[tierId], [field]: value } }))
  }

  const saveTiers = async () => {
    setSavingTiers(true)
    try {
      await fetch('/api/admin/events/joto-gorom/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tiers),
      })
    } catch { /* ignore */ }
    setSavingTiers(false)
  }

  const toggleChallenge = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/events/joto-gorom/challenges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (res.ok) setChallenges(prev => prev.map(c => c.id === id ? { ...c, enabled } : c))
    } catch { /* ignore */ }
  }

  const createChallenge = async () => {
    try {
      const res = await fetch('/api/admin/events/joto-gorom/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChallenge),
      })
      const data = await res.json()
      if (data.success) {
        setChallenges(prev => [...prev, data.data])
        setShowCreateModal(false)
        setNewChallenge(emptyChallenge())
      }
    } catch { /* ignore */ }
  }

  const saveBadgeRequirement = async (badgeId: string) => {
    try {
      const res = await fetch(`/api/admin/events/joto-gorom/badges/${badgeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement: editRequirement }),
      })
      if (res.ok) {
        setBadges(prev => prev.map(b => b.id === badgeId ? { ...b, requirement: editRequirement } : b))
        setEditingBadge(null)
      }
    } catch { /* ignore */ }
  }

  const freezeRankings = async () => {
    try { await fetch('/api/admin/events/joto-gorom/leaderboard/freeze', { method: 'POST' }) } catch { /* ignore */ }
    setShowFreezeConfirm(false)
  }

  const distributeRewards = async () => {
    try { await fetch('/api/admin/events/joto-gorom/leaderboard/distribute', { method: 'POST' }) } catch { /* ignore */ }
    setShowDistributeConfirm(false)
  }

  const sections = [
    { id: 'tiers', label: 'Temperature Tiers', icon: Thermometer },
    { id: 'challenges', label: 'Challenges', icon: ShieldCheck },
    { id: 'badges', label: 'Badges', icon: Award },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" /></div>

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Thermometer className="text-orange-400" size={20} />
          </div>
          <div>
            <h1 className="font-heading text-3xl text-velvet-white tracking-tight">Joto Gorom Toto Char</h1>
            <p className="text-sm text-velvet-muted mt-1">The Heat Is Real. The Rewards Are Too.</p>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-1 p-1 rounded-2xl bg-velvet-card border border-white/10 overflow-x-auto">
        {sections.map(s => {
          const Icon = s.icon
          return (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold whitespace-nowrap transition-all ${
                activeSection === s.id ? 'bg-velvet-white text-velvet-black' : 'text-velvet-muted hover:text-velvet-white'
              }`}
            >
              <Icon size={14} />
              {s.label}
            </button>
          )
        })}
      </div>

      {activeSection === 'tiers' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="space-y-4">
          <h2 className="font-heading text-xl text-velvet-white tracking-tight">Temperature Tier Editor</h2>
          <div className="rounded-2xl bg-velvet-card border border-white/10 overflow-hidden">
            <div className="grid grid-cols-7 gap-0 border-b border-white/10">
              <div className="col-span-1 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-velvet-muted font-bold">Tier</div>
              <div className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-velvet-muted font-bold text-center">XP</div>
              <div className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-velvet-muted font-bold text-center">Coins</div>
              <div className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-velvet-muted font-bold text-center">Heat Points</div>
              <div className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-velvet-muted font-bold text-center">Mystery Crate %</div>
              <div className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-velvet-muted font-bold text-center">Premium Crate %</div>
              <div className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-velvet-muted font-bold text-center">Temp Range</div>
            </div>
            {TIER_CONFIG.map(tier => {
              const Icon = tier.icon
              const data = tiers[tier.id] || { tempMin: tier.defaultTemp, xp: 0, coins: 0, heatPoints: 0, mysteryCrate: 0, premiumCrate: 0 }
              return (
                <div key={tier.id} className="grid grid-cols-7 gap-0 border-b border-white/5 last:border-b-0">
                  <div className="col-span-1 px-4 py-3 flex items-center gap-2">
                    <Icon size={16} className={tier.color} />
                    <span className="text-sm text-velvet-white font-heading">{tier.label}</span>
                  </div>
                  {(['xp', 'coins', 'heatPoints', 'mysteryCrate', 'premiumCrate'] as (keyof TierData)[]).map(field => (
                    <div key={field} className="px-4 py-3 flex justify-center">
                      <input type="number" value={data[field]}
                        onChange={e => updateTier(tier.id, field, Number(e.target.value))}
                        className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-velvet-white text-center focus:outline-none focus:border-white/20"
                      />
                    </div>
                  ))}
                  <div className="px-4 py-3 flex items-center justify-center text-xs text-velvet-muted">{tier.range}</div>
                </div>
              )
            })}
          </div>
          <button onClick={saveTiers} disabled={savingTiers}
            className="bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-6 py-3 hover:opacity-80 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={14} />
            {savingTiers ? 'Saving...' : 'Save Temperature Config'}
          </button>
        </motion.div>
      )}

      {activeSection === 'challenges' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl text-velvet-white tracking-tight">Event Challenge Management</h2>
            <button onClick={() => setShowCreateModal(true)}
              className="bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-5 py-2.5 hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <Plus size={14} />
              Create Challenge
            </button>
          </div>
          <div className="rounded-2xl bg-velvet-card border border-white/10 overflow-hidden">
            <div className="grid grid-cols-10 gap-0 border-b border-white/10">
              {['', 'Title', 'Description', 'XP', 'Heat Points', 'Type', 'Requirement', 'Status', '', ''].map(h => (
                <div key={h} className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-velvet-muted font-bold">{h}</div>
              ))}
            </div>
            {challenges.map(ch => (
              <div key={ch.id} className="grid grid-cols-10 gap-0 border-b border-white/5 items-center">
                <div className="px-4 py-3 text-lg">{ch.emoji}</div>
                <div className="px-4 py-3 text-sm text-velvet-white font-heading">{ch.title}</div>
                <div className="px-4 py-3 text-xs text-velvet-muted truncate">{ch.description}</div>
                <div className="px-4 py-3 text-sm text-velvet-white">{ch.xp}</div>
                <div className="px-4 py-3 text-sm text-velvet-white">{ch.heatPoints}</div>
                <div className="px-4 py-3 text-[10px] uppercase tracking-[0.1em] text-velvet-muted">{ch.type}</div>
                <div className="px-4 py-3 text-sm text-velvet-muted">{ch.requirementValue ?? '-'}</div>
                <div className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.1em] font-bold border ${
                    ch.enabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                  }`}>
                    {ch.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <button className="text-velvet-muted hover:text-velvet-white transition-colors" title="Edit">
                    <Pencil size={14} />
                  </button>
                </div>
                <div className="px-4 py-3">
                  <button onClick={() => toggleChallenge(ch.id, !ch.enabled)}
                    className={`transition-colors ${ch.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-velvet-muted hover:text-velvet-white'}`}
                    title={ch.enabled ? 'Disable' : 'Enable'}
                  >
                    {ch.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6 w-full max-w-lg mx-4">
                <h3 className="font-heading text-lg text-velvet-white mb-4">Create Challenge</h3>
                <div className="space-y-3">
                  {(['id', 'emoji', 'title'] as const).map(f => (
                    <div key={f}>
                      <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-1">{f}</label>
                      <input type="text" value={newChallenge[f]} onChange={e => setNewChallenge(p => ({ ...p, [f]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white focus:outline-none focus:border-white/20" />
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-1">Description</label>
                    <textarea value={newChallenge.description} onChange={e => setNewChallenge(p => ({ ...p, description: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white focus:outline-none focus:border-white/20 h-20 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(['xp', 'heatPoints'] as const).map(f => (
                      <div key={f}>
                        <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-1">{f}</label>
                        <input type="number" value={newChallenge[f]} onChange={e => setNewChallenge(p => ({ ...p, [f]: Number(e.target.value) }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white focus:outline-none focus:border-white/20" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-1">Type</label>
                    <select value={newChallenge.type} onChange={e => setNewChallenge(p => ({ ...p, type: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white focus:outline-none focus:border-white/20"
                    >
                      {CHALLENGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-1">Requirement Value (optional)</label>
                    <input type="number" value={newChallenge.requirementValue ?? ''} onChange={e => setNewChallenge(p => ({ ...p, requirementValue: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white focus:outline-none focus:border-white/20" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] text-velvet-muted hover:text-velvet-white transition-colors">Cancel</button>
                  <button onClick={createChallenge}
                    className="bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-5 py-2.5 hover:opacity-80 transition-opacity">Create</button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}

      {activeSection === 'badges' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="space-y-4">
          <h2 className="font-heading text-xl text-velvet-white tracking-tight">Event Badge Management</h2>
          <div className="rounded-2xl bg-velvet-card border border-white/10 overflow-hidden">
            <div className="grid grid-cols-6 gap-0 border-b border-white/10">
              {['', 'Name', 'Description', 'Requirement', '', ''].map(h => (
                <div key={h} className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-velvet-muted font-bold">{h}</div>
              ))}
            </div>
            {badges.map(badge => (
              <div key={badge.id} className="grid grid-cols-6 gap-0 border-b border-white/5 items-center">
                <div className="px-4 py-3 text-lg">{badge.emoji}</div>
                <div className="px-4 py-3 text-sm text-velvet-white font-heading">{badge.name}</div>
                <div className="px-4 py-3 text-xs text-velvet-muted">{badge.description}</div>
                <div className="px-4 py-3">
                  {editingBadge === badge.id ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={editRequirement} onChange={e => setEditRequirement(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-velvet-white w-40 focus:outline-none focus:border-white/20" />
                      <button onClick={() => saveBadgeRequirement(badge.id)} className="text-emerald-400 hover:text-emerald-300"><Save size={14} /></button>
                      <button onClick={() => setEditingBadge(null)} className="text-velvet-muted hover:text-velvet-white transition-colors text-xs">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-sm text-velvet-muted">{badge.requirement}</span>
                  )}
                </div>
                <div className="px-4 py-3">
                  {editingBadge !== badge.id && (
                    <button onClick={() => { setEditingBadge(badge.id); setEditRequirement(badge.requirement) }}
                      className="text-velvet-muted hover:text-velvet-white transition-colors" title="Edit">
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
                <div />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeSection === 'leaderboard' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl text-velvet-white tracking-tight">Event Leaderboard</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFreezeConfirm(true)}
                className="bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-5 py-2.5 hover:opacity-80 transition-opacity">Freeze Rankings</button>
              <button onClick={() => setShowDistributeConfirm(true)}
                className="bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-5 py-2.5 hover:opacity-80 transition-opacity">Distribute Rewards</button>
              <button className="bg-white/10 text-velvet-white rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-5 py-2.5 hover:bg-white/20 transition-colors">Export Results</button>
            </div>
          </div>
          <div className="rounded-2xl bg-velvet-card border border-white/10 overflow-hidden">
            <div className="grid grid-cols-3 gap-0 border-b border-white/10">
              {['Rank', 'User Name', 'Score'].map(h => (
                <div key={h} className="px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-velvet-muted font-bold">{h}</div>
              ))}
            </div>
            {leaderboard.map(entry => (
              <div key={entry.rank} className="grid grid-cols-3 gap-0 border-b border-white/5 items-center">
                <div className={`px-5 py-3 text-sm font-heading ${
                  entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-amber-600' : 'text-velvet-muted'
                }`}>
                  #{entry.rank}
                </div>
                <div className="px-5 py-3 text-sm text-velvet-white">{entry.userName}</div>
                <div className="px-5 py-3 text-sm text-velvet-white font-heading">{entry.score.toLocaleString()}</div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-velvet-muted">No leaderboard data yet.</div>
            )}
          </div>

          {showFreezeConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4">
                <h3 className="font-heading text-lg text-velvet-white mb-2">Freeze Rankings</h3>
                <p className="text-sm text-velvet-muted mb-6">Are you sure you want to freeze the current leaderboard rankings? This action cannot be undone.</p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowFreezeConfirm(false)} className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] text-velvet-muted hover:text-velvet-white transition-colors">Cancel</button>
                  <button onClick={freezeRankings} className="bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-5 py-2.5 hover:opacity-80 transition-opacity">Confirm Freeze</button>
                </div>
              </motion.div>
            </div>
          )}

          {showDistributeConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4">
                <h3 className="font-heading text-lg text-velvet-white mb-2">Distribute Rewards</h3>
                <p className="text-sm text-velvet-muted mb-6">Are you sure you want to distribute rewards to the top leaderboard participants? This will issue badges and prizes.</p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowDistributeConfirm(false)} className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] text-velvet-muted hover:text-velvet-white transition-colors">Cancel</button>
                  <button onClick={distributeRewards} className="bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold px-5 py-2.5 hover:opacity-80 transition-opacity">Confirm Distribute</button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}

      {activeSection === 'analytics' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="space-y-4">
          <h2 className="font-heading text-xl text-velvet-white tracking-tight">Event Analytics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Participants', value: analytics?.participants ?? 0, icon: Users, color: 'text-blue-400 bg-blue-500/10' },
              { label: 'Daily Claims', value: analytics?.dailyClaims ?? 0, icon: Gift, color: 'text-purple-400 bg-purple-500/10' },
              { label: 'Avg Heat Streak', value: analytics?.avgHeatStreak ?? 0, icon: Activity, color: 'text-orange-400 bg-orange-500/10' },
              { label: 'Crates Opened', value: analytics?.cratesOpened ?? 0, icon: Gift, color: 'text-pink-400 bg-pink-500/10' },
              { label: 'Meltdown Claims', value: analytics?.meltdownClaims ?? 0, icon: Skull, color: 'text-red-400 bg-red-500/10' },
              { label: 'Event Purchases', value: analytics?.eventPurchases ?? 0, icon: ShoppingBag, color: 'text-cyan-400 bg-cyan-500/10' },
              { label: 'Heatwave Shopper', value: analytics?.heatwaveShopperCompletions ?? 0, icon: Star, color: 'text-yellow-400 bg-yellow-500/10' },
              { label: 'Revenue', value: `₹${(analytics?.revenue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10' },
            ].map((stat, i) => (
              <div key={stat.label} className="rounded-2xl bg-velvet-card border border-white/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted">{stat.label}</span>
                  <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon size={16} />
                  </div>
                </div>
                <div className="font-heading text-2xl text-velvet-white tracking-tight">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
