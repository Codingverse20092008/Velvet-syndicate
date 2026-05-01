'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ProductGallery } from '@/components/product/ProductGallery'
import { SizeSelector } from '@/components/product/SizeSelector'
import { Button } from '@/components/ui/Button'
import { useCartStore } from '@/store/cartStore'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { events } from '@/lib/analytics'

interface Variant {
  id: string
  name: string
  color: string
  slug: string | null
  images: string[]
  sizes: { size: string; stock: number }[]
}

interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  category: string
  featured: boolean
  variants: Variant[]
}

const RECENTLY_VIEWED_KEY = 'velvet_recently_viewed'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const { addItem, toggleCart } = useCartStore()

  useEffect(() => {
    if (slug) {
      fetchProduct(slug)
    }
  }, [slug])

  const fetchProduct = async (slug: string) => {
    try {
      const res = await fetch(`/api/products/${slug}`)
      const data = await res.json()
      if (data.success) {
        const p = data.data.product
        setProduct(p)
        if (p.variants && p.variants.length > 0) {
          setSelectedVariantId(p.variants[0].id)
        }
      } else {
        setProduct(null)
      }
    } catch (error) {
      console.error('Failed to fetch product:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedVariant = product?.variants.find(v => v.id === selectedVariantId) || product?.variants[0]

  useEffect(() => {
    if (!product) return
    events.viewProduct(product.id)
    const primaryImage = product.variants?.[0]?.images?.[0] || ''
    const entry = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      imageUrl: primaryImage,
      viewedAt: Date.now(),
    }

    try {
      const existingRaw = localStorage.getItem(RECENTLY_VIEWED_KEY)
      const existing = existingRaw ? JSON.parse(existingRaw) : []
      const next = [entry, ...(Array.isArray(existing) ? existing : [])]
        .filter((item, index, arr) => index === arr.findIndex((x: any) => x.id === item.id))
        .slice(0, 12)
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next))
    } catch {
      // Ignore local storage failures silently.
    }
  }, [product])

  const handleAddToCart = () => {
    if (!product || !selectedVariant || !selectedSize) return

    setIsAdding(true)

    // Simulate animation delay
    setTimeout(() => {
      addItem({
        id: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        variantName: selectedVariant.name !== 'Standard' ? selectedVariant.name : undefined,
        slug: product.slug,
        price: product.price,
        image: selectedVariant.images[0] || '',
        size: selectedSize,
      })
      events.addToCart(product.id, 1)
      setIsAdding(false)
      toggleCart()
    }, 600)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <motion.div
          className="w-10 h-10 border-2 border-velvet-accent border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center text-center">
        <div>
          <p className="text-velvet-muted mb-4">Product not found</p>
          <Link href="/collection">
            <Button variant="outline">Back to Collection</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Back Link */}
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <Link
          href="/collection"
          className="inline-flex items-center gap-2 text-sm text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive"
        >
          <ArrowLeft size={16} />
          Back to Collection
        </Link>
      </div>

      {/* Product Content */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.215, 0.61, 0.355, 1] }}
            key={product.id} // Reset animation on product change
          >
            <ProductGallery 
              images={selectedVariant?.images || []} 
              productName={product.name} 
            />
          </motion.div>

          {/* Product Info */}
          <motion.div
            className="flex flex-col justify-center"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.215, 0.61, 0.355, 1] }}
          >
            <h1 className="font-heading text-4xl md:text-5xl text-velvet-white mb-3">
              {product.name}
            </h1>
            <p className="text-2xl text-velvet-accent mb-8">
              {formatPrice(product.price)}
            </p>

            <motion.div
              className="prose prose-invert mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p className="text-velvet-muted font-light leading-relaxed">
                {product.description}
              </p>
            </motion.div>

            {/* Size Selector */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <SizeSelector
                availableSizes={(selectedVariant?.sizes || []).map(s => s.size)}
                selectedSize={selectedSize}
                onSelectSize={setSelectedSize}
                stock={Object.fromEntries((selectedVariant?.sizes || []).map(s => [s.size, s.stock]))}
              />
            </motion.div>

            {/* Add to Cart */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button
                className="w-full"
                size="lg"
                onClick={handleAddToCart}
                disabled={!selectedSize}
                isLoading={isAdding}
              >
                {selectedSize ? 'Add to Selection' : 'Select a Size'}
              </Button>
            </motion.div>

            {/* Additional Info */}
            <motion.div
              className="space-y-4 pt-8 border-t border-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {/* Color Name Display */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-velvet-muted">Color</span>
                <span className="text-velvet-white capitalize">{selectedVariant?.name || 'Standard'}</span>
              </div>
              
              {/* Selected Size Display */}
              {selectedSize && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-velvet-muted">Selected Size</span>
                  <span className="text-velvet-white font-medium">UK {selectedSize}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-velvet-muted">Category</span>
                <span className="text-velvet-white capitalize">{product.category}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-velvet-muted">Shipping</span>
                <span className="text-velvet-white">Complimentary</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-velvet-muted">Returns</span>
                <span className="text-velvet-white">30 days</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Story Section */}
      <motion.section
        className="max-w-4xl mx-auto px-6 mt-32 text-center"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="font-heading text-3xl text-velvet-white mb-6">
          The Story Behind
        </h2>
        <p className="text-velvet-muted font-light leading-relaxed">
          Every Velvet Syndicate piece emerges from the intersection of silence and presence.
          Crafted with intention, designed for those who understand that true luxury
          doesn&apos;t announce itself—it simply exists.
        </p>
      </motion.section>
    </div>
  )
}
