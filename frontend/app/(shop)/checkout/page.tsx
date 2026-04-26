'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatPrice } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    address: '',
    city: '',
    zip: '',
  })

  // Protected route logic
  useEffect(() => {
    if (!user) {
      router.replace('/login?message=authentication is required&redirect=/checkout')
    }
    if (items.length === 0) {
      router.replace('/collection')
    }
  }, [user, items, router])

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          shippingAddress: `${formData.address}, ${formData.city}, ${formData.zip}`,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        alert('Order placed successfully. The Syndicate awaits.')
        clearCart()
        router.push('/collection')
      } else {
        alert(data.error || 'Failed to place order')
      }
    } catch (error) {
      alert('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user || items.length === 0) return null

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left: Shipping Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
        >
          <h1 className="font-heading text-4xl tracking-widest mb-12 uppercase text-velvet-white">Shipping</h1>
          
          <form onSubmit={handlePlaceOrder} className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                disabled
              />
            </div>
            
            <Input
              label="Street Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. 123 Silent Street"
              required
            />
            
            <div className="grid grid-cols-2 gap-6">
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
              <Input
                label="Zip / Postal Code"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                required
              />
            </div>

            <div className="pt-8">
              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                isLoading={isSubmitting}
              >
                Complete Selection
              </Button>
            </div>
          </form>
        </motion.div>

        {/* Right: Order Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1], delay: 0.2 }}
          className="bg-velvet-card p-12 h-fit border border-white/5"
        >
          <h2 className="font-heading text-2xl tracking-widest mb-8 uppercase text-velvet-white">Your Selection</h2>
          
          <div className="space-y-6 mb-12">
            {items.map((item) => (
              <div key={`${item.id}-${item.variantId}-${item.size}`} className="flex gap-4">
                <div className="w-20 h-20 bg-velvet-black overflow-hidden flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-sm text-velvet-white">{item.name}</h3>
                  <p className="text-[10px] text-velvet-muted uppercase tracking-widest mt-1">
                    {item.variantName} / Size {item.size}
                  </p>
                  <p className="text-xs text-velvet-accent mt-2">{formatPrice(item.price)} x {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-6 space-y-4">
            <div className="flex justify-between text-velvet-muted uppercase tracking-widest text-[10px]">
              <span>Subtotal</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-velvet-muted uppercase tracking-widest text-[10px]">
              <span>Shipping</span>
              <span className="italic">Complimentary</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-white/5">
              <span className="font-heading text-xl text-velvet-white tracking-widest uppercase">Total</span>
              <span className="font-heading text-2xl text-velvet-white">{formatPrice(totalPrice)}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
