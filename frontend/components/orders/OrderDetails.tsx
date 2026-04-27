'use client'

import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { 
  Package, MapPin, Calendar, CreditCard, 
  ChevronLeft, CheckCircle2, Truck, Box, 
  Clock, AlertCircle, ShoppingBag 
} from 'lucide-react'
import Link from 'next/link'
import { Order } from '@/store/orderStore'
import { formatPrice } from '@/lib/utils'

interface OrderTimelineProps {
  status: Order['status']
}

export function OrderTimeline({ status }: OrderTimelineProps) {
  const steps = [
    { id: 'PENDING', label: 'Ordered', icon: Clock },
    { id: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
    { id: 'SHIPPED', label: 'Shipped', icon: Truck },
    { id: 'DELIVERED', label: 'Delivered', icon: Package },
  ]

  const currentIdx = steps.findIndex(s => s.id === status)
  const isFailed = status === 'FAILED'

  return (
    <div className="py-8">
      {isFailed ? (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <AlertCircle size={20} />
          <span className="text-sm font-medium tracking-wide uppercase">This order has failed or was cancelled</span>
        </div>
      ) : (
        <div className="relative flex justify-between">
          {/* Progress Bar Background */}
          <div className="absolute top-5 left-0 w-full h-0.5 bg-white/5" />
          
          {/* Active Progress Bar */}
          <div 
            className="absolute top-5 left-0 h-0.5 bg-velvet-accent transition-all duration-1000"
            style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step, idx) => {
            const Icon = step.icon
            const isCompleted = idx <= currentIdx
            const isActive = idx === currentIdx

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isCompleted 
                      ? 'bg-velvet-accent text-white' 
                      : 'bg-velvet-dark border border-white/10 text-velvet-muted'
                  } ${isActive ? 'ring-4 ring-velvet-accent/20' : ''}`}
                >
                  <Icon size={18} />
                </div>
                <div className="mt-3 text-center">
                  <div className={`text-[10px] uppercase tracking-widest font-bold ${
                    isCompleted ? 'text-velvet-white' : 'text-velvet-muted'
                  }`}>
                    {step.label}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function OrderItemsTable({ items }: { items: Order['items'] }) {
  return (
    <div className="space-y-4">
      <div className="hidden md:grid grid-cols-4 gap-4 pb-4 border-b border-white/5 text-[10px] uppercase tracking-widest font-bold text-velvet-muted">
        <div className="col-span-2">Product</div>
        <div className="text-center">Quantity</div>
        <div className="text-right">Price</div>
      </div>

      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4 border-b border-white/5 items-center">
          <div className="col-span-2 flex items-center gap-4">
            <div className="w-16 h-20 rounded-lg overflow-hidden bg-white/5 border border-white/10">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag size={20} className="text-velvet-muted" />
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm font-heading text-velvet-white tracking-wide mb-1">{item.productName}</h4>
              <p className="text-xs text-velvet-muted uppercase tracking-widest">Size: {item.size}</p>
            </div>
          </div>
          <div className="flex md:block items-center justify-between">
            <span className="md:hidden text-xs text-velvet-muted uppercase tracking-widest">Quantity</span>
            <div className="text-sm text-velvet-white text-center">x{item.quantity}</div>
          </div>
          <div className="flex md:block items-center justify-between">
            <span className="md:hidden text-xs text-velvet-muted uppercase tracking-widest">Price</span>
            <div className="text-sm font-medium text-velvet-white text-right">{formatPrice(item.productPrice)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
