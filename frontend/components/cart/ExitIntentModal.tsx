'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { X, Flame, ShieldAlert, Tag, ArrowRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { getFullImageUrl } from '@/lib/api'
import Image from 'next/image'

const SESSION_KEY = 'velvet_exit_intent_shown'

export function ExitIntentModal() {
  const router = useRouter()
  const pathname = usePathname()
  const { items, hasHydrated, closeCart } = useCartStore()
  const [isOpen, setIsOpen] = useState(false)
  const isTriggeredRef = useRef(false)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  const activeItemsCount = hasHydrated ? items.reduce((sum, i) => sum + i.quantity, 0) : 0
  const totalPrice = hasHydrated ? items.reduce((sum, i) => sum + i.price * i.quantity, 0) : 0
  const leadItem = items[0]

  const isCheckoutOrOrder = 
    pathname.startsWith('/checkout') || 
    pathname.startsWith('/orders') || 
    pathname.includes('/order-success')

  useEffect(() => {
    // Strictly do not trigger on checkout, order, or success pages, or if empty cart
    if (isCheckoutOrOrder || !hasHydrated || items.length === 0) return

    // Limit trigger to once per browser session
    try {
      if (sessionStorage.getItem(SESSION_KEY) === 'true') {
        isTriggeredRef.current = true
        return
      }
    } catch {
      // sessionStorage unavailable/private mode
    }

    const triggerModal = () => {
      if (isTriggeredRef.current) return
      isTriggeredRef.current = true
      try {
        sessionStorage.setItem(SESSION_KEY, 'true')
      } catch {}
      setIsOpen(true)
    }

    // 1. Desktop: Mouse leaves viewport towards top tab bar (clientY <= 10)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10) {
        triggerModal()
      }
    }

    // 2. Mobile: 45 seconds of cart inactivity or before unmount
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
      inactivityTimerRef.current = setTimeout(() => {
        triggerModal()
      }, 45000) // 45 seconds of inactivity
    }

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer, { passive: true })
    })

    // Start initial timer
    resetInactivityTimer()

    // Add mouseleave listener for desktop
    document.addEventListener('mouseleave', handleMouseLeave)

    // Handle visibility/unload on mobile
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && items.length > 0) {
        // Can be used to log or prep state
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer)
      })
    }
  }, [hasHydrated, items.length, pathname])

  if (isCheckoutOrOrder || !isOpen || items.length === 0) return null

  const handleSecurePair = () => {
    setIsOpen(false)
    closeCart()
    router.push('/checkout')
  }

  const handleDismiss = () => {
    setIsOpen(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 25 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-[#0D0D0D] border border-[#C9A961]/40 rounded-2xl p-6 md:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(201,169,97,0.15)] text-center overflow-hidden z-10"
          >
            {/* Top Gold Gradient Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C9A961] to-transparent opacity-80" />

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Scarcity Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C9A961]/10 border border-[#C9A961]/30 text-[#C9A961] text-[10px] uppercase font-bold tracking-widest mb-4">
              <Flame size={12} className="text-amber-400 animate-pulse" />
              Limited Allocation
            </div>

            {/* Headline */}
            <h2 className="font-heading text-2xl md:text-3xl text-velvet-white tracking-widest uppercase mb-3 leading-snug">
              YOUR DROP RESERVATION IS EXPIRING
            </h2>

            {/* Copy */}
            <p className="text-neutral-300 text-sm md:text-base leading-relaxed mb-6 font-light max-w-md mx-auto">
              Your selected size is currently held in high demand. Complete checkout now and unlock your{' '}
              <span className="text-[#C9A961] font-semibold underline underline-offset-4 decoration-[#C9A961]/50">
                ₹150 Syndicate Welcome credit
              </span>
              .
            </p>

            {/* Cart Preview Snapshot */}
            {leadItem && (
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3.5 mb-6 flex items-center gap-3.5 text-left">
                <div className="relative w-16 h-16 rounded-lg bg-neutral-900 border border-white/5 overflow-hidden flex-shrink-0">
                  <Image
                    src={getFullImageUrl(leadItem.image)}
                    alt={leadItem.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/images/placeholder-product.png'
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading text-white text-sm font-medium truncate">
                      {leadItem.name}
                    </p>
                    <span className="text-[#C9A961] text-xs font-mono font-bold whitespace-nowrap">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Size: <span className="text-neutral-200">UK {leadItem.size}</span>
                    {activeItemsCount > 1 && ` • +${activeItemsCount - 1} more item${activeItemsCount > 2 ? 's' : ''}`}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-emerald-400">
                    <Tag size={12} />
                    <span>₹150 welcome credit will apply automatically</span>
                  </div>
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="space-y-3">
              {/* Primary Gold Button */}
              <button
                onClick={handleSecurePair}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#D8BA73] via-[#C9A961] to-[#A8873E] text-black font-bold uppercase tracking-widest text-xs md:text-sm hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(201,169,97,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>SECURE MY PAIR NOW</span>
                <ArrowRight size={16} />
              </button>

              {/* Subtext button */}
              <button
                onClick={handleDismiss}
                className="w-full py-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors underline underline-offset-4 cursor-pointer font-light"
              >
                I&apos;ll risk missing out
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
