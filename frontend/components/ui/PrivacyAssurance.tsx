'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, X, Lock } from 'lucide-react'

export function PrivacyAssurance() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const hasSeenPrivacy = localStorage.getItem('hasSeenPrivacyAssurance')
    if (!hasSeenPrivacy) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 2000) // Show after 2 seconds
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    localStorage.setItem('hasSeenPrivacyAssurance', 'true')
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 m-auto w-[90%] max-w-md h-fit z-[101]"
          >
            <div className="bg-velvet-dark border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              {/* Subtle background glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-velvet-accent/10 rounded-full blur-3xl pointer-events-none" />
              
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 text-velvet-muted hover:text-velvet-white transition-colors p-2"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-velvet-accent/10 rounded-full flex items-center justify-center mb-6 border border-velvet-accent/20">
                  <ShieldCheck size={32} className="text-velvet-accent" />
                </div>

                <h2 className="font-heading text-2xl tracking-[0.2em] text-velvet-white mb-4 uppercase">
                  Privacy First
                </h2>

                <div className="space-y-4 text-sm text-velvet-muted leading-relaxed tracking-wide">
                  <p>
                    At <span className="text-velvet-white font-medium uppercase tracking-widest text-[10px]">Velvet Syndicate</span>, your anonymity is our priority.
                  </p>
                  
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-left flex gap-3 items-start">
                    <Lock size={18} className="text-velvet-accent shrink-0 mt-0.5" />
                    <p className="text-[12px]">
                      No one can see your personal info or browsing choices until you choose to add items to your cart or place an order.
                    </p>
                  </div>

                  <p className="text-[12px]">
                    Even after purchase, your specific order details and personal identity remain completely private and are never shared with others.
                  </p>
                </div>

                <button
                  onClick={handleClose}
                  className="mt-8 w-full py-4 bg-white text-black rounded-xl text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-velvet-accent transition-all duration-300 active:scale-95"
                >
                  I Understand
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
