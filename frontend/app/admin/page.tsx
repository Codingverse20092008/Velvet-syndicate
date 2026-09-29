'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  CalendarDays, 
  DollarSign, 
  Package, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react'
import { useAdminStore, AdminOrderStatus } from '@/store/adminStore'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { SalesTrendChart } from '@/components/admin/SalesTrendChart'
import { formatPrice } from '@/lib/utils'

export default function AdminDashboardPage() {
  const { stats, dashboardMetrics, isLoading, fetchOverview, fetchDashboardMetrics } = useAdminStore()

  useEffect(() => {
    fetchOverview()
    fetchDashboardMetrics()
  }, [fetchOverview, fetchDashboardMetrics])

  const metrics = dashboardMetrics || {
    totalUsers: 0,
    newUsersToday: 0,
    totalProfit: 0,
    profitToday: 0,
    profitMargin: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    salesGrowth: 0,
    totalLoyaltyPoints: 0,
    pointsRedeemed: 0,
    topProducts: [],
    salesByDay: [],
    ordersByStatus: {
      PENDING: 0,
      CONFIRMED: 0,
      SHIPPED: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">Admin Dashboard</h1>
          <p className="text-velvet-muted text-sm mt-2">Sales, profit, users, and loyalty overview.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-velvet-muted">
          <Clock size={12} />
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>

      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Total Sales</div>
              <div className="text-3xl font-heading text-velvet-white mt-2">{formatPrice(stats?.totalRevenue ?? 0)}</div>
              <div className="flex items-center gap-1 mt-1">
                {metrics.salesGrowth >= 0 ? (
                  <ArrowUpRight size={12} className="text-emerald-400" />
                ) : (
                  <ArrowDownRight size={12} className="text-red-400" />
                )}
                <span className={`text-[10px] ${metrics.salesGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {Math.abs(metrics.salesGrowth || 0)}% vs last month
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="text-emerald-400" size={20} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Net Profit</div>
              <div className="text-3xl font-heading text-velvet-white mt-2">{formatPrice(metrics.totalProfit ?? 0)}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-velvet-muted">{metrics.profitMargin || 0}% margin</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <TrendingUp className="text-cyan-400" size={20} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Total Users</div>
              <div className="text-3xl font-heading text-velvet-white mt-2">{metrics.totalUsers?.toLocaleString() ?? 0}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-emerald-400">+{metrics.newUsersToday || 0}</span>
                <span className="text-[10px] text-velvet-muted">new today</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Users className="text-violet-400" size={20} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Loyalty Points</div>
              <div className="text-3xl font-heading text-velvet-white mt-2">{(metrics.totalLoyaltyPoints ?? 0).toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-amber-400">{metrics.pointsRedeemed || 0}</span>
                <span className="text-[10px] text-velvet-muted">redeemed</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Award className="text-amber-400" size={20} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Visual Sales & Revenue Trend Chart */}
      <SalesTrendChart data={metrics.salesByDay} />

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-2">Today's Performance</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-velvet-muted">Sales Today</span>
              <span className="text-lg font-heading text-velvet-white">{formatPrice(stats?.revenueToday ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-velvet-muted">Profit Today</span>
              <span className="text-lg font-heading text-emerald-400">{formatPrice(metrics.profitToday ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-velvet-muted">Orders Today</span>
              <span className="text-lg font-heading text-velvet-white">{stats?.ordersToday ?? 0}</span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-2">Order Status</div>
          <div className="space-y-2">
            {Object.entries(metrics.ordersByStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status as AdminOrderStatus} />
                <span className="text-sm text-velvet-white font-heading">{count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-2">Key Metrics</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-velvet-muted">Avg Order Value</span>
              <span className="text-lg font-heading text-velvet-white">{formatPrice(metrics.avgOrderValue ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-velvet-muted">Conversion Rate</span>
              <span className="text-lg font-heading text-cyan-400">{metrics.conversionRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-velvet-muted">Pending Orders</span>
              <span className="text-lg font-heading text-amber-400">{stats?.pendingOrders ?? 0}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-heading text-xl text-velvet-white tracking-wide">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs uppercase tracking-widest text-velvet-accent hover:text-velvet-white transition-colors">
              View all
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {(stats?.recentOrders ?? []).slice(0, 5).map((order) => (
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

        {/* Top Products */}
        <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-heading text-xl text-velvet-white tracking-wide">Top Products</h2>
            <Link href="/admin/products" className="text-xs uppercase tracking-widest text-velvet-accent hover:text-velvet-white transition-colors">
              View all
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {(metrics.topProducts || []).slice(0, 5).map((product: any, idx: number) => (
              <div key={product.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-velvet-muted">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-sm text-velvet-white">{product.name}</div>
                    <div className="text-xs text-velvet-muted">{product.totalSold} sold</div>
                  </div>
                </div>
                <div className="text-sm text-emerald-400 font-heading">
                  {formatPrice(product.revenue)}
                </div>
              </div>
            ))}
            {(!metrics.topProducts || metrics.topProducts.length === 0) && (
              <div className="px-6 py-8 text-center text-sm text-velvet-muted">No sales data yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
