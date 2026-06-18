'use client'

import { motion } from 'framer-motion'
import { Sparkles, Gift, Star, Award, ShieldAlert } from 'lucide-react'

interface RewardRevealProps {
  reward: {
    type: 'coins' | 'xp' | 'shipping' | 'coupon' | 'badge' | 'access' | 'crate'
    value: any
    label: string
  }
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  onClose: () => void
}

const RARITY_THEMES = {
  common: {
    label: 'Common',
    color: '#9CA3AF',
    glow: 'rgba(156, 163, 175, 0.4)',
    bg: 'from-neutral-900 to-neutral-800',
    border: 'border-neutral-700',
    text: 'text-neutral-300'
  },
  rare: {
    label: 'Rare',
    color: '#3B82F6',
    glow: 'rgba(59, 130, 246, 0.5)',
    bg: 'from-blue-950/40 to-neutral-900',
    border: 'border-blue-500/40',
    text: 'text-blue-300'
  },
  epic: {
    label: 'Epic',
    color: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.6)',
    bg: 'from-purple-950/40 to-neutral-900',
    border: 'border-purple-500/40',
    text: 'text-purple-300'
  },
  legendary: {
    label: 'Legendary',
    color: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.7)',
    bg: 'from-amber-950/40 to-neutral-900',
    border: 'border-amber-500/40',
    text: 'text-amber-300'
  }
}

export function RewardReveal({ reward, rarity, onClose }: RewardRevealProps) {
  const theme = RARITY_THEMES[rarity] || RARITY_THEMES.common

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-sm w-full mx-auto"
    >
      {/* Glow Effect */}
      <div
        className="absolute w-64 h-64 rounded-full blur-[80px] pointer-events-none -z-10 transition-all duration-1000"
        style={{ background: theme.glow }}
      />

      {/* Reward Icon & Emoji */}
      <motion.div
        initial={{ y: 20, rotate: -10 }}
        animate={{ y: 0, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className={`w-28 h-28 rounded-full flex items-center justify-center border-2 ${theme.border} bg-black/60 relative overflow-hidden`}
        style={{ boxShadow: `0 0 20px ${theme.color}40` }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-5xl"
        >
          {reward.type === 'coins' && '🪙'}
          {reward.type === 'xp' && '⚡'}
          {reward.type === 'shipping' && '🚚'}
          {reward.type === 'coupon' && '🏷️'}
          {reward.type === 'badge' && '🏆'}
          {reward.type === 'access' && '🔑'}
          {reward.type === 'crate' && '🎁'}
        </motion.div>
      </motion.div>

      {/* Rarity Label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-1"
      >
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-black/50 border border-white/5 ${theme.text}`}
          style={{ boxShadow: `0 0 10px ${theme.color}20` }}
        >
          <Star className="w-2.5 h-2.5 fill-current" />
          {theme.label} Reward
        </span>
        <h3 className="text-3xl font-heading uppercase text-velvet-white mt-3">
          {reward.label}
        </h3>
      </motion.div>

      {/* Reward description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xs text-velvet-muted max-w-[280px]"
      >
        {reward.type === 'coins' && 'Vault coins added to your wallet. Spend them on rewards or crates.'}
        {reward.type === 'xp' && 'XP added to seasonal progression. Check level rewards.'}
        {reward.type === 'shipping' && 'Free shipping coupon added. Apply at checkout.'}
        {reward.type === 'coupon' && 'Discount coupon unlocked. Find details in rewards section.'}
        {reward.type === 'badge' && 'Exclusive event badge unlocked. Displayed in your trophy cabinet.'}
        {reward.type === 'access' && 'Early Access Drop Pass unlocked. Get first pick of new styles.'}
        {reward.type === 'crate' && 'Bonus premium crate added directly to inventory.'}
      </motion.p>

      {/* Confirm CTA */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onClose}
        className="w-full py-4 px-6 rounded-full font-heading text-[10px] uppercase tracking-[0.24em] bg-velvet-white text-black hover:bg-white/90 active:scale-[0.98] transition-all"
        style={{ boxShadow: `0 4px 20px ${theme.color}40` }}
      >
        Collect Reward
      </motion.button>
    </motion.div>
  )
}
