'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flame, Sparkles } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { RewardReveal } from './RewardReveal'

interface CrateOpeningModalProps {
  isOpen: boolean
  onClose: () => void
  crateType: 'mystery' | 'premium'
}

// Particle helper
const generateParticles = (count = 35) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    angle: Math.random() * 360,
    speed: 1.5 + Math.random() * 3.5,
    size: 2 + Math.random() * 6,
    delay: Math.random() * 0.2
  }))
}

export function CrateOpeningModal({ isOpen, onClose, crateType }: CrateOpeningModalProps) {
  const { openCrate } = useGameStore()
  const [openingState, setOpeningState] = useState<'idle' | 'shaking' | 'revealed'>('idle')
  const [reward, setReward] = useState<any | null>(null)
  const [rarity, setRarity] = useState<any>('')
  const [particles, setParticles] = useState<any[]>([])

  if (!isOpen) return null

  const triggerOpen = () => {
    if (openingState !== 'idle') return

    // Sound Hook Optional
    try {
      const audio = new Audio('/sounds/crate-shake.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {}

    setOpeningState('shaking')
    
    // Simulate shaking for 1.8 seconds before reveal
    setTimeout(() => {
      const res = openCrate(crateType)
      if (res.success) {
        setReward(res.reward)
        setRarity(res.rarity)
        setParticles(generateParticles())
        setOpeningState('revealed')

        try {
          const audio = new Audio('/sounds/crate-reveal.mp3')
          audio.volume = 0.5
          audio.play().catch(() => {})
        } catch {}
      } else {
        onClose()
      }
    }, 1800)
  }

  const handleClose = () => {
    setOpeningState('idle')
    setReward(null)
    setRarity('')
    setParticles([])
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl overflow-hidden p-6"
      >
        {/* Close Button */}
        {openingState !== 'shaking' && (
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-velvet-muted hover:text-velvet-white transition-all interactive"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="w-full max-w-lg flex flex-col items-center justify-center relative">
          
          {openingState !== 'revealed' ? (
            <div className="flex flex-col items-center space-y-8 text-center select-none">
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-[0.3em] text-orange-400 font-bold">
                  {crateType === 'premium' ? '⚡ Premium Crate' : '📦 Mystery Crate'}
                </span>
                <h2 className="text-3xl font-heading uppercase text-velvet-white">
                  {openingState === 'idle' ? 'Ready to Open' : 'Cracking Code...'}
                </h2>
                <p className="text-xs text-velvet-muted max-w-[280px]">
                  {openingState === 'idle'
                    ? 'Click the crate to break it open and unlock exclusive rewards.'
                    : 'The temperature is rising. Preparing rewards...'}
                </p>
              </div>

              {/* Crate Animation Canvas */}
              <div className="relative w-72 h-72 flex items-center justify-center">
                {/* Glow ring */}
                <div
                  className={`absolute w-48 h-48 rounded-full blur-[40px] pointer-events-none transition-all duration-500 ${
                    openingState === 'shaking' ? 'bg-orange-500/30 scale-125' : 'bg-orange-500/10 scale-100'
                  }`}
                />

                <motion.div
                  onClick={triggerOpen}
                  className={`cursor-pointer z-10 relative select-none ${openingState === 'shaking' ? 'pointer-events-none' : ''}`}
                  animate={
                    openingState === 'shaking'
                      ? {
                          x: [0, -6, 6, -8, 8, -6, 6, 0],
                          y: [0, 4, -4, 6, -6, 4, -4, 0],
                          rotate: [0, -3, 3, -4, 4, -2, 2, 0],
                          scale: [1, 1.05, 0.98, 1.04, 1.02, 1]
                        }
                      : {
                          y: [0, -10, 0]
                        }
                  }
                  transition={
                    openingState === 'shaking'
                      ? { duration: 0.25, repeat: 7 }
                      : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                  }
                >
                  {/* Visual Crate Container */}
                  <div className="text-8xl select-none filter drop-shadow-[0_10px_20px_rgba(255,102,0,0.2)]">
                    {crateType === 'premium' ? '🎁' : '📦'}
                  </div>

                  {openingState === 'idle' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-orange-500/25 border border-orange-400/50 rounded-full px-4 py-1 text-[9px] uppercase tracking-widest text-orange-200 font-bold whitespace-nowrap animate-pulse"
                    >
                      Click to Open
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </div>
          ) : (
            // Revealed Reward Mode
            <div className="relative w-full flex items-center justify-center">
              {/* Particle Explosions */}
              {particles.map((p) => {
                const angleRad = (p.angle * Math.PI) / 180
                const targetX = Math.cos(angleRad) * p.speed * 85
                const targetY = Math.sin(angleRad) * p.speed * 85

                return (
                  <motion.div
                    key={p.id}
                    className="absolute rounded-full bg-gradient-to-r from-orange-400 to-amber-300 pointer-events-none"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: targetX,
                      y: targetY,
                      opacity: 0,
                      scale: 0.1
                    }}
                    transition={{
                      duration: 0.95,
                      delay: p.delay,
                      ease: 'easeOut'
                    }}
                    style={{
                      width: p.size,
                      height: p.size,
                      boxShadow: '0 0 10px rgba(255, 165, 0, 0.6)'
                    }}
                  />
                )
              })}

              <RewardReveal reward={reward} rarity={rarity} onClose={handleClose} />
            </div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  )
}
