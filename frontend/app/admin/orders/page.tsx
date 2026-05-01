'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdminStore, AdminOrderStatus } from '@/store/adminStore'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { formatPrice } from '@/lib/utils'

const transitionOptions: Record<AdminOrderStatus, AdminOrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
}

export default function AdminOrdersPage() {
  const { orders, isLoading, fetchOrders, updateOrderStatus, error } = useAdminStore()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<AdminOrderStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const rows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter
      if (!matchesStatus) return false
      if (!query) return true

      const orderId = order.id.toLowerCase()
      const phone = (order.phone || '').toLowerCase()
      return orderId.includes(query) || phone.includes(query)
    })
  }, [orders, searchQuery, statusFilter])

  const handleStatusUpdate = async (orderId: string, nextStatus: AdminOrderStatus) => {
    const confirmed = window.confirm('Are you sure?')
    if (!confirmed) return

    setUpdatingId(orderId)
    try {
      await updateOrderStatus(orderId, nextStatus)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">Order Management</h1>
        <p className="text-velvet-muted text-sm mt-2">Monitor COD order flow and progress each order safely.</p>
      </div>

      {error && <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>}

      <div className="bg-velvet-card border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="w-full md:w-64">
          <label htmlFor="order-status-filter" className="text-[10px] uppercase tracking-widest text-velvet-muted block mb-2">
            Filter by status
          </label>
          <select
            id="order-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AdminOrderStatus | 'ALL')}
            className="w-full bg-black border border-white/15 text-velvet-white text-xs px-3 py-2 rounded-lg"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
        <div className="w-full md:flex-1">
          <label htmlFor="order-search" className="text-[10px] uppercase tracking-widest text-velvet-muted block mb-2">
            Search by phone or order ID
          </label>
          <input
            id="order-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. 9876543210 or 8f2a1b"
            className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
          />
        </div>
      </div>

      <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
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
            return (
              <div key={order.id} className="flex flex-col lg:grid lg:grid-cols-12 px-5 py-4 gap-4 lg:gap-0 lg:items-center text-sm">
                {/* Mobile Header: Order ID & Status */}
                <div className="flex justify-between items-center lg:hidden">
                  <Link href={`/admin/orders/${order.id}`} className="text-velvet-white hover:text-velvet-accent transition-colors font-heading text-base">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </Link>
                  <StatusBadge status={order.status} />
                </div>

                {/* Desktop: Order ID */}
                <div className="hidden lg:block col-span-2">
                  <Link href={`/admin/orders/${order.id}`} className="text-velvet-white hover:text-velvet-accent transition-colors font-medium">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </Link>
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
                <div className="col-span-2 text-velvet-muted lg:truncate text-xs lg:text-sm">
                  {order.addressSnapshot.street}, {order.addressSnapshot.city}
                </div>

                {/* Total & Payment grouped on mobile */}
                <div className="flex justify-between items-center lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-0">
                  <div className="lg:col-span-1 text-velvet-white font-heading tracking-wide">
                    {formatPrice(order.total)}
                  </div>
                  <div className="lg:col-span-1 text-velvet-muted text-[10px] uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded w-fit">
                    {order.paymentMethod}
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
                      className="w-full lg:w-auto bg-black border border-white/15 text-velvet-white text-[11px] px-3 py-2 lg:px-2 lg:py-1.5 rounded-lg"
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
            <div className="px-6 py-10 text-center text-velvet-muted">No orders to manage yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
