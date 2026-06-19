'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { getFullImageUrl } from '@/lib/api'
import { useWishlistStore } from '@/store/wishlistStore'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

const EASE = [0.22, 1, 0.36, 1]

interface ProductCardProps {
  id: string
  name: string
  slug: string
  price: number
  image?: string
  variants?: { id: string; color: string }[]
  index?: number
}

export function ProductCard({ id, name, slug, price, image, variants, index = 0 }: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(id))
  const addToWishlist = useWishlistStore((s) => s.addToWishlist)
  const removeFromWishlist = useWishlistStore((s) => s.removeFromWishlist)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const router = useRouter()

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/product/${slug}`)}`)
      return
    }
    if (isWishlisted) {
      removeFromWishlist(id)
    } else {
      addToWishlist(id)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: EASE }}
      className="relative"
    >
      <Link href={`/product/${slug}`} className="block group">
        <div className="relative aspect-[4/5] bg-neutral-900 overflow-hidden mb-5">
          <button
            onClick={handleWishlist}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isWishlisted ? '#ef4444' : 'none'}
              stroke={isWishlisted ? '#ef4444' : 'white'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <motion.div
            className="absolute inset-0"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <Image
              src={getFullImageUrl(image)}
              alt={name}
              fill
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                console.warn(`Image failed to load for ${name}: ${image}`)
                setImgLoaded(true)
              }}
              className={[
                'object-cover transition-all duration-700',
                'group-hover:brightness-[1.06]',
                imgLoaded ? 'opacity-100' : 'opacity-20',
              ].join(' ')}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </motion.div>
        </div>

        <div className="space-y-[6px]">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-heading text-[15px] font-semibold text-velvet-white tracking-wide leading-snug flex-1">
              {name}
            </h3>
            {variants && variants.length > 1 && (
              <div className="flex gap-1 mt-1">
                {variants.slice(0, 4).map((v) => (
                  <div
                    key={v.id}
                    className="w-2 h-2 rounded-full border border-white/10"
                    style={{ backgroundColor: v.color }}
                  />
                ))}
                {variants.length > 4 && (
                  <span className="text-[8px] text-velvet-muted leading-none">+{variants.length - 4}</span>
                )}
              </div>
            )}
          </div>
          <p className="text-[10px] font-medium text-velvet-muted tracking-[0.32em] uppercase">
            {formatPrice(price)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
