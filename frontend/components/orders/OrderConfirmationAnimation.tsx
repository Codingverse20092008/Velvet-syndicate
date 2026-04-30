'use client'

import { motion } from 'framer-motion'
import { Check, PackageCheck, Truck } from 'lucide-react'

type OrderConfirmationAnimationProps = {
  state?: 'processing' | 'confirmed'
  className?: string
}

const burstPieces = Array.from({ length: 12 })

export function OrderConfirmationAnimation({
  state = 'confirmed',
  className = '',
}: OrderConfirmationAnimationProps) {
  const isConfirmed = state === 'confirmed'

  return (
    <div className={`relative mx-auto flex w-full max-w-sm flex-col items-center ${className}`}>
      <div className="relative flex h-44 w-44 items-center justify-center">
        {isConfirmed &&
          burstPieces.map((_, index) => {
            const angle = (index / burstPieces.length) * Math.PI * 2
            const x = Math.cos(angle) * 78
            const y = Math.sin(angle) * 78

            return (
              <motion.span
                key={index}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], x, y, scale: [0.4, 1, 0.7] }}
                transition={{ duration: 1.25, delay: 0.1 + index * 0.025, ease: 'easeOut' }}
                className="absolute h-2 w-2 rounded-full bg-emerald-300"
              />
            )
          })}

        <motion.div
          initial={{ scale: 0.86, opacity: 0 }}
          animate={{
            scale: isConfirmed ? [0.86, 1.08, 1] : [0.94, 1.02, 0.94],
            opacity: 1,
          }}
          transition={{
            duration: isConfirmed ? 0.65 : 1.5,
            repeat: isConfirmed ? 0 : Infinity,
            ease: 'easeInOut',
          }}
          className="absolute h-36 w-36 rounded-full border border-emerald-300/25 bg-emerald-400/10"
        />

        <motion.div
          animate={{ rotate: isConfirmed ? 0 : 360 }}
          transition={{ duration: 1.7, repeat: isConfirmed ? 0 : Infinity, ease: 'linear' }}
          className="absolute h-40 w-40 rounded-full border border-transparent border-t-emerald-300/70"
        />

        <motion.div
          initial={{ y: 18, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-velvet-black shadow-[0_0_40px_rgba(52,211,153,0.22)] ring-1 ring-emerald-300/35"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: isConfirmed ? 1 : [0.9, 1.05, 0.9] }}
            transition={{ duration: isConfirmed ? 0.35 : 1.2, repeat: isConfirmed ? 0 : Infinity }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 text-black"
          >
            {isConfirmed ? <Check size={30} strokeWidth={3} /> : <PackageCheck size={30} />}
          </motion.div>
        </motion.div>
      </div>

      <div className="mt-2 flex w-full items-center justify-center gap-3">
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
        >
          <PackageCheck size={16} />
        </motion.div>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isConfirmed ? 1 : [0.15, 0.7, 0.15] }}
          transition={{ duration: isConfirmed ? 0.55 : 1.2, repeat: isConfirmed ? 0 : Infinity }}
          className="h-px w-20 origin-left bg-emerald-300/70"
        />
        <motion.div
          initial={{ opacity: 0.3, x: -8 }}
          animate={{ opacity: isConfirmed ? 1 : [0.35, 1, 0.35], x: isConfirmed ? 0 : [-8, 8, -8] }}
          transition={{ duration: isConfirmed ? 0.45 : 1.2, repeat: isConfirmed ? 0 : Infinity }}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
        >
          <Truck size={16} />
        </motion.div>
      </div>

      <motion.p
        key={state}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 text-center text-[11px] uppercase tracking-[0.35em] text-emerald-200"
      >
        {isConfirmed ? 'Order Confirmed' : 'Confirming Order'}
      </motion.p>
    </div>
  )
}
