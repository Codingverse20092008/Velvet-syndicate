'use client'

/**
 * TrendingDrops.tsx
 * -----------------
 * High-converting product showcase section for homepage
 *
 * Features:
 * - 4-column responsive grid (desktop) → 2-column (mobile)
 * - Smooth hover animations with zoom effect
 * - Dynamic badges (NEW, EXCLUSIVE, XP BONUS)
 * - Quick "Add to Cart" on hover
 * - Mobile-optimized with optional horizontal scroll
 * - Dark streetwear aesthetic matching brand
 */

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ShoppingCart, ArrowRight, Zap } from 'lucide-react'
import { apiFetch, getFullImageUrl } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  category: string
  image?: string
  imageUrl?: string
  isNew?: boolean
  isExclusive?: boolean
  hasXPBonus?: boolean
  salePrice?: number | null
  variants: {
    id: string
    color: string
    images: string[]
    sizes: { size: string; stock: number }[]
  }[]
}

export function TrendingDrops() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const { addItem } = useCartStore()

  useEffect(() => {
    const fetchTrendingProducts = async () => {
      try {
        // Fetch featured/trending products
        const res = await apiFetch('/products?featured=true&limit=8')
        const data = await res.json()
        if (data.success) {
          const products = data.data?.products ?? []
          setProducts(products.slice(0, 8))
        }
      } catch (error) {
        console.error('Failed to fetch trending products:', error)
        // Fallback: try regular products
        try {
          const fallbackRes = await apiFetch('/products?limit=8')
          const fallbackData = await fallbackRes.json()
          if (fallbackData.success) {
            setProducts(fallbackData.data?.products?.slice(0, 8) ?? [])
          }
        } catch (fallbackError) {
          console.error('Fallback fetch also failed:', fallbackError)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrendingProducts()
  }, [])

  // Get product image - prioritize variants.images, then image/imageUrl
  const getProductImage = (product: Product): string => {
    if (product.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0]
      if (firstVariant.images && firstVariant.images.length > 0) {
        return getFullImageUrl(firstVariant.images[0])
      }
    }
    if (product.image) return getFullImageUrl(product.image)
    if (product.imageUrl) return getFullImageUrl(product.imageUrl)
    return '/images/placeholder-product.png'
  }

  // Check if image URL is external
  const isExternalImage = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://')
  }

  // Get badge info
  const getBadge = (product: Product) => {
    if (product.isNew) return { text: 'NEW', color: 'bg-green-500' }
    if (product.isExclusive) return { text: 'EXCLUSIVE', color: 'bg-purple-500' }
    if (product.hasXPBonus) return { text: 'XP BONUS', color: 'bg-[#C9A961]' }
    return null
  }

  // Quick add to cart
  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Get first available variant and size
    const firstVariant = product.variants?.[0]
    const firstAvailableSize = firstVariant?.sizes?.find(s => s.stock > 0)

    if (firstVariant && firstAvailableSize) {
      addItem({
        id: product.id,
        variantId: firstVariant.id,
        variantName: firstVariant.color,
        slug: product.slug,
        size: firstAvailableSize.size,
        name: product.name,
        price: product.salePrice ?? product.price,
        image: getProductImage(product),
      })
    }
  }

  return (
    <section className="relative bg-black py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-10 sm:mb-12 lg:mb-16">
          <div>
            <motion.h2
              className="font-heading text-3xl sm:text-4xl lg:text-5xl text-white uppercase tracking-tight mb-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Trending Drops
            </motion.h2>
            <motion.p
              className="text-sm sm:text-base text-gray-400 tracking-wide"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Exclusive pairs selling out fast
            </motion.p>
          </div>

          {/* View All Link - Desktop */}
          <Link
            href="/collection"
            className="hidden sm:flex items-center gap-2 text-sm uppercase tracking-[0.15em] text-gray-400 hover:text-white transition-colors duration-300 group"
          >
            View All Sneakers
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#121212] border border-[#262626] rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-square bg-neutral-900" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-800 rounded w-1/2" />
                  <div className="h-5 bg-neutral-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Product Grid - Desktop/Tablet */}
        {!isLoading && products.length > 0 && (
          <>
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product, index) => {
                const productImage = getProductImage(product)
                const badge = getBadge(product)
                const isHovered = hoveredCard === product.id

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    onMouseEnter={() => setHoveredCard(product.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <Link href={`/product/${product.slug}`} className="group block">
                      <div className="bg-[#121212] border border-[#262626] rounded-lg overflow-hidden transition-all duration-300 hover:border-[#3a3a3a] hover:shadow-2xl hover:shadow-black/50">

                        {/* Image Container */}
                        <div className="relative aspect-square bg-neutral-900 overflow-hidden">
                          <Image
                            src={productImage}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/images/placeholder-product.png'
                            }}
                          />

                          {/* Badge */}
                          {badge && (
                            <div className={`absolute top-3 left-3 ${badge.color} px-3 py-1 rounded-full`}>
                              <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                {badge.text === 'XP BONUS' && <Zap size={10} fill="currentColor" />}
                                {badge.text}
                              </span>
                            </div>
                          )}

                          {/* Quick Add to Cart - Shows on Hover */}
                          <motion.button
                            onClick={(e) => handleQuickAdd(product, e)}
                            className="absolute bottom-3 right-3 bg-white text-black p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-gray-200"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <ShoppingCart size={18} />
                          </motion.button>
                        </div>

                        {/* Product Info */}
                        <div className="p-4 space-y-2">
                          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500">
                            {product.category}
                          </p>
                          <h3 className="text-base font-semibold text-white line-clamp-2 leading-tight">
                            {product.name}
                          </h3>
                          <div className="flex items-baseline gap-2 pt-1">
                            {product.salePrice && product.salePrice < product.price ? (
                              <>
                                <span className="text-lg font-bold text-white">
                                  {formatPrice(product.salePrice)}
                                </span>
                                <span className="text-sm text-gray-500 line-through">
                                  {formatPrice(product.price)}
                                </span>
                              </>
                            ) : (
                              <span className="text-lg font-bold text-white">
                                {formatPrice(product.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>

            {/* Horizontal Scroll - Mobile Only */}
            <div className="sm:hidden -mx-4 px-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              <div className="flex gap-4 pb-4">
                {products.map((product, index) => {
                  const productImage = getProductImage(product)
                  const badge = getBadge(product)

                  return (
                    <motion.div
                      key={product.id}
                      className="snap-start flex-shrink-0 w-[75vw] max-w-[280px]"
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                    >
                      <Link href={`/product/${product.slug}`}>
                        <div className="bg-[#121212] border border-[#262626] rounded-lg overflow-hidden">

                          {/* Image Container */}
                          <div className="relative aspect-square bg-neutral-900 overflow-hidden">
                            <Image
                              src={productImage}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = '/images/placeholder-product.png'
                              }}
                            />

                            {/* Badge */}
                            {badge && (
                              <div className={`absolute top-3 left-3 ${badge.color} px-2.5 py-1 rounded-full`}>
                                <span className="text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                  {badge.text === 'XP BONUS' && <Zap size={9} fill="currentColor" />}
                                  {badge.text}
                                </span>
                              </div>
                            )}

                            {/* Quick Add - Always Visible on Mobile */}
                            <button
                              onClick={(e) => handleQuickAdd(product, e)}
                              className="absolute bottom-3 right-3 bg-white text-black p-2.5 rounded-lg active:scale-95 transition-transform"
                            >
                              <ShoppingCart size={16} />
                            </button>
                          </div>

                          {/* Product Info */}
                          <div className="p-3 space-y-1.5">
                            <p className="text-[9px] uppercase tracking-[0.15em] text-gray-500">
                              {product.category}
                            </p>
                            <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight">
                              {product.name}
                            </h3>
                            <div className="flex items-baseline gap-2 pt-1">
                              {product.salePrice && product.salePrice < product.price ? (
                                <>
                                  <span className="text-base font-bold text-white">
                                    {formatPrice(product.salePrice)}
                                  </span>
                                  <span className="text-xs text-gray-500 line-through">
                                    {formatPrice(product.price)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-base font-bold text-white">
                                  {formatPrice(product.price)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* View All Link - Mobile */}
        <div className="sm:hidden mt-8 text-center">
          <Link
            href="/collection"
            className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.15em] text-gray-400 active:text-white transition-colors"
          >
            View All Sneakers
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  )
}
