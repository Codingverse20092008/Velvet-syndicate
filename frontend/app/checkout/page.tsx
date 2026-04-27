'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useAddressStore } from '@/store/addressStore'
import { useOrderStore } from '@/store/orderStore'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { events } from '@/lib/analytics'
import { getVariant, trackABConversion } from '@/lib/ab-testing'
import { MapPin, Plus, Check, Loader2, AlertCircle } from 'lucide-react'
import { AddressModal } from '@/components/address/AddressModal'

function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart, version } = useCartStore()
  const { user, isLoading: authLoading } = useAuthStore()
  const { addresses, fetchAddresses, isLoading: addressesLoading } = useAddressStore()
  const { createOrder, isLoading: isSubmitting } = useOrderStore()
  
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const submitLockRef = useRef(false)
  const [ctaVariant] = useState(() => getVariant('checkout_cta', user?.id))

  useEffect(() => {
    if (user) {
      fetchAddresses()
    }
  }, [user, fetchAddresses])

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0]
      setSelectedAddressId(defaultAddr.id)
    }
  }, [addresses, selectedAddressId])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?redirect=/checkout')
      return
    }
    if (items.length === 0) {
      router.replace('/collection')
      return
    }
  }, [user, items, router, authLoading])

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || isSubmitting || submitLockRef.current) return
    submitLockRef.current = true
    setErrorMessage(null)
    
    try {
      events.checkoutStarted(idempotencyKey)

      const order = await createOrder(selectedAddressId, 'COD', {
        idempotencyKey,
        expectedVersion: version,
      })
      
      events.orderCreated(order.id, totalPrice)
      trackABConversion('checkout_cta', ctaVariant, 'ORDER_CREATED')
      clearCart()
      router.push(`/order-success?orderId=${encodeURIComponent(order.id)}`)
    } catch (error) {
      console.error('Order placement error:', error)
      events.orderFailed((error as Error).message)
      setErrorMessage((error as Error).message || 'Failed to place order. Please try again.')
    } finally {
      submitLockRef.current = false
    }
  }

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
            {addressesLoading && addresses.length === 0 ? (
              <div className="flex items-center gap-3 text-velvet-muted italic">
                <Loader2 size={16} className="animate-spin" />
                Loading addresses...
              </div>
            ) : addresses.length === 0 ? (
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
              disabled={!selectedAddressId || isSubmitting}
              className="w-full h-14" 
              size="lg" 
              isLoading={isSubmitting}
            >
              {isSubmitting ? 'Placing Order...' : `Place Order - ${formatPrice(totalPrice)}`}
            </Button>
            <p className="text-center text-xs text-velvet-muted mt-4">
              We will contact you shortly to confirm your order.
            </p>
            {!selectedAddressId && !addressesLoading && addresses.length > 0 && (
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
              {items.map((item) => (
                <div key={`${item.id}-${item.variantId}-${item.size}`} className="flex gap-4">
                  <div className="w-16 h-20 bg-velvet-black border border-white/5 overflow-hidden flex-shrink-0 rounded-lg">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-sm text-velvet-white truncate">{item.name}</h3>
                    <p className="text-[10px] text-velvet-muted uppercase tracking-widest mt-1">
                      {item.variantName} • Size {item.size}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-velvet-muted">{item.quantity} units</span>
                      <span className="text-xs font-medium text-velvet-accent">{formatPrice(item.price * item.quantity)}</span>
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
