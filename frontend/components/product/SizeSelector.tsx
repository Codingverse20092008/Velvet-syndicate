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
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs tracking-widest uppercase text-velvet-muted">
          Select Size
        </span>
        <button className="text-xs text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive underline">
          Size Guide
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {availableSizes.map((size) => {
          const isOutOfStock = stock && stock[size] === 0
          const isSelected = selectedSize === size

          return (
            <motion.button
              key={size}
              onClick={() => !isOutOfStock && onSelectSize(size)}
              disabled={isOutOfStock}
              className={`w-14 h-14 flex items-center justify-center text-sm transition-all cursor-none interactive ${
                isSelected
                  ? 'bg-velvet-white text-velvet-black'
                  : isOutOfStock
                  ? 'bg-velvet-card text-neutral-600 cursor-not-allowed'
                  : 'border border-white/20 text-velvet-muted hover:border-velvet-white hover:text-velvet-white'
              }`}
              whileHover={{ scale: isOutOfStock ? 1 : 1.05 }}
              whileTap={{ scale: isOutOfStock ? 1 : 0.95 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {size}
            </motion.button>
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
