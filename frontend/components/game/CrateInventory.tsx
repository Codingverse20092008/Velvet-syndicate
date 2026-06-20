'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gift, History, Sparkles, Inbox, PlusCircle, X,
  Coins, Package, Eye, TrendingUp, Layers, Info,
  Zap, BadgePercent, Truck, Award, Key, Frame, Type,
  HelpCircle, Lock, Gem,
} from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { CrateOpeningModal } from './CrateOpeningModal'
import { getFullImageUrl } from '@/lib/api'

interface CrateReward {
  id: string
  crateId: string
  rewardType: string
  rewardValue: string
  rewardName: string
  probability: number
  rarity: string
}

interface CrateType {
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
  rewards: CrateReward[]
}

const RARITY_BADGE_STYLE: Record<string, string> = {
  common: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  rare: 'bg-blue-950/40 text-blue-400 border-blue-500/20',
  epic: 'bg-purple-950/40 text-purple-400 border-purple-500/20',
  legendary: 'bg-amber-950/40 text-amber-400 border-amber-500/20',
}

const RARITY_BAR_STYLE: Record<string, string> = {
  common: 'bg-neutral-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-amber-500',
}

const RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}

const REWARD_TYPE_ICONS: Record<string, any> = {
  xp: Zap,
  coins: Coins,
  coupon: BadgePercent,
  shipping: Truck,
  badge: Award,
  access: Key,
  frame: Frame,
  title: Type,
  crate: Package,
}

const STORE_KEY_MAP: Record<string, 'mystery' | 'premium'> = {
  basic: 'mystery',
  premium: 'premium',
}

const ACQUISITION_METHODS_LIST = [
  { method: 'daily_challenges', icon: Sparkles, label: 'Daily Challenges', description: 'Complete daily challenges to earn crates' },
  { method: 'level_reward', icon: TrendingUp, label: 'Level Rewards', description: 'Reach new levels to unlock crate rewards' },
  { method: 'seasonal_event', icon: Gift, label: 'Seasonal Events', description: 'Participate in seasonal events for exclusive crates' },
  { method: 'purchase', icon: PlusCircle, label: 'Purchases', description: 'Buy crates from the Reward Shop using Vault Coins' },
  { method: 'leaderboard', icon: Award, label: 'Leaderboards', description: 'Climb the leaderboards to earn crate bonuses' },
]

function getRarityDistribution(rewards: CrateReward[]): { rarity: string; totalProbability: number; count: number }[] {
  const dist: Record<string, { totalProbability: number; count: number }> = {}
  for (const r of rewards) {
    const rarity = r.rarity || 'common'
    if (!dist[rarity]) dist[rarity] = { totalProbability: 0, count: 0 }
    dist[rarity].totalProbability += r.probability
    dist[rarity].count++
  }
  return Object.entries(dist).map(([rarity, data]) => ({
    rarity,
    totalProbability: Math.round(data.totalProbability * 10) / 10,
    count: data.count,
  }))
}

function getRewardIcon(type: string) {
  const Icon = REWARD_TYPE_ICONS[type]
  return Icon ? <Icon className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />
}

