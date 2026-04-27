'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, Users, ShoppingBag, IndianRupee, 
  TrendingUp, Repeat, Loader2, ArrowUpRight,
  Eye, MousePointerClick, ShoppingCart, Package
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface AnalyticsData {
  totalUsers: number
  totalOrders: number
  totalRevenue: number
  conversionRate: number
  topProducts: { productId: string; productName: string; totalOrdered: number; revenue: number }[]
  repeatUsers: number
  repeatUserRate: number
  avgOrderValue: number
  recentEvents: number
  eventBreakdown: { eventType: string; count: number }[]
}

const EVENT_ICONS: Record<string, any> = {
  VIEW_PRODUCT: Eye,
  ADD_TO_CART: ShoppingCart,
  CHECKOUT_STARTED: MousePointerClick,
  ORDER_CREATED: Package,
  RETURN_VISIT: Users,
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await apiFetch('/admin/analytics/overview')
        const result = await res.json()
        if (result.success) {
          setData(result.analytics)
        } else {
          throw new Error(result.error || 'Failed to load analytics')
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={32} className="text-velvet-accent animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Failed to load analytics'}</p>
          <p className="text-velvet-muted text-sm">Make sure you have admin access.</p>
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Total Users', value: data.totalUsers.toString(), icon: Users, color: 'text-blue-400' },
    { label: 'Total Orders', value: data.totalOrders.toString(), icon: ShoppingBag, color: 'text-emerald-400' },
    { label: 'Total Revenue', value: formatPrice(data.totalRevenue), icon: IndianRupee, color: 'text-amber-400' },
    { label: 'Avg Order Value', value: formatPrice(data.avgOrderValue), icon: TrendingUp, color: 'text-purple-400' },
    { label: 'Conversion Rate', value: `${data.conversionRate}%`, icon: BarChart3, color: 'text-cyan-400' },
    { label: 'Repeat Users', value: `${data.repeatUserRate}%`, icon: Repeat, color: 'text-pink-400' },
  ]

  return (
    <div className="min-h-screen bg-black pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <h1 className="text-4xl font-heading text-velvet-white tracking-wide mb-4">
            Analytics Dashboard
          </h1>
          <p className="text-velvet-muted">
            Real-time insights into your store performance.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-velvet-dark border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                    <Icon size={20} />
                  </div>
                  <ArrowUpRight size={16} className="text-velvet-muted" />
                </div>
                <div className="text-2xl font-heading text-velvet-white tracking-wide mb-1">
                  {stat.value}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-velvet-muted">
                  {stat.label}
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-velvet-dark border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-lg font-heading text-velvet-white tracking-wide mb-6 flex items-center gap-2">
              <ShoppingBag size={18} className="text-velvet-accent" /> Top Products
            </h2>
            {data.topProducts.length === 0 ? (
              <p className="text-velvet-muted text-sm">No order data yet.</p>
            ) : (
              <div className="space-y-4">
                {data.topProducts.map((product, idx) => (
                  <div key={product.productId} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-velvet-muted">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm text-velvet-white">{product.productName}</div>
                        <div className="text-[10px] text-velvet-muted uppercase tracking-widest">
                          {product.totalOrdered} units sold
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-velvet-accent">
                      {formatPrice(product.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Event Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-velvet-dark border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-lg font-heading text-velvet-white tracking-wide mb-6 flex items-center gap-2">
              <BarChart3 size={18} className="text-velvet-accent" /> Event Breakdown
            </h2>
            <div className="text-xs text-velvet-muted mb-4">
              {data.recentEvents} events in the last 7 days
            </div>
            {data.eventBreakdown.length === 0 ? (
              <p className="text-velvet-muted text-sm">No events tracked yet.</p>
            ) : (
              <div className="space-y-3">
                {data.eventBreakdown.map((event) => {
                  const Icon = EVENT_ICONS[event.eventType] || BarChart3
                  const maxCount = data.eventBreakdown[0]?.count || 1
                  const width = (event.count / maxCount) * 100
                  return (
                    <div key={event.eventType} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-velvet-white">
                          <Icon size={14} className="text-velvet-muted" />
                          {event.eventType.replace(/_/g, ' ')}
                        </div>
                        <span className="text-xs text-velvet-muted">{event.count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-velvet-accent/60 rounded-full transition-all duration-500"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
