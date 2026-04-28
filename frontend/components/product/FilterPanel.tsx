'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1]

// Strict category system (only these allowed)
const GENDERS = ['men', 'women'] as const
const SUBCATEGORIES = ['casual', 'walking', 'jogging', 'running', 'sports', 'sneakers'] as const

type Gender = typeof GENDERS[number]
type Subcategory = typeof SUBCATEGORIES[number]

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedSize: string | null
  selectedGender: Gender | null
  selectedSubcategory: Subcategory | null
  priceRange: [number, number]
  onSizeChange: (size: string | null) => void
  onGenderChange: (gender: Gender | null) => void
  onSubcategoryChange: (subcategory: Subcategory | null) => void
  onPriceRangeChange: (range: [number, number]) => void
}

const sizes = ['7', '8', '9', '10', '11', '12']

export function FilterPanel({
  isOpen,
  onClose,
  selectedSize,
  selectedGender,
  selectedSubcategory,
  priceRange,
  onSizeChange,
  onGenderChange,
  onSubcategoryChange,
  onPriceRangeChange,
}: FilterPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/80 z-40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-velvet-black z-50 border-l border-white/5 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="p-12">
              <div className="flex items-center justify-between mb-16">
                <h2 className="font-heading text-3xl tracking-tight text-velvet-white">
                  Filter
                </h2>
                <button
                  onClick={onClose}
                  className="text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive p-2"
                >
                  <X size={20} strokeWidth={1} />
                </button>
              </div>

              {/* Gender - Main Category (Strict: Men/Women only) */}
              <div className="mb-12">
                <h3 className="text-[10px] tracking-[0.4em] uppercase text-velvet-muted mb-8">
                  Category
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {GENDERS.map((gender) => (
                    <button
                      key={gender}
                      onClick={() => onGenderChange(selectedGender === gender ? null : gender)}
                      className={`text-left px-6 py-4 text-[10px] tracking-[0.2em] uppercase transition-all duration-500 cursor-none interactive ${
                        selectedGender === gender
                          ? 'bg-white text-black'
                          : 'bg-neutral-900 text-velvet-muted hover:text-velvet-white'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategory - Type (Strict: 6 types only) */}
              <div className="mb-12">
                <h3 className="text-[10px] tracking-[0.4em] uppercase text-velvet-muted mb-8">
                  Type
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {SUBCATEGORIES.map((subcategory) => (
                    <button
                      key={subcategory}
                      onClick={() => onSubcategoryChange(selectedSubcategory === subcategory ? null : subcategory)}
                      className={`text-left px-6 py-4 text-[10px] tracking-[0.2em] uppercase transition-all duration-500 cursor-none interactive ${
                        selectedSubcategory === subcategory
                          ? 'bg-white text-black'
                          : 'bg-neutral-900 text-velvet-muted hover:text-velvet-white'
                      }`}
                    >
                      {subcategory}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="mb-12">
                <h3 className="text-[10px] tracking-[0.4em] uppercase text-velvet-muted mb-8">
                  Size
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => onSizeChange(selectedSize === size ? null : size)}
                      className={`h-16 flex items-center justify-center text-[10px] tracking-[0.1em] transition-all duration-500 cursor-none interactive ${
                        selectedSize === size
                          ? 'bg-white text-black'
                          : 'bg-neutral-900 text-velvet-muted hover:text-velvet-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="mb-16">
                <h3 className="text-[10px] tracking-[0.4em] uppercase text-velvet-muted mb-8">
                  Price Limit
                </h3>
                <div className="space-y-4">
                   <div className="flex justify-between text-[10px] tracking-widest text-velvet-muted uppercase">
                      <span>₹990</span>
                      <span>₹{priceRange[1]}</span>
                   </div>
                   <input
                    type="range"
                    min="990"
                    max="5000"
                    step="50"
                    value={priceRange[1]}
                    onChange={(e) => onPriceRangeChange([990, Number(e.target.value)])}
                    className="w-full h-px bg-neutral-800 appearance-none cursor-none interactive accent-velvet-white"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  onSizeChange(null)
                  onGenderChange(null)
                  onSubcategoryChange(null)
                  onPriceRangeChange([990, 5000])
                }}
                className="w-full py-6 text-[10px] tracking-[0.4em] uppercase text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive border border-white/5 hover:border-white/10"
              >
                Reset Archive
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
