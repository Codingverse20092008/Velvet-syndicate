'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, History, Sparkles, Inbox, PlusCircle } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { CrateOpeningModal } from './CrateOpeningModal'

const RARITY_BADGE_STYLE = {
  common: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  rare: 'bg-blue-950/40 text-blue-400 border-blue-500/20',
  epic: 'bg-purple-950/40 text-purple-400 border-purple-500/20',
  legendary: 'bg-amber-950/40 text-amber-400 border-amber-500/20'
}

export function CrateInventory() {
  const { crateInventory, crateHistory } = useGameStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [activeCrateType, setActiveCrateType] = useState<'mystery' | 'premium'>('mystery')

  const totalCrates = (crateInventory.mystery || 0) + (crateInventory.premium || 0)

  const handleOpenCrate = (type: 'mystery' | 'premium') => {
    setActiveCrateType(type)
    setModalOpen(true)
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
            Unlock crates earned from weather claims, purchase missions, or levels.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-velvet-muted">
          Available: <span className="font-bold text-velvet-white">{totalCrates} Crates</span>
        </div>
      </div>

      {/* Grid: Crates Available */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Mystery Crate */}
        <motion.div
          whileHover={{ y: -4 }}
          className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 flex flex-col justify-between space-y-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-9xl pointer-events-none group-hover:opacity-[0.05] transition-opacity">
            📦
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl">📦</span>
              <div>
                <h4 className="font-bold text-velvet-white">Mystery Crate</h4>
                <p className="text-[10px] text-velvet-muted uppercase tracking-wider">Common / Rare / Epic Drops</p>
              </div>
            </div>
            <p className="text-xs text-velvet-muted">
              Standard crate containing XP rewards, vault coins, or discount coupons.
            </p>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm">
              In Stock: <span className="font-bold text-orange-400">{crateInventory.mystery || 0}</span>
            </div>
            <button
              onClick={() => handleOpenCrate('mystery')}
              disabled={(crateInventory.mystery || 0) <= 0}
              className="px-5 py-2.5 rounded-full font-heading text-[9px] uppercase tracking-widest bg-orange-600/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500 hover:text-black disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              Unlock Crate
            </button>
          </div>
        </motion.div>

        {/* Premium Crate */}
        <motion.div
          whileHover={{ y: -4 }}
          className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 flex flex-col justify-between space-y-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-9xl pointer-events-none group-hover:opacity-[0.05] transition-opacity">
            🎁
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🎁</span>
              <div>
                <h4 className="font-bold text-velvet-white">Premium Crate</h4>
                <p className="text-[10px] text-amber-400 uppercase tracking-wider">Epic / Legendary Drops</p>
              </div>
            </div>
            <p className="text-xs text-velvet-muted">
              High-tier chest loaded with premium coins, rare badges, early access pass, or massive discounts.
            </p>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm">
              In Stock: <span className="font-bold text-amber-400">{crateInventory.premium || 0}</span>
            </div>
            <button
              onClick={() => handleOpenCrate('premium')}
              disabled={(crateInventory.premium || 0) <= 0}
              className="px-5 py-2.5 rounded-full font-heading text-[9px] uppercase tracking-widest bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-black disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              Unlock Crate
            </button>
          </div>
        </motion.div>

      </div>

      {/* History Log */}
      <div className="space-y-4">
        <h4 className="font-heading text-xs uppercase tracking-widest text-velvet-white flex items-center gap-2">
          <History className="w-4 h-4 text-velvet-muted" />
          Opening History
        </h4>
        
        {crateHistory.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center flex flex-col items-center justify-center text-velvet-muted">
            <Inbox className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No crates opened yet. Start earning rewards!</p>
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 overflow-hidden divide-y divide-white/5 max-h-60 overflow-y-auto custom-scrollbar">
            {crateHistory.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between gap-4 text-xs">
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

      {/* Opening Modal Portal */}
      <CrateOpeningModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        crateType={activeCrateType}
      />
    </div>
  )
}
