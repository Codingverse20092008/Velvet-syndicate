'use client'

/**
 * Hero3D.tsx
 * ----------------------
 * CRO-Optimized Hero Section
 *
 * Key Improvements:
 * - Clear, bold headline: "CURATED STREETWEAR & EXCLUSIVE KICKS"
 * - Legible subheadline (text-gray-300) explaining value prop
 * - Dual CTA buttons with high contrast
 * - Primary: White bg (#FFFFFF) + Black text (#000000)
 * - Secondary: Ghost/outline style with gold accent
 * - Reduced background clutter for WCAG AA compliance
 * - Mobile-optimized touch targets (min 44px height)
 * - Premium streetwear aesthetic maintained
 */

import React, { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

const EASE = [0.22, 1, 0.36, 1] as const

const CanvasScene = dynamic(() => import('./CanvasScene'), {
  ssr: false,
  loading: () => null,
})

const BackgroundAnimation = dynamic(() => import('./BackgroundAnimation'), {
  ssr: false,
  loading: () => null,
})

export function Hero3D() {
  const [hasError, setHasError] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)

  const handleReady = useCallback(() => setCanvasReady(true), [])

  return (
    <div className="relative w-full min-h-screen bg-[#060606] overflow-hidden">
      {/* Animated Background - Reduced opacity for better contrast */}
      <div className="opacity-40">
        <BackgroundAnimation />
      </div>

      {/* 3D Canvas - Subtle opacity for readability */}
      <AnimatePresence>
        {!hasError && (
          <motion.div
            key="canvas"
            className="absolute inset-0 opacity-70"
            initial={{ opacity: 0 }}
            animate={{ opacity: canvasReady ? 0.7 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: EASE }}
          >
            <CanvasScene onReady={handleReady} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flagship Sneaker Visual with Priority for LCP */}
      {(!canvasReady || hasError) && (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${canvasReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <Image
            src="/images/sneaker-fallback.png"
            alt="Velvet Syndicate Flagship Sneaker"
            fill
            sizes="100vw"
            className="object-contain p-12 md:p-20 opacity-50 filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            priority={true}
          />
        </div>
      )}

      {/* Enhanced Vignette for Text Contrast - WCAG AA Compliant */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* Text Contrast Shield - Darker overlay behind content */}
      <div
        className="absolute inset-0 z-15 pointer-events-none flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle at center, rgba(0,0,0,0.65) 0%, transparent 75%)'
        }}
      />

      {/* Hero Content - CRO Optimized */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
        <motion.div
          className="text-center max-w-5xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: EASE }}
        >
          {/* Brand Label - Enhanced visibility */}
          <motion.p
            className="text-xs sm:text-sm uppercase tracking-[0.4em] sm:tracking-[0.5em] text-white/90 mb-6 sm:mb-8 font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            Velvet Syndicate
          </motion.p>

          {/* Primary Headline - Clear Value Proposition */}
          <motion.h1
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white mb-5 sm:mb-6 leading-[1.1] tracking-tight"
            style={{
              textShadow: '0 4px 24px rgba(0,0,0,0.9), 0 8px 48px rgba(0,0,0,0.6)',
              fontWeight: 700,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1 }}
          >
            CURATED STREETWEAR
            <br />
            <span className="text-[#C9A961]">& EXCLUSIVE KICKS</span>
          </motion.h1>

          {/* Subheadline - Legible on Mobile (WCAG AA) */}
          <motion.p
            className="text-sm sm:text-base md:text-lg text-gray-300 mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4"
            style={{
              textShadow: '0 2px 12px rgba(0,0,0,0.8)',
              lineHeight: '1.7',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            Buy premium sneakers from exclusive drops and earn Vault XP.
            <br className="hidden sm:block" />
            Unlock rewards, early access, and members-only collections.
          </motion.p>

          {/* Dual CTA Buttons - High Contrast & Clear Actions */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 pointer-events-auto"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4, ease: EASE }}
          >
            {/* Primary CTA - Shop Collection (High Contrast) */}
            <Link
              href="/collection"
              className="w-full sm:w-auto group relative overflow-hidden"
            >
              <div
                className="px-8 sm:px-10 md:px-12 py-4 sm:py-5 bg-white text-black font-bold text-sm sm:text-base tracking-[0.15em] uppercase text-center transition-all duration-300 hover:bg-gray-100 active:scale-[0.98] min-h-[44px] flex items-center justify-center"
                style={{
                  boxShadow: '0 8px 32px rgba(255,255,255,0.15)',
                }}
              >
                <span className="relative z-10">Shop Collection</span>
              </div>
            </Link>

            {/* Secondary CTA - Explore Vault XP (Ghost/Outline) */}
            <Link
              href="/vault"
              className="w-full sm:w-auto group"
            >
              <div
                className="px-8 sm:px-10 md:px-12 py-4 sm:py-5 border-2 border-neutral-700 bg-black/30 backdrop-blur-sm text-white font-semibold text-sm sm:text-base tracking-[0.15em] uppercase text-center transition-all duration-300 hover:border-[#C9A961] hover:bg-[#C9A961]/10 active:scale-[0.98] min-h-[44px] flex items-center justify-center"
                style={{
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
              >
                <span className="relative z-10">Explore Vault XP</span>
              </div>
            </Link>
          </motion.div>

          {/* Trust Signal / Social Proof */}
          <motion.div
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.8 }}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="uppercase tracking-wider">Free Shipping Over ₹2000</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#C9A961]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="uppercase tracking-wider">10,000+ Sneakerheads</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none hidden md:flex"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 1, repeat: Infinity, repeatType: 'reverse' }}
      >
        <div className="flex flex-col items-center gap-3">
          <span className="text-[9px] uppercase tracking-[0.4em] text-white/50 font-medium">
            Scroll
          </span>
          <div className="w-px h-12 bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </motion.div>
    </div>
  )
}
