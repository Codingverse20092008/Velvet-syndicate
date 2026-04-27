'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarDays, DollarSign, Package, ShoppingBag } from 'lucide-react'
import { useAdminStore } from '@/store/adminStore'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { formatPrice } from '@/lib/utils'

export default function AdminOverviewPage() {
  const { stats, isLoading, fetchOverview } = useAdminStore()

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">Dashboard</h1>
        <p className="text-velvet-muted text-sm mt-2">COD operations, order velocity, and immediate actions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Total Orders</div>
              <div className="text-3xl font-heading text-velvet-white mt-2">{stats?.totalOrders ?? 0}</div>
            </div>
            <ShoppingBag className="text-velvet-accent" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Total Revenue</div>
              <div className="text-3xl font-heading text-velvet-white mt-2">{formatPrice(stats?.totalRevenue ?? 0)}</div>
            </div>
            <DollarSign className="text-emerald-400" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Pending Orders</div>
              <div className="text-3xl font-heading text-velvet-white mt-2">{stats?.pendingOrders ?? 0}</div>
            </div>
            <Package className="text-amber-400" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Orders Today</div>
              <div className="text-3xl font-heading text-velvet-white mt-2">{stats?.ordersToday ?? 0}</div>
            </div>
            <CalendarDays className="text-sky-400" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Revenue Today</div>
              <div className="text-3xl font-heading text-velvet-white mt-2">{formatPrice(stats?.revenueToday ?? 0)}</div>
            </div>
            <DollarSign className="text-cyan-400" />
          </div>
        </motion.div>
      </div>

      <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-heading text-xl text-velvet-white tracking-wide">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs uppercase tracking-widest text-velvet-accent hover:text-velvet-white transition-colors">
            View all
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {(stats?.recentOrders ?? []).map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.id}`} className="block px-6 py-4 hover:bg-white/5 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-velvet-white">#{order.id.slice(0, 8).toUpperCase()} - {order.customerName}</div>
                  <div className="text-xs text-velvet-muted mt-1">{order.phone} - {order.addressSnapshot.city || 'N/A'}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-velvet-white">{formatPrice(order.total)}</div>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </Link>
          ))}
          {!isLoading && (stats?.recentOrders?.length ?? 0) === 0 && (
            <div className="px-6 py-8 text-center text-sm text-velvet-muted">No recent orders yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
