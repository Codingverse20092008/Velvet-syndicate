'use client'

import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { Package, ChevronRight, MapPin, Calendar, CreditCard, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { Order } from '@/store/orderStore'
import { formatPrice } from '@/lib/utils'
import { getFullImageUrl } from '@/lib/api'
import Image from 'next/image'

interface OrderCardProps {
  order: Order
}

function safeParseAddress(raw?: string) {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function OrderCard({ order }: OrderCardProps) {
  const addressSnapshot = order.addressSnapshot ?? safeParseAddress(order.shippingAddress)
  const itemsCount = order.items.reduce((acc, item) => acc + item.quantity, 0)
  
  const statusColors = {
    PENDING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    CONFIRMED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    SHIPPED: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
    OUT_FOR_DELIVERY: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    DELIVERED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    CANCELLED: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    FAILED: 'text-red-400 bg-red-400/10 border-red-400/20',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-velvet-dark border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300"
    >
      <div className="p-6 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
            <Package size={24} className="text-velvet-muted" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-1">Order ID</div>
            <div className="text-sm font-medium text-velvet-white tracking-wide">#{order.id.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border ${statusColors[order.status]}`}>
          {order.status}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-velvet-muted">
            <Calendar size={16} />
            <span>{format(new Date(order.createdAt), 'PPP')}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-velvet-muted">
            <CreditCard size={16} />
            <span>{order.paymentMethod} • {order.paymentStatus}</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-velvet-muted">
            <MapPin size={16} className="mt-1 flex-shrink-0" />
            <span className="line-clamp-1">{addressSnapshot.street}, {addressSnapshot.city}</span>
          </div>
        </div>

        <div className="flex -space-x-3 overflow-hidden items-center">
          {order.items.slice(0, 3).map((item, idx) => (
            <div key={item.id} className="relative w-12 h-12 rounded-lg border-2 border-velvet-dark overflow-hidden bg-white/5">
              {item.imageUrl ? (
                <Image src={getFullImageUrl(item.imageUrl)} alt={item.productName} fill sizes="48px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag size={16} className="text-velvet-muted" />
                </div>
              )}
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="w-12 h-12 rounded-lg border-2 border-velvet-dark bg-white/5 flex items-center justify-center text-[10px] text-velvet-muted font-bold">
              +{order.items.length - 3}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end justify-center">
          <div className="text-2xl font-heading text-velvet-white mb-2">{formatPrice(order.totalAmount)}</div>
          <Link
            href={`/orders/${order.id}`}
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-velvet-accent hover:text-velvet-white transition-colors"
          >
            View Details <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
