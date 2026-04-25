'use client'

// Hero3D.tsx — Optimized for readability and premium aesthetic

import React, { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

const EASE = [0.22, 1, 0.36, 1] as const

const CanvasScene = dynamic(() => import('./CanvasScene'), {
  ssr: false,
  loading: () => null,
})

export function Hero3D() {
  const [hasError, setHasError] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)

  const handleReady = useCallback(() => setCanvasReady(true), [])

  return (
    <div className="relative w-full h-screen bg-[#060606] overflow-hidden">

      {/* 3D Canvas */}
      <AnimatePresence>
        {!hasError && (
          <motion.div
            key="canvas"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: canvasReady ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: EASE }}
          >
            <CanvasScene onReady={handleReady} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Static fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/images/sneaker-fallback.png"
            alt="Velvet Syndicate Sneaker"
            fill
            className="object-contain p-20 opacity-70"
            priority
          />
        </div>
      )}

      {/* Primary Vignette Overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* Text Contrast Guard — Subtle dark wash behind the central text area */}
      <div 
        className="absolute inset-0 z-15 pointer-events-none flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle at center, rgba(0,0,0,0.45) 0%, transparent 70%)'
        }}
      />

      {/* Hero copy + CTA */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
        <motion.div
          className="text-center px-6"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8, ease: EASE }}
        >
          {/* Brand micro-label — Enlarged as requested */}
          <p className="text-[14px] uppercase tracking-[0.65em] text-velvet-white mb-8 pointer-events-none select-none font-medium opacity-90">
            Velvet Syndicate
          </p>

          {/* Primary headline — Enhanced visibility with premium color pattern */}
          <h1
            className="font-heading text-5xl md:text-7xl lg:text-8xl text-white mb-10 tracking-tight leading-none pointer-events-none select-none"
            style={{ 
              textShadow: '0 8px 64px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.4)',
              letterSpacing: '-0.02em'
            }}
          >
            Built Quiet.<br />
            <span 
              className="italic" 
              style={{ 
                color: '#D4C4B0', // Premium Champagne / Sand color for visibility against white
                textShadow: '0 4px 32px rgba(0,0,0,0.8)'
              }}
            >
              Worn Loud.
            </span>
          </h1>

          {/* CTA button */}
          <motion.div
            className="pointer-events-auto inline-block"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.4, ease: EASE }}
          >
            <a
              href="/collection"
              className="inline-flex items-center px-12 py-[18px] border border-white/30 bg-black/20 backdrop-blur-sm text-white text-[11px] font-semibold tracking-[0.45em] uppercase select-none transition-all duration-500"
              style={{
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#FFFFFF'
                e.currentTarget.style.color = '#000000'
                e.currentTarget.style.borderColor = '#FFFFFF'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.2)'
                e.currentTarget.style.color = '#FFFFFF'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              Explore Collection
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
      >
        <div className="flex flex-col items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 select-none font-medium">
            Scroll
          </span>
          <div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </motion.div>

    </div>
  )
}
