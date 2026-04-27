'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { ProductCard } from '@/components/product/ProductCard'
import { apiFetch } from '@/lib/api'

interface RecommendationProduct {
  id: string
  name: string
  slug: string
  price: number
  imageUrl: string
}

interface RecentProduct {
  id: string
  name: string
  slug: string
  price: number
  imageUrl?: string
}

interface GrowthStats {
  lastOrderStatus: string | null
  activeOrder: { id: string; status: string } | null
}

const STORAGE_KEY = 'velvet_recently_viewed'

function loadRecentlyViewed(): RecentProduct[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function Recommendations() {
  const { isAuthenticated, user } = useAuthStore()
  const [recentlyViewed, setRecentlyViewed] = useState<RecentProduct[]>([])
  const [buyAgain, setBuyAgain] = useState<RecommendationProduct[]>([])
  const [mayAlsoLike, setMayAlsoLike] = useState<RecommendationProduct[]>([])
  const [stats, setStats] = useState<GrowthStats | null>(null)

  useEffect(() => {
    setRecentlyViewed(loadRecentlyViewed())
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return
      try {
        const [recommendationsRes, statsRes] = await Promise.all([
          apiFetch('/user/recommendations?limit=6'),
          apiFetch('/user/stats'),
        ])
        const recommendationsData = await recommendationsRes.json()
        const statsData = await statsRes.json()

        if (recommendationsData?.success) {
          setBuyAgain(recommendationsData.data?.recommendations?.buyAgain ?? [])
          setMayAlsoLike(recommendationsData.data?.recommendations?.mayAlsoLike ?? [])
        }
        if (statsData?.success) {
          setStats({
            lastOrderStatus: statsData.data?.stats?.lastOrderStatus ?? null,
            activeOrder: statsData.data?.stats?.activeOrder ?? null,
          })
        }
      } catch {
        // Keep section silent on failure to avoid homepage friction.
      }
    }
    fetchData()
  }, [isAuthenticated])

  const welcomeMessage = useMemo(() => {
    if (!isAuthenticated) return null
    if (stats?.activeOrder) {
      return 'Your order is on the way.'
    }
    if (stats?.lastOrderStatus === 'DELIVERED') {
      return 'Order delivered — explore more.'
    }
    return `Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}.`
  }, [isAuthenticated, stats, user?.name])

  return (
    <section className="py-20 bg-velvet-black px-6 md:px-10 lg:px-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto space-y-14">
        {welcomeMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/10 bg-velvet-dark px-5 py-4 text-sm text-velvet-white flex flex-wrap items-center justify-between gap-3"
          >
            <div>{welcomeMessage}</div>
            {stats?.activeOrder && (
              <Link href={`/orders/${stats.activeOrder.id}`} className="text-[10px] uppercase tracking-widest text-velvet-accent hover:text-white">
                Track Active Order
              </Link>
            )}
          </motion.div>
        )}

        {recentlyViewed.length > 0 && (
          <div>
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-[10px] uppercase tracking-[0.45em] text-velvet-muted mb-2 block">For You</span>
                <h2 className="font-heading text-3xl text-velvet-white tracking-tight">Recently Viewed</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {recentlyViewed.slice(0, 6).map((product, index) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  slug={product.slug}
                  price={product.price}
                  image={product.imageUrl}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        {buyAgain.length > 0 && (
          <div>
            <div className="flex items-end justify-between mb-8">
              <h2 className="font-heading text-3xl text-velvet-white tracking-tight">Buy Again</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {buyAgain.map((product, index) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  slug={product.slug}
                  price={product.price}
                  image={product.imageUrl}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        {mayAlsoLike.length > 0 && (
          <div>
            <div className="flex items-end justify-between mb-8">
              <h2 className="font-heading text-3xl text-velvet-white tracking-tight">You May Also Like</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {mayAlsoLike.map((product, index) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  slug={product.slug}
                  price={product.price}
                  image={product.imageUrl}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-velvet-dark p-5">
            <p className="text-[10px] uppercase tracking-widest text-velvet-muted mb-2">COD Trust</p>
            <p className="text-sm text-velvet-white">Pay only when your order arrives.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-velvet-dark p-5">
            <p className="text-[10px] uppercase tracking-widest text-velvet-muted mb-2">Returns</p>
            <p className="text-sm text-velvet-white">Easy returns available.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
