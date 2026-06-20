'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Package, Plus, Edit3, Eye, XCircle, Trash2, Save, X,
  AlertTriangle, BarChart3, Layers, Gift, Trophy, Zap,
  Coins, Truck, Award, Key, Frame, Type, Upload, Shield,
  Activity, Hash
} from 'lucide-react'
import { getFullImageUrl } from '@/lib/api'

const EASE = [0.22, 1, 0.36, 1]

const REWARD_TYPES = [
  { value: 'xp', label: 'XP', icon: Zap },
  { value: 'coins', label: 'Coins', icon: Coins },
  { value: 'coupon', label: 'Coupon', icon: Gift },
  { value: 'shipping', label: 'Free Shipping', icon: Truck },
  { value: 'badge', label: 'Badge', icon: Award },
  { value: 'access', label: 'Early Access', icon: Key },
  { value: 'frame', label: 'Profile Frame', icon: Frame },
  { value: 'title', label: 'Title', icon: Type },
] as const

const RARITIES = [
  { value: 'common', label: 'Common', color: 'text-gray-400 bg-gray-500/10' },
  { value: 'rare', label: 'Rare', color: 'text-blue-400 bg-blue-500/10' },
  { value: 'epic', label: 'Epic', color: 'text-purple-400 bg-purple-500/10' },
  { value: 'legendary', label: 'Legendary', color: 'text-yellow-400 bg-yellow-500/10' },
] as const

const CRATE_TYPES = [
  { value: 'basic', label: 'Basic Crate' },
  { value: 'premium', label: 'Premium Crate' },
  { value: 'event', label: 'Event Crate' },
  { value: 'seasonal', label: 'Seasonal Crate' },
] as const

const ACQUISITION_METHODS = [
  { value: '', label: 'None' },
  { value: 'reward_shop', label: 'Reward Shop' },
  { value: 'level_reward', label: 'Level Reward' },
  { value: 'event_reward', label: 'Event Reward' },
  { value: 'leaderboard_reward', label: 'Leaderboard Reward' },
  { value: 'challenge_reward', label: 'Challenge Reward' },
  { value: 'admin_grant', label: 'Admin Grant' },
  { value: 'seasonal_event', label: 'Seasonal Event' },
] as const

interface CrateEntry {
  id: string
  name: string
  description: string
  crateType: string
  cost: number
  isActive: boolean
  rewardCount: number
  createdAt: string
  imageUrl: string
  acquisitionMethod: string
  isSystem: boolean
}

interface RewardEntry {
  id: string
  crateId: string
  rewardType: string
  rewardValue: string
  rewardName: string
  probability: number
  rarity: string
}

interface BadgeEntry {
  badgeId: string
  name: string
  emoji: string
  rarity: string
}

interface CrateAnalytics {
  totalOpened: number
  openedToday: number
  mostCommonReward: string
  mostRareReward: string
  activeCrates: number
  totalCrates: number
  totalRewards: number
  mostOpenedCrate: string
  mostOpenedCrateCount: number
  rewardDistribution: { name: string; count: number; percentage: number }[]
}

interface CrateHealth {
  activeCrates: number
  invalidCrates: number
  unusedCrates: number
  mostAwardedReward: string
  avgRewardsPerCrate: number
}

const EMPTY_CRATE_FORM = {
  name: '',
  description: '',
  crateType: 'basic' as string,
  cost: 0,
  isActive: true,
  imageUrl: '',
  acquisitionMethod: '',
}

const EMPTY_REWARD_FORM = {
  rewardType: 'xp' as string,
  rewardValue: '',
  rewardName: '',
  probability: 0,
  rarity: 'common' as string,
}

const CRATE_TYPE_LABELS: Record<string, string> = {
  basic: 'Basic Crate',
  premium: 'Premium Crate',
  event: 'Event Crate',
  seasonal: 'Seasonal Crate',
}

const CRATE_TYPE_COLORS: Record<string, string> = {
  basic: 'text-gray-400 bg-gray-500/10',
  premium: 'text-yellow-400 bg-yellow-500/10',
  event: 'text-purple-400 bg-purple-500/10',
  seasonal: 'text-emerald-400 bg-emerald-500/10',
}

const ACQUISITION_LABELS: Record<string, string> = {
  reward_shop: 'Reward Shop',
  level_reward: 'Level Reward',
  event_reward: 'Event Reward',
  leaderboard_reward: 'Leaderboard Reward',
  challenge_reward: 'Challenge Reward',
  admin_grant: 'Admin Grant',
  seasonal_event: 'Seasonal Event',
}

const RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}

function Spinner() {
  return <div className="flex justify-center py-20"><div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" /></div>
}

