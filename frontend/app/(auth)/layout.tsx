'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

import { AuthVideoBackground } from '@/components/auth/AuthVideoBackground'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [showForm, setShowForm] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowForm(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-[100dvh] w-full bg-black overflow-hidden relative flex items-center justify-center">
      {/* Dynamic Video Background with Masking */}
      <AuthVideoBackground />

      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div
            key="wait-msg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20 text-center px-6 flex flex-col items-center"
          >
            <motion.div 
              className="w-12 h-12 mb-8 border border-white/20 border-t-velvet-accent rounded-full animate-spin"
              style={{ borderWidth: '1px' }}
            />
            <h2 className="font-heading text-2xl md:text-3xl tracking-[0.4em] text-velvet-white mb-4 uppercase">
              Preparing Your Access
            </h2>
            <p className="text-velvet-muted text-sm tracking-[0.2em] uppercase max-w-xs mx-auto leading-relaxed">
              Step into the world of Velvet Syndicate. <br/>A premium experience is arriving.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
            className="relative z-10 w-full mt-4 md:mt-0"
          >
            {/* Glassmorphism Container to hide center watermark */}
            <div className="mx-auto max-w-xl px-4 md:px-6">
              <div className="backdrop-blur-2xl bg-black/40 md:bg-black/50 border border-white/10 rounded-3xl p-6 md:p-16 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
                {/* Internal glow/gradient to further hide anything behind */}
                <div className="absolute inset-0 bg-gradient-to-br from-velvet-accent/5 via-transparent to-black/40 pointer-events-none" />
                
                <div className="relative z-10">
                  {children}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
