'use client'

import { useEffect } from 'react'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, PackageCheck, Star } from 'lucide-react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { formatPrice } from '@/lib/utils'
import { useOrderStore } from '@/store/orderStore'
import { Button } from '@/components/ui/Button'
import { ProductCard } from '@/components/product/ProductCard'
import { apiFetch } from '@/lib/api'
import { useState } from 'react'

interface SuggestionProduct {
  id: string
  name: string
  slug: string
  price: number
  imageUrl: string
}

function OrderSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const { currentOrder, isLoading, error, fetchOrderById } = useOrderStore()
  const [suggestions, setSuggestions] = useState<SuggestionProduct[]>([])

  useEffect(() => {
    if (!orderId) {
      router.replace('/orders')
      return
    }
    fetchOrderById(orderId)
  }, [orderId, fetchOrderById, router])

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await apiFetch('/user/recommendations?limit=3')
        const data = await res.json()
        if (data?.success) {
          const recommended = data.data?.recommendations?.mayAlsoLike ?? []
          setSuggestions(recommended.slice(0, 3))
        }
      } catch {
        setSuggestions([])
      }
    }
    fetchSuggestions()
  }, [])

  if (isLoading || !orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-velvet-accent animate-spin" />
      </div>
    )
  }

  if (error || !currentOrder || currentOrder.id !== orderId) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 max-w-3xl mx-auto flex items-center">
        <div className="w-full bg-velvet-card border border-white/10 rounded-2xl p-10 text-center">
          <h1 className="font-heading text-2xl tracking-widest uppercase text-velvet-white">Order Placed</h1>
          <p className="text-velvet-muted mt-4">
            We could not load full order details right now, but your order has been received.
          </p>
          <div className="mt-8">
            <Button onClick={() => router.push('/orders')}>Go to My Orders</Button>
          </div>
        </div>
      </div>
    )
  }

  const orderTotal = Number(currentOrder.total ?? currentOrder.totalAmount ?? 0)
  const pointsEarned = Math.floor(orderTotal / 100)

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-velvet-card border border-white/10 rounded-2xl p-10"
      >
        <div className="flex items-center gap-3 mb-6">
          <PackageCheck className="text-emerald-400" size={28} />
          <h1 className="font-heading text-3xl tracking-widest uppercase text-velvet-white">Order Confirmed</h1>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between border-b border-white/5 pb-3">
            <span className="text-velvet-muted uppercase tracking-widest text-[11px]">Order ID</span>
            <span className="text-velvet-white">{currentOrder.id}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-3">
            <span className="text-velvet-muted uppercase tracking-widest text-[11px]">Payment Method</span>
            <span className="text-velvet-white">Cash on Delivery</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-3">
            <span className="text-velvet-muted uppercase tracking-widest text-[11px]">Order Total</span>
            <span className="text-velvet-white">{formatPrice(orderTotal)}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-3">
            <span className="text-velvet-muted uppercase tracking-widest text-[11px]">Order Status</span>
            <span className="text-velvet-white">{currentOrder.status}</span>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-amber-300/25 bg-amber-500/10 px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-amber-100">You earned {pointsEarned} loyalty points from this order.</div>
          <Star size={16} className="text-amber-300" />
        </div>

        <p className="text-velvet-muted mt-8 leading-relaxed">
          Your order will be shipped soon. Please keep the exact amount ready at delivery time for Cash on Delivery.
        </p>

        <div className="mt-8 flex gap-3">
          <Button onClick={() => router.push(`/orders/${currentOrder.id}`)}>Track Your Order</Button>
          <Button variant="secondary" onClick={() => router.push('/collection')}>Continue Shopping</Button>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-velvet-dark px-4 py-3 text-sm text-velvet-white">
            Pay only when your order arrives.
          </div>
          <div className="rounded-xl border border-white/10 bg-velvet-dark px-4 py-3 text-sm text-velvet-white">
            Easy returns available.
          </div>
        </div>
      </motion.div>

      {suggestions.length > 0 && (
        <section className="mt-14">
          <h2 className="font-heading text-2xl text-velvet-white mb-6">You May Also Like</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {suggestions.map((product, index) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                slug={product.slug}
                price={product.price}
                image={product.imageUrl}
                index={index}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default function OrderSuccess() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="text-velvet-accent animate-spin" /></div>}>
      <ErrorBoundary>
        <OrderSuccessPage />
      </ErrorBoundary>
    </Suspense>
  )
}
