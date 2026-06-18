'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { apiFetch, getFullImageUrl } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
// Hero3D with 3D rotating shoes
const Hero3D = dynamic(() => import('@/components/hero/Hero3D').then(mod => ({ default: mod.Hero3D })), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-[#060606] flex items-center justify-center">
    <div className="text-white text-xl">Loading 3D Experience...</div>
  </div>,
})

interface Product {
  id: string
  name: string
  slug: string
  price: number
  category: string
  image?: string // Standardized key
  imageUrl?: string // Alternative key
  isOnSale?: boolean
  salePercentage?: number
  salePrice?: number | null
  summerSale?: boolean
  variants: {
    id: string
    color: string
    images: string[]
    sizes: { size: string; stock: number }[]
  }[]
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await apiFetch('/products?featured=true&limit=4')
        const data = await res.json()
        if (data.success) {
          const products = data.data?.products ?? []
          setProducts(products.slice(0, 4))
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
        // Fallback: try regular products if featured fails
        try {
          const fallbackRes = await apiFetch('/products?limit=4')
          const fallbackData = await fallbackRes.json()
          if (fallbackData.success) {
            setProducts(fallbackData.data?.products?.slice(0, 4) ?? [])
          }
        } catch (fallbackError) {
          console.error('Fallback fetch also failed:', fallbackError)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Get product image - prioritize variants.images, then image/imageUrl, then fallback
  const getProductImage = (product: Product): string => {
    // First try variant images (standard way for multi-image products)
    if (product.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0]
      if (firstVariant.images && firstVariant.images.length > 0) {
        return getFullImageUrl(firstVariant.images[0])
      }
    }
    // Then try standardized image field
    if (product.image) {
      return getFullImageUrl(product.image)
    }
    // Then try legacy/alternative imageUrl field
    if (product.imageUrl) {
      return getFullImageUrl(product.imageUrl)
    }
    // Fallback to placeholder
    return '/images/placeholder-product.png'
  }

  // Check if image URL is external
  const isExternalImage = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://')
  }

  return (
    <div className="relative">
      {/* Hero Section with 3D Rotating Shoes */}
      <section className="relative h-screen">
        <Hero3D />
      </section>

      <section className="bg-velvet-card/40 py-16 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-black/30 p-10 shadow-2xl shadow-black/20">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-velvet-muted">New experience</p>
              <h2 className="text-4xl font-heading uppercase tracking-[0.06em] text-velvet-white sm:text-5xl">
                Velvet Vault — play for points, redeem for offers.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-velvet-muted sm:text-base">
                Play the Velvet Vault challenge to earn points from style picks, streaks, and daily missions.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:items-end">
              <Link href="/game" aria-label="Open Velvet Vault game" className="group block w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/10 transition hover:border-velvet-accent">
                <div className="relative w-full aspect-[9/16] sm:aspect-[16/9] overflow-hidden">
                  {/* Desktop Banner Image */}
                  <Image
                    src="/images/Velvet Vault For PC.png"
                    alt="New Velvet Vault game launch banner"
                    fill
                    className="hidden sm:block object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {/* Mobile Banner Image - Container only visible on mobile */}
                  <div className="block sm:hidden absolute inset-0">
                    <Image
                      src="/images/Velvet Vault For Mobile.png"
                      alt="New Velvet Vault game launch banner mobile"
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="100vw"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/30 transition group-hover:bg-black/20" />
                  <div className="absolute inset-x-6 bottom-6 rounded-3xl bg-black/50 px-5 py-4 backdrop-blur-sm">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">New launch</p>
                    <h3 className="mt-2 text-2xl font-heading uppercase tracking-[0.08em] text-white">Play Velvet Vault</h3>
                    <p className="mt-2 text-sm text-velvet-muted">Tap the banner to launch the game and earn points for checkout rewards.</p>
                  </div>
                </div>
              </Link>
              <p className="text-sm text-velvet-muted">
                Points can be used later at checkout for discounts, free shipping, and limited access drops.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="relative py-20 px-6 bg-velvet-black">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-4xl md:text-5xl mb-6 uppercase tracking-wide">
              Featured Collection
            </h2>
            <p className="text-velvet-muted max-w-2xl mx-auto">
              Discover our carefully curated selection of premium footwear, designed for those who appreciate the art of silence.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <div className="w-12 h-[1px] bg-white/10 relative overflow-hidden mx-auto">
                  <div className="absolute inset-0 bg-velvet-white animate-loading-bar" />
                </div>
              </div>
            ) : (
              products.map((product, index) => {
                const productImage = getProductImage(product)
                return (
                  <div key={product.id} className="bg-velvet-dark border border-white/10 overflow-hidden group">
                    {/* Product Image */}
                    <div className="relative aspect-square bg-velvet-black overflow-hidden">
                      {isExternalImage(productImage) ? (
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
                      <h3 className="text-xl font-heading mb-2">{product.name}</h3>
                      <p className="text-velvet-muted mb-2 text-sm">{product.category}</p>
                      <div className="flex items-baseline gap-2 mb-4">
                        {product.isOnSale && product.salePrice && product.salePrice < product.price ? (
                          <>
                            <span className="text-velvet-white font-medium">
                              {formatPrice(product.salePrice)}
                            </span>
                            <span className="text-velvet-muted/75 text-xs line-through">
                              {formatPrice(product.price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-velvet-white font-medium">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/product/${product.slug}`}
                        className="inline-block px-4 py-2 border border-white/20 text-xs uppercase tracking-wider hover:bg-white/5 transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {!isLoading && products.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-16"
            >
              <Link
                href="/collection"
                className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-[10px] tracking-[0.3em] uppercase hover:bg-white/5 transition-all duration-300"
              >
                View Full Collection
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}
