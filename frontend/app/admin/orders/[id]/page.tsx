'use client'

import { useEffect, use, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useAdminStore, AdminOrderStatus } from '@/store/adminStore'
import { formatPrice } from '@/lib/utils'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { Truck, Package, CheckCircle, XCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react'

interface AdminOrderDetailsProps {
  params: Promise<{ id: string }>
}

const statusFlow: AdminOrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']

const statusConfig: Record<AdminOrderStatus, { label: string; color: string; icon: any; description: string }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-500', icon: Clock, description: 'Order awaiting confirmation' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500', icon: CheckCircle, description: 'Order confirmed, preparing for shipment' },
  SHIPPED: { label: 'Shipped', color: 'bg-purple-500', icon: Package, description: 'Order shipped, in transit' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-cyan-500', icon: Truck, description: 'Order out for delivery today' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-500', icon: CheckCircle, description: 'Order delivered successfully' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-500', icon: XCircle, description: 'Order cancelled' },
  FAILED: { label: 'Failed', color: 'bg-red-600', icon: AlertCircle, description: 'Order failed' },
}

export default function AdminOrderDetailsPage({ params }: AdminOrderDetailsProps) {
  const { id } = use(params)
  const { currentOrder, isLoading, error, fetchOrderById, updateOrderStatus } = useAdminStore()
  const [updating, setUpdating] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  useEffect(() => {
    fetchOrderById(id)
  }, [fetchOrderById, id])

  const handleStatusUpdate = async (newStatus: AdminOrderStatus) => {
    if (newStatus === 'CANCELLED' && !showCancelConfirm) {
      setShowCancelConfirm(true)
      return
    }
    
    setUpdating(true)
    try {
      await updateOrderStatus(id, newStatus)
      setShowCancelConfirm(false)
    } finally {
      setUpdating(false)
    }
  }

  const getNextStatuses = (current: AdminOrderStatus): AdminOrderStatus[] => {
    const currentIndex = statusFlow.indexOf(current)
    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) return []
    return [statusFlow[currentIndex + 1]]
  }

  if (isLoading || !currentOrder || currentOrder.id !== id) {
    return <div className="text-velvet-muted">Loading order details...</div>
  }

  const nextStatuses = getNextStatuses(currentOrder.status)
  const canCancel = ['PENDING', 'CONFIRMED'].includes(currentOrder.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="text-xs uppercase tracking-widest text-velvet-muted hover:text-velvet-white">
            ← Back to orders
          </Link>
          <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase mt-2">
            Order #{currentOrder.id.slice(0, 8).toUpperCase()}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-velvet-muted">{format(new Date(currentOrder.createdAt), 'PPP')}</span>
          <StatusBadge status={currentOrder.status} />
        </div>
      </div>

      {error && <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>}

      {/* Status Control Panel */}
      <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
        <h2 className="font-heading text-lg text-velvet-white mb-4">Order Status Control</h2>
        
        {/* Status Timeline */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-4">
          {statusFlow.map((status, idx) => {
            const config = statusConfig[status]
            const Icon = config.icon
            const isActive = status === currentOrder.status
            const isCompleted = statusFlow.indexOf(status) < statusFlow.indexOf(currentOrder.status)
            const isPending = statusFlow.indexOf(status) > statusFlow.indexOf(currentOrder.status)
            
            return (
              <div key={status} className="flex items-center shrink-0">
                <div className={`flex flex-col items-center p-3 rounded-xl border ${
                  isActive ? 'border-velvet-accent bg-velvet-accent/10' :
                  isCompleted ? 'border-emerald-500/50 bg-emerald-500/10' :
                  'border-white/10 bg-white/5'
                }`}>
                  <Icon size={20} className={isActive ? 'text-velvet-accent' : isCompleted ? 'text-emerald-400' : 'text-velvet-muted'} />
                  <span className={`text-[10px] uppercase tracking-widest mt-2 ${isActive ? 'text-velvet-accent' : isCompleted ? 'text-emerald-400' : 'text-velvet-muted'}`}>
                    {config.label}
                  </span>
                </div>
                {idx < statusFlow.length - 1 && (
                  <ArrowRight size={16} className="text-velvet-muted mx-2 shrink-0" />
                )}
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {nextStatuses.map((status) => {
            const config = statusConfig[status]
            return (
              <button
                key={status}
                onClick={() => handleStatusUpdate(status)}
                disabled={updating}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${config.color.replace('bg-', 'bg-opacity-20 text-')}`}
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                Mark as {config.label}
              </button>
            )
          })}
          
          {canCancel && (
            <button
              onClick={() => handleStatusUpdate('CANCELLED')}
              disabled={updating}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              Cancel Order
            </button>
          )}
        </div>

        {updating && <div className="text-xs text-velvet-muted mt-3">Updating status...</div>}
      </div>

      {/* Cancel Confirmation */}
      {showCancelConfirm && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <h3 className="font-heading text-lg text-red-400 mb-2">Cancel Order?</h3>
          <p className="text-sm text-velvet-muted mb-4">This action cannot be undone. The customer will be notified.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="px-4 py-2 border border-white/15 rounded-lg text-sm text-velvet-muted hover:text-velvet-white"
            >
              Keep Order
            </button>
            <button
              onClick={() => handleStatusUpdate('CANCELLED')}
              disabled={updating}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium"
            >
              Yes, Cancel Order
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 bg-velvet-card border border-white/10 rounded-2xl p-6">
          <h2 className="font-heading text-xl text-velvet-white mb-4">Order Items</h2>
          <div className="divide-y divide-white/5">
            {currentOrder.items.map((item) => (
              <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.productName} className="w-16 h-16 object-cover rounded-lg bg-white/5" />
                  )}
                  <div>
                    <div className="text-velvet-white font-medium">{item.productName}</div>
                    <div className="text-xs text-velvet-muted mt-1">
                      Size {item.size} • Qty {item.quantity} • ₹{item.productPrice} each
                    </div>
                  </div>
                </div>
                <div className="text-velvet-white font-heading">{formatPrice(item.productPrice * item.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-velvet-muted">Subtotal</span>
              <span className="text-velvet-white">{formatPrice(currentOrder.total)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-velvet-muted">Shipping</span>
              <span className="text-emerald-400">Free</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <span className="text-velvet-white font-medium">Total</span>
              <span className="text-2xl font-heading text-velvet-white">{formatPrice(currentOrder.total)}</span>
            </div>
          </div>
        </div>

        {/* Customer & Shipping Info */}
        <div className="space-y-6">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Customer</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-velvet-muted">Name</div>
                <div className="text-velvet-white">{currentOrder.addressSnapshot.name}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-velvet-muted">Phone</div>
                <div className="text-velvet-white">{currentOrder.addressSnapshot.phone}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-velvet-muted">User ID</div>
                <div className="text-xs text-velvet-muted font-mono">{currentOrder.userId}</div>
              </div>
            </div>
          </div>

          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Shipping Address</h3>
            <div className="text-sm text-velvet-muted space-y-1">
              <div className="text-velvet-white">{currentOrder.addressSnapshot.name}</div>
              <div>{currentOrder.addressSnapshot.phone}</div>
              <div className="pt-2">{currentOrder.addressSnapshot.street}</div>
              <div>{currentOrder.addressSnapshot.city}, {currentOrder.addressSnapshot.state}</div>
              <div>PIN: {currentOrder.addressSnapshot.pincode}</div>
            </div>
          </div>

          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Payment Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs uppercase tracking-widest text-velvet-muted">Method</span>
                <span className="text-velvet-white">{currentOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs uppercase tracking-widest text-velvet-muted">Status</span>
                <span className={`${currentOrder.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {currentOrder.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <h3 className="font-heading text-lg text-velvet-white mb-4">Order Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-velvet-muted">Created</span>
                <span className="text-velvet-white">{format(new Date(currentOrder.createdAt), 'PP p')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-velvet-muted">Order ID</span>
                <span className="text-xs text-velvet-muted font-mono">{currentOrder.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
