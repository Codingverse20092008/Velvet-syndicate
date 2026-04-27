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
          setActiveOrder(data.data?.activeOrder ?? null)
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

  return (
    <AnimatePresence>
      {activeOrder && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="relative z-30 border-b border-amber-300/25 bg-amber-500/10"
        >
          <div className="max-w-7xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-100 text-xs tracking-wide">
              <Truck size={14} />
              <span>You have an active order.</span>
              <span className="text-amber-200/80 uppercase text-[10px] tracking-widest">{activeOrder.status}</span>
            </div>
            <Link
              href={`/orders/${activeOrder.id}`}
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-amber-100 hover:text-white transition-colors"
            >
              <Package size={12} /> Track Order
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
