'use client'

import { useEffect, use } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useAdminStore } from '@/store/adminStore'
import { formatPrice } from '@/lib/utils'
import { StatusBadge } from '@/components/admin/StatusBadge'

interface AdminOrderDetailsProps {
  params: Promise<{ id: string }>
}

export default function AdminOrderDetailsPage({ params }: AdminOrderDetailsProps) {
  const { id } = use(params)
  const { currentOrder, isLoading, error, fetchOrderById } = useAdminStore()

  useEffect(() => {
    fetchOrderById(id)
  }, [fetchOrderById, id])

  if (isLoading || !currentOrder || currentOrder.id !== id) {
    return <div className="text-velvet-muted">Loading order details...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="text-xs uppercase tracking-widest text-velvet-muted hover:text-velvet-white">
            Back to orders
          </Link>
          <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase mt-2">Order #{currentOrder.id.slice(0, 8).toUpperCase()}</h1>
        </div>
        <StatusBadge status={currentOrder.status} />
      </div>

      {error && <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-velvet-card border border-white/10 rounded-2xl p-6">
          <h2 className="font-heading text-xl text-velvet-white mb-4">Items</h2>
          <div className="divide-y divide-white/5">
            {currentOrder.items.map((item) => (
              <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-velvet-white">{item.productName}</div>
                  <div className="text-xs text-velvet-muted mt-1">Size {item.size} - Qty {item.quantity}</div>
                </div>
                <div className="text-velvet-white">{formatPrice(item.productPrice * item.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between">
            <span className="text-velvet-muted">Total</span>
            <span className="text-xl font-heading text-velvet-white">{formatPrice(currentOrder.total)}</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Address Snapshot</h3>
            <div className="text-sm text-velvet-muted space-y-1">
              <div className="text-velvet-white">{currentOrder.addressSnapshot.name}</div>
              <div>{currentOrder.addressSnapshot.phone}</div>
              <div>{currentOrder.addressSnapshot.street}</div>
              <div>{currentOrder.addressSnapshot.city}, {currentOrder.addressSnapshot.state}</div>
              <div>{currentOrder.addressSnapshot.pincode}</div>
            </div>
          </div>

          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Payment</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-velvet-muted">Method</span><span className="text-velvet-white">{currentOrder.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-velvet-muted">Payment Status</span><span className="text-velvet-white">{currentOrder.paymentStatus}</span></div>
            </div>
          </div>

          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Status Timeline</h3>
            <div className="text-sm text-velvet-muted space-y-2">
              <div>Created: {format(new Date(currentOrder.createdAt), 'PPP p')}</div>
              <div>Current: <span className="text-velvet-white">{currentOrder.status}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
