'use client'

import { useState, useEffect, Suspense, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useAddressStore } from '@/store/addressStore'
import { useOrderStore } from '@/store/orderStore'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { events } from '@/lib/analytics'
import { getVariant, trackABConversion } from '@/lib/ab-testing'
import { MapPin, Plus, Check, Loader2, AlertCircle } from 'lucide-react'
import { AddressModal } from '@/components/address/AddressModal'
import { checkoutLock } from '@/lib/checkout-lock'
import { OrderConfirmationAnimation } from '@/components/orders/OrderConfirmationAnimation'

function CheckoutPage() {
  const router = useRouter()
  const cartStore = useCartStore()
  const { items = [], clearCart, version, isProcessing: cartProcessing } = cartStore
  const { user, isLoading: authLoading } = useAuthStore()
  const addressStore = useAddressStore()
  const { addresses = [], fetchAddresses, isLoading: addressesLoading } = addressStore
  const { createOrder, isLoading: isSubmitting } = useOrderStore()
  
  const totalPrice = (items || []).reduce((sum, item) => sum + (item?.price || 0) * (item?.quantity || 0), 0)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // ENTERPRISE LOCK SYSTEM - Multiple layers of protection
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID())
  const [isLocked, setIsLocked] = useState(false)
  const submitLockRef = useRef(false)
  const orderInProgressRef = useRef(false)
  const [ctaVariant] = useState(() => getVariant('checkout_cta', user?.id))

  // FREEZE CART STATE DURING CHECKOUT - Prevent sync mutations
  const frozenCartRef = useRef<{ items: typeof items; version: number } | null>(null)

  useEffect(() => {
    if (user && !orderInProgressRef.current) {
      fetchAddresses()
    }
  }, [user, fetchAddresses])

  useEffect(() => {
    if ((addresses || []).length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0]
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id)
      }
    }
  }, [addresses, selectedAddressId])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?redirect=/checkout')
      return
    }
    if ((items || []).length === 0) {
      router.replace('/collection')
      return
    }
  }, [user, items, router, authLoading])

  // 🛡️ BULLETPROOF LOCKING SYSTEM
  const isExecutingRef = useRef(false)
  const lastExecutionTimeRef = useRef(0)

  const handlePlaceOrder = useCallback(async () => {
    // 1. ATOMIC LOCK CHECK - Pure execution lock
    if (isExecutingRef.current || isSubmitting || isLocked || cartProcessing) {
      console.log('🚫 EXECUTION BLOCKED: Request already in flight')
      return
    }

    if (!selectedAddressId) {
      setErrorMessage('Please select a shipping address')
      return
    }

    // 2. SET ALL LOCKS IMMEDIATELY (Synchronous)
    checkoutLock.lock() // 🔒 INSTANT GLOBAL LOCK
    isExecutingRef.current = true
    setIsLocked(true)
    setErrorMessage(null)
    
    // 3. LOCK GLOBAL CART STATE
    cartStore.setCheckoutInProgress(true)
    
    // 4. CAPTURE STATE FOR THIS ATOMIC EXECUTION
    const currentVersion = version
    const currentTotal = totalPrice
    const currentItemsCount = items.length
    
    console.log('🚀 ATOMIC CHECKOUT START', {
      idempotencyKey: idempotencyKeyRef.current,
      version: currentVersion
    })

    try {
      // 5. ATOMIC API CALL WITH RETRY & IDEMPOTENCY
      const order = await createOrder(selectedAddressId, 'COD', {
        idempotencyKey: idempotencyKeyRef.current,
        expectedVersion: currentVersion,
      })
      
      console.log('✅ ORDER SUCCESS', { orderId: order.id })

      // 6. ANALYTICS
      events.orderCreated(order.id, currentTotal)
      trackABConversion('checkout_cta', ctaVariant, 'checkout_success')

      // 7. BACKGROUND SYNC (Non-blocking)
      const selectedAddress = addresses.find(a => a.id === selectedAddressId)
      if (selectedAddress && (!user?.phone || !user?.address)) {
        apiFetch('/user/profile', {
          method: 'PATCH',
          body: JSON.stringify({
            phone: selectedAddress.phone,
            address: `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode}`
          })
        }).catch(() => {})
      }

      // 8. OPTIMIZED SUCCESS FLOW
      // We push the route FIRST to start the transition, then clear the local state
      // This prevents the "empty cart" flash during the redirect
      router.push(`/order-success?orderId=${encodeURIComponent(order.id)}`)
      
      // Delay clearing slightly to ensure navigation has started
      setTimeout(() => {
        clearCart()
      }, 500)
      
    } catch (error: any) {
      console.error('❌ ORDER EXECUTION FAILED:', error)
      
      // 9. RELEASE LOCKS ONLY ON FAILURE
      checkoutLock.unlock() // 🔓 RELEASE GLOBAL LOCK
      isExecutingRef.current = false
      setIsLocked(false)
      cartStore.setCheckoutInProgress(false)
      
      // 10. DETAILED ERROR HANDLING
      let msg = 'Failed to place order. Please try again.'
      if (error.status === 409) {
        msg = 'Your cart was modified in another tab or session. Please refresh and try again.'
        // Auto-trigger fetch to sync with reality
        setTimeout(() => cartStore.fetchCart(), 500)
      } else if (error.status === 400) {
        if (error.message?.includes('version') || error.message?.includes('modified')) {
          msg = 'Your cart was modified elsewhere. Please refresh and try again.'
          // Auto-trigger fetch to sync with reality
          setTimeout(() => cartStore.fetchCart(), 500)
        } else if (error.message?.includes('stock')) {
          msg = 'Some items are out of stock. Please update your cart.'
        } else {
          msg = error.message || msg
        }
      } else if (error.status === 401) {
        msg = 'Session expired. Please login again.'
        router.push('/login?redirect=/checkout')
      } else if (error.status >= 500) {
        msg = 'Server is currently busy. Please wait a moment and try again.'
      }
      
      setErrorMessage(msg)
      events.orderFailed(msg)
    }
  }, [
    selectedAddressId, 
    isSubmitting, 
    isLocked, 
    cartProcessing, 
    items, 
    version, 
    totalPrice, 
    createOrder, 
    cartStore, 
    router, 
    addresses, 
    user, 
    ctaVariant
  ])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-velvet-accent animate-spin" />
      </div>
    )
  }

  if (!user || items.length === 0) return null

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
        {/* Left: Address Selection */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3"
        >
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="font-heading text-4xl tracking-widest uppercase text-velvet-white">Shipping</h1>
              <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full border border-amber-300/30 bg-amber-400/10 text-amber-200 text-[10px] uppercase tracking-widest">
                Cash on Delivery Only
              </div>
            </div>
            <button
              onClick={() => setIsAddressModalOpen(true)}
              className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-velvet-accent hover:text-velvet-white transition-colors"
            >
              <Plus size={14} /> New Address
            </button>
          </div>
          
          <div className="space-y-4">
            {addressesLoading && (addresses || []).length === 0 ? (
              <div className="flex items-center gap-3 text-velvet-muted italic">
                <Loader2 size={16} className="animate-spin" />
                Loading addresses...
              </div>
            ) : (addresses || []).length === 0 ? (
              <div className="p-12 border border-dashed border-white/10 rounded-2xl flex flex-col items-center text-center">
                <MapPin size={32} className="text-velvet-muted mb-4" />
                <p className="text-velvet-muted mb-6">No saved addresses found.</p>
                <Button onClick={() => setIsAddressModalOpen(true)}>Add your first address</Button>
              </div>
            ) : (
              addresses.map((address) => (
                <div
                  key={address.id}
                  onClick={() => setSelectedAddressId(address.id)}
                  className={`group relative p-6 bg-velvet-dark border rounded-2xl cursor-pointer transition-all duration-300 ${
                    selectedAddressId === address.id 
                      ? 'border-velvet-accent bg-velvet-accent/5' 
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-heading text-velvet-white tracking-wide">{address.name}</span>
                        {address.isDefault && (
                          <span className="text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 bg-white/5 text-velvet-muted rounded">Default</span>
                        )}
                      </div>
                      <p className="text-sm text-velvet-muted leading-relaxed">
                        {address.street}, {address.city}, {address.state} - {address.pincode}
                      </p>
                      <p className="text-xs text-velvet-muted pt-1">{address.phone}</p>
                    </div>
                    {selectedAddressId === address.id && (
                      <div className="w-6 h-6 rounded-full bg-velvet-accent flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-12">
            <Button 
              onClick={handlePlaceOrder}
              disabled={
                !selectedAddressId || 
                isSubmitting || 
                isLocked || 
                orderInProgressRef.current ||
                cartProcessing
              }
              className="w-full h-14" 
              size="lg" 
              isLoading={isSubmitting || isLocked || cartProcessing}
            >
              {(isSubmitting || isLocked || cartProcessing) ? 'Processing Order...' : `Place Order - ${formatPrice(totalPrice)}`}
            </Button>
            <p className="text-center text-xs text-velvet-muted mt-4">
              We will contact you shortly to confirm your order.
            </p>
            {!selectedAddressId && !addressesLoading && (addresses || []).length > 0 && (
              <p className="text-center text-xs text-red-400 mt-4 flex items-center justify-center gap-2">
                <AlertCircle size={14} /> Please select a shipping address
              </p>
            )}
            {errorMessage && (
              <p className="text-center text-xs text-red-400 mt-4 flex items-center justify-center gap-2">
                <AlertCircle size={14} /> {errorMessage}
              </p>
            )}
          </div>
        </motion.div>

        {/* Right: Order Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className="bg-velvet-card p-12 h-fit border border-white/5 sticky top-32">
            <h2 className="font-heading text-2xl tracking-widest mb-8 uppercase text-velvet-white border-b border-white/5 pb-4">Order Summary</h2>
            
            <div className="space-y-6 mb-12 max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar">
              {(items || []).filter(item => item && item.id).map((item) => (
                <div key={`${item.id}-${item.variantId}-${item.size}`} className="flex gap-4">
                  <div className="w-16 h-20 bg-velvet-black border border-white/5 overflow-hidden flex-shrink-0 rounded-lg">
                    <img src={item.image || '/images/placeholder-product.png'} alt={item.name || 'Product'} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-sm text-velvet-white truncate">{item.name || 'Unknown Product'}</h3>
                    <p className="text-[10px] text-velvet-muted uppercase tracking-widest mt-1">
                      {item.variantName || 'Standard'} • Size {item.size || 'N/A'}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-velvet-muted">{item.quantity || 0} units</span>
                      <span className="text-xs font-medium text-velvet-accent">{formatPrice((item.price || 0) * (item.quantity || 0))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="flex justify-between text-velvet-muted uppercase tracking-widest text-[10px]">
                <span>Subtotal</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-velvet-muted uppercase tracking-widest text-[10px]">
                <span>Shipping</span>
                <span className="text-emerald-400">Complimentary</span>
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-white/10">
                <span className="font-heading text-xl text-velvet-white tracking-widest uppercase">Total</span>
                <span className="font-heading text-2xl text-velvet-white">{formatPrice(totalPrice)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <AddressModal 
        isOpen={isAddressModalOpen} 
        onClose={() => setIsAddressModalOpen(false)} 
      />

      <AnimatePresence>
        {(isLocked || isSubmitting) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md border border-white/10 bg-velvet-card px-6 py-10 text-center shadow-2xl"
            >
              <OrderConfirmationAnimation state="processing" />
              <h2 className="mt-8 font-heading text-2xl uppercase tracking-widest text-velvet-white">
                Confirming Your Order
              </h2>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-velvet-muted">
                Please keep this page open while we reserve your items and confirm Cash on Delivery.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


export default function Checkout() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center animate-pulse uppercase tracking-widest text-velvet-muted">Entering Secure Vault...</div>}>
      <ErrorBoundary>
        <CheckoutPage />
      </ErrorBoundary>
    </Suspense>
  )
}
