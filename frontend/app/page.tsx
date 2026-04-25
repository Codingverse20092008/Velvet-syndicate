'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ProductCard } from '@/components/product/ProductCard'
import { AboutSection } from '@/components/home/AboutSection'
import { ProductGridSkeleton } from '@/components/product/ProductSkeleton'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { apiFetch } from '@/lib/api'
import Image from 'next/image'

const EASE = [0.22, 1, 0.36, 1]

// Hero3D already isolates all r3f code internally via its own dynamic import
const Hero3D = dynamic(() => import('@/components/hero/Hero3D').then(mod => mod.Hero3D), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-[#060606]" />,
})

function HeroFallback() {
  return (
    <div className="relative w-full h-screen bg-velvet-black flex items-center justify-center overflow-hidden">
      {/* Radial vignette — matches 3D version */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.72) 100%)' }}
      />
      <Image
        src="/images/sneaker-fallback.png"
        alt="Premium Velvet Sneaker"
        fill
        className="object-contain p-20 opacity-70"
        priority
      />
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
        <div className="text-center px-6">
          <p className="text-[10px] uppercase tracking-[0.55em] text-velvet-muted mb-6">
            Velvet Syndicate
          </p>
          <h1
            className="font-heading text-5xl md:text-7xl lg:text-8xl text-velvet-white mb-8 tracking-tight leading-none"
            style={{ textShadow: '0 2px 40px rgba(0,0,0,0.6)' }}
          >
            Built Quiet.<br />
            <span className="italic text-velvet-muted/80">Worn Loud.</span>
          </h1>
          <a
            href="/collection"
            className="inline-flex items-center gap-3 px-10 py-4 border border-white/15 text-velvet-white text-[10px] tracking-[0.42em] uppercase hover:bg-velvet-white hover:text-black transition-all duration-500"
          >
            Explore Collection
          </a>
        </div>
      </div>
    </div>
  )
}


export default function HomePage() {
  return (
    <div className="bg-velvet-black min-h-screen">
      {/* 1. Hero Section with 3D Model */}
      <ErrorBoundary fallback={<HeroFallback />}>
        <Hero3D />
      </ErrorBoundary>

      {/* 2. About Section */}
      <AboutSection />

      {/* 3. Featured Products */}
      <FeaturedProductsSection />

      {/* 4. Brand Statement — tighter vertical padding removes dead space */}
      <section className="py-28 flex items-center justify-center bg-velvet-black px-6">
        <motion.div
          className="max-w-2xl text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, ease: EASE }}
        >
          <p className="font-heading text-3xl md:text-5xl text-velvet-white leading-[1.2] tracking-tight">
            Built in silence.<br />
            <span className="italic text-velvet-muted/50">Revealed in presence.</span>
          </p>
        </motion.div>
      </section>

      {/* CTA Section — py-28 matches brand statement rhythm */}
      <section className="py-28 flex items-center justify-center bg-velvet-dark px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
          className="flex flex-col items-center gap-5 text-center"
        >
          <p className="text-[10px] uppercase tracking-[0.45em] text-velvet-muted">Ready to begin?</p>
          <Link href="/collection">
            <motion.button
              className="px-12 py-[15px] border border-white/15 text-velvet-white text-[10px] tracking-[0.42em] uppercase
                         hover:bg-velvet-white hover:text-black transition-all duration-[420ms] select-none"
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              Enter the Collection
            </motion.button>
          </Link>
        </motion.div>
      </section>
    </div>
  )
}

function FeaturedProductsSection() {
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProducts() {
      try {
        // Try fetching featured products explicitly first
        const res = await apiFetch('/products?featured=true&limit=6')
        const json = await res.json()
        
        if (json.success && json.data?.products?.length > 0) {
          setProducts(json.data.products)
        } else {
          // Fallback: Fetch any products if no featured ones are found
          const fallbackRes = await apiFetch('/products?limit=6')
          const fallbackJson = await fallbackRes.json()
          if (fallbackJson.success && fallbackJson.data?.products) {
            setProducts(fallbackJson.data.products)
          }
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
    <section className="py-24 bg-velvet-black px-6 md:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <div>
            <span className="text-[10px] uppercase tracking-[0.45em] text-velvet-muted/60 mb-3 block">Selected Pieces</span>
            <h2 className="font-heading text-3xl md:text-4xl text-velvet-white tracking-tight">Featured</h2>
          </div>
          <Link
            href="/collection"
            className="text-[9px] uppercase tracking-[0.38em] text-velvet-muted/60 hover:text-velvet-white transition-colors duration-300 pb-px border-b border-white/10 hover:border-white/30 self-end md:self-auto"
          >
            View All
          </Link>
        </motion.div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" exit={{ opacity: 0, transition: { duration: 0.3 } }}>
              <ProductGridSkeleton count={3} />
            </motion.div>
          ) : (
            <motion.div
              key="products"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              {products.map((product, index) => (
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
    </section>
  )
}
