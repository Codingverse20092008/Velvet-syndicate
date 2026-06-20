'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Award, Plus, Edit3, XCircle, X, Eye, Upload,
  Shield, AlertTriangle, Hash, Trophy, Activity,
} from 'lucide-react'
import { getFullImageUrl } from '@/lib/api'

const EASE = [0.22, 1, 0.36, 1]

interface Badge {
  id: string
  badgeId: string
  name: string
  description: string
  emoji: string
  rarity: string
  category: string
  unlockCondition: string
  unlockValue: number | null
  imageUrl: string
  rewardType: string
  rewardValue: string
  rewardLabel: string
  isActive: boolean
  unlockCount: number
  createdAt: string
  updatedAt: string
}

interface BadgeStats {
  totalBadges: number
  activeBadges: number
  disabledBadges: number
  totalUnlocks: number
  avgUnlockRate: number
  mostEarned: { badgeId: string; name: string; count: number }
  leastEarned: { badgeId: string; name: string; count: number }
  rarityDistribution: { common: number; rare: number; epic: number; legendary: number }
}

const RARITIES = [
  { value: 'common', label: 'Common', color: 'text-gray-400', bg: 'bg-gray-500/10' },
  { value: 'rare', label: 'Rare', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { value: 'epic', label: 'Epic', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { value: 'legendary', label: 'Legendary', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
] as const

const CATEGORIES = [
  { value: 'progression', label: 'Progression' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'community', label: 'Community' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'special', label: 'Special' },
] as const

const REWARD_TYPE_LABELS: Record<string, string> = {
  badge: 'Badge Unlock',
  coins: 'Coins',
  xp: 'XP',
  frame: 'Profile Frame',
  title: 'Title',
  accent: 'Profile Accent',
  recognition: 'Recognition',
  crate: 'Crate',
}

const EMPTY_BADGE = {
  badgeId: '',
  name: '',
  description: '',
  emoji: '',
  rarity: 'common' as string,
  category: 'progression' as string,
  unlockCondition: '',
  unlockValue: null as number | null,
  imageUrl: '',
  rewardType: '' as string,
  rewardValue: '',
  rewardLabel: '',
  isActive: true,
}

function Spinner() {
  return <div className="flex justify-center py-20"><div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" /></div>
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [stats, setStats] = useState<BadgeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'definitions' | 'stats'>('definitions')
  const [showModal, setShowModal] = useState(false)
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null)
  const [form, setForm] = useState(EMPTY_BADGE)
  const [saving, setSaving] = useState(false)

  // Detail modal
  const [detailBadge, setDetailBadge] = useState<Badge | null>(null)

  // Image upload
  const [uploadingImage, setUploadingImage] = useState(false)

  // Confirm disable for active badges
  const [confirmDisable, setConfirmDisable] = useState<Badge | null>(null)

  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/velvet-vault/badges')
      const d = await res.json()
      if (d.success) setBadges(d.data ?? [])
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/velvet-vault/badges/stats')
      const d = await res.json()
      if (d.success) setStats(d.data)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchBadges(), fetchStats()]).finally(() => setLoading(false))
  }, [fetchBadges, fetchStats])

  const openCreate = () => {
    setEditingBadge(null)
    setForm({ ...EMPTY_BADGE })
    setShowModal(true)
  }

  const openEdit = (badge: Badge) => {
    setEditingBadge(badge)
    setForm({
      badgeId: badge.badgeId,
      name: badge.name,
      description: badge.description,
      emoji: badge.emoji,
      rarity: badge.rarity,
      category: badge.category,
      unlockCondition: badge.unlockCondition || '',
      unlockValue: badge.unlockValue,
      imageUrl: badge.imageUrl || '',
      rewardType: badge.rewardType || '',
      rewardValue: badge.rewardValue || '',
      rewardLabel: badge.rewardLabel || '',
      isActive: badge.isActive,
    })
    setShowModal(true)
  }

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      const responseData = data.data || data
      if (data.success && responseData.imageUrl) {
        setForm(f => ({ ...f, imageUrl: getFullImageUrl(responseData.imageUrl) }))
      }
    } catch {
      setError('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!form.badgeId || !form.name || !form.description) {
      setError('Badge ID, name, and description are required')
      return
    }
    if (form.isActive && !form.unlockCondition) {
      setError('Active badges must have an unlock condition')
      return
    }
    if (form.isActive && !form.category) {
      setError('Active badges must have a category')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const url = editingBadge
        ? `/api/admin/velvet-vault/badges/${editingBadge.badgeId}`
        : '/api/admin/velvet-vault/badges'

      const res = await fetch(url, {
        method: editingBadge ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!d.success) { setError(d.error || 'Failed to save'); return }

      setShowModal(false)
      await fetchBadges()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (badge: Badge) => {
    if (badge.isActive) {
      setConfirmDisable(badge)
      return
    }
    await doToggle(badge)
  }

  const doToggle = async (badge: Badge) => {
    setConfirmDisable(null)
    try {
      const res = await fetch(`/api/admin/velvet-vault/badges/${badge.badgeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !badge.isActive }),
      })
      const d = await res.json()
      if (d.success) await fetchBadges()
      else setError(d.error || 'Failed to toggle')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleDelete = async (badge: Badge) => {
    if (!confirm(`Delete badge "${badge.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/velvet-vault/badges/${badge.badgeId}`, { method: 'DELETE' })
      const d = await res.json()
      if (d.success) {
        await fetchBadges()
        if (detailBadge?.badgeId === badge.badgeId) setDetailBadge(null)
      } else setError(d.error || 'Failed to delete')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const openDetail = async (badge: Badge) => {
    try {
      const res = await fetch(`/api/admin/velvet-vault/badges/${badge.badgeId}`)
      const d = await res.json()
      if (d.success && d.data) setDetailBadge(d.data)
    } catch {
      setDetailBadge(badge)
    }
  }

  const rarityColor = (r: string) => {
    const found = RARITIES.find(rr => rr.value === r)
    return found?.color || 'text-gray-400'
  }

  const rarityBg = (r: string) => {
    const found = RARITIES.find(rr => rr.value === r)
    return found?.bg || 'bg-gray-500/10'
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-velvet-white tracking-tight">Badge Management</h1>
          <p className="text-sm text-velvet-muted mt-2">Define and manage vault badges</p>
        </div>
        {activeTab === 'definitions' && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white/90 transition-colors">
            <Plus size={14} />
            Create Badge
          </button>
        )}
      </motion.div>

      {error && <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {[
          { id: 'definitions', label: 'Badge Definitions', icon: Award },
          { id: 'stats', label: 'Unlock Statistics', icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-widest transition-colors ${
              activeTab === tab.id
                ? 'text-velvet-accent border-b-2 border-velvet-accent'
                : 'text-velvet-muted hover:text-velvet-white'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Badge Definitions ─────────────────────────────────────── */}
      {activeTab === 'definitions' && (
        <>
          {/* Badge Detail Modal */}
          {detailBadge && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setDetailBadge(null)}>
              <div className="bg-velvet-card border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {detailBadge.imageUrl ? (
                      <img src={getFullImageUrl(detailBadge.imageUrl)} alt={detailBadge.name} className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl bg-white/5 border border-white/10">
                        {detailBadge.emoji || '🏅'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-heading text-xl text-velvet-white">{detailBadge.name}</h3>
                      <p className="text-sm text-velvet-muted mt-1">{detailBadge.description}</p>
                    </div>
                  </div>
                  <button onClick={() => setDetailBadge(null)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                    <X size={18} className="text-velvet-muted" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-[10px] uppercase tracking-wider text-velvet-muted mb-1">Rarity</div>
                    <span className={`text-sm font-bold ${rarityColor(detailBadge.rarity)}`}>
                      {detailBadge.rarity.charAt(0).toUpperCase() + detailBadge.rarity.slice(1)}
                    </span>
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-[10px] uppercase tracking-wider text-velvet-muted mb-1">Category</div>
                    <div className="text-sm text-velvet-white capitalize">{detailBadge.category}</div>
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-[10px] uppercase tracking-wider text-velvet-muted mb-1">Requirement</div>
                    <div className="text-sm text-velvet-white">{detailBadge.unlockCondition || 'None'}</div>
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-[10px] uppercase tracking-wider text-velvet-muted mb-1">Reward</div>
                    <div className="text-sm text-velvet-white">{detailBadge.rewardLabel || 'None'}</div>
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-[10px] uppercase tracking-wider text-velvet-muted mb-1">Unlock Count</div>
                    <div className="text-sm text-velvet-white font-mono">{detailBadge.unlockCount?.toLocaleString() || 0}</div>
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-[10px] uppercase tracking-wider text-velvet-muted mb-1">Status</div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] uppercase font-bold ${
                      detailBadge.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>{detailBadge.isActive ? 'Active' : 'Disabled'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[10px] text-velvet-muted">
                  <div>Created: {detailBadge.createdAt ? new Date(detailBadge.createdAt).toLocaleDateString() : '-'}</div>
                  <div>Modified: {detailBadge.updatedAt ? new Date(detailBadge.updatedAt).toLocaleDateString() : '-'}</div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setDetailBadge(null)} className="flex-1 px-4 py-2.5 border border-white/15 rounded-xl text-sm text-velvet-muted hover:text-velvet-white transition-colors">
                    Close
                  </button>
                  <button
                    onClick={() => { const b = detailBadge; setDetailBadge(null); openEdit(b); }}
                    className="flex-1 px-4 py-2.5 bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold"
                  >
                    Edit Badge
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-4 text-[10px] uppercase tracking-widest text-velvet-muted border-b border-white/5">
              <div className="col-span-2">Badge</div>
              <div className="col-span-2">Name</div>
              <div className="col-span-2">Requirement</div>
              <div className="col-span-1">Reward</div>
              <div className="col-span-1">Rarity</div>
              <div className="col-span-1">Category</div>
              <div className="col-span-1">Unlocked</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1" />
            </div>
            <div className="divide-y divide-white/5">
              {badges.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-velvet-muted">No badges found.</div>
              )}
              {badges.map((badge) => (
                <div key={badge.id} className="grid grid-cols-12 px-5 py-4 items-center text-sm hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-2 flex items-center gap-2">
                    {badge.imageUrl ? (
                      <img src={getFullImageUrl(badge.imageUrl)} alt={badge.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                    ) : (
                      <span className="text-lg shrink-0">{badge.emoji || '🏅'}</span>
                    )}
                    <span className="text-[10px] text-velvet-muted font-mono truncate">{badge.badgeId}</span>
                  </div>
                  <div className="col-span-2 text-velvet-white truncate">{badge.name}</div>
                  <div className="col-span-2 text-velvet-muted text-xs truncate">{badge.unlockCondition || '-'}</div>
                  <div className="col-span-1 text-velvet-muted text-xs truncate">{badge.rewardLabel || '-'}</div>
                  <div className="col-span-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${rarityColor(badge.rarity)}`}>
                      {badge.rarity}
                    </span>
                  </div>
                  <div className="col-span-1 text-[10px] text-velvet-muted uppercase tracking-wider">{badge.category}</div>
                  <div className="col-span-1 text-xs font-mono text-velvet-muted">{badge.unlockCount?.toLocaleString() || 0}</div>
                  <div className="col-span-1">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-bold ${
                      badge.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {badge.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center gap-1 justify-end">
                    <button onClick={() => openDetail(badge)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="View details">
                      <Eye size={14} className="text-velvet-muted hover:text-velvet-white" />
                    </button>
                    <button onClick={() => openEdit(badge)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Edit badge">
                      <Edit3 size={14} className="text-velvet-muted hover:text-velvet-white" />
                    </button>
                    <button onClick={() => handleToggle(badge)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title={badge.isActive ? 'Disable badge' : 'Enable badge'}>
                      <XCircle size={14} className={badge.isActive ? 'text-red-400' : 'text-emerald-400'} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── Unlock Statistics ──────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { key: 'totalBadges', label: 'Total Badges', icon: Award, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
              { key: 'activeBadges', label: 'Active Badges', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { key: 'disabledBadges', label: 'Disabled Badges', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
              { key: 'totalUnlocks', label: 'Total Unlocks', icon: Hash, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { key: 'avgUnlockRate', label: 'Avg Unlocks Per Badge', icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { key: 'mostEarned', label: 'Most Earned Badge', icon: Trophy, color: 'text-blue-400', bg: 'bg-blue-500/10', sub: 'count' },
              { key: 'leastEarned', label: 'Least Earned Badge', icon: Award, color: 'text-gray-400', bg: 'bg-gray-500/10', sub: 'count' },
            ].map((card, i) => {
              const Icon = card.icon
              const raw = stats ? (stats as any)[card.key] : null
              const value = typeof raw === 'object' && raw !== null ? raw.name : raw
              const sub = typeof raw === 'object' && raw !== null && card.sub ? raw[card.sub] : null
              const display = value ?? value === 0 ? typeof value === 'number' ? value.toLocaleString() : value : 'N/A'
              return (
                <motion.div
                  key={card.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.5, ease: EASE }}
                  className="bg-velvet-card border border-white/10 rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted">{card.label}</div>
                      <div className="text-lg font-heading text-velvet-white mt-1 truncate">{display}</div>
                      {sub !== null && sub > 0 && <div className="text-[10px] text-velvet-muted mt-0.5">{sub.toLocaleString()} unlocks</div>}
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={card.color} size={18} />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Rarity Distribution */}
          {stats && (
            <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-heading text-velvet-white uppercase tracking-wider mb-4">Badge Rarity Distribution</h3>
              <div className="grid grid-cols-4 gap-4">
                {(['common', 'rare', 'epic', 'legendary'] as const).map((rarity) => {
                  const count = stats.rarityDistribution[rarity] || 0
                  const maxCount = Math.max(...Object.values(stats.rarityDistribution), 1)
                  const found = RARITIES.find(r => r.value === rarity)
                  return (
                    <div key={rarity} className="text-center">
                      <div className="h-20 flex items-end justify-center mb-2">
                        <div
                          className={`w-8 rounded-t-lg transition-all ${found?.bg || 'bg-gray-500/10'}`}
                          style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? '16px' : '4px' }}
                        />
                      </div>
                      <div className={`text-sm font-bold ${found?.color || 'text-gray-400'}`}>{count}</div>
                      <div className="text-[10px] uppercase text-velvet-muted tracking-wider mt-0.5">{rarity}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Per-badge unlock list */}
          <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 text-[10px] uppercase tracking-widest text-velvet-muted border-b border-white/5">
              Badge Unlock Distribution
            </div>
            <div className="divide-y divide-white/5">
              {badges.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-velvet-muted">No badges found.</div>
              )}
              {badges.map((badge) => {
                const maxUnlock = Math.max(...badges.map(b => b.unlockCount), 1)
                return (
                  <div key={badge.id} className="grid grid-cols-12 px-5 py-3 items-center text-sm">
                    <div className="col-span-3 flex items-center gap-2">
                      {badge.imageUrl ? (
                        <img src={getFullImageUrl(badge.imageUrl)} alt={badge.name} className="w-6 h-6 rounded object-cover" />
                      ) : (
                        <span className="text-base">{badge.emoji || '🏅'}</span>
                      )}
                      <span className="text-velvet-white truncate">{badge.name}</span>
                    </div>
                    <div className="col-span-7">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all"
                            style={{ width: `${(badge.unlockCount / maxUnlock) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-right text-xs font-mono text-velvet-white">{badge.unlockCount.toLocaleString()}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Create/Edit Modal ──────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-xl text-velvet-white">
                {editingBadge ? 'Edit Badge' : 'Create Badge'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} className="text-velvet-muted" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Badge ID</label>
                <input
                  type="text"
                  value={form.badgeId}
                  onChange={e => setForm(f => ({ ...f, badgeId: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  placeholder="e.g. streak_7"
                  disabled={!!editingBadge}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                    placeholder="Badge name"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Emoji</label>
                  <input
                    type="text"
                    value={form.emoji}
                    onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                    placeholder="🏆"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  placeholder="Badge description"
                />
              </div>

              {/* Requirement */}
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Unlock Requirement</label>
                <input
                  type="text"
                  value={form.unlockCondition}
                  onChange={e => setForm(f => ({ ...f, unlockCondition: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  placeholder="e.g. Reach Level 2"
                />
              </div>

              {/* Badge Image */}
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Badge Image</label>
                {form.imageUrl && (
                  <div className="mb-2 relative inline-block">
                    <img src={getFullImageUrl(form.imageUrl)} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                    <button onClick={() => setForm(f => ({ ...f, imageUrl: '' }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors text-[10px] uppercase tracking-wider text-velvet-muted">
                    <Upload size={12} />
                    {uploadingImage ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} disabled={uploadingImage} />
                  </label>
                  <input type="text" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white" placeholder="Or paste image URL..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Rarity</label>
                  <select
                    value={form.rarity}
                    onChange={e => setForm(f => ({ ...f, rarity: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  >
                    {RARITIES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reward */}
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Reward (optional)</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={form.rewardType}
                    onChange={e => setForm(f => ({ ...f, rewardType: e.target.value }))}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-xs text-velvet-white"
                  >
                    <option value="">No reward</option>
                    <option value="badge">Badge</option>
                    <option value="coins">Coins</option>
                    <option value="xp">XP</option>
                    <option value="frame">Frame</option>
                    <option value="title">Title</option>
                    <option value="accent">Accent</option>
                    <option value="recognition">Recognition</option>
                    <option value="crate">Crate</option>
                  </select>
                  <input
                    type="text"
                    value={form.rewardValue}
                    onChange={e => setForm(f => ({ ...f, rewardValue: e.target.value }))}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-velvet-white"
                    placeholder="Value"
                  />
                  <input
                    type="text"
                    value={form.rewardLabel}
                    onChange={e => setForm(f => ({ ...f, rewardLabel: e.target.value }))}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-velvet-white"
                    placeholder="Label"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted">Active</label>
                <button
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`w-10 h-6 rounded-full transition-colors relative ${form.isActive ? 'bg-emerald-500' : 'bg-white/20'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form.isActive ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-white/15 rounded-xl text-sm text-velvet-muted hover:text-velvet-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.badgeId || !form.name || !form.description}
                className="flex-1 px-4 py-2.5 bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingBadge ? 'Update Badge' : 'Create Badge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm Disable Modal ──────────────────────────────────── */}
      {confirmDisable && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-amber-400" />
              <h3 className="font-heading text-lg text-velvet-white">Disable Badge</h3>
            </div>
            <p className="text-sm text-velvet-muted mb-6">
              Disable <strong className="text-velvet-white">{confirmDisable.name}</strong>? Disabled badges cannot be unlocked by users.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDisable(null)} className="flex-1 px-4 py-2.5 border border-white/15 rounded-xl text-sm text-velvet-muted hover:text-velvet-white transition-colors">
                Cancel
              </button>
              <button onClick={() => doToggle(confirmDisable)} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-red-600 transition-colors">
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
