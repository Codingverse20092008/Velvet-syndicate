'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from './Button'
import { formatPrice } from '@/lib/utils'
import { getFullImageUrl } from '@/lib/api'
import Image from 'next/image'
import { X, Flame } from 'lucide-react'

import { useRouter } from 'next/navigation'

export function CartDrawer() {
  const router = useRouter()
  const { items, isOpen, closeCart, removeItem, updateQuantity, hasHydrated } = useCartStore()
  const totalItems = hasHydrated ? items.reduce((sum, item) => sum + item.quantity, 0) : 0
  const totalPrice = hasHydrated ? items.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()

  // Stock Reservation Timer
  const [timeLeft, setTimeLeft] = useState<string>('14:59')

  useEffect(() => {
    if (!hasHydrated) return

    if (items.length === 0) {
      try {
        localStorage.removeItem('velvet_cart_reservation_expiry')
      } catch {}
      setTimeLeft('14:59')
      return
    }

    const HOLD_DURATION_MS = 15 * 60 * 1000 // 15 minutes
    let expiry = 0

    try {
      const savedExpiry = localStorage.getItem('velvet_cart_reservation_expiry')
      if (savedExpiry) {
        const parsed = parseInt(savedExpiry, 10)
        if (!isNaN(parsed) && parsed > Date.now()) {
          expiry = parsed
        }
      }
    } catch {}

    if (!expiry) {
      expiry = Date.now() + HOLD_DURATION_MS
      try {
        localStorage.setItem('velvet_cart_reservation_expiry', expiry.toString())
      } catch {}
    }

    const updateTimer = () => {
      const remaining = Math.max(0, expiry - Date.now())
      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [hasHydrated, items.length])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/80 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-velvet-dark z-[100] border-l border-white/10"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: [0.215, 0.61, 0.355, 1] }}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="font-heading text-xl font-normal tracking-wide">
                  Your Selection ({totalItems})
                </h2>
                <button
                  onClick={closeCart}
                  className="p-2 text-velvet-muted hover:text-velvet-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Stock Reservation Ribbon */}
              {items.length > 0 && (
                <div className="bg-[#14120B] border-b border-[#C9A961]/25 px-5 py-2.5 flex items-center justify-between text-xs">
                  <span className="text-[#C9A961] flex items-center gap-1.5 font-medium tracking-wide">
                    <Flame size={13} className="text-amber-400" />
                    High Demand: Sneaker allocation reserved for
                  </span>
                  <span className="font-mono font-bold text-amber-200 bg-[#C9A961]/15 border border-[#C9A961]/40 px-2 py-0.5 rounded text-[11px] tracking-wider shadow-inner">
                    [ {timeLeft} ]
                  </span>
                </div>
              )}

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-6">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-velvet-muted font-light mb-4 italic tracking-widest text-sm uppercase">Your silence is empty.</p>
                    <Button variant="outline" size="sm" onClick={closeCart} className="mt-4">
                      Explore the Vault
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                      {items.map((item) => (
                      <motion.div
                        key={`${item.id}-${item.variantId}-${item.size}`}
                        className="flex gap-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <div className="relative w-24 h-24 aspect-square bg-neutral-900 rounded overflow-hidden shrink-0">
                          <Image 
                            src={getFullImageUrl(item.image)} 
                            alt={item.name} 
                            fill
                            sizes="96px"
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/images/placeholder-product.png'
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-heading text-base mb-1">{item.name}</h3>
                          {item.variantName && (
                            <p className="text-[10px] uppercase tracking-widest text-velvet-accent mb-1">{item.variantName}</p>
                          )}
                          <p className="text-sm text-velvet-muted mb-2">Size: {item.size}</p>
                          <p className="text-velvet-accent text-sm">{formatPrice(item.price)}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <button
                              onClick={() => updateQuantity(item.id, item.variantId, item.size, item.quantity - 1)}
                              className="w-8 h-8 border border-white/20 flex items-center justify-center text-velvet-muted hover:text-velvet-white hover:border-velvet-white transition-colors"
                            >
                              -
                            </button>
                            <span className="text-sm w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.variantId, item.size, item.quantity + 1)}
                              className="w-8 h-8 border border-white/20 flex items-center justify-center text-velvet-muted hover:text-velvet-white hover:border-velvet-white transition-colors"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeItem(item.id, item.variantId, item.size)}
                              className="ml-auto text-xs text-velvet-muted hover:text-velvet-white transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="border-t border-white/10 p-6 space-y-4 bg-velvet-black/40 backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <span className="text-velvet-muted tracking-widest text-xs uppercase">Subtotal</span>
                    <span className="font-heading text-xl">{formatPrice(totalPrice)}</span>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg"
                    isLoading={authLoading}
                    onClick={() => {
                      if (isAuthenticated) {
                        router.push('/order-secure')
                      } else {
                        router.push('/login?redirect=/order-secure')
                      }
                      closeCart()
                    }}
                  >
                    Proceed to Checkout
                  </Button>

                </div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
