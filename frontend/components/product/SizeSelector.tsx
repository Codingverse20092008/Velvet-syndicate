'use client'

import { motion } from 'framer-motion'

interface SizeSelectorProps {
  availableSizes: string[]
  selectedSize: string | null
  onSelectSize: (size: string) => void
  stock?: Record<string, number>
}

export function SizeSelector({
  availableSizes,
  selectedSize,
  onSelectSize,
  stock,
}: SizeSelectorProps) {
  if (availableSizes.length === 1 && availableSizes[0] === 'Standard') {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs tracking-widest uppercase text-velvet-muted">
          Select Size
        </span>
        <button className="text-xs text-velvet-muted hover:text-velvet-white transition-colors interactive underline">
          Size Guide
        </button>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {availableSizes.map((size) => {
          const isOutOfStock = stock && stock[size] === 0
          const isSelected = selectedSize === size

          return (
            <div key={size} className="relative group">
              <motion.button
                onClick={() => !isOutOfStock && onSelectSize(size)}
                disabled={isOutOfStock}
                title={isOutOfStock ? `Size ${size} - Out of Stock` : `Size ${size}`}
                className={`w-14 h-14 relative flex items-center justify-center text-sm font-medium transition-all interactive rounded-lg ${
                  isSelected
                    ? 'bg-velvet-white text-velvet-black font-bold shadow-lg shadow-white/10'
                    : isOutOfStock
                    ? 'bg-neutral-950/70 border border-neutral-800/60 text-neutral-500 cursor-not-allowed'
                    : 'border border-white/20 text-velvet-muted hover:border-velvet-white hover:text-velvet-white'
                }`}
                whileHover={{ scale: isOutOfStock ? 1 : 1.05 }}
                whileTap={{ scale: isOutOfStock ? 1 : 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <span className={isOutOfStock ? 'opacity-40' : ''}>{size}</span>
                {isOutOfStock && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-lg">
                    <span className="w-[140%] h-[1.5px] bg-red-500/70 -rotate-45 transform origin-center" />
                  </span>
                )}
              </motion.button>
              {isOutOfStock && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-neutral-900 border border-red-500/40 text-red-400 text-[10px] font-semibold rounded tracking-wider uppercase shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                  Out of Stock
                </div>
              )}
            </div>
          )
        })}
      </div>
      {selectedSize && stock && stock[selectedSize] !== undefined && (
        <motion.p
          className="text-xs text-velvet-muted mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {stock[selectedSize] > 0
            ? `${stock[selectedSize]} pairs available`
            : 'Out of stock'}
        </motion.p>
      )}
    </div>
  )
}
