'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Circle, PackageCheck, Truck, Warehouse, XCircle } from 'lucide-react'
import type { Order } from '@/store/orderStore'

type OrderStatus = Order['status']

const TRACKING_STEPS: Array<{
  id: Extract<OrderStatus, 'CONFIRMED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED'>
  label: string
  icon: typeof CheckCircle2
}> = [
  { id: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { id: 'SHIPPED', label: 'Shipped', icon: Warehouse },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: Truck },
  { id: 'DELIVERED', label: 'Delivered', icon: PackageCheck },
]

function getStepIndex(status: OrderStatus) {
  return TRACKING_STEPS.findIndex((step) => step.id === status)
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const isCancelled = status === 'CANCELLED' || status === 'FAILED'
  const currentIndex = getStepIndex(status)
  const normalizedIndex = currentIndex >= 0 ? currentIndex : status === 'PENDING' ? -1 : 0
  const progressPercent =
    normalizedIndex < 0 ? 0 : (normalizedIndex / (TRACKING_STEPS.length - 1)) * 100

  return (
    <div className="space-y-6">
      {isCancelled ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 text-rose-200"
        >
          <XCircle size={18} />
          <span className="text-sm tracking-wide">This order was cancelled and is no longer moving through delivery steps.</span>
        </motion.div>
      ) : (
        <div className="relative px-1 pt-2">
          <div className="absolute top-[19px] left-4 right-4 h-0.5 bg-white/10" />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `calc(${progressPercent}% - ${progressPercent > 0 ? 8 : 0}px)` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute top-[19px] left-4 h-0.5 bg-velvet-accent"
          />

          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-3">
            {TRACKING_STEPS.map((step, index) => {
              const completed = normalizedIndex >= index
              const active = normalizedIndex === index
              const muted = normalizedIndex < index
              const Icon = step.icon

              return (
                <div key={step.id} className="flex flex-col items-start md:items-center">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0.7 }}
                    animate={{ scale: active ? 1.03 : 1, opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className={`h-9 w-9 rounded-full border flex items-center justify-center ${
                      completed
                        ? 'bg-velvet-accent border-velvet-accent text-black'
                        : 'bg-black border-white/15 text-velvet-muted'
                    } ${active ? 'shadow-[0_0_0_4px_rgba(242,197,117,0.18)]' : ''}`}
                  >
                    {completed ? <Icon size={16} /> : <Circle size={14} />}
                  </motion.div>
                  <span
                    className={`mt-3 text-[11px] uppercase tracking-widest ${
                      muted ? 'text-velvet-muted/70' : 'text-velvet-white'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
