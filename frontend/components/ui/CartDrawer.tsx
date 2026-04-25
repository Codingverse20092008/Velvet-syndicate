'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { Button } from './Button'
import { formatPrice } from '@/lib/utils'
import { X } from 'lucide-react'

export function CartDrawer() {
  const { items, isOpen, totalItems, totalPrice, closeCart, removeItem, updateQuantity } = useCartStore()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/80 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-velvet-dark z-50 border-l border-white/10"
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
                  className="p-2 text-velvet-muted hover:text-velvet-white transition-colors cursor-none"
                >
                  <X size={20} />
                </button>
              </div>

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
                        key={`${item.id}-${item.size}`}
                        className="flex gap-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <div className="w-24 h-24 bg-velvet-card overflow-hidden">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-heading text-base mb-1">{item.name}</h3>
                          <p className="text-sm text-velvet-muted mb-2">Size: {item.size}</p>
                          <p className="text-velvet-accent text-sm">{formatPrice(item.price)}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <button
                              onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                              className="w-8 h-8 border border-white/20 flex items-center justify-center text-velvet-muted hover:text-velvet-white hover:border-velvet-white transition-colors cursor-none"
                            >
                              -
                            </button>
                            <span className="text-sm w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                              className="w-8 h-8 border border-white/20 flex items-center justify-center text-velvet-muted hover:text-velvet-white hover:border-velvet-white transition-colors cursor-none"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeItem(item.id, item.size)}
                              className="ml-auto text-xs text-velvet-muted hover:text-velvet-white transition-colors cursor-none"
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
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/orders', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ shippingAddress: 'Default Address' }) // Mock address for now
                        })
                        const data = await res.json()
                        if (data.success) {
                          alert('Order placed successfully. Silence is yours.')
                          useCartStore.getState().clearCart()
                          closeCart()
                        } else {
                          alert(data.error || 'Failed to place order')
                        }
                      } catch (error) {
                        alert('An error occurred during checkout')
                      }
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
