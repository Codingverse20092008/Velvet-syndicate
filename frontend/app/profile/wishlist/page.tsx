'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useWishlistStore } from '@/store/wishlistStore'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { getFullImageUrl } from '@/lib/api'
import { Heart, ShoppingBag, Trash2, Search, X } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1]

export default function WishlistPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore()
  const { items, isLoading, fetchWishlist, removeFromWishlist, count } = useWishlistStore()
  const addToCart = useCartStore((s) => s.addItem)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStock, setFilterStock] = useState<'all' | 'in' | 'out'>('all')
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/profile/wishlist')
      return
    }
    if (isAuthenticated) {
      fetchWishlist()
    }
  }, [isAuthenticated, authLoading, router, fetchWishlist])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-velvet-black flex items-center justify-center">
        <div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !user) return null

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    if (filterStock === 'in') return matchesSearch && !item.is_out_of_stock
    if (filterStock === 'out') return matchesSearch && item.is_out_of_stock
    return matchesSearch
  })

  const handleAddToCart = async (item: typeof items[0]) => {
    await addToCart({
      id: item.productId,
      variantId: '',
      name: item.name,
      slug: item.slug,
      price: item.is_on_sale && item.sale_price ? item.sale_price : item.price,
      image: item.image_url,
      size: '',
    })
  }

  const handleRemove = async (productId: string) => {
    setRemovingId(productId)
    await removeFromWishlist(productId)
    setRemovingId(null)
  }

  return (
    <div className="min-h-screen bg-velvet-black pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-10"
        >
          <Link
            href="/profile"
            className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted hover:text-velvet-white transition-colors mb-4 inline-block"
          >
            ← Back to Profile
          </Link>
          <h1 className="font-heading text-4xl md:text-5xl text-velvet-white tracking-tight mt-4">
            Wishlist
          </h1>
          <p className="text-sm text-velvet-muted mt-3">
            {count} {count === 1 ? 'item' : 'items'} saved
          </p>
        </motion.div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-velvet-muted" />
            <input
              type="text"
              placeholder="Search wishlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-velvet-white placeholder:text-velvet-muted focus:outline-none focus:border-white/20 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-velvet-muted hover:text-velvet-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {(['all', 'in', 'out'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStock(f)}
                className={`px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold transition-colors ${
                  filterStock === f
                    ? 'bg-velvet-white text-velvet-black'
                    : 'bg-white/5 text-velvet-muted hover:text-velvet-white border border-white/10'
                }`}
              >
                {f === 'all' ? 'All' : f === 'in' ? 'In Stock' : 'Out Of Stock'}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Heart className="w-12 h-12 text-velvet-muted mx-auto mb-6" />
            <h2 className="text-xl font-heading text-velvet-white mb-2">
              Your Wishlist Is Empty
            </h2>
            <p className="text-sm text-velvet-muted mb-8 max-w-md mx-auto">
              Start saving products you love.
            </p>
            <Link
              href="/collection"
              className="inline-block px-8 py-3 bg-velvet-white text-velvet-black rounded-full text-[10px] uppercase tracking-[0.24em] font-bold hover:bg-white/90 transition-colors"
            >
              Browse Products
            </Link>
          </motion.div>
        )}

        {/* Wishlist Items */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="grid gap-4">
            {filteredItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04, ease: EASE }}
                className={`flex items-center gap-4 p-4 bg-velvet-card border border-white/10 rounded-2xl transition-all ${
                  removingId === item.productId ? 'opacity-40 scale-95' : ''
                }`}
              >
                {/* Product Image */}
                <Link href={`/product/${item.slug}`} className="shrink-0">
                  <div className="w-20 h-20 bg-neutral-900 rounded-xl overflow-hidden">
                    <Image
                      src={getFullImageUrl(item.image_url)}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.slug}`}>
                    <h3 className="text-sm font-semibold text-velvet-white truncate">{item.name}</h3>
                  </Link>
                  <p className="text-[10px] font-medium text-velvet-muted tracking-[0.3em] uppercase mt-1">
                    {formatPrice(item.is_on_sale && item.sale_price ? item.sale_price : item.price)}
                  </p>
                  <p className="text-[9px] text-velvet-muted/60 mt-1">
                    Added {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {item.is_out_of_stock ? (
                    <span className="inline-block mt-1.5 text-[9px] uppercase tracking-[0.2em] text-red-400 font-bold">
                      Out Of Stock
                    </span>
                  ) : (
                    <span className="inline-block mt-1.5 text-[9px] uppercase tracking-[0.2em] text-emerald-400 font-bold">
                      In Stock
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  {!item.is_out_of_stock && (
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                      title="Add to Cart"
                    >
                      <ShoppingBag className="w-4 h-4 text-velvet-white" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(item.productId)}
                    className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                    title="Remove from Wishlist"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
