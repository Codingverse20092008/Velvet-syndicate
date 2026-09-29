'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { 
  Filter, 
  Search, 
  Calendar, 
  CreditCard, 
  X, 
  RefreshCw, 
  Clock,
  Layers,
  CheckCircle2,
  MessageSquare,
  Flame,
  ShoppingBag,
  ExternalLink,
  Phone,
  Mail,
  Check,
  RotateCcw
} from 'lucide-react'
import { useAdminStore, AdminOrderStatus, AbandonedCartLead } from '@/store/adminStore'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { formatPrice } from '@/lib/utils'

export type PaymentFilter = 'ALL' | 'COD' | 'ONLINE'
export type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'

const transitionOptions: Record<AdminOrderStatus, AdminOrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
}

function parseOrderDate(dateStr: string): Date {
  if (!dateStr) return new Date(0)
  if (dateStr.includes(' ') && !dateStr.includes('T')) {
    const parsed = new Date(dateStr.replace(' ', 'T') + 'Z')
    if (!isNaN(parsed.getTime())) return parsed
  }
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? new Date(0) : parsed
}

export default function AdminOrdersPage() {
  const { 
    orders, 
    isLoading, 
    fetchOrders, 
    updateOrderStatus, 
    error,
    abandonedCarts,
    fetchAbandonedCarts,
    markCartRecovered 
  } = useAdminStore()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Tabs: Active Orders vs Abandoned Carts
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'ABANDONED'>('ORDERS')
  const [abandonedFilter, setAbandonedFilter] = useState<'ALL' | 'UNRECOVERED' | 'RECOVERED'>('ALL')
  const [abandonedSearch, setAbandonedSearch] = useState('')

  // Enhanced Filters for Orders
  const [statusFilter, setStatusFilter] = useState<AdminOrderStatus | 'ALL'>('ALL')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL')
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchOrders()
    fetchAbandonedCarts()
  }, [fetchOrders, fetchAbandonedCarts])

  const rows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const now = new Date()

    return orders.filter((order) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false
      }

      // 2. Payment Mode Filter
      if (paymentFilter !== 'ALL') {
        const method = (order.paymentMethod || '').toUpperCase()
        if (paymentFilter === 'COD') {
          if (method !== 'COD') return false
        } else if (paymentFilter === 'ONLINE') {
          if (method === 'COD') return false
        }
      }

      // 3. Date Range / Quick Date Filter
      if (dateFilter !== 'ALL') {
        const orderDate = parseOrderDate(order.createdAt)
        if (dateFilter === 'TODAY') {
          const isToday = 
            orderDate.getFullYear() === now.getFullYear() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getDate() === now.getDate()
          if (!isToday) return false
        } else if (dateFilter === 'WEEK') {
          const weekAgo = new Date(now)
          weekAgo.setDate(now.getDate() - 7)
          weekAgo.setHours(0, 0, 0, 0)
          if (orderDate < weekAgo) return false
        } else if (dateFilter === 'MONTH') {
          const monthAgo = new Date(now)
          monthAgo.setDate(now.getDate() - 30)
          monthAgo.setHours(0, 0, 0, 0)
          if (orderDate < monthAgo) return false
        }
      }

      // 4. Phone, Order ID, or Customer Name instant search
      if (query) {
        const orderId = order.id.toLowerCase()
        const phone = (order.phone || '').toLowerCase()
        const customerName = (order.customerName || '').toLowerCase()
        if (!orderId.includes(query) && !phone.includes(query) && !customerName.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [orders, searchQuery, statusFilter, paymentFilter, dateFilter])

  const activeFiltersCount = 
    (statusFilter !== 'ALL' ? 1 : 0) + 
    (paymentFilter !== 'ALL' ? 1 : 0) + 
    (dateFilter !== 'ALL' ? 1 : 0) + 
    (searchQuery.trim() ? 1 : 0)

  const filteredTotalValue = useMemo(() => {
    return rows.reduce((acc, order) => acc + (order.total || 0), 0)
  }, [rows])

  const resetFilters = () => {
    setStatusFilter('ALL')
    setPaymentFilter('ALL')
    setDateFilter('ALL')
    setSearchQuery('')
  }

  const handleStatusUpdate = async (orderId: string, nextStatus: AdminOrderStatus) => {
    const confirmed = window.confirm(`Update order status to ${nextStatus}?`)
    if (!confirmed) return

    setUpdatingId(orderId)
    try {
      await updateOrderStatus(orderId, nextStatus)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredAbandoned = useMemo(() => {
    const q = abandonedSearch.trim().toLowerCase()
    return abandonedCarts.filter((lead) => {
      if (abandonedFilter === 'UNRECOVERED' && lead.recovered) return false
      if (abandonedFilter === 'RECOVERED' && !lead.recovered) return false
      if (q) {
        const phone = (lead.phone || '').toLowerCase()
        const email = (lead.email || '').toLowerCase()
        if (!phone.includes(q) && !email.includes(q)) return false
      }
      return true
    })
  }, [abandonedCarts, abandonedFilter, abandonedSearch])

  const abandonedStats = useMemo(() => {
    const total = abandonedCarts.length
    const recovered = abandonedCarts.filter(c => c.recovered).length
    const potentialValue = abandonedCarts.reduce((acc, c) => acc + (c.totalAmount || 0), 0)
    const recoveredRate = total > 0 ? Math.round((recovered / total) * 100) : 0
    return { total, recovered, potentialValue, recoveredRate }
  }, [abandonedCarts])

  const generateWhatsAppLink = (lead: AbandonedCartLead) => {
    if (!lead.phone) return '#'
    let cleanPhone = lead.phone.replace(/\D/g, '')
    if (cleanPhone.length > 10 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.slice(2)
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.slice(1)
    }

    const itemsText = lead.items && lead.items.length > 0
      ? lead.items.map((i: any) => `${i.name || 'Sneakers'}${i.size ? ` (UK ${i.size})` : ''}`).join(', ')
      : 'Sneakers'

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://velvetsyndicate.shop'
    const checkoutLink = `${siteUrl.replace(/\/$/, '')}/checkout`
    const message = `Hey! Your Velvet Syndicate drop (${itemsText}) is waiting for you. Complete your order here: ${checkoutLink}`

    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">Order Management</h1>
          <p className="text-velvet-muted text-sm mt-1">
            Monitor orders, recover abandoned checkouts via WhatsApp, and advance delivery workflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchOrders()
              fetchAbandonedCarts()
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-velvet-muted hover:text-velvet-white hover:border-neutral-700 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#C9A961]' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher: Orders vs Abandoned Carts */}
      <div className="flex items-center gap-2 p-1.5 bg-[#111111] border border-neutral-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'ORDERS'
              ? 'bg-[#C9A961] text-black shadow-lg shadow-[#C9A961]/20'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShoppingBag size={14} />
          <span>Active Orders</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'ORDERS' ? 'bg-black/20 text-black' : 'bg-neutral-800 text-neutral-300'}`}>
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ABANDONED')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'ABANDONED'
              ? 'bg-[#C9A961] text-black shadow-lg shadow-[#C9A961]/20'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flame size={14} className={activeTab === 'ABANDONED' ? 'text-black' : 'text-amber-400'} />
          <span>Abandoned Carts</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'ABANDONED' ? 'bg-black/20 text-black' : 'bg-neutral-800 text-amber-300'}`}>
            {abandonedCarts.length}
          </span>
        </button>
      </div>

      {error && (
        <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {activeTab === 'ORDERS' ? (
        <>
          {/* Filter Control Center */}
          <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Status Filter */}
          <div>
            <label 
              htmlFor="order-status-filter" 
              className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium mb-1.5 flex items-center gap-1.5"
            >
              <Filter size={11} className="text-[#C9A961]" />
              Order Status
            </label>
            <select
              id="order-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AdminOrderStatus | 'ALL')}
              className="w-full bg-black/90 border border-neutral-800 focus:border-[#C9A961]/80 focus:ring-1 focus:ring-[#C9A961]/30 text-velvet-white text-xs px-3 py-2.5 rounded-xl transition-all outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          {/* 2. Payment Mode Filter */}
          <div>
            <label 
              htmlFor="order-payment-filter" 
              className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium mb-1.5 flex items-center gap-1.5"
            >
              <CreditCard size={11} className="text-[#C9A961]" />
              Payment Mode
            </label>
            <select
              id="order-payment-filter"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              className="w-full bg-black/90 border border-neutral-800 focus:border-[#C9A961]/80 focus:ring-1 focus:ring-[#C9A961]/30 text-velvet-white text-xs px-3 py-2.5 rounded-xl transition-all outline-none"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="COD">Cash on Delivery (COD)</option>
              <option value="ONLINE">Prepaid / Online</option>
            </select>
          </div>

          {/* 3. Quick Date Range Filter */}
          <div>
            <label 
              htmlFor="order-date-filter" 
              className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium mb-1.5 flex items-center gap-1.5"
            >
              <Calendar size={11} className="text-[#C9A961]" />
              Date Range
            </label>
            <select
              id="order-date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="w-full bg-black/90 border border-neutral-800 focus:border-[#C9A961]/80 focus:ring-1 focus:ring-[#C9A961]/30 text-velvet-white text-xs px-3 py-2.5 rounded-xl transition-all outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week (Last 7 Days)</option>
              <option value="MONTH">This Month (Last 30 Days)</option>
            </select>
          </div>

          {/* 4. Instant Search */}
          <div>
            <label 
              htmlFor="order-search" 
              className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium mb-1.5 flex items-center gap-1.5"
            >
              <Search size={11} className="text-[#C9A961]" />
              Instant Search
            </label>
            <div className="relative">
              <input
                id="order-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Phone, Order ID or Name..."
                className="w-full bg-black/90 border border-neutral-800 focus:border-[#C9A961]/80 focus:ring-1 focus:ring-[#C9A961]/30 rounded-xl pl-3 pr-8 py-2 text-xs text-velvet-white placeholder-neutral-500 transition-all outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Summary & Active Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-400">
              Showing <span className="font-heading text-velvet-white font-semibold">{rows.length}</span> of <span className="text-neutral-500">{orders.length}</span> orders
            </span>

            {rows.length > 0 && (
              <span className="text-[11px] text-[#C9A961] bg-[#C9A961]/10 px-2.5 py-0.5 rounded-full border border-[#C9A961]/20 font-medium">
                Volume: {formatPrice(filteredTotalValue)}
              </span>
            )}

            {/* Active filter badges */}
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/10 text-neutral-300 px-2 py-0.5 rounded-md border border-white/10">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter('ALL')} className="hover:text-red-400 ml-0.5 cursor-pointer">
                  <X size={10} />
                </button>
              </span>
            )}

            {paymentFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/10 text-neutral-300 px-2 py-0.5 rounded-md border border-white/10">
                Payment: {paymentFilter === 'COD' ? 'COD' : 'PREPAID / ONLINE'}
                <button onClick={() => setPaymentFilter('ALL')} className="hover:text-red-400 ml-0.5 cursor-pointer">
                  <X size={10} />
                </button>
              </span>
            )}

            {dateFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-white/10 text-neutral-300 px-2 py-0.5 rounded-md border border-white/10">
                Date: {dateFilter === 'TODAY' ? 'Today' : dateFilter === 'WEEK' ? 'This Week' : 'This Month'}
                <button onClick={() => setDateFilter('ALL')} className="hover:text-red-400 ml-0.5 cursor-pointer">
                  <X size={10} />
                </button>
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#C9A961] hover:text-[#e4cf92] underline decoration-dotted flex items-center gap-1 transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#111111] border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="hidden lg:grid grid-cols-12 px-5 py-4 text-[10px] uppercase tracking-widest text-velvet-muted border-b border-white/5">
          <div className="col-span-2">Order</div>
          <div className="col-span-2">Customer</div>
          <div className="col-span-2">Phone</div>
          <div className="col-span-2">Address</div>
          <div className="col-span-1">Total</div>
          <div className="col-span-1">Payment</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        <div className="divide-y divide-white/5">
          {rows.map((order) => {
            const options = transitionOptions[order.status]
            const orderDate = parseOrderDate(order.createdAt)
            const isCOD = (order.paymentMethod || '').toUpperCase() === 'COD'

            return (
              <div key={order.id} className="flex flex-col lg:grid lg:grid-cols-12 px-5 py-4 gap-4 lg:gap-0 lg:items-center text-sm hover:bg-white/[0.02] transition-colors">
                {/* Mobile Header: Order ID, Date, Status & Items */}
                <div className="flex flex-col lg:hidden gap-2">
                  <div className="flex justify-between items-center">
                    <Link href={`/admin/orders/${order.id}`} className="text-velvet-white hover:text-[#C9A961] transition-colors font-heading text-base">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Link>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <Clock size={11} className="text-neutral-500" />
                    <span>
                      {orderDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {order.itemsSummary && (
                    <div className="text-xs text-velvet-muted line-clamp-2 italic">
                      {order.itemsSummary}
                    </div>
                  )}
                </div>

                {/* Desktop: Order ID, Date & Items */}
                <div className="hidden lg:block col-span-2">
                  <Link href={`/admin/orders/${order.id}`} className="text-velvet-white hover:text-[#C9A961] transition-colors font-medium">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </Link>
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                    <Clock size={10} />
                    <span>
                      {orderDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {order.itemsSummary && (
                    <div className="text-xs text-velvet-muted mt-1 line-clamp-2 italic pr-2">
                      {order.itemsSummary}
                    </div>
                  )}
                </div>

                {/* Customer & Phone grouped on mobile */}
                <div className="flex flex-col gap-1 lg:col-span-4 lg:grid lg:grid-cols-2 lg:gap-0">
                  <div className="lg:col-span-1">
                    <div className="text-velvet-white font-medium lg:font-normal">{order.customerName}</div>
                  </div>
                  <div className="lg:col-span-1">
                    <div className="text-velvet-muted text-xs lg:text-sm">{order.phone || '-'}</div>
                  </div>
                </div>

                {/* Address */}
                <div className="col-span-2 text-velvet-muted text-xs lg:text-sm break-words pr-2">
                  {order.addressSnapshot.street}, {order.addressSnapshot.city}{order.addressSnapshot.state ? `, ${order.addressSnapshot.state}` : ''}{order.addressSnapshot.pincode ? ` - ${order.addressSnapshot.pincode}` : ''}
                </div>

                {/* Total & Payment grouped on mobile */}
                <div className="flex justify-between items-center lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-0">
                  <div className="lg:col-span-1 text-velvet-white font-heading tracking-wide">
                    {formatPrice(order.total)}
                  </div>
                  <div className="lg:col-span-1">
                    <span 
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium ${
                        isCOD 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {order.paymentMethod || 'COD'}
                    </span>
                  </div>
                </div>

                {/* Desktop: Status */}
                <div className="hidden lg:block col-span-1">
                  <StatusBadge status={order.status} />
                </div>

                {/* Action Dropdown */}
                <div className="col-span-1 flex lg:justify-end border-t border-white/5 lg:border-0 pt-3 lg:pt-0 mt-1 lg:mt-0">
                  {options.length > 0 ? (
                    <select
                      value=""
                      disabled={updatingId === order.id}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleStatusUpdate(order.id, e.target.value as AdminOrderStatus)
                        }
                      }}
                      className="w-full lg:w-auto bg-black border border-white/15 text-velvet-white text-[11px] px-3 py-2 lg:px-2 lg:py-1.5 rounded-lg outline-none focus:border-[#C9A961]"
                    >
                      <option value="">Update Status</option>
                      {options.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[10px] text-velvet-muted uppercase tracking-widest">Locked</span>
                  )}
                </div>
              </div>
            )
          })}

          {!isLoading && rows.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-500">
                <Search size={20} />
              </div>
              <h3 className="text-sm font-heading uppercase tracking-wider text-velvet-white">No Matching Orders</h3>
              <p className="text-xs text-velvet-muted mt-1 max-w-sm mx-auto">
                No orders match your selected filters. Try changing or resetting your search criteria.
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#C9A961] border border-[#C9A961]/30 transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      </>
      ) : (
      /* ─── ABANDONED CARTS VIEW ─── */
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 shadow-lg">
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1 font-medium">
              Total Drop Leads
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-heading text-white">{abandonedStats.total}</span>
              <span className="text-xs text-amber-400 font-medium">Active Leads</span>
            </div>
          </div>

          <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 shadow-lg">
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1 font-medium">
              Potential Cart Value
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-heading text-[#C9A961]">{formatPrice(abandonedStats.potentialValue)}</span>
              <span className="text-xs text-neutral-400">At Risk</span>
            </div>
          </div>

          <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 shadow-lg">
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1 font-medium">
              Recovery Rate
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-heading text-emerald-400">{abandonedStats.recoveredRate}%</span>
              <span className="text-xs text-neutral-400">{abandonedStats.recovered} Recovered</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setAbandonedFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                abandonedFilter === 'ALL'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All ({abandonedCarts.length})
            </button>
            <button
              onClick={() => setAbandonedFilter('UNRECOVERED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                abandonedFilter === 'UNRECOVERED'
                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Pending ({abandonedCarts.filter(c => !c.recovered).length})
            </button>
            <button
              onClick={() => setAbandonedFilter('RECOVERED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                abandonedFilter === 'RECOVERED'
                  ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Recovered ({abandonedStats.recovered})
            </button>
          </div>

          <div className="w-full sm:w-64 relative">
            <input
              type="text"
              value={abandonedSearch}
              onChange={(e) => setAbandonedSearch(e.target.value)}
              placeholder="Search phone or email..."
              className="w-full bg-black/80 border border-neutral-800 focus:border-[#C9A961] text-xs text-white pl-8 pr-3 py-2 rounded-xl outline-none"
            />
            <Search size={13} className="absolute left-2.5 top-2.5 text-neutral-500" />
          </div>
        </div>

        {/* Abandoned Leads List */}
        <div className="bg-[#111111] border border-neutral-800 rounded-2xl overflow-hidden shadow-xl divide-y divide-neutral-850">
          {filteredAbandoned.map((lead) => {
            const hasPhone = Boolean(lead.phone)
            const waLink = generateWhatsAppLink(lead)

            return (
              <div
                key={lead.id}
                className="p-5 hover:bg-white/[0.02] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Contact & Date */}
                <div className="space-y-1.5 min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-sm text-white font-medium">
                      {lead.phone ? `+91 ${lead.phone}` : 'No phone number'}
                    </span>
                    {lead.recovered ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        RECOVERED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        PENDING
                      </span>
                    )}
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <Mail size={12} className="text-neutral-500" />
                      <span>{lead.email}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-neutral-500 font-mono">
                    Captured: {new Date(lead.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Center: Items */}
                <div className="flex-1 max-w-md">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1">
                    Cart Items ({lead.items?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(lead.items || []).slice(0, 3).map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg p-1.5 pr-2.5 text-xs"
                      >
                        {item.image && (
                          <img
                            src={item.image}
                            alt=""
                            className="w-7 h-7 rounded object-cover bg-black"
                          />
                        )}
                        <span className="text-white text-xs truncate max-w-[130px]">
                          {item.name || 'Sneaker'}
                        </span>
                        {item.size && (
                          <span className="text-[10px] text-[#C9A961] bg-black/40 px-1 rounded font-mono">
                            UK {item.size}
                          </span>
                        )}
                      </div>
                    ))}
                    {(lead.items?.length || 0) > 3 && (
                      <span className="self-center text-xs text-neutral-500">
                        +{(lead.items?.length || 0) - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Value & Actions */}
                <div className="flex items-center justify-between lg:justify-end gap-5 pt-3 lg:pt-0 border-t border-neutral-850 lg:border-t-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 block">Value</span>
                    <span className="font-heading text-base font-bold text-[#C9A961]">
                      {formatPrice(lead.totalAmount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 1-Click WhatsApp Button */}
                    <a
                      href={hasPhone ? waLink : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!hasPhone) {
                          e.preventDefault()
                          alert('This lead has no phone number recorded.')
                        }
                      }}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        hasPhone
                          ? 'bg-[#25D366] hover:bg-[#20BD5A] text-black shadow-lg shadow-[#25D366]/20 cursor-pointer'
                          : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      }`}
                      title={hasPhone ? 'Send 1-Click WhatsApp Recovery' : 'No phone number'}
                    >
                      <MessageSquare size={13} className="fill-black" />
                      <span>Send WhatsApp Recovery</span>
                    </a>

                    {/* Toggle Recovered */}
                    <button
                      onClick={() => markCartRecovered(lead.id, !lead.recovered)}
                      className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                        lead.recovered
                          ? 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                      title={lead.recovered ? 'Mark as Unrecovered' : 'Mark as Recovered'}
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {filteredAbandoned.length === 0 && (
            <div className="py-16 text-center">
              <Flame size={28} className="text-neutral-600 mx-auto mb-3" />
              <h3 className="text-sm font-heading uppercase tracking-wider text-velvet-white">
                No Abandoned Leads Found
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                Check back as shoppers enter their phone or email during checkout.
              </p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
