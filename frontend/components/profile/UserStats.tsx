'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarDays, IndianRupee, Package, Star } from 'lucide-react'
import { format } from 'date-fns'
import { formatPrice } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

interface UserStatsPayload {
  totalOrders: number
  totalSpent: number
  loyaltyPoints: number
  lastOrderDate: string | null
  lastOrderStatus: string | null
  lastActivity: string | null
  activeOrder: {
    id: string
    status: string
    total: number
    createdAt: string
  } | null
}

export function UserStats() {
  const [stats, setStats] = useState<UserStatsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchStats = async () => {
      try {
        const res = await apiFetch('/user/stats')
        const data = await res.json()
        if (!mounted) return
        if (data?.success) {
          setStats(data.data?.stats ?? null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchStats()
    return () => {
      mounted = false
    }
  }, [])

  if (loading || !stats) {
    return (
      <div className="bg-velvet-dark border border-white/10 rounded-2xl p-6 text-sm text-velvet-muted">
        Loading your purchase insights...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-velvet-dark border border-white/10 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-2">Total Orders</div>
          <div className="text-xl font-heading text-velvet-white flex items-center gap-2"><Package size={16} /> {stats.totalOrders}</div>
        </div>
        <div className="bg-velvet-dark border border-white/10 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-2">Total Spent</div>
          <div className="text-xl font-heading text-velvet-white flex items-center gap-1"><IndianRupee size={16} /> {formatPrice(stats.totalSpent)}</div>
        </div>
        <div className="bg-velvet-dark border border-white/10 rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-2">Loyalty Points</div>
          <div className="text-xl font-heading text-velvet-white flex items-center gap-2"><Star size={16} className="text-amber-300" /> {stats.loyaltyPoints}</div>
        </div>
      </div>

      <div className="bg-velvet-dark border border-white/10 rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-2">Last Order Date</div>
        <div className="text-sm text-velvet-white flex items-center gap-2">
          <CalendarDays size={14} />
          {stats.lastOrderDate ? format(new Date(stats.lastOrderDate), 'PPP') : 'No orders yet'}
        </div>
        {stats.lastActivity && (
          <div className="text-xs text-velvet-muted mt-2">
            Last activity: {format(new Date(stats.lastActivity), 'PPP')}
          </div>
        )}
      </div>

      {stats.activeOrder ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-500/10 border border-indigo-400/30 rounded-xl p-4"
        >
          <div className="flex justify-end">
            <Link
              href="/orders"
              className="text-[10px] uppercase tracking-widest px-4 py-3 rounded-lg border border-indigo-300/40 text-indigo-100 hover:bg-indigo-400/10"
            >
              Order History
            </Link>
          </div>
        </motion.div>
      ) : null}
    </div>
  )
}
