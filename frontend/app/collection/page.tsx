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
  image?: string // Standardized key
  imageUrl?: string // Alternative key
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
  const [activeGender, setActiveGender] = useState<string>('All')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [activePriceRange, setActivePriceRange] = useState<string>('All')
  const [activeStyle, setActiveStyle] = useState<string>('All')

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

  // Filter Logic
  const filteredProducts = products.filter(product => {
    const genderMatch = activeGender === 'All' || product.gender?.toLowerCase() === activeGender.toLowerCase()
    const categoryMatch = activeCategory === 'All' || product.category?.toLowerCase() === activeCategory.toLowerCase()
    const styleMatch = activeStyle === 'All' || product.productType?.toLowerCase() === activeStyle.toLowerCase()
    
    let priceMatch = true
    if (activePriceRange !== 'All') {
      const [min, max] = activePriceRange.split('-').map(Number)
      if (max) {
        priceMatch = product.price >= min && product.price <= max
      } else {
        priceMatch = product.price >= min
      }
    }

    return genderMatch && categoryMatch && styleMatch && priceMatch
  })

  // 100% Dynamic Option Extraction
  const getUniqueOptions = (field: keyof Product) => {
    const values = products
      .map(p => p[field])
      .filter((v): v is string => typeof v === 'string' && v !== '')
      .map(v => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()) // Normalize casing
    
    return ['All', ...new Set(values)].sort()
  }

  const categories = getUniqueOptions('category')
  const styles = getUniqueOptions('productType')
  const genders = getUniqueOptions('gender')
  
  const priceRanges = [
    { label: 'All', value: 'All' },
    { label: 'Under ₹5,000', value: '0-5000' },
    { label: '₹5,000 - ₹10,000', value: '5000-10000' },
    { label: 'Above ₹10,000', value: '10000' }
  ]

  // Get product image - prioritize variants.images, then image/imageUrl, then fallback
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

  const isExternalImage = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://')
  }

  return (
    <div className="min-h-screen bg-velvet-black px-4 md:px-6 py-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-3xl md:text-5xl mb-4 md:mb-6 uppercase tracking-[0.2em] text-white">
            Collection
          </h1>
          <p className="text-velvet-muted text-xs md:text-sm max-w-2xl mx-auto uppercase tracking-widest">
            {isLoading ? 'Scanning Archive...' : `${filteredProducts.length} Pieces Found`}
          </p>
        </div>

        {/* Compact Dropdown Filter Bar */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-3 md:gap-6 pb-6 border-b border-white/5">
          {/* Gender Dropdown */}
          <div className="relative group min-w-[120px]">
            <select 
              value={activeGender}
              onChange={(e) => setActiveGender(e.target.value)}
              className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-velvet-white outline-none focus:border-velvet-accent/50 appearance-none cursor-pointer hover:bg-white/5 transition-all"
            >
              <option value="All" className="bg-velvet-black">Gender: All</option>
              {genders.filter(g => g !== 'All').map(g => (
                <option key={g} value={g} className="bg-velvet-black">{g}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 text-[8px]">▼</div>
          </div>

          {/* Category Dropdown */}
          <div className="relative group min-w-[140px]">
            <select 
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-velvet-white outline-none focus:border-velvet-accent/50 appearance-none cursor-pointer hover:bg-white/5 transition-all"
            >
              <option value="All" className="bg-velvet-black">Category: All</option>
              {categories.filter(c => c !== 'All').map(c => (
                <option key={c} value={c} className="bg-velvet-black">{c}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 text-[8px]">▼</div>
          </div>

          {/* Style Dropdown */}
          <div className="relative group min-w-[120px]">
            <select 
              value={activeStyle}
              onChange={(e) => setActiveStyle(e.target.value)}
              className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-velvet-white outline-none focus:border-velvet-accent/50 appearance-none cursor-pointer hover:bg-white/5 transition-all"
            >
              <option value="All" className="bg-velvet-black">Style: All</option>
              {styles.filter(s => s !== 'All').map(s => (
                <option key={s} value={s} className="bg-velvet-black">{s}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 text-[8px]">▼</div>
          </div>

          {/* Price Dropdown */}
          <div className="relative group min-w-[140px]">
            <select 
              value={activePriceRange}
              onChange={(e) => setActivePriceRange(e.target.value)}
              className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-velvet-white outline-none focus:border-velvet-accent/50 appearance-none cursor-pointer hover:bg-white/5 transition-all"
            >
              {priceRanges.map(range => (
                <option key={range.value} value={range.value} className="bg-velvet-black">
                  {range.label === 'All' ? 'Price: All' : range.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 text-[8px]">▼</div>
          </div>

          {/* Reset Button (Only shows when filters are active) */}
          {(activeGender !== 'All' || activeCategory !== 'All' || activeStyle !== 'All' || activePriceRange !== 'All') && (
            <button 
              onClick={() => {
                setActiveGender('All'); setActiveCategory('All'); setActivePriceRange('All'); setActiveStyle('All');
              }}
              className="px-4 py-2 text-[8px] uppercase tracking-[0.3em] text-velvet-accent hover:text-white transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-12 h-[1px] bg-white/10 relative overflow-hidden mx-auto">
              <div className="absolute inset-0 bg-velvet-white animate-loading-bar" />
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-32 border border-white/5 rounded-3xl bg-white/2 overflow-hidden">
            <p className="text-velvet-muted text-sm uppercase tracking-widest mb-2">No matches found</p>
            <p className="text-[10px] text-velvet-muted/40 uppercase tracking-widest">Adjust filters to reveal archived pieces</p>
            <button 
              onClick={() => {
                setActiveGender('All'); setActiveCategory('All'); setActivePriceRange('All'); setActiveStyle('All');
              }}
              className="mt-6 text-[10px] text-velvet-accent uppercase tracking-[0.3em] hover:text-velvet-white transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
            {filteredProducts.map((product) => {
              const productImage = getProductImage(product)
              return (
                <Link 
                  key={product.id} 
                  href={`/product/${product.slug}`}
                  className="bg-velvet-dark border border-white/10 rounded-2xl overflow-hidden group flex flex-col h-full hover:border-white/20 transition-all duration-500"
                >
                  <div className="relative aspect-square bg-velvet-black overflow-hidden">
                    {isExternalImage(productImage) ? (
                      <img
                        src={productImage}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
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
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw"
                        unoptimized={isExternalImage(productImage)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/images/placeholder-product.png'
                        }}
                      />
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-white px-4 py-2 border border-white/20 backdrop-blur-md rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        View Piece
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4 md:p-8 flex flex-col flex-1">
                    <div className="mb-4">
                      <p className="text-velvet-muted text-[10px] uppercase tracking-[0.2em] mb-1">{product.category}</p>
                      <h3 className="text-sm md:text-xl font-heading text-white line-clamp-1">{product.name}</h3>
                    </div>
                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                      <p className="text-white text-xs md:text-lg font-medium">{formatPrice(product.price)}</p>
                      <span className="text-velvet-muted group-hover:text-velvet-accent transition-colors">→</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
