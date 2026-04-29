'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  category: string
  gender: string
  productType: string
  variants: {
    id: string
    color: string
    images: string[]
    sizes: { size: string; stock: number }[]
  }[]
}

export function CollectionContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        const response = await apiFetch('/products')
        const data = await response.json()
        
        console.log('Collection API Response:', data)
        
        if (data.success) {
          setProducts(data.data.products || [])
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  return (
    <div className="min-h-screen bg-velvet-black px-6 py-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="font-heading text-4xl md:text-5xl mb-6 uppercase tracking-wide">
            Collection
          </h1>
          <p className="text-velvet-muted max-w-2xl mx-auto">
            Discover our complete collection of premium footwear
          </p>
        </motion.div>

        {/* Results Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex justify-between items-center"
        >
          <p className="text-velvet-muted">
            {isLoading ? 'Loading...' : `${products.length} products found`}
          </p>
        </motion.div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-12 h-[1px] bg-white/10 relative overflow-hidden mx-auto">
              <div className="absolute inset-0 bg-velvet-white animate-loading-bar" />
            </div>
          </div>
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <p className="text-velvet-muted mb-4">No products found</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {products.map((product, index) => (
              <div key={product.id} className="bg-velvet-dark border border-white/10 p-6">
                <h3 className="text-xl font-heading mb-2">{product.name}</h3>
                <p className="text-velvet-muted mb-2">{product.category}</p>
                <p className="text-velvet-white mb-4">${product.price}</p>
                <Link
                  href={`/product/${product.slug}`}
                  className="inline-block px-4 py-2 border border-white/20 text-xs uppercase tracking-wider hover:bg-white/5 transition-colors"
                >
                  View Details
                </Link>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
