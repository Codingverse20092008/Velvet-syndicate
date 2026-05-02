'use client'

import { forwardRef, InputHTMLAttributes, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  type?: 'text' | 'email' | 'password'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, type = 'text', className, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs tracking-widest uppercase text-velvet-muted mb-2">
            {label}
          </label>
        )}
        <div className="relative group">
          <input
            ref={ref}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            className={cn(
              'w-full bg-transparent text-velvet-white placeholder-velvet-muted/50',
              'border-b border-white/20 py-4 px-0',
              'focus:outline-none focus:border-velvet-accent',
              'transition-colors duration-300 luxury-ease',
              'text-base font-light tracking-wide',
              'autofill:bg-transparent autofill:text-velvet-white',
              isPassword && 'pr-12',
              className
            )}
            style={{
              WebkitBoxShadow: '0 0 0px 1000px transparent inset',
              WebkitTextFillColor: 'white',
              transition: 'background-color 5000s ease-in-out 0s',
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-velvet-muted/80 hover:text-velvet-accent transition-colors p-2 z-10 interactive"
              tabIndex={-1}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={showPassword ? 'eye-off' : 'eye'}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                </motion.div>
              </AnimatePresence>
            </button>
          )}

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
