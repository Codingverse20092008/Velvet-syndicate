'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { apiFetch, getFullImageUrl } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'

interface ProductVariant {
  id: string
  color: string
  images: string[]
  sizes: { size: string; stock: number }[]
}

interface SummerSaleProduct {
  id: string
  name: string
  slug: string
  price: number
  salePrice?: number | null
  summerSale?: boolean
  image?: string
  imageUrl?: string
  variants: ProductVariant[]
}

export default function SummerSalePage() {
  const [products, setProducts] = useState<SummerSaleProduct[]>([])
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const { addItem, toggleCart } = useCartStore()

  useEffect(() => {
    const loadSummerSale = async () => {
      try {
        const res = await apiFetch('/products?summerSale=true&limit=60')
        const data = await res.json()
        if (!data.success) return
        const rows = (data.data?.products ?? []) as SummerSaleProduct[]
        setProducts(rows)

        const defaults: Record<string, string> = {}
        rows.forEach((p) => {
          const firstVariant = p.variants?.[0]
          const firstInStockSize = firstVariant?.sizes?.find((s) => s.stock > 0)?.size
          if (firstInStockSize) defaults[p.id] = firstInStockSize
        })
        setSelectedSize(defaults)
      } catch (error) {
        console.error('Failed to load summer sale products:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSummerSale()
  }, [])

  const hasProducts = useMemo(() => products.length > 0, [products])

  const getCardImage = (product: SummerSaleProduct) => {
    const variantImage = product.variants?.[0]?.images?.[0]
    return getFullImageUrl(variantImage || product.image || product.imageUrl || '/images/placeholder-product.png')
  }

  const handleAddToCart = async (product: SummerSaleProduct) => {
    const variant = product.variants?.[0]
    const size = selectedSize[product.id]
    if (!variant || !size) return

    setAddingId(product.id)
    try {
      await addItem({
        id: product.id,
        variantId: variant.id,
        variantName: variant.color !== 'Standard' ? variant.color : undefined,
        name: product.name,
        slug: product.slug,
        price: product.salePrice ?? product.price,
        image: variant.images?.[0] || product.image || '',
        size,
      })
      toggleCart()
    } finally {
      setAddingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-velvet-black px-4 sm:px-6 md:px-10 lg:px-16 py-20 md:py-24">
      <div className="max-w-7xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 md:mb-14"
        >
          <p className="text-[10px] uppercase tracking-[0.28em] text-amber-100/80 mb-3">Seasonal Campaign</p>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl uppercase tracking-[0.08em] text-velvet-white leading-[0.95]">
            Summer Sale Collection
          </h1>
          <p className="text-velvet-muted text-sm sm:text-base mt-4">
            Limited Pairs. Limited Time.
          </p>
        </motion.header>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-12 h-[1px] bg-white/10 relative overflow-hidden mx-auto">
              <div className="absolute inset-0 bg-velvet-white animate-loading-bar" />
            </div>
          </div>
        ) : !hasProducts ? (
          <div className="text-center py-20 border border-white/10 rounded-2xl bg-velvet-card">
            <p className="text-velvet-muted uppercase text-xs tracking-[0.2em] mb-3">No Summer Sale Products Yet</p>
            <Link href="/collection" className="inline-flex px-6 py-3 border border-white/20 text-[10px] uppercase tracking-[0.24em] hover:bg-white/5 transition-colors">
              Browse Collection
            </Link>
          </div>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-7">
            {products.map((product, index) => {
              const variant = product.variants?.[0]
              const sizes = variant?.sizes ?? []
              const selected = selectedSize[product.id] ?? ''

              return (
                <motion.article
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55, delay: index * 0.04 }}
                  className="bg-velvet-dark border border-white/10 rounded-2xl overflow-hidden group"
                >
                  <Link href={`/product/${product.slug}`} className="block relative aspect-[4/5] overflow-hidden bg-black">
                    <Image
                      src={getCardImage(product)}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-700 luxury-ease group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute top-3 right-3 rounded-full border border-amber-300/35 bg-black/65 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-amber-100">
                      Summer
                    </div>
                  </Link>

                  <div className="p-4 md:p-5">
                    <Link href={`/product/${product.slug}`} className="block">
                      <h2 className="font-heading text-xl text-velvet-white mb-2 leading-tight">
                        {product.name}
                      </h2>
                    </Link>

                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-velvet-white text-sm md:text-base font-medium">
                        {formatPrice(product.salePrice ?? product.price)}
                      </span>
                      {product.salePrice && product.salePrice < product.price && (
                        <span className="text-velvet-muted/75 text-xs line-through">
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <label className="sr-only" htmlFor={`size-${product.id}`}>Select size for {product.name}</label>
                      <select
                        id={`size-${product.id}`}
                        value={selected}
                        onChange={(e) => setSelectedSize((prev) => ({ ...prev, [product.id]: e.target.value }))}
                        className="w-full bg-black border border-white/15 rounded-xl px-3 py-2.5 text-xs uppercase tracking-[0.18em] text-velvet-white outline-none focus:border-velvet-accent/50"
                      >
                        <option value="" disabled>Select Size</option>
                        {sizes.map((size) => (
                          <option key={`${product.id}-${size.size}`} value={size.size} disabled={size.stock <= 0}>
                            {size.size} {size.stock > 0 ? '' : '(Out)'}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        disabled={!selected || addingId === product.id}
                        className="w-full px-4 py-3 border border-white/20 text-[10px] uppercase tracking-[0.24em] text-velvet-white bg-white/[0.03] hover:bg-white/8 hover:border-white/35 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingId === product.id ? 'Adding...' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}

