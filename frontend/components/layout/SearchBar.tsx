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
  brand: string
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

interface SearchBarProps {
  autoFocus?: boolean
}

export function SearchBar({ autoFocus = false }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  // Auto-focus when prop is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

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
          const rawResults = json.data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            brand: p.brand || 'Velvet',
            slug: p.slug,
            price: p.price,
            image: p.variants?.[0]?.images?.[0] ?? undefined,
          }));

          setResults(rawResults);
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
    <div ref={containerRef} className="relative w-full max-w-[220px] md:max-w-[280px]">
      {/* Luxury Minimal Input */}
      <div
        className={`flex items-center gap-3 h-11 px-4 rounded-full bg-white/10 backdrop-blur-md border transition-all duration-500 ease-luxury ${
          isFocused 
            ? 'border-white/40 ring-1 ring-white/20' 
            : 'border-white/20 hover:border-white/30'
        }`}
      >
        <Search
          size={14}
          className={`flex-shrink-0 transition-colors duration-300 ${isFocused ? 'text-white/60' : 'text-white/30'}`}
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
          className="bg-transparent text-sm tracking-wide text-white placeholder-white/40 outline-none w-full min-w-0"
          aria-label="Search products"
          autoComplete="off"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: EASE }}
              onClick={handleClear}
              className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors p-1"
              aria-label="Clear search"
            >
              <X size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Redesigned Dropdown */}
      <AnimatePresence>
        {isOpen && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute top-full left-0 right-0 mt-3 z-50 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-3"
            style={{ width: '100%' }}
          >
            {isLoading ? (
              <div className="py-4 text-center">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 animate-pulse">
                  Searching...
                </span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-4 text-center">
                <span className="text-sm text-white/40">
                  No results found
                </span>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/40 px-2 pb-2">
                  Results
                </span>
                <ul className="space-y-1">
                  {results.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/product/${product.slug}`}
                        onClick={handleResultClick}
                        className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 ease-out hover:bg-white/5 hover:translate-x-[2px] group"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-white/5">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                              sizes="40px"
                              unoptimized
                            />
                          ) : (
                            <div className="absolute inset-0 bg-neutral-900" />
                          )}
                        </div>
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate group-hover:text-white transition-colors">
                            {product.name}
                          </p>
                          <p className="text-xs text-white/50 tracking-wide mt-0.5">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                        <span className="text-white/20 group-hover:text-white/50 transition-colors text-xs translate-x-[-4px] group-hover:translate-x-0 opacity-0 group-hover:opacity-100 duration-300">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
