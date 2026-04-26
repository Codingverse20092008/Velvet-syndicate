'use client'

import { motion } from 'framer-motion'

interface Variant {
  id: string
  name: string
  color: string
}

interface VariantSelectorProps {
  variants: Variant[]
  selectedVariantId: string
  onSelectVariant: (variantId: string) => void
}

export function VariantSelector({
  variants,
  selectedVariantId,
  onSelectVariant
}: VariantSelectorProps) {
  if (variants.length <= 1 && variants[0]?.name === 'Standard') {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.2em] text-velvet-muted font-medium">
          Color
        </span>
        <span className="text-[11px] text-velvet-white font-light">
          {variants.find(v => v.id === selectedVariantId)?.name}
        </span>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => {
          const isActive = variant.id === selectedVariantId
          
          return (
            <button
              key={variant.id}
              onClick={() => onSelectVariant(variant.id)}
              className="group relative flex items-center justify-center p-1 cursor-none interactive"
              title={variant.name}
            >
              {/* Active Ring */}
              {isActive && (
                <motion.div
                  layoutId="activeVariant"
                  className="absolute inset-0 border border-velvet-accent rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              
              {/* Color Dot */}
              <div 
                className={`
                  w-6 h-6 rounded-full border border-white/10 transition-all duration-300
                  ${isActive ? 'scale-75 shadow-[0_0_12px_rgba(74,125,156,0.3)]' : 'group-hover:scale-110'}
                `}
                style={{ backgroundColor: variant.color }}
              />
              
              {/* Tooltip on hover (optional, using title for now) */}
            </button>
          )
        })}
      </div>
    </div>
  )
}
