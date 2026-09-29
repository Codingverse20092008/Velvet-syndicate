'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, ShoppingCart, IndianRupee, Calendar } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export interface SalesDayData {
  date: string
  sales: number
  orders: number
}

interface SalesTrendChartProps {
  data?: SalesDayData[]
}

export function SalesTrendChart({ data = [] }: SalesTrendChartProps) {
  const [activeMetric, setActiveMetric] = useState<'sales' | 'orders'>('sales')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Ensure 7 days are always represented cleanly
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      const days = []
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        days.push({
          date: d.toISOString().split('T')[0],
          sales: 0,
          orders: 0,
        })
      }
      return days
    }
    return data
  }, [data])

  // Summary calculations
  const totalRevenue = useMemo(() => chartData.reduce((acc, d) => acc + (d.sales || 0), 0), [chartData])
  const totalOrders = useMemo(() => chartData.reduce((acc, d) => acc + (d.orders || 0), 0), [chartData])
  const peakDay = useMemo(() => {
    return chartData.reduce(
      (max, d) => (d[activeMetric] > max[activeMetric] ? d : max),
      chartData[0] || { date: '', sales: 0, orders: 0 }
    )
  }, [chartData, activeMetric])

  const avgDaily = useMemo(() => {
    const sum = activeMetric === 'sales' ? totalRevenue : totalOrders
    return Math.round(sum / Math.max(1, chartData.length))
  }, [activeMetric, totalRevenue, totalOrders, chartData.length])

  // Chart dimensions & plotting math
  const width = 800
  const height = 260
  const padding = { top: 25, right: 30, bottom: 45, left: 60 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxValue = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d[activeMetric]), 0)
    if (max === 0) return activeMetric === 'sales' ? 10000 : 10
    // Give 15% breathing room at the top
    return Math.ceil(max * 1.15)
  }, [chartData, activeMetric])

  // Generate coordinate points
  const points = useMemo(() => {
    if (chartData.length === 0) return []
    const step = chartW / Math.max(1, chartData.length - 1)
    return chartData.map((d, i) => {
      const val = d[activeMetric] || 0
      const x = padding.left + i * step
      const y = padding.top + chartH - (val / maxValue) * chartH
      return { x, y, data: d, index: i }
    })
  }, [chartData, activeMetric, chartW, chartH, padding.left, padding.top, maxValue])

  // Generate smooth cubic bezier curves path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' }
    if (points.length === 1) {
      const p = points[0]
      return {
        linePath: `M ${p.x} ${p.y}`,
        areaPath: `M ${p.x} ${p.y} L ${p.x} ${padding.top + chartH} Z`,
      }
    }

    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i]
      const next = points[i + 1]
      const controlX = (current.x + next.x) / 2
      d += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`
    }

    const last = points[points.length - 1]
    const first = points[0]
    const baseline = padding.top + chartH
    const area = `${d} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`

    return { linePath: d, areaPath: area }
  }, [points, chartH, padding.top])

  // Format axis date label (e.g. "Mon 29")
  const formatDateLabel = (isoDate: string) => {
    try {
      const parts = isoDate.split('-')
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
      }
    } catch {
      // fallback
    }
    return isoDate
  }

  // Y-axis ticks
  const yTicks = [0, 0.33, 0.66, 1].map((ratio) => {
    const value = Math.round(maxValue * ratio)
    const y = padding.top + chartH - ratio * chartH
    return { value, y }
  })

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null

  return (
    <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#C9A961]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header and Toggle Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C9A961] shadow-[0_0_8px_#C9A961]" />
            <h2 className="font-heading text-xl text-velvet-white tracking-wide">Sales & Revenue Trend</h2>
          </div>
          <p className="text-xs text-velvet-muted mt-1">7-Day performance telemetry and revenue trajectories.</p>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-black/60 border border-white/10 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMetric('sales')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMetric === 'sales'
                ? 'bg-[#C9A961] text-black shadow-md font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <IndianRupee size={12} />
            <span>Revenue (₹)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('orders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMetric === 'orders'
                ? 'bg-[#C9A961] text-black shadow-md font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShoppingCart size={12} />
            <span>Orders Count</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 relative z-10">
        <div className="bg-black/40 border border-white/5 rounded-xl p-3">
          <span className="text-[10px] uppercase tracking-widest text-velvet-muted block">7-Day Revenue</span>
          <span className="text-lg font-heading text-velvet-white font-bold mt-1 block">
            {formatPrice(totalRevenue)}
          </span>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-xl p-3">
          <span className="text-[10px] uppercase tracking-widest text-velvet-muted block">7-Day Volume</span>
          <span className="text-lg font-heading text-cyan-400 font-bold mt-1 block">
            {totalOrders} orders
          </span>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-xl p-3">
          <span className="text-[10px] uppercase tracking-widest text-velvet-muted block">Daily Run-Rate</span>
          <span className="text-lg font-heading text-[#C9A961] font-bold mt-1 block">
            {activeMetric === 'sales' ? formatPrice(avgDaily) : `${avgDaily} / day`}
          </span>
        </div>
        <div className="bg-black/40 border border-white/5 rounded-xl p-3">
          <span className="text-[10px] uppercase tracking-widest text-velvet-muted block">Period Peak</span>
          <span className="text-lg font-heading text-emerald-400 font-bold mt-1 block">
            {activeMetric === 'sales' ? formatPrice(peakDay.sales) : `${peakDay.orders} orders`}
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Area gradient under the bezier curve */}
            <linearGradient id="velvetAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C9A961" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#06B6D4" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
            </linearGradient>

            {/* Stroke gradient along curve */}
            <linearGradient id="velvetStrokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="45%" stopColor="#E6C875" />
              <stop offset="100%" stopColor="#C9A961" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid horizontal guidelines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="rgba(255, 255, 255, 0.07)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 12}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[10px] fill-neutral-500 font-mono"
              >
                {activeMetric === 'sales'
                  ? tick.value >= 1000
                    ? `₹${Math.round(tick.value / 1000)}k`
                    : `₹${tick.value}`
                  : tick.value}
              </text>
            </g>
          ))}

          {/* Bottom baseline */}
          <line
            x1={padding.left}
            y1={padding.top + chartH}
            x2={width - padding.right}
            y2={padding.top + chartH}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1"
          />

          {/* Smooth Area Path */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#velvetAreaGradient)"
              className="transition-all duration-500 ease-out"
            />
          )}

          {/* Smooth Stroke Path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#velvetStrokeGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#glow)"
              className="transition-all duration-500 ease-out"
            />
          )}

          {/* Crosshair guide line on hover */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={padding.top}
                x2={activePoint.x}
                y2={padding.top + chartH}
                stroke="#C9A961"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className="transition-all duration-150"
              />
            </g>
          )}

          {/* Interactive Node Dots */}
          {points.map((p, i) => {
            const isHovered = hoveredIndex === i
            return (
              <g key={i} className="cursor-pointer">
                {/* Hit area for easier touch/hover */}
                <rect
                  x={p.x - chartW / points.length / 2}
                  y={padding.top}
                  width={chartW / points.length}
                  height={chartH + padding.bottom}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(i)}
                />

                {/* Visible dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? '#C9A961' : '#111111'}
                  stroke={isHovered ? '#FFFFFF' : '#C9A961'}
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all duration-200"
                />

                {/* Outer pulsing ring on hover */}
                {isHovered && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={11}
                    fill="none"
                    stroke="#C9A961"
                    strokeOpacity="0.4"
                    strokeWidth="1.5"
                    className="animate-ping"
                  />
                )}

                {/* X-axis date text */}
                <text
                  x={p.x}
                  y={padding.top + chartH + 20}
                  textAnchor="middle"
                  className={`text-[10px] font-medium transition-colors ${
                    isHovered ? 'fill-[#C9A961] font-bold' : 'fill-neutral-400'
                  }`}
                >
                  {formatDateLabel(p.data.date)}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Dynamic Floating Tooltip */}
        <AnimatePresence>
          {activePoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              style={{
                left: `${(activePoint.x / width) * 100}%`,
                top: `${(activePoint.y / height) * 100}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-[120%] pointer-events-none z-30 min-w-[130px]"
            >
              <div className="bg-black/95 border border-[#C9A961]/40 rounded-xl p-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-md">
                <div className="flex items-center gap-1 text-[10px] text-neutral-400 mb-1">
                  <Calendar size={10} className="text-[#C9A961]" />
                  <span>{formatDateLabel(activePoint.data.date)}</span>
                </div>
                <div className="text-base font-heading font-bold text-white leading-tight">
                  {formatPrice(activePoint.data.sales)}
                </div>
                <div className="text-[10px] text-cyan-400 font-medium mt-0.5 flex items-center justify-between">
                  <span>{activePoint.data.orders} order{activePoint.data.orders !== 1 ? 's' : ''}</span>
                  {activePoint.data.sales > 0 && (
                    <span className="text-neutral-500">
                      avg ₹{Math.round(activePoint.data.sales / Math.max(1, activePoint.data.orders))}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-neutral-500 border-t border-white/5 pt-3 mt-2">
        <span className="flex items-center gap-1.5">
          <TrendingUp size={12} className="text-emerald-400" />
          <span>Real-time aggregation from verified order records</span>
        </span>
        <span className="text-neutral-400 font-mono">
          Updated: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