export default function CratesPage() {
  const [tab, setTab] = useState<'list' | 'analytics' | 'health'>('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBadgeDropdown, setShowBadgeDropdown] = useState(false)

  // Crate list
  const [crates, setCrates] = useState<CrateEntry[]>([])
  const [fetchingCrates, setFetchingCrates] = useState(false)

  // Create/Edit modal
  const [showCrateModal, setShowCrateModal] = useState(false)
  const [editingCrate, setEditingCrate] = useState<CrateEntry | null>(null)
  const [crateForm, setCrateForm] = useState({ ...EMPTY_CRATE_FORM })
  const [savingCrate, setSavingCrate] = useState(false)

  // Detail view with rewards
  const [viewCrate, setViewCrate] = useState<CrateEntry | null>(null)
  const [rewards, setRewards] = useState<RewardEntry[]>([])
  const [loadingRewards, setLoadingRewards] = useState(false)

  // Reward preview modal
  const [previewCrate, setPreviewCrate] = useState<CrateEntry | null>(null)
  const [previewRewards, setPreviewRewards] = useState<RewardEntry[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Add reward modal
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [editingReward, setEditingReward] = useState<RewardEntry | null>(null)
  const [rewardForm, setRewardForm] = useState({ ...EMPTY_REWARD_FORM })
  const [savingReward, setSavingReward] = useState(false)
  const [rewardError, setRewardError] = useState<string | null>(null)

  // Badge list for dropdown
  const [badges, setBadges] = useState<BadgeEntry[]>([])

  // Analytics
  const [analytics, setAnalytics] = useState<CrateAnalytics | null>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // Health
  const [health, setHealth] = useState<CrateHealth | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(false)

  // Image upload
  const [uploadingImage, setUploadingImage] = useState(false)

  // Toggle confirm modal
  const [confirmToggle, setConfirmToggle] = useState<CrateEntry | null>(null)

  const fetchCrates = useCallback(async () => {
    setFetchingCrates(true)
    try {
      const res = await fetch('/api/admin/velvet-vault/crates')
      if (!res.ok) throw new Error('Failed to fetch')
      const d = await res.json()
      if (d.success && Array.isArray(d.data?.crates)) setCrates(d.data.crates)
      else setCrates([])
    } catch (e: any) {
      setError(e.message)
      setCrates([])
    } finally {
      setFetchingCrates(false)
      setLoading(false)
    }
  }, [])

  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/velvet-vault/badges')
      if (!res.ok) return
      const d = await res.json()
      if (d.success && Array.isArray(d.data)) setBadges(d.data)
    } catch { /* ignore */ }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true)
    try {
      const res = await fetch('/api/admin/velvet-vault/crates/analytics/overview')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      const d = await res.json()
      if (d.success && d.data) setAnalytics(d.data)
    } catch (e: any) {
      console.error('Failed to fetch analytics:', e)
    } finally {
      setLoadingAnalytics(false)
    }
  }, [])

  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true)
    try {
      const res = await fetch('/api/admin/velvet-vault/crates/health')
      if (!res.ok) throw new Error('Failed to fetch health')
      const d = await res.json()
      if (d.success && d.data) setHealth(d.data)
    } catch (e: any) {
      console.error('Failed to fetch health:', e)
    } finally {
      setLoadingHealth(false)
    }
  }, [])

  useEffect(() => {
    fetchCrates()
    fetchAnalytics()
    fetchBadges()
  }, [fetchCrates, fetchAnalytics, fetchBadges])

  useEffect(() => {
    if (tab === 'health') fetchHealth()
  }, [tab, fetchHealth])

  // ─── Probability Helpers ─────────────────────────────────────────────

  const calcCrateProbabilityTotal = useCallback(async (crateId: string): Promise<number> => {
    try {
      const res = await fetch(`/api/admin/velvet-vault/crates/${crateId}`)
      if (!res.ok) return 0
      const d = await res.json()
      if (d.success && Array.isArray(d.data?.rewards)) {
        return d.data.rewards.reduce((s: number, r: any) => s + (r.probability || 0), 0)
      }
    } catch { /* ignore */ }
    return 0
  }, [])

  const [crateProbabilities, setCrateProbabilities] = useState<Record<string, number>>({})

  useEffect(() => {
    if (Array.isArray(crates) && crates.length > 0) {
      Promise.all(crates.map(c => calcCrateProbabilityTotal(c.id).then(p => [c.id, p] as const)))
        .then(results => {
          const map: Record<string, number> = {}
          for (const [id, prob] of results) map[id] = prob
          setCrateProbabilities(map)
        })
    }
  }, [crates, calcCrateProbabilityTotal])

  const getProbabilityTotal = () => {
    if (!Array.isArray(rewards)) return 0
    return rewards.reduce((sum, r) => sum + (r.probability || 0), 0)
  }

  const isProbabilityValid = () => {
    const total = getProbabilityTotal()
    return Math.abs(total - 100) < 0.01
  }

  // ─── Crate CRUD ─────────────────────────────────────────────────────

  const openCreateCrate = () => {
    setEditingCrate(null)
    setCrateForm({ ...EMPTY_CRATE_FORM })
    setShowCrateModal(true)
  }

  const openEditCrate = (crate: CrateEntry) => {
    setEditingCrate(crate)
    setCrateForm({
      name: crate.name,
      description: crate.description || '',
      crateType: crate.crateType,
      cost: crate.cost,
      isActive: crate.isActive,
      imageUrl: crate.imageUrl || '',
      acquisitionMethod: crate.acquisitionMethod || '',
    })
    setShowCrateModal(true)
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
        setCrateForm(f => ({ ...f, imageUrl: getFullImageUrl(responseData.imageUrl) }))
      }
    } catch {
      setError('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveCrate = async () => {
    if (!crateForm.name) return
    setSavingCrate(true)
    setError(null)
    try {
      if (editingCrate) {
        const res = await fetch(`/api/admin/velvet-vault/crates/${editingCrate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(crateForm),
        })
        const d = await res.json()
        if (!d.success) { setError(d.error || 'Failed to update'); return }
      } else {
        const res = await fetch('/api/admin/velvet-vault/crates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...crateForm,
            isSystem: false,
          }),
        })
        const d = await res.json()
        if (!d.success) { setError(d.error || 'Failed to create'); return }
      }
      setShowCrateModal(false)
      await fetchCrates()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingCrate(false)
    }
  }

  const handleToggleCrate = async (crate: CrateEntry) => {
    if (crate.isActive && crate.isSystem) {
      setConfirmToggle(crate)
      return
    }
    await doToggleCrate(crate)
  }

  const doToggleCrate = async (crate: CrateEntry) => {
    setConfirmToggle(null)
    try {
      const res = await fetch(`/api/admin/velvet-vault/crates/${crate.id}/toggle`, { method: 'PATCH' })
      const d = await res.json()
      if (d.success) await fetchCrates()
      else setError(d.error || 'Failed to toggle')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleDeleteCrate = async (crate: CrateEntry) => {
    if (crate.isSystem) {
      setError(`"${crate.name}" is a system crate and cannot be deleted.`)
      return
    }
    if (!confirm(`Delete crate "${crate.name}"? All rewards will be removed.`)) return
    try {
      const res = await fetch(`/api/admin/velvet-vault/crates/${crate.id}`, { method: 'DELETE' })
      const d = await res.json()
      if (d.success) {
        await fetchCrates()
        if (viewCrate?.id === crate.id) setViewCrate(null)
      } else setError(d.error || 'Failed to delete')
    } catch (e: any) {
      setError(e.message)
    }
  }

  // ─── Crate Detail / Rewards ─────────────────────────────────────────

  const openViewCrate = async (crate: CrateEntry) => {
    setViewCrate(crate)
    setLoadingRewards(true)
    try {
      const res = await fetch(`/api/admin/velvet-vault/crates/${crate.id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const d = await res.json()
      if (d.success) {
        if (d.data?.crate) setViewCrate(d.data.crate)
        if (Array.isArray(d.data?.rewards)) setRewards(d.data.rewards)
        else setRewards([])
      } else {
        setRewards([])
      }
    } catch (e: any) {
      setError(e.message)
      setRewards([])
    } finally {
      setLoadingRewards(false)
    }
  }

  // ─── Reward Preview ────────────────────────────────────────────────

  const openRewardPreview = async (crate: CrateEntry) => {
    setPreviewCrate(crate)
    setLoadingPreview(true)
    try {
      const res = await fetch(`/api/admin/velvet-vault/crates/${crate.id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const d = await res.json()
      if (d.success && Array.isArray(d.data?.rewards)) setPreviewRewards(d.data.rewards)
      else setPreviewRewards([])
    } catch {
      setPreviewRewards([])
    } finally {
      setLoadingPreview(false)
    }
  }

  // ─── Reward CRUD ────────────────────────────────────────────────────

  const openCreateReward = () => {
    setEditingReward(null)
    setRewardForm({ ...EMPTY_REWARD_FORM })
    setRewardError(null)
    setShowRewardModal(true)
  }

  const openEditReward = (reward: RewardEntry) => {
    setEditingReward(reward)
    setRewardForm({
      rewardType: reward.rewardType,
      rewardValue: reward.rewardValue || '',
      rewardName: reward.rewardName,
      probability: reward.probability,
      rarity: reward.rarity || 'common',
    })
    setRewardError(null)
    setShowRewardModal(true)
  }

  const validateRewardProbability = (newProbability: number) => {
    if (!Array.isArray(rewards)) return true
    const otherTotal = rewards
      .filter(r => editingReward ? r.id !== editingReward.id : true)
      .reduce((sum, r) => sum + (r.probability || 0), 0)
    return (otherTotal + newProbability) <= 100.01
  }

  const handleSaveReward = async () => {
    if (!rewardForm.rewardName) {
      setRewardError('Reward name is required')
      return
    }
    if (!validateRewardProbability(rewardForm.probability)) {
      setRewardError('Total probability would exceed 100%')
      return
    }
    if (!viewCrate) return
    setSavingReward(true)
    setRewardError(null)
    try {
      if (editingReward) {
        const res = await fetch(`/api/admin/velvet-vault/crates/rewards/${editingReward.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rewardForm),
        })
        const d = await res.json()
        if (!d.success) { setRewardError(d.error || 'Failed to update'); return }
      } else {
        const res = await fetch(`/api/admin/velvet-vault/crates/${viewCrate.id}/rewards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rewardForm),
        })
        const d = await res.json()
        if (!d.success) { setRewardError(d.error || 'Failed to create'); return }
      }
      setShowRewardModal(false)
      await openViewCrate(viewCrate)
      await fetchCrates()
    } catch (e: any) {
      setRewardError(e.message)
    } finally {
      setSavingReward(false)
    }
  }

  const handleDeleteReward = async (reward: RewardEntry) => {
    if (!confirm(`Delete reward "${reward.rewardName}"?`)) return
    try {
      const res = await fetch(`/api/admin/velvet-vault/crates/rewards/${reward.id}`, { method: 'DELETE' })
      const d = await res.json()
      if (d.success) {
        if (viewCrate) await openViewCrate(viewCrate)
        await fetchCrates()
      } else setError(d.error || 'Failed to delete reward')
    } catch (e: any) {
      setError(e.message)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-heading text-3xl text-velvet-white tracking-tight">Crate Management</h1>
          <p className="text-sm text-velvet-muted mt-2">Manage crate types, rewards, and economy health</p>
        </div>
        <button
          onClick={openCreateCrate}
          className="flex items-center gap-2 px-4 py-2.5 bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white/90 transition-colors"
        >
          <Plus size={14} />
          Create Crate
        </button>
      </motion.div>

      {error && (
        <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {[
          { id: 'list', label: 'Crate List', icon: Layers },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'health', label: 'Health Dashboard', icon: Activity },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-widest transition-colors ${
              tab === t.id
                ? 'text-velvet-accent border-b-2 border-velvet-accent'
                : 'text-velvet-muted hover:text-velvet-white'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Crate List Tab ──────────────────────────────────────────────── */}
      {tab === 'list' && (
        <>
          {/* Detail View */}
          {viewCrate && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {viewCrate.imageUrl ? (
                    <img src={getFullImageUrl(viewCrate.imageUrl)} alt={viewCrate.name} className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${CRATE_TYPE_COLORS[viewCrate.crateType] || 'bg-gray-500/10'}`}>
                      <Package size={18} className={CRATE_TYPE_COLORS[viewCrate.crateType]?.split(' ')[0] || 'text-gray-400'} />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-lg text-velvet-white">{viewCrate.name}</h3>
                      {viewCrate.isSystem && <span title="System Crate"><Shield size={14} className="text-cyan-400" /></span>}
                    </div>
                    <p className="text-[10px] text-velvet-muted uppercase tracking-wider">
                      {CRATE_TYPE_LABELS[viewCrate.crateType] || viewCrate.crateType} &middot; {viewCrate.cost} coins
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-bold ${
                    viewCrate.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {viewCrate.isActive ? 'Active' : 'Disabled'}
                  </span>
                  {viewCrate.acquisitionMethod && (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[8px] uppercase text-velvet-muted">
                      {ACQUISITION_LABELS[viewCrate.acquisitionMethod] || viewCrate.acquisitionMethod}
                    </span>
                  )}
                  <button onClick={() => setViewCrate(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    <X size={14} className="text-velvet-muted" />
                  </button>
                </div>
              </div>

              {viewCrate.description && (
                <div className="px-6 py-3 border-b border-white/5 text-xs text-velvet-muted">{viewCrate.description}</div>
              )}

              {/* Rewards Table */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-heading text-velvet-white uppercase tracking-wider">
                    Rewards {Array.isArray(rewards) ? `(${rewards.length})` : '(0)'}
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      isProbabilityValid() ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {getProbabilityTotal().toFixed(1)}%
                      {!isProbabilityValid() && <AlertTriangle size={10} />}
                    </div>
                    <button
                      onClick={openCreateReward}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-[10px] uppercase tracking-wider text-velvet-white hover:bg-white/15 transition-colors"
                    >
                      <Plus size={12} />
                      Add Reward
                    </button>
                  </div>
                </div>

                {loadingRewards ? (
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border border-white/20 border-t-white/60 rounded-full animate-spin" /></div>
                ) : !Array.isArray(rewards) || rewards.length === 0 ? (
                  <div className="text-center py-8 text-sm text-velvet-muted">No rewards defined. Click "Add Reward" to create one.</div>
                ) : (
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-velvet-muted bg-white/5 border-b border-white/10">
                      <div className="col-span-2">Type</div>
                      <div className="col-span-2">Name</div>
                      <div className="col-span-1">Rarity</div>
                      <div className="col-span-1">Value</div>
                      <div className="col-span-3">Probability</div>
                      <div className="col-span-3" />
                    </div>
                    <div className="divide-y divide-white/5">
                      {rewards.map((reward, i) => {
                        const rt = REWARD_TYPES.find(t => t.value === reward.rewardType)
                        const rar = RARITIES.find(r => r.value === (reward.rarity || 'common'))
                        return (
                          <div key={reward.id || i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                            <div className="col-span-2 flex items-center gap-1.5">
                              {rt && <rt.icon size={12} className="text-velvet-muted" />}
                              <span className="text-xs text-velvet-white">{rt?.label || reward.rewardType}</span>
                            </div>
                            <div className="col-span-2 text-xs text-velvet-white truncate">{reward.rewardName}</div>
                            <div className="col-span-1">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${rar?.color || 'text-gray-400 bg-gray-500/10'}`}>
                                {RARITY_LABELS[reward.rarity] || 'Common'}
                              </span>
                            </div>
                            <div className="col-span-1 text-xs text-velvet-muted font-mono">{reward.rewardValue || '-'}</div>
                            <div className="col-span-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min((reward.probability || 0), 100)}%` }} />
                                </div>
                                <span className="text-[10px] text-velvet-muted font-mono w-8 text-right">{reward.probability?.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="col-span-3 flex items-center justify-end gap-1">
                              <button onClick={() => openEditReward(reward)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                                <Edit3 size={13} className="text-velvet-muted hover:text-velvet-white" />
                              </button>
                              <button onClick={() => handleDeleteReward(reward)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                                <Trash2 size={13} className="text-red-400 hover:text-red-300" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {Array.isArray(rewards) && rewards.length > 0 && !isProbabilityValid() && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-300 text-[10px]">
                    <AlertTriangle size={12} />
                    Reward probabilities total {getProbabilityTotal().toFixed(1)}%. Must equal 100%.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Crate List */}
          <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-4 text-[10px] uppercase tracking-widest text-velvet-muted border-b border-white/5">
              <div className="col-span-2">Name</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-1">Cost</div>
              <div className="col-span-1">Rewards</div>
              <div className="col-span-1">Probability</div>
              <div className="col-span-1">Acquisition</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2" />
            </div>
            <div className="divide-y divide-white/5">
              {fetchingCrates ? (
                <div className="px-6 py-10 text-center text-sm text-velvet-muted">Loading...</div>
              ) : !Array.isArray(crates) || crates.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-velvet-muted">No crates found. Create one to get started.</div>
              ) : (
                crates.map((crate) => {
                  const prob = crateProbabilities[crate.id]
                  const probValid = prob !== undefined && Math.abs(prob - 100) < 0.01
                  return (
                    <div
                      key={crate.id}
                      className={`grid grid-cols-12 px-5 py-4 items-center text-sm hover:bg-white/[0.02] transition-colors ${
                        viewCrate?.id === crate.id ? 'bg-white/[0.03]' : ''
                      }`}
                    >
                      <div className="col-span-2 flex items-center gap-2">
                        {crate.imageUrl ? (
                          <img src={getFullImageUrl(crate.imageUrl)} alt={crate.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                        ) : (
                          <Package size={14} className="text-velvet-muted shrink-0" />
                        )}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-velvet-white truncate">{crate.name}</span>
                          {crate.isSystem && <span title="System Crate"><Shield size={12} className="text-cyan-400 shrink-0" /></span>}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] uppercase font-bold ${CRATE_TYPE_COLORS[crate.crateType] || 'text-gray-400 bg-gray-500/10'}`}>
                          {CRATE_TYPE_LABELS[crate.crateType] || crate.crateType}
                        </span>
                      </div>
                      <div className="col-span-1 text-velvet-muted text-xs font-mono">{crate.cost}</div>
                      <div className="col-span-1 text-velvet-muted text-xs font-mono">{crate.rewardCount}</div>
                      <div className="col-span-1">
                        {prob !== undefined ? (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${
                            probValid ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                          }`}>
                            {probValid ? '✅' : '❌'} {prob.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-[8px] text-velvet-muted">...</span>
                        )}
                      </div>
                      <div className="col-span-1">
                        {crate.acquisitionMethod ? (
                          <span className="text-[8px] text-velvet-muted uppercase tracking-wider">
                            {ACQUISITION_LABELS[crate.acquisitionMethod] || crate.acquisitionMethod}
                          </span>
                        ) : (
                          <span className="text-[8px] text-velvet-muted">-</span>
                        )}
                      </div>
                      <div className="col-span-1">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-bold ${
                          crate.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                          {crate.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <div className="col-span-2 text-velvet-muted text-xs">
                        {crate.createdAt ? new Date(crate.createdAt).toLocaleDateString() : '-'}
                      </div>
                      <div className="col-span-2 flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openRewardPreview(crate)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                          title="Preview rewards"
                        >
                          <Eye size={14} className="text-velvet-muted hover:text-velvet-white" />
                        </button>
                        <button
                          onClick={() => openViewCrate(crate)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                          title="Edit rewards"
                        >
                          <Edit3 size={14} className="text-velvet-muted hover:text-velvet-white" />
                        </button>
                        <button
                          onClick={() => handleToggleCrate(crate)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                          title={crate.isActive ? 'Disable crate' : 'Enable crate'}
                        >
                          <XCircle size={14} className={crate.isActive ? 'text-red-400' : 'text-emerald-400'} />
                        </button>
                        <button
                          onClick={() => handleDeleteCrate(crate)}
                          className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${crate.isSystem ? 'opacity-30 cursor-not-allowed' : ''}`}
                          title={crate.isSystem ? 'System crates cannot be deleted' : 'Delete crate'}
                          disabled={crate.isSystem}
                        >
                          <Trash2 size={14} className="text-red-400 hover:text-red-300" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── Analytics Tab ────────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <div>
          {loadingAnalytics ? (
            <Spinner />
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { key: 'totalOpened', label: 'Total Crates Opened', icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                  { key: 'openedToday', label: 'Crates Opened Today', icon: Hash, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { key: 'mostOpenedCrate', label: 'Most Opened Crate', icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10', sub: 'mostOpenedCrateCount' },
                  { key: 'mostCommonReward', label: 'Most Common Reward', icon: Gift, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { key: 'mostRareReward', label: 'Most Rare Reward', icon: Award, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                  { key: 'activeCrates', label: 'Active Crate Types', icon: Layers, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                  { key: 'totalCrates', label: 'Total Crate Types', icon: Package, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                  { key: 'totalRewards', label: 'Total Rewards', icon: Gift, color: 'text-pink-400', bg: 'bg-pink-500/10' },
                ].map((card, i) => {
                  const Icon = card.icon
                  const value = analytics ? (analytics as any)[card.key] : '...'
                  const subValue = card.sub ? (analytics as any)?.[card.sub] : null
                  const display = typeof value === 'number' ? value.toLocaleString() : value || 'N/A'
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
                          <div className="text-2xl font-heading text-velvet-white mt-2">{display}</div>
                          {subValue !== null && subValue !== undefined && subValue > 0 && (
                            <div className="text-[10px] text-velvet-muted mt-1">{subValue.toLocaleString()} opens</div>
                          )}
                        </div>
                        <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                          <Icon className={card.color} size={20} />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Reward Distribution */}
              {analytics?.rewardDistribution && analytics.rewardDistribution.length > 0 && (
                <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-heading text-velvet-white uppercase tracking-wider mb-4">Reward Distribution</h3>
                  <div className="space-y-2">
                    {analytics.rewardDistribution.map((rd, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-velvet-white w-40 truncate shrink-0">{rd.name}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                            style={{ width: `${Math.min(rd.percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-velvet-muted font-mono w-12 text-right shrink-0">{rd.percentage}%</span>
                        <span className="text-[10px] text-velvet-muted font-mono w-16 text-right shrink-0">({rd.count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Health Dashboard Tab ────────────────────────────────────────── */}
      {tab === 'health' && (
        <div>
          {loadingHealth ? (
            <Spinner />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[
                  { key: 'activeCrates', label: 'Active Crates', icon: Layers, color: 'text-emerald-400', bg: 'bg-emerald-500/10', good: true },
                  { key: 'invalidCrates', label: 'Invalid Crates', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', good: false },
                  { key: 'unusedCrates', label: 'Unused Crates', icon: XCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', good: false },
                  { key: 'mostAwardedReward', label: 'Most Awarded Reward', icon: Trophy, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { key: 'avgRewardsPerCrate', label: 'Avg Rewards Per Crate', icon: Hash, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                ].map((card, i) => {
                  const Icon = card.icon
                  const value = health ? (health as any)[card.key] : '...'
                  const display = typeof value === 'number' ? value.toLocaleString() : value || 'N/A'
                  return (
                    <motion.div
                      key={card.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.5, ease: EASE }}
                      className="bg-velvet-card border border-white/10 rounded-2xl p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted">{card.label}</div>
                          <div className="text-2xl font-heading text-velvet-white mt-2">{display}</div>
                        </div>
                        <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                          <Icon className={card.color} size={20} />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {health && health.invalidCrates > 0 && (
                <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl">
                  <div className="flex items-center gap-2 text-red-300 text-sm">
                    <AlertTriangle size={16} />
                    <span><strong>{health.invalidCrates}</strong> crate(s) have invalid probability totals. Disable them or fix their reward probabilities.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Reward Preview Modal ────────────────────────────────────── */}
      {previewCrate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewCrate(null)}>
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {previewCrate.imageUrl ? (
                  <img src={getFullImageUrl(previewCrate.imageUrl)} alt={previewCrate.name} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <Package size={20} className="text-velvet-muted" />
                )}
                <div>
                  <h3 className="font-heading text-lg text-velvet-white">{previewCrate.name}</h3>
                  <p className="text-[10px] text-velvet-muted uppercase tracking-wider">
                    {CRATE_TYPE_LABELS[previewCrate.crateType] || previewCrate.crateType} &middot; {previewCrate.cost} coins
                  </p>
                </div>
              </div>
              <button onClick={() => setPreviewCrate(null)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} className="text-velvet-muted" />
              </button>
            </div>

            {loadingPreview ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border border-white/20 border-t-white/60 rounded-full animate-spin" /></div>
            ) : !Array.isArray(previewRewards) || previewRewards.length === 0 ? (
              <div className="text-center py-8 text-sm text-velvet-muted">No rewards defined.</div>
            ) : (
              <div className="space-y-2">
                {previewRewards.map((reward, i) => {
                  const rt = REWARD_TYPES.find(t => t.value === reward.rewardType)
                  const rar = RARITIES.find(r => r.value === (reward.rarity || 'common'))
                  return (
                    <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-3">
                        {rt && <rt.icon size={14} className="text-velvet-muted" />}
                        <div>
                          <div className="text-sm text-velvet-white">{reward.rewardName}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${rar?.color || 'text-gray-400 bg-gray-500/10'}`}>
                              {RARITY_LABELS[reward.rarity] || 'Common'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-velvet-white font-mono">{reward.probability.toFixed(1)}%</div>
                        <div className="w-24 h-1 rounded-full bg-white/10 mt-1 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(reward.probability, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Create/Edit Crate Modal ──────────────────────────────────── */}
      {showCrateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-xl text-velvet-white">
                {editingCrate ? 'Edit Crate' : 'Create Crate'}
              </h3>
              <button onClick={() => setShowCrateModal(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} className="text-velvet-muted" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Name</label>
                <input
                  type="text"
                  value={crateForm.name}
                  onChange={e => setCrateForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  placeholder="e.g. Summer Mystery Crate"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Description</label>
                <textarea
                  value={crateForm.description}
                  onChange={e => setCrateForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white resize-none h-20"
                  placeholder="Crate description..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Crate Image</label>
                {crateForm.imageUrl && (
                  <div className="mb-2 relative inline-block">
                    <img src={getFullImageUrl(crateForm.imageUrl)} alt="Preview" className="w-20 h-20 rounded-xl object-cover border border-white/10" />
                    <button
                      onClick={() => setCrateForm(f => ({ ...f, imageUrl: '' }))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors text-[10px] uppercase tracking-wider text-velvet-muted">
                    <Upload size={12} />
                    {uploadingImage ? 'Uploading...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/png,image/svg+xml,image/webp,image/jpeg,image/gif"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file)
                      }}
                      disabled={uploadingImage}
                    />
                  </label>
                  <input
                    type="text"
                    value={crateForm.imageUrl}
                    onChange={e => setCrateForm(f => ({ ...f, imageUrl: e.target.value }))}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                    placeholder="Or paste image URL..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Crate Type</label>
                  <select
                    value={crateForm.crateType}
                    onChange={e => setCrateForm(f => ({ ...f, crateType: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  >
                    {CRATE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Cost (Coins)</label>
                  <input
                    type="number"
                    min={0}
                    value={crateForm.cost}
                    onChange={e => setCrateForm(f => ({ ...f, cost: Number(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  />
                </div>
              </div>

              {/* Acquisition Method */}
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Acquisition Method</label>
                <select
                  value={crateForm.acquisitionMethod}
                  onChange={e => setCrateForm(f => ({ ...f, acquisitionMethod: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                >
                  {ACQUISITION_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted">Active</label>
                <button
                  onClick={() => setCrateForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    crateForm.isActive ? 'bg-emerald-500' : 'bg-white/20'
                  } relative`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                    crateForm.isActive ? 'left-5' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCrateModal(false)}
                className="flex-1 px-4 py-2.5 border border-white/15 rounded-xl text-sm text-velvet-muted hover:text-velvet-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCrate}
                disabled={savingCrate || !crateForm.name}
                className="flex-1 px-4 py-2.5 bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold disabled:opacity-50"
              >
                {savingCrate ? 'Saving...' : editingCrate ? 'Update Crate' : 'Create Crate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create/Edit Reward Modal ────────────────────────────────── */}
      {showRewardModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-xl text-velvet-white">
                {editingReward ? 'Edit Reward' : 'Add Reward'}
              </h3>
              <button onClick={() => setShowRewardModal(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X size={18} className="text-velvet-muted" />
              </button>
            </div>

            {rewardError && (
              <div className="mb-4 p-3 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-xs">{rewardError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Reward Type</label>
                <select
                  value={rewardForm.rewardType}
                  onChange={e => {
                    const type = e.target.value
                    setRewardForm(f => ({ ...f, rewardType: type }))
                    if (type === 'badge') setShowBadgeDropdown(true)
                    else setShowBadgeDropdown(false)
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                >
                  {REWARD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Badge dropdown when reward type = badge */}
              {rewardForm.rewardType === 'badge' && (
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Select Badge</label>
                  <select
                    value={rewardForm.rewardValue}
                    onChange={e => {
                      const badgeId = e.target.value
                      const badge = badges.find(b => b.badgeId === badgeId)
                      if (badge) {
                        setRewardForm(f => ({
                          ...f,
                          rewardValue: badgeId,
                          rewardName: badge.name,
                          rarity: badge.rarity,
                        }))
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  >
                    <option value="">Select a badge...</option>
                    {badges.map(b => (
                      <option key={b.badgeId} value={b.badgeId}>
                        {b.emoji} {b.name} ({b.rarity})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Reward Name</label>
                <input
                  type="text"
                  value={rewardForm.rewardName}
                  onChange={e => setRewardForm(f => ({ ...f, rewardName: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  placeholder="e.g. 50 XP Bonus"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">
                    Value {rewardForm.rewardType === 'xp' ? '(XP amount)' : rewardForm.rewardType === 'coins' ? '(Coin amount)' : '(ID or amount)'}
                  </label>
                  <input
                    type="text"
                    value={rewardForm.rewardValue}
                    onChange={e => setRewardForm(f => ({ ...f, rewardValue: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                    placeholder="e.g. 50"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Rarity</label>
                  <select
                    value={rewardForm.rarity}
                    onChange={e => setRewardForm(f => ({ ...f, rarity: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  >
                    {RARITIES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">
                  Probability (%) {Array.isArray(rewards) && `(Current total: ${(getProbabilityTotal() - (editingReward ? (editingReward.probability || 0) : 0)).toFixed(1)}% + new)`}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={rewardForm.probability}
                  onChange={e => setRewardForm(f => ({ ...f, probability: Number(e.target.value) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                />
                <div className="mt-1.5">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{
                        width: `${Math.min(
                          ((Array.isArray(rewards)
                            ? rewards
                                .filter(r => editingReward ? r.id !== editingReward.id : true)
                                .reduce((s, r) => s + (r.probability || 0), 0)
                            : 0) + (rewardForm.probability || 0)) / 100 * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-velvet-muted mt-0.5">
                    <span>Current</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRewardModal(false)}
                className="flex-1 px-4 py-2.5 border border-white/15 rounded-xl text-sm text-velvet-muted hover:text-velvet-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReward}
                disabled={savingReward || !rewardForm.rewardName}
                className="flex-1 px-4 py-2.5 bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold disabled:opacity-50"
              >
                {savingReward ? 'Saving...' : editingReward ? 'Update Reward' : 'Add Reward'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm Toggle Modal (for system crates) ──────────────────── */}
      {confirmToggle && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <Shield size={20} className="text-cyan-400" />
              <h3 className="font-heading text-lg text-velvet-white">Disable System Crate</h3>
            </div>
            <p className="text-sm text-velvet-muted mb-6">
              <strong className="text-velvet-white">{confirmToggle.name}</strong> is a system crate. Disabling it will prevent users from opening it. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmToggle(null)}
                className="flex-1 px-4 py-2.5 border border-white/15 rounded-xl text-sm text-velvet-muted hover:text-velvet-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => doToggleCrate(confirmToggle)}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-red-600 transition-colors"
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
