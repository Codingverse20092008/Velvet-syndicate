'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, Users, ShoppingBag, IndianRupee, 
  TrendingUp, Repeat, Loader2, ArrowUpRight,
  Eye, MousePointerClick, ShoppingCart, Package,
  AlertTriangle, CheckCircle2, TrendingDown, Star,
  Lightbulb, MessageCircle
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

interface FunnelData {
  views: number
  addToCart: number
  checkoutStarted: number
  orders: number
  viewToCartRate: number
  cartToCheckoutRate: number
  checkoutToOrderRate: number
  overallConversionRate: number
  biggestDropoff: { stage: string; rate: number; dropoff: number }
  insights: { stage: string; severity: 'critical' | 'warning' | 'good'; recommendations: string[] }[]
}

interface ProductInsights {
  products: {
    productId: string
    productName: string | null
    views: number
    addToCart: number
    orders: number
    revenue: number
    viewToCartRate: number
    cartToOrderRate: number
    tag: 'problem' | 'opportunity' | 'star' | 'neutral'
  }[]
}

interface FeedbackSummary {
  total: number
  avgRating: number
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
  recentFeedback: { id: string; message: string; rating: string | null; page: string | null; createdAt: string }[]
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
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [productInsights, setProductInsights] = useState<ProductInsights | null>(null)
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAllAnalytics = async () => {
      try {
        const [overviewRes, funnelRes, productRes, feedbackRes] = await Promise.all([
          apiFetch('/admin/analytics/overview'),
          apiFetch('/admin/analytics/funnel'),
          apiFetch('/admin/analytics/product-insights'),
          apiFetch('/admin/analytics/feedback-summary'),
        ])

        const [overviewResult, funnelResult, productResult, feedbackResult] = await Promise.all([
          overviewRes.json(),
          funnelRes.json(),
          productRes.json(),
          feedbackRes.json(),
        ])

        if (overviewResult.success) setData(overviewResult.analytics)
        if (funnelResult.success) setFunnel(funnelResult.funnel)
        if (productResult.success) setProductInsights(productResult.productInsights)
        if (feedbackResult.success) setFeedbackSummary(feedbackResult.feedbackSummary)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAllAnalytics()
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
          <p className="text-velvet-muted text-sm mb-6">Make sure you have admin access.</p>
          <button 
            onClick={() => window.location.href = '/login?redirect=/admin/analytics'}
            className="px-6 py-3 bg-velvet-accent text-black rounded-xl text-sm font-medium hover:bg-velvet-accent/90"
          >
            Login Again
          </button>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Funnel Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-velvet-dark border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-lg font-heading text-velvet-white tracking-wide mb-6 flex items-center gap-2">
              <BarChart3 size={18} className="text-velvet-accent" /> Conversion Funnel
            </h2>
            {funnel ? (
              <>
                <div className="space-y-4 mb-6">
                  {[
                    { label: 'VIEW_PRODUCT', count: funnel.views, rate: 100, icon: Eye },
                    { label: 'ADD_TO_CART', count: funnel.addToCart, rate: funnel.viewToCartRate, icon: ShoppingCart },
                    { label: 'CHECKOUT_STARTED', count: funnel.checkoutStarted, rate: funnel.cartToCheckoutRate, icon: MousePointerClick },
                    { label: 'ORDER_CREATED', count: funnel.orders, rate: funnel.checkoutToOrderRate, icon: Package },
                  ].map((stage, idx) => {
                    const Icon = stage.icon
                    const prevCount = idx === 0 ? funnel.views : 
                      idx === 1 ? funnel.views : 
                      idx === 2 ? funnel.addToCart : funnel.checkoutStarted
                    const dropoff = idx === 0 ? 0 : prevCount - stage.count
                    const dropoffRate = prevCount > 0 ? ((dropoff / prevCount) * 100).toFixed(1) : '0'
                    const width = idx === 0 ? 100 : stage.rate
                    const isWorstDropoff = funnel.biggestDropoff.stage.includes(stage.label)
                    
                    return (
                      <div key={stage.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Icon size={14} className="text-velvet-muted" />
                            <span className="text-velvet-white">{stage.label.replace(/_/g, ' ')}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-velvet-muted">{stage.count}</span>
                            {idx > 0 && (
                              <span className={`text-xs ${isWorstDropoff ? 'text-red-400' : 'text-velvet-muted'}`}>
                                -{dropoffRate}% drop
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full h-8 bg-white/5 rounded-lg overflow-hidden relative">
                          <div 
                            className={`h-full bg-gradient-to-r ${isWorstDropoff ? 'from-red-500/20 to-red-500/40' : 'from-velvet-accent/20 to-velvet-accent/40'} rounded-lg transition-all duration-500`}
                            style={{ width: `${width}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-velvet-white">
                            {idx === 0 ? '100%' : `${stage.rate.toFixed(1)}%`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-velvet-muted">Overall Conversion</span>
                    <span className="text-lg font-bold text-velvet-white">{funnel.overallConversionRate.toFixed(2)}%</span>
                  </div>
                  <div className="text-[10px] text-velvet-muted mt-1">
                    From view to order
                  </div>
                </div>
              </>
            ) : (
              <p className="text-velvet-muted text-sm">Loading funnel data...</p>
            )}
          </motion.div>

          {/* Actionable Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-velvet-dark border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-lg font-heading text-velvet-white tracking-wide mb-6 flex items-center gap-2">
              <Lightbulb size={18} className="text-velvet-accent" /> Actionable Insights
            </h2>
            {funnel?.insights ? (
              <div className="space-y-4">
                {funnel.insights.map((insight, idx) => {
                  const Icon = insight.severity === 'critical' ? AlertTriangle :
                    insight.severity === 'warning' ? TrendingDown : CheckCircle2
                  const color = insight.severity === 'critical' ? 'text-red-400' :
                    insight.severity === 'warning' ? 'text-amber-400' : 'text-emerald-400'
                  const bgColor = insight.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                    insight.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                  
                  return (
                    <div key={idx} className={`p-4 rounded-xl border ${bgColor}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon size={16} className={color} />
                        <span className="text-sm font-medium text-velvet-white">{insight.stage}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {insight.recommendations.map((rec, rIdx) => (
                          <li key={rIdx} className="text-xs text-velvet-muted flex items-start gap-2">
                            <span className="text-velvet-accent">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-velvet-muted text-sm">Loading insights...</p>
            )}
          </motion.div>
        </div>

        {/* Product Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-velvet-dark border border-white/10 rounded-2xl p-8"
        >
          <h2 className="text-lg font-heading text-velvet-white tracking-wide mb-6 flex items-center gap-2">
            <Star size={18} className="text-velvet-accent" /> Product Insights
          </h2>
          {productInsights?.products && productInsights.products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 text-velvet-muted text-[10px] uppercase tracking-widest">Product</th>
                    <th className="text-right py-3 text-velvet-muted text-[10px] uppercase tracking-widest">Views</th>
                    <th className="text-right py-3 text-velvet-muted text-[10px] uppercase tracking-widest">→ Cart</th>
                    <th className="text-right py-3 text-velvet-muted text-[10px] uppercase tracking-widest">→ Order</th>
                    <th className="text-right py-3 text-velvet-muted text-[10px] uppercase tracking-widest">Revenue</th>
                    <th className="text-right py-3 text-velvet-muted text-[10px] uppercase tracking-widest">Tag</th>
                  </tr>
                </thead>
                <tbody>
                  {productInsights.products.map((p) => {
                    const tagColors = {
                      problem: 'bg-red-500/10 text-red-400 border-red-500/20',
                      opportunity: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      star: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                      neutral: 'bg-white/5 text-velvet-muted border-white/10',
                    }
                    const tagLabels = {
                      problem: 'Problem',
                      opportunity: 'Opportunity',
                      star: 'Star',
                      neutral: 'Neutral',
                    }
                    return (
                      <tr key={p.productId} className="border-b border-white/5 last:border-0">
                        <td className="py-3 text-velvet-white">{p.productName || p.productId.slice(0, 8)}</td>
                        <td className="py-3 text-right text-velvet-muted">{p.views}</td>
                        <td className="py-3 text-right text-velvet-muted">{p.viewToCartRate.toFixed(1)}%</td>
                        <td className="py-3 text-right text-velvet-muted">{p.cartToOrderRate.toFixed(1)}%</td>
                        <td className="py-3 text-right text-velvet-accent">{formatPrice(p.revenue)}</td>
                        <td className="py-3 text-right">
                          <span className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-widest border ${tagColors[p.tag]}`}>
                            {tagLabels[p.tag]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-velvet-muted text-sm">No product data yet. Need more views and orders.</p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Top Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-velvet-dark border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-lg font-heading text-velvet-white tracking-wide mb-6 flex items-center gap-2">
              <ShoppingBag size={18} className="text-velvet-accent" /> Top Products
            </h2>
            {data?.topProducts.length === 0 ? (
              <p className="text-velvet-muted text-sm">No order data yet.</p>
            ) : (
              <div className="space-y-4">
                {data?.topProducts.map((product, idx) => (
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
            transition={{ delay: 0.9 }}
            className="bg-velvet-dark border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-lg font-heading text-velvet-white tracking-wide mb-6 flex items-center gap-2">
              <BarChart3 size={18} className="text-velvet-accent" /> Event Breakdown
            </h2>
            <div className="text-xs text-velvet-muted mb-4">
              {data?.recentEvents} events in the last 7 days
            </div>
            {data?.eventBreakdown.length === 0 ? (
              <p className="text-velvet-muted text-sm">No events tracked yet.</p>
            ) : (
              <div className="space-y-3">
                {data?.eventBreakdown.map((event) => {
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

        {/* User Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-velvet-dark border border-white/10 rounded-2xl p-8"
        >
          <h2 className="text-lg font-heading text-velvet-white tracking-wide mb-6 flex items-center gap-2">
            <MessageCircle size={18} className="text-velvet-accent" /> User Feedback
          </h2>
          {feedbackSummary ? (
            <div className="space-y-6">
              {/* Rating Summary */}
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-4xl font-heading text-velvet-white mb-1">
                    {feedbackSummary.avgRating.toFixed(1)}
                  </div>
                  <div className="text-xs text-velvet-muted">Average Rating</div>
                </div>
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((num) => {
                    const count = feedbackSummary.ratingDistribution[num as keyof typeof feedbackSummary.ratingDistribution]
                    const maxCount = Math.max(...Object.values(feedbackSummary.ratingDistribution))
                    const width = maxCount > 0 ? (count / maxCount) * 100 : 0
                    return (
                      <div key={num} className="flex items-center gap-2">
                        <span className="text-xs text-velvet-muted w-4">{num}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-velvet-accent/60 rounded-full transition-all duration-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className="text-xs text-velvet-muted w-6 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent Feedback */}
              {feedbackSummary.recentFeedback.length > 0 ? (
                <div className="border-t border-white/10 pt-6">
                  <div className="text-xs text-velvet-muted mb-4">
                    {feedbackSummary.total} total feedback • {feedbackSummary.recentFeedback.length} recent
                  </div>
                  <div className="space-y-3">
                    {feedbackSummary.recentFeedback.map((fb) => (
                      <div key={fb.id} className="bg-black/40 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            {fb.rating && Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={i < parseInt(fb.rating || '0') ? 'fill-velvet-accent text-velvet-accent' : 'text-velvet-muted'}
                              />
                            ))}
                          </div>
                          <div className="text-[10px] text-velvet-muted">
                            {new Date(fb.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-sm text-velvet-white">{fb.message}</p>
                        {fb.page && (
                          <div className="text-[10px] text-velvet-muted mt-2">
                            From: {fb.page}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border-t border-white/10 pt-6 text-center">
                  <p className="text-velvet-muted text-sm">No feedback yet. Users can submit via the floating button.</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-velvet-muted text-sm">Loading feedback data...</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
