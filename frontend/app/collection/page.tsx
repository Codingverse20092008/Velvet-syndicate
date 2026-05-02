'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { apiFetch, getFullImageUrl } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  category: string
  gender: string
  productType: string
  imageUrl?: string
  variants: {
    id: string
    color: string
    images: string[]
    sizes: { size: string; stock: number }[]
  }[]
}

export default function CollectionPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiFetch('/products')
        const data = await response.json()
        
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

  // Get product image - prioritize variants.images, then imageUrl, then fallback
  const getProductImage = (product: Product): string => {
    // First try variant images
    if (product.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0]
      if (firstVariant.images && firstVariant.images.length > 0) {
        return getFullImageUrl(firstVariant.images[0])
      }
    }
    // Then try imageUrl
    if (product.imageUrl) {
      return getFullImageUrl(product.imageUrl)
    }
    // Fallback to placeholder
    return '/images/placeholder-product.png'
  }

  // Check if image URL is external (needs unoptimized loading)
  const isExternalImage = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://')
  }

  return (
    <div className="min-h-screen bg-velvet-black px-6 py-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-heading text-4xl md:text-5xl mb-6 uppercase tracking-wide text-white">
            Collection
          </h1>
          <p className="text-velvet-muted max-w-2xl mx-auto">
            Discover our complete collection of premium footwear
          </p>
        </div>

        {/* Results Header */}
        <div className="mb-8 flex justify-between items-center">
          <p className="text-velvet-muted">
            {isLoading ? 'Loading...' : `${products.length} products found`}
          </p>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-12 h-[1px] bg-white/10 relative overflow-hidden mx-auto">
              <div className="absolute inset-0 bg-velvet-white animate-loading-bar" />
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-velvet-muted mb-4">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, index) => {
              const productImage = getProductImage(product)
              return (
                <div key={product.id} className="bg-velvet-dark border border-white/10 overflow-hidden group">
                  {/* Product Image */}
                  <div className="relative aspect-square bg-velvet-black overflow-hidden">
                    {isExternalImage(productImage) ? (
                      // External images - use regular img with unoptimized loading
                      <img
                        src={productImage}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/images/placeholder-product.png'
                        }}
                      />
                    ) : (
                      // Local images - use Next.js Image optimization
                      <Image
                        src={productImage}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        unoptimized={isExternalImage(productImage)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/images/placeholder-product.png'
                        }}
                      />
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-heading mb-2 text-white">{product.name}</h3>
                    <p className="text-velvet-muted mb-2 text-sm">{product.category}</p>
                    <p className="text-white mb-4 font-medium">{formatPrice(product.price)}</p>
                    <Link
                      href={`/product/${product.slug}`}
                      className="inline-block px-4 py-2 border border-white/20 text-xs uppercase tracking-wider hover:bg-white/5 transition-colors text-white"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
