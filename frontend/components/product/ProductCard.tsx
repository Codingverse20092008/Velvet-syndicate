'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { formatPrice } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1]

interface ProductCardProps {
  id: string
  name: string
  slug: string
  price: number
  image: string
  index?: number
}

export function ProductCard({ id, name, slug, price, image, index = 0 }: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: EASE }}
    >
      <Link href={`/product/${slug}`} className="block group">
        {/* Image container — subtle scale + brightness on hover, no jarring transforms */}
        <div className="relative aspect-[4/5] bg-neutral-900 overflow-hidden mb-5">
          <motion.div
            className="absolute inset-0"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <Image
              src={image || '/placeholder.jpg'}
              alt={name}
              fill
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                // If the primary image fails, try a fallback or just show the card
                console.warn(`Image failed to load for ${name}: ${image}`)
                setImgLoaded(true) // Show the card even if image failed
              }}
              className={[
                'object-cover transition-all duration-700',
                'group-hover:brightness-[1.06]',
                imgLoaded ? 'opacity-100' : 'opacity-20', // Show dimmed version if loading/failed
              ].join(' ')}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </motion.div>
        </div>

        {/* Text hierarchy: name prominent, price recedes */}
        <div className="space-y-[6px]">
          <h3 className="font-heading text-[15px] font-semibold text-velvet-white tracking-wide leading-snug">
            {name}
          </h3>
          <p className="text-[10px] font-light text-velvet-muted/70 tracking-[0.32em] uppercase">
            {formatPrice(price)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
