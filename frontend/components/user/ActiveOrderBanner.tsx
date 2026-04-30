'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Truck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { apiFetch } from '@/lib/api'

interface ActiveOrder {
  id: string
  status: string
  total: number
  createdAt: string
}

export function ActiveOrderBanner() {
  const { isAuthenticated } = useAuthStore()
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveOrder(null)
      return
    }

    let mounted = true

    const fetchActiveOrder = async () => {
      try {
        const res = await apiFetch('/user/active-order')
        const data = await res.json()
        if (!mounted) return
        if (data?.success) {
          const order = data.data?.activeOrder ?? null
          setActiveOrder(order)
          if (order) setIsVisible(true)
        }
      } catch {
        if (mounted) setActiveOrder(null)
      }
    }

    fetchActiveOrder()
    const intervalId = window.setInterval(fetchActiveOrder, 25000)
    return () => {
      mounted = false
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!activeOrder) {
      setIsVisible(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsVisible(false)
    }, 6000)

    return () => window.clearTimeout(timeoutId)
  }, [activeOrder?.id])

  return (
    <AnimatePresence>
      {activeOrder && isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="fixed left-0 right-0 top-[72px] z-30 border-y border-amber-300/25 bg-black/90 shadow-lg shadow-black/30 backdrop-blur-xl"
        >
          <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-100 text-xs tracking-wide">
              <Truck size={14} />
              <span>You have an active order.</span>
              <span className="text-amber-200/80 uppercase text-[10px] tracking-widest">{activeOrder.status}</span>
            </div>
            <Link
              href={`/orders/${activeOrder.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/35 px-3 py-2 text-[10px] uppercase tracking-widest text-amber-100 transition-colors hover:bg-amber-300/10 hover:text-white"
            >
              <Package size={12} /> Track Order
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
