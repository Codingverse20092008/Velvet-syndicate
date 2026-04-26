'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1]

interface SearchResult {
  id: string
  name: string
  slug: string
  price: number
  image?: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  // Fetch results when debounced query changes
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (!q) {
      setResults([])
      setIsOpen(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    async function search() {
      try {
        const res = await apiFetch(`/products?search=${encodeURIComponent(q)}&limit=6`)
        if (cancelled) return
        const json = await res.json()
        if (json.success && json.data?.products) {
          setResults(json.data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            image: p.variants?.[0]?.images?.[0] ?? undefined,
          })))
          setIsOpen(true)
        } else {
          setResults([])
          setIsOpen(true) // show empty state
        }
      } catch {
        if (!cancelled) { setResults([]); setIsOpen(true) }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    search()
    return () => { cancelled = true }
  }, [debouncedQuery])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }, [])

  const handleResultClick = useCallback(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full max-w-[220px] md:max-w-[260px]">
      {/* Input */}
      <div
        className={`flex items-center gap-2 px-3 py-[7px] rounded-lg bg-neutral-900 border transition-all duration-300 ${
          isFocused ? 'border-white/20' : 'border-white/8'
        }`}
      >
        <Search
          size={13}
          className={`flex-shrink-0 transition-colors duration-200 ${isFocused ? 'text-velvet-muted' : 'text-white/30'}`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true)
            if (results.length > 0 || debouncedQuery.trim()) setIsOpen(true)
          }}
          onBlur={() => setIsFocused(false)}
          placeholder="Search sneakers..."
          className="bg-transparent text-[11px] tracking-wide text-velvet-white placeholder-white/25 outline-none w-full min-w-0"
          aria-label="Search products"
          autoComplete="off"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              onClick={handleClear}
              className="flex-shrink-0 text-white/25 hover:text-velvet-muted transition-colors"
              aria-label="Clear search"
            >
              <X size={11} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0e0e0e]/95 backdrop-blur-xl border border-white/8 rounded-xl shadow-2xl overflow-hidden"
            style={{ minWidth: '280px', right: 'auto', left: '50%', transform: 'translateX(-50%)' }}
          >
            {isLoading ? (
              <div className="px-4 py-6 text-center">
                <span className="text-[10px] uppercase tracking-widest text-white/25 animate-pulse">
                  Searching...
                </span>
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <span className="text-[10px] uppercase tracking-widest text-white/25">
                  No results found
                </span>
              </div>
            ) : (
              <ul>
                {results.map((product, i) => (
                  <li key={product.id}>
                    <Link
                      href={`/product/${product.slug}`}
                      onClick={handleResultClick}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors duration-150 group ${
                        i !== results.length - 1 ? 'border-b border-white/5' : ''
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-neutral-800">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 bg-neutral-800" />
                        )}
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-velvet-white font-medium truncate group-hover:text-white transition-colors">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-velvet-muted/70 tracking-wide mt-0.5">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                      <span className="text-white/20 group-hover:text-white/40 transition-colors text-xs">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
