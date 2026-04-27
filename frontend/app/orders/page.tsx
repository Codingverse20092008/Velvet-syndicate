'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, Loader2, Package } from 'lucide-react'
import { useOrderStore } from '@/store/orderStore'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { OrderCard } from '@/components/orders/OrderCard'

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { orders, fetchOrders, isLoading: ordersLoading } = useOrderStore()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/orders')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated, fetchOrders])

  if (authLoading || (isAuthenticated && ordersLoading && orders.length === 0)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={32} className="text-velvet-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-12">
          <h1 className="text-4xl font-heading text-velvet-white tracking-wide mb-4">
            Order History
          </h1>
          <p className="text-velvet-muted">
            Track your recent orders and view your purchase history.
          </p>
        </div>

        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <ShoppingBag size={32} className="text-velvet-muted" />
            </div>
            <h3 className="text-xl font-heading text-velvet-white mb-2">No orders found</h3>
            <p className="text-velvet-muted mb-8 text-center max-w-sm">
              You haven't placed any orders yet. Once you do, they will appear here.
            </p>
            <button
              onClick={() => router.push('/products')}
              className="px-8 py-3 bg-white text-black rounded-full text-xs uppercase tracking-widest font-bold hover:bg-opacity-90 transition-all duration-300"
            >
              Start Shopping
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
