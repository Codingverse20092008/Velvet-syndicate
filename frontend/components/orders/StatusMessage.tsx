'use client'

import { motion } from 'framer-motion'
import { BellRing } from 'lucide-react'
import type { Order } from '@/store/orderStore'

type OrderStatus = Order['status']

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  PENDING: 'We are preparing your order confirmation.',
  CONFIRMED: 'Your order has been confirmed.',
  SHIPPED: 'Your order has been shipped.',
  OUT_FOR_DELIVERY: 'Your order is out for delivery.',
  DELIVERED: 'Your order has been delivered.',
  CANCELLED: 'Your order was cancelled.',
  FAILED: 'Your order was cancelled.',
}

const STATUS_TONES: Record<OrderStatus, string> = {
  PENDING: 'border-amber-400/25 bg-amber-500/10 text-amber-100',
  CONFIRMED: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-100',
  SHIPPED: 'border-indigo-400/25 bg-indigo-500/10 text-indigo-100',
  OUT_FOR_DELIVERY: 'border-violet-400/25 bg-violet-500/10 text-violet-100',
  DELIVERED: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
  CANCELLED: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
  FAILED: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
}

export function StatusMessage({ status }: { status: OrderStatus }) {
  return (
    <motion.div
      key={status}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${STATUS_TONES[status]}`}
    >
      <BellRing size={16} />
      <p className="text-sm">{STATUS_MESSAGES[status]}</p>
    </motion.div>
  )
}
