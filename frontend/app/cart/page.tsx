'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCartStore, CartItem } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, hasHydrated } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-velvet-black flex items-center justify-center">
        <div className="w-12 h-[1px] bg-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-velvet-white animate-loading-bar" />
        </div>
      </div>
    )
  }

  const handleQuantityChange = async (item: CartItem, newQuantity: number) => {
    if (newQuantity === 0) {
      handleRemoveItem(item)
      return
    }

    setIsLoading(true)
    try {
      await api.patch('/cart', { 
        productId: item.id, 
        variantId: item.variantId, 
        size: item.size, 
        quantity: newQuantity 
      })
      updateQuantity(item.id, item.variantId, item.size, newQuantity)
    } catch (error) {
      console.error('Failed to update quantity:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveItem = async (item: CartItem) => {
    setIsLoading(true)
    try {
      await api.delete(`/cart?productId=${item.id}&variantId=${item.variantId}&size=${item.size}`)
      removeItem(item.id, item.variantId, item.size)
    } catch (error) {
      console.error('Failed to remove item:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-velvet-black text-velvet-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-heading mb-4">Shopping Cart</h1>
          <p className="text-velvet-muted">
            {items.length === 0 ? 'Your cart is empty' : `${items.length} item${items.length !== 1 ? 's' : ''} in your cart`}
          </p>
        </motion.div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <ShoppingBag className="w-20 h-20 mx-auto mb-6 text-velvet-muted" />
            <h2 className="text-2xl font-heading mb-4">Your cart is empty</h2>
            <p className="text-velvet-muted mb-8">Add some products to get started</p>
            <Link href="/collection">
              <Button variant="primary" size="lg">
                Continue Shopping
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-velvet-black/50 border border-white/5 rounded-lg p-6"
                  >
                    <div className="flex gap-6">
                      <div className="relative w-24 h-24 bg-velvet-black rounded-lg overflow-hidden flex-shrink-0">
                        {item.image && (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-velvet-white mb-1">
                              {item.name}
                            </h3>
                            <p className="text-sm text-velvet-muted">
                              Size: {item.size} | Variant: {item.variantName || 'Standard'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item)}
                            className="text-velvet-muted hover:text-velvet-white transition-colors"
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleQuantityChange(item, item.quantity - 1)}
                              className="w-8 h-8 rounded border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors disabled:opacity-50"
                              disabled={isLoading || item.quantity <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(item, item.quantity + 1)}
                              className="w-8 h-8 rounded border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors disabled:opacity-50"
                              disabled={isLoading}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-medium text-velvet-white">
                              ${(item.price * item.quantity).toLocaleString()}
                            </p>
                            <p className="text-sm text-velvet-muted">
                              ${item.price.toLocaleString()} each
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-velvet-black/50 border border-white/5 rounded-lg p-6 sticky top-6"
              >
                <h2 className="text-xl font-heading mb-6">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-velvet-muted">
                    <span>Subtotal</span>
                    <span>${totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-velvet-muted">
                    <span>Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between text-lg font-medium text-velvet-white">
                      <span>Total</span>
                      <span>${totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {isAuthenticated ? (
                  <Link href="/checkout">
                    <Button variant="primary" size="lg" className="w-full">
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-velvet-muted text-center">
                      Please login to continue
                    </p>
                    <Link href="/login">
                      <Button variant="primary" size="lg" className="w-full">
                        Login to Checkout
                      </Button>
                    </Link>
                  </div>
                )}

                <Link href="/collection" className="block text-center mt-4 text-sm text-velvet-muted hover:text-velvet-white transition-colors">
                  Continue Shopping
                </Link>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
