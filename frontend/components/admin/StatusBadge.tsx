'use client'

import { AdminOrderStatus } from '@/store/adminStore'

const statusClasses: Record<AdminOrderStatus, string> = {
  PENDING: 'text-amber-300 bg-amber-400/10 border-amber-300/30',
  CONFIRMED: 'text-cyan-300 bg-cyan-400/10 border-cyan-300/30',
  SHIPPED: 'text-indigo-300 bg-indigo-400/10 border-indigo-300/30',
  OUT_FOR_DELIVERY: 'text-violet-300 bg-violet-400/10 border-violet-300/30',
  DELIVERED: 'text-emerald-300 bg-emerald-400/10 border-emerald-300/30',
  CANCELLED: 'text-rose-300 bg-rose-400/10 border-rose-300/30',
  FAILED: 'text-red-300 bg-red-400/10 border-red-300/30',
}

export function StatusBadge({ status }: { status: AdminOrderStatus }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-widest font-bold ${statusClasses[status]}`}>
      {status}
    </span>
  )
}
