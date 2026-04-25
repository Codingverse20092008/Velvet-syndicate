'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1]

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  ...props
}: ButtonProps) {
  // Base: consistent tracking, letter-spacing, transition timing
  const baseStyles = cn(
    'inline-flex items-center justify-center font-normal tracking-[0.32em] uppercase',
    'transition-all duration-[420ms] cursor-none select-none',
    'focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30',
    'disabled:opacity-40 disabled:pointer-events-none'
  )

  const variants = {
    // Filled white → transparent on hover
    primary: cn(
      'bg-velvet-white text-velvet-black border border-velvet-white',
      'hover:bg-transparent hover:text-velvet-white'
    ),
    // Subtle border → brightens on hover
    secondary: cn(
      'bg-transparent text-velvet-white border border-white/25',
      'hover:border-velvet-white hover:bg-white/5'
    ),
    // Ghost border → slight fill on hover
    outline: cn(
      'bg-transparent text-velvet-white border border-white/15',
      'hover:border-white/40 hover:bg-white/[0.04]'
    ),
    // Text only
    ghost: cn(
      'bg-transparent text-velvet-muted border border-transparent',
      'hover:text-velvet-white'
    ),
  }

  // Consistent vertical rhythm across sizes
  const sizes = {
    sm:  'px-7  py-3   text-[9px]',
    md:  'px-10 py-[14px] text-[10px]',
    lg:  'px-14 py-5   text-[10px]',
  }

  return (
    <motion.button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18, ease: EASE }}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <motion.div
          className="w-4 h-4 border border-current border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      ) : (
        children
      )}
    </motion.button>
  )
}