function CrateTooltip({ crate }: { crate: CrateType }) {
  const dist = getRarityDistribution(crate.rewards)
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-4 rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl z-50 pointer-events-none">
      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted mb-1">Rewards</p>
          <p className="text-xs text-velvet-white">{crate.rewardCount} possible rewards</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted mb-2">Rarity Distribution</p>
          <div className="space-y-1.5">
            {dist.map(d => (
              <div key={d.rarity} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${RARITY_BAR_STYLE[d.rarity] || 'bg-neutral-500'}`} />
                <span className="text-[10px] text-velvet-muted flex-1 capitalize">{d.rarity}</span>
                <span className="text-[10px] text-velvet-white font-mono">{d.totalProbability}%</span>
              </div>
            ))}
          </div>
        </div>
        {crate.acquisitionMethod && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted mb-1">Acquisition</p>
            <p className="text-[10px] text-velvet-white capitalize">{crate.acquisitionMethod.replace(/_/g, ' ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function RewardsModal({ crate, onClose }: { crate: CrateType; onClose: () => void }) {
  const dist = getRarityDistribution(crate.rewards)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-velvet-card border border-white/10 rounded-[2rem] p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto custom-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {crate.imageUrl ? (
              <img src={getFullImageUrl(crate.imageUrl)} alt={crate.name} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-velvet-muted" />
              </div>
            )}
            <div>
              <h3 className="font-heading text-lg text-velvet-white">{crate.name}</h3>
              {crate.description && (
                <p className="text-[10px] text-velvet-muted mt-0.5 max-w-xs leading-relaxed">{crate.description}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-velvet-muted" />
          </button>
        </div>

        {crate.cost > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-300 font-semibold">{crate.cost} Vault Coins</span>
          </div>
        )}

        {crate.rewards.length === 0 ? (
          <div className="text-center py-8 text-sm text-velvet-muted">No rewards configured for this crate.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted">
                Possible Rewards ({crate.rewards.length})
              </p>
              <p className="text-[10px] text-velvet-muted">Probability</p>
            </div>

            <div className="space-y-2">
              {crate.rewards.map((reward, i) => (
                <div
                  key={reward.id || i}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-velvet-muted shrink-0">{getRewardIcon(reward.rewardType)}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-velvet-white truncate">{reward.rewardName}</p>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold border ${
                        RARITY_BADGE_STYLE[reward.rarity] || RARITY_BADGE_STYLE.common
                      }`}>
                        {RARITY_LABELS[reward.rarity] || reward.rarity}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-sm text-velvet-white font-mono">{reward.probability.toFixed(1)}%</span>
                    <div className="w-20 h-1 rounded-full bg-white/10 mt-1 overflow-hidden ml-auto">
                      <div
                        className={`h-full rounded-full ${RARITY_BAR_STYLE[reward.rarity] || 'bg-neutral-500'}`}
                        style={{ width: `${Math.min(reward.probability, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/5 pt-4 mt-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted mb-3">Rarity Breakdown</p>
              <div className="grid grid-cols-4 gap-2">
                {dist.map(d => (
                  <div key={d.rarity} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className={`w-2 h-2 rounded-full mx-auto mb-1.5 ${RARITY_BAR_STYLE[d.rarity] || 'bg-neutral-500'}`} />
                    <p className="text-[10px] text-velvet-muted uppercase">{d.rarity}</p>
                    <p className="text-sm font-bold text-velvet-white">{d.totalProbability}%</p>
                    <p className="text-[8px] text-velvet-muted">{d.count} rewards</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export function CrateInventory() {
  const { crateInventory, crateHistory, dailyCratesOpened, analytics } = useGameStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [activeCrateType, setActiveCrateType] = useState<'mystery' | 'premium'>('mystery')
  const [crateTypes, setCrateTypes] = useState<CrateType[]>([])
  const [loading, setLoading] = useState(true)
  const [rewardsModalCrate, setRewardsModalCrate] = useState<CrateType | null>(null)
  const [hoveredCrate, setHoveredCrate] = useState<string | null>(null)

  useEffect(() => {
    const fetchCrateTypes = async () => {
      try {
        const res = await fetch('/api/vault/crates/types')
        if (!res.ok) throw new Error('Failed to fetch')
        const d = await res.json()
        if (d.success && Array.isArray(d.data?.crateTypes)) {
          setCrateTypes(d.data.crateTypes)
        }
      } catch {
        // Fallback: show nothing, component will render with just the opening interface
      } finally {
        setLoading(false)
      }
    }
    fetchCrateTypes()
  }, [])

  const totalCrates = (crateInventory.mystery || 0) + (crateInventory.premium || 0)
  const totalLifetimeCrates = analytics?.totalCratesOpened || 0

  const handleOpenCrate = (type: 'mystery' | 'premium') => {
    setActiveCrateType(type)
    setModalOpen(true)
  }

  const storeKeyForCrate = (ct: CrateType): 'mystery' | 'premium' | null => {
    return STORE_KEY_MAP[ct.crateType] || null
  }

  const crateInventoryForKey = (key: 'mystery' | 'premium' | null): number => {
    if (!key) return 0
    return crateInventory[key] || 0
  }

  const dailyOpenedForKey = (key: 'mystery' | 'premium' | null): number => {
    if (!key) return 0
    return dailyCratesOpened[key] || 0
  }

  const dailyLimitForKey = (key: 'mystery' | 'premium' | null): number => {
    if (key === 'mystery') return 2
    if (key === 'premium') return 1
    return 0
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8 space-y-8 relative overflow-hidden">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Vault Storage</p>
          <h3 className="mt-2 text-2xl font-heading uppercase tracking-wide text-velvet-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-orange-400" />
            Mystery Crate Inventory
          </h3>
          <p className="mt-1 text-sm text-velvet-muted">
            Earn crates through daily challenges, level progression, events, and purchases. Each crate contains exclusive rewards with varying rarity.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-velvet-muted">
          Available: <span className="font-bold text-velvet-white">{totalCrates} Crates</span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[9px] uppercase tracking-[0.2em] text-velvet-muted">Mystery Opened Today</p>
          <p className="text-lg font-bold text-orange-400 mt-0.5">{dailyOpenedForKey('mystery')}/2</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[9px] uppercase tracking-[0.2em] text-velvet-muted">Premium Opened Today</p>
          <p className="text-lg font-bold text-amber-400 mt-0.5">{dailyOpenedForKey('premium')}/1</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[9px] uppercase tracking-[0.2em] text-velvet-muted">Total Earned Lifetime</p>
          <p className="text-lg font-bold text-emerald-400 mt-0.5">{totalLifetimeCrates.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[9px] uppercase tracking-[0.2em] text-velvet-muted">Unopened</p>
          <p className="text-lg font-bold text-velvet-white mt-0.5">{totalCrates}</p>
        </div>
      </div>

      {/* Rarity Breakdown */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted flex items-center gap-2">
          <Layers className="w-3 h-3" />
          Rarity Breakdown
        </p>
        <div className="flex h-3 rounded-full overflow-hidden border border-white/5">
          <div className="bg-neutral-500/80 transition-all" style={{ width: '65%' }} title="Common 65%" />
          <div className="bg-blue-500/80 transition-all" style={{ width: '25%' }} title="Rare 25%" />
          <div className="bg-purple-500/80 transition-all" style={{ width: '8%' }} title="Epic 8%" />
          <div className="bg-amber-500/80 transition-all" style={{ width: '2%' }} title="Legendary 2%" />
        </div>
        <div className="flex justify-between text-[9px] text-velvet-muted">
          <span>Common 65%</span>
          <span>Rare 25%</span>
          <span>Epic 8%</span>
          <span>Legendary 2%</span>
        </div>
      </div>

      {/* Grid: Crates Available */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      ) : crateTypes.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-white/10 p-10 text-center flex flex-col items-center justify-center text-velvet-muted">
          <Package className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No crate types available yet</p>
          <p className="text-[10px] mt-1">Check back later or contact support</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {crateTypes.map((crate) => {
            const storeKey = storeKeyForCrate(crate)
            const inv = crateInventoryForKey(storeKey)
            const dailyOpened = dailyOpenedForKey(storeKey)
            const dailyLimit = dailyLimitForKey(storeKey)
            const canOpen = storeKey && inv > 0 && dailyOpened < dailyLimit
            const isEventCrate = crate.crateType === 'event' || crate.crateType === 'seasonal'

            return (
              <motion.div
                key={crate.id}
                whileHover={{ y: -4 }}
                onMouseEnter={() => setHoveredCrate(crate.id)}
                onMouseLeave={() => setHoveredCrate(null)}
                className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 flex flex-col justify-between space-y-6 relative overflow-hidden group"
              >
                {hoveredCrate === crate.id && crate.rewards.length > 0 && (
                  <CrateTooltip crate={crate} />
                )}

                {/* Crate Image / Icon */}
                <div className="absolute top-0 right-0 p-6 opacity-[0.04] text-9xl pointer-events-none group-hover:opacity-[0.06] transition-opacity">
                  {crate.imageUrl ? (
                    <img src={getFullImageUrl(crate.imageUrl)} alt="" className="w-32 h-32 object-contain opacity-50" />
                  ) : (
                    <Package className="w-32 h-32" />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {crate.imageUrl ? (
                      <img src={getFullImageUrl(crate.imageUrl)} alt={crate.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Package className="w-6 h-6 text-velvet-muted" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-velvet-white truncate">{crate.name}</h4>
                      <p className="text-[10px] text-velvet-muted uppercase tracking-wider">
                        {crate.crateType === 'basic' && 'Common / Rare / Epic Drops'}
                        {crate.crateType === 'premium' && 'Epic / Legendary Drops'}
                        {crate.crateType === 'event' && 'Event Exclusive Rewards'}
                        {crate.crateType === 'seasonal' && 'Seasonal Limited Drops'}
                      </p>
                    </div>
                  </div>
                  {crate.description && (
                    <p className="text-xs text-velvet-muted leading-relaxed">{crate.description}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {/* View Rewards Button */}
                  <button
                    onClick={() => setRewardsModalCrate(crate)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-white/10 bg-white/[0.03] text-[9px] uppercase tracking-widest text-velvet-muted hover:text-velvet-white hover:bg-white/[0.06] transition-all group"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Rewards
                    <span className="ml-auto text-[8px] text-velvet-muted opacity-50">{crate.rewardCount} items</span>
                  </button>

                  {/* Action Row */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3 text-sm">
                      <span>
                        In Stock: <span className={`font-bold ${crate.crateType === 'premium' ? 'text-amber-400' : 'text-orange-400'}`}>{inv}</span>
                      </span>
                      {storeKey && dailyLimit > 0 && (
                        <span className="text-[10px] text-velvet-muted">
                          {dailyOpened}/{dailyLimit} today
                        </span>
                      )}
                    </div>
                    {isEventCrate ? (
                      <span className="px-4 py-2 rounded-full text-[8px] uppercase tracking-widest bg-purple-600/20 border border-purple-500/30 text-purple-300">
                        Event Crate
                      </span>
                    ) : storeKey ? (
                      <button
                        onClick={() => handleOpenCrate(storeKey)}
                        disabled={!canOpen}
                        className={`px-5 py-2.5 rounded-full font-heading text-[9px] uppercase tracking-widest transition-all ${
                          crate.crateType === 'premium'
                            ? 'bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-black'
                            : 'bg-orange-600/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500 hover:text-black'
                        } disabled:opacity-40 disabled:pointer-events-none`}
                      >
                        {inv <= 0 ? 'Out of Stock' : dailyOpened >= dailyLimit ? 'Daily Limit Reached' : 'Unlock Crate'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* How To Earn Section */}
      <div className="space-y-4">
        <h4 className="font-heading text-xs uppercase tracking-widest text-velvet-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-velvet-muted" />
          How To Earn
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ACQUISITION_METHODS_LIST.map(item => {
            const Icon = item.icon
            return (
              <div
                key={item.method}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center hover:bg-white/[0.04] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2">
                  <Icon className="w-4 h-4 text-velvet-muted" />
                </div>
                <p className="text-[10px] font-semibold text-velvet-white uppercase tracking-wider">{item.label}</p>
                <p className="text-[9px] text-velvet-muted mt-1 leading-relaxed">{item.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* History Log */}
      <div className="space-y-4">
        <h4 className="font-heading text-xs uppercase tracking-widest text-velvet-white flex items-center gap-2">
          <History className="w-4 h-4 text-velvet-muted" />
          Opening History
        </h4>

        {crateHistory.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-white/10 p-10 text-center flex flex-col items-center justify-center text-velvet-muted">
            <Inbox className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-semibold text-velvet-white">No Crates Opened Yet</p>
            <p className="text-xs mt-1 max-w-sm">
              Complete daily challenges, earn levels, participate in events, or purchase crates from the Reward Shop to start building your collection.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[9px] uppercase tracking-wider text-velvet-muted">
                Daily Challenges
              </span>
              <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[9px] uppercase tracking-wider text-velvet-muted">
                Level Up
              </span>
              <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[9px] uppercase tracking-wider text-velvet-muted">
                Events
              </span>
              <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[9px] uppercase tracking-wider text-velvet-muted">
                Reward Shop
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 overflow-hidden divide-y divide-white/5 max-h-60 overflow-y-auto custom-scrollbar">
            {crateHistory.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{log.crateType === 'premium' ? '🎁' : '📦'}</span>
                  <div>
                    <p className="font-medium text-velvet-white">{log.rewardLabel}</p>
                    <p className="text-[10px] text-velvet-muted">Opened on {log.date}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border ${
                  RARITY_BADGE_STYLE[log.rarity as keyof typeof RARITY_BADGE_STYLE] || RARITY_BADGE_STYLE.common
                }`}>
                  {log.rarity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Rewards Modal */}
      <AnimatePresence>
        {rewardsModalCrate && (
          <RewardsModal crate={rewardsModalCrate} onClose={() => setRewardsModalCrate(null)} />
        )}
      </AnimatePresence>

      {/* Opening Modal Portal */}
      <CrateOpeningModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        crateType={activeCrateType}
      />
    </div>
  )
}
