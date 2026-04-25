'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FilterPanel } from '@/components/product/FilterPanel'
import { ProductCard } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/Button'
import { SlidersHorizontal } from 'lucide-react'
import { ProductGridSkeleton } from '@/components/product/ProductSkeleton'
import { apiFetch } from '@/lib/api'

const EASE = [0.22, 1, 0.36, 1]

interface Product {
  id: string
  name: string
  slug: string
  price: number
  images: string[]
  sizes: string[] // Backend returns string sizes
  category: string
}

export default function CollectionPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [sortBy, setSortBy] = useState('createdAt')
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000])

  useEffect(() => {
    fetchProducts()
  }, [sortBy])

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch(`/products?sort=${sortBy}&limit=100`)
      const json = await res.json()
      if (json.success) {
        setProducts(json.data.products)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    // Size check - sizes from backend are objects with size/stock or string keys
    // Assuming backend returns sizes in standardized product object
    if (selectedSize && !Object.keys((product as any).stock || {}).includes(selectedSize)) return false
    if (selectedCategory && product.category.toLowerCase() !== selectedCategory.toLowerCase()) return false
    if (product.price < priceRange[0] || product.price > priceRange[1]) return false
    return true
  })

  return (
    <div className="min-h-screen pt-32 pb-24 bg-velvet-black">
      {/* Header */}
      <motion.div
        className="max-w-7xl mx-auto px-6 mb-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10">
          <div>
            <span className="text-[10px] uppercase tracking-[0.5em] text-velvet-muted mb-4 block">Archive</span>
            <h1 className="font-heading text-5xl md:text-6xl text-velvet-white mb-2 tracking-tight">
              Collection
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-velvet-white/60 hover:text-velvet-white transition-colors cursor-none interactive px-4 py-2 border border-white/5 hover:border-white/20"
            >
              <SlidersHorizontal size={12} />
              Filter
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border border-white/5 hover:border-white/20 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-velvet-white/60 focus:outline-none focus:text-velvet-white cursor-none interactive transition-all"
            >
              <option value="createdAt" className="bg-neutral-900">Newest</option>
              <option value="price-asc" className="bg-neutral-900">Price Low</option>
              <option value="price-desc" className="bg-neutral-900">Price High</option>
              <option value="name" className="bg-neutral-900">A - Z</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-6">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProductGridSkeleton count={6} />
            </motion.div>
          ) : products.length === 0 ? (
            <motion.div
              key="empty-state"
              className="text-center py-40 border border-white/5 rounded-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-velvet-muted mb-8 italic tracking-[0.3em] uppercase text-[10px]">Collection coming soon</p>
              <div className="h-px w-12 bg-white/10 mx-auto" />
            </motion.div>
          ) : filteredProducts.length === 0 ? (
            <motion.div
              key="no-filter-match"
              className="text-center py-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-velvet-muted mb-8 italic tracking-[0.3em] uppercase text-[10px]">No pieces match your selection</p>
              <button
                className="text-[10px] uppercase tracking-[0.3em] text-velvet-white border-b border-white/20 pb-1"
                onClick={() => {
                  setSelectedSize(null)
                  setSelectedCategory(null)
                  setPriceRange([0, 2000])
                }}
              >
                Reset Filters
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="grid"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  slug={product.slug}
                  price={product.price}
                  image={product.images[0]}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        selectedSize={selectedSize}
        selectedCategory={selectedCategory}
        priceRange={priceRange}
        onSizeChange={setSelectedSize}
        onCategoryChange={setSelectedCategory}
        onPriceRangeChange={setPriceRange}
      />
    </div>
  )
}
