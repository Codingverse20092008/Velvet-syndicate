'use client'

import { forwardRef, InputHTMLAttributes, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  type?: 'text' | 'email' | 'password'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, type = 'text', className, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs tracking-widest uppercase text-velvet-muted mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={type}
            className={cn(
              'w-full bg-transparent text-velvet-white placeholder-velvet-muted/50',
              'border-b border-white/20 py-4 px-0',
              'focus:outline-none focus:border-velvet-accent',
              'transition-colors duration-300 luxury-ease',
              'text-base font-light tracking-wide',
              className
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          <motion.div
            className="absolute bottom-0 left-0 h-px bg-velvet-accent shadow-[0_-5px_15px_rgba(74,125,156,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: isFocused ? '100%' : 0 }}
            transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
          />
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-velvet-muted mt-2 font-light"
          >
            {error}
          </motion.p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
