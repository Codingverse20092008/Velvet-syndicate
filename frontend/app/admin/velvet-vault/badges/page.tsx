'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Award, Plus, Edit3, XCircle, X, Hash, Eye } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1]

interface Badge {
  id: string
  badgeId: string
  name: string
  description: string
  emoji: string
  rarity: string
  category: string
  active: boolean
}

interface BadgeStat {
  badgeId: string
  badgeName: string
  emoji: string
  unlockCount: number
}

const EMPTY_BADGE = {
  badgeId: '',
  name: '',
  description: '',
  emoji: '',
  rarity: 'common',
  category: 'progression',
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [stats, setStats] = useState<BadgeStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'definitions' | 'stats'>('definitions')
  const [showModal, setShowModal] = useState(false)
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null)
  const [form, setForm] = useState(EMPTY_BADGE)
  const [saving, setSaving] = useState(false)

  const fetchBadges = async () => {
    try {
      const res = await fetch('/api/admin/velvet-vault/badges')
      const d = await res.json()
      if (d.success) setBadges(d.data?.badges ?? d.data ?? [])
    } catch (e: any) {
      setError(e.message)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/velvet-vault/badge-stats')
      const d = await res.json()
      if (d.success) setStats(d.data?.badges ?? d.data ?? [])
    } catch (e: any) {
      setError(e.message)
    }
  }

  useEffect(() => {
    Promise.all([fetchBadges(), fetchStats()]).finally(() => setLoading(false))
  }, [])

  const openCreate = () => {
    setEditingBadge(null)
    setForm(EMPTY_BADGE)
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
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.badgeId || !form.name) return
    setSaving(true)
    setError(null)
    try {
      if (editingBadge) {
        const res = await fetch(`/api/admin/velvet-vault/badges/${editingBadge.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const d = await res.json()
        if (!d.success) { setError(d.error || 'Failed to update'); return }
      } else {
        const res = await fetch('/api/admin/velvet-vault/badges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const d = await res.json()
        if (!d.success) { setError(d.error || 'Failed to create'); return }
      }
      setShowModal(false)
      await fetchBadges()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDisable = async (badge: Badge) => {
    if (!confirm(`Disable badge "${badge.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/velvet-vault/badges/${badge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !badge.active }),
      })
      const d = await res.json()
      if (d.success) await fetchBadges()
      else setError(d.error || 'Failed to toggle badge')
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-velvet-white tracking-tight">Badge Management</h1>
          <p className="text-sm text-velvet-muted mt-2">Define and manage vault badges</p>
        </div>
        {activeTab === 'definitions' && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white/90 transition-colors"
          >
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
          { id: 'stats', label: 'Unlock Statistics', icon: Eye },
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

      {/* Badge Definitions */}
      {activeTab === 'definitions' && (
        <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-4 text-[10px] uppercase tracking-widest text-velvet-muted border-b border-white/5">
            <div className="col-span-1">ID</div>
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-1">Emoji</div>
            <div className="col-span-1">Rarity</div>
            <div className="col-span-1">Category</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1" />
          </div>
          <div className="divide-y divide-white/5">
            {badges.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-velvet-muted">No badges found.</div>
            )}
            {badges.map((badge) => (
              <div key={badge.id} className="grid grid-cols-12 px-5 py-4 items-center text-sm">
                <div className="col-span-1 text-velvet-muted text-xs font-mono truncate">{badge.badgeId}</div>
                <div className="col-span-3 text-velvet-white">{badge.name}</div>
                <div className="col-span-3 text-velvet-muted text-xs truncate">{badge.description}</div>
                <div className="col-span-1 text-lg">{badge.emoji}</div>
                <div className="col-span-1">
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${
                    badge.rarity === 'legendary' ? 'text-yellow-400' :
                    badge.rarity === 'epic' ? 'text-purple-400' :
                    badge.rarity === 'rare' ? 'text-blue-400' : 'text-gray-400'
                  }`}>
                    {badge.rarity}
                  </span>
                </div>
                <div className="col-span-1 text-[10px] text-velvet-muted uppercase tracking-wider">{badge.category}</div>
                <div className="col-span-1">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-bold ${
                    badge.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {badge.active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="col-span-1 flex items-center gap-1">
                  <button onClick={() => openEdit(badge)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    <Edit3 size={14} className="text-velvet-muted hover:text-velvet-white" />
                  </button>
                  <button onClick={() => handleDisable(badge)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    <XCircle size={14} className={badge.active ? 'text-red-400' : 'text-emerald-400'} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unlock Statistics */}
      {activeTab === 'stats' && (
        <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-4 text-[10px] uppercase tracking-widest text-velvet-muted border-b border-white/5">
            <div className="col-span-4">Badge</div>
            <div className="col-span-4">Name</div>
            <div className="col-span-4">Unlock Count</div>
          </div>
          <div className="divide-y divide-white/5">
            {stats.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-velvet-muted">No statistics available.</div>
            )}
            {stats.map((stat) => (
              <div key={stat.badgeId} className="grid grid-cols-12 px-5 py-4 items-center text-sm">
                <div className="col-span-4 flex items-center gap-2">
                  <span className="text-lg">{stat.emoji}</span>
                  <span className="text-velvet-muted text-xs font-mono">{stat.badgeId}</span>
                </div>
                <div className="col-span-4 text-velvet-white">{stat.badgeName}</div>
                <div className="col-span-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${Math.min((stat.unlockCount / Math.max(...stats.map(s => s.unlockCount), 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-heading text-velvet-white">{stat.unlockCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6 max-w-md w-full">
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
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  placeholder="Badge description"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Rarity</label>
                  <select
                    value={form.rarity}
                    onChange={e => setForm(f => ({ ...f, rarity: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  >
                    <option value="common">Common</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  >
                    <option value="progression">Progression</option>
                    <option value="quiz">Quiz</option>
                    <option value="streak">Streak</option>
                    <option value="crate">Crate</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-white/15 rounded-xl text-sm text-velvet-muted hover:text-velvet-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.badgeId || !form.name}
                className="flex-1 px-4 py-2.5 bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingBadge ? 'Update Badge' : 'Create Badge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
