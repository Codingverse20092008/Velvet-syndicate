'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { ShoppingBag, User, Search, X } from 'lucide-react'
import Image from 'next/image'
import { SearchBar } from './SearchBar'

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { items, toggleCart, hasHydrated } = useCartStore()
  const totalItems = hasHydrated ? items.reduce((sum, item) => sum + item.quantity, 0) : 0
  const { isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        isScrolled
          ? 'bg-velvet-black/95 backdrop-blur-xl border-b border-white/5'
          : 'bg-gradient-to-b from-velvet-black/80 to-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6 relative">

          {/* Logo — Hidden on mobile when search is open */}
          <div className={`${isSearchOpen ? 'hidden md:block' : 'block'}`}>
            <Link href="/" className="interactive flex items-center flex-shrink-0">
              <div className="relative w-8 h-8 md:w-10 md:h-10">
                <Image
                  src="/logo.png"
                  alt="Velvet Syndicate Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Center Links — Hidden on mobile when search is open */}
          <div className={`items-center gap-6 md:gap-10 flex-shrink-0 ${isSearchOpen ? 'hidden md:flex' : 'flex'}`}>
            <Link
              href="/collection"
              className="text-[10px] tracking-widest uppercase text-velvet-muted hover:text-velvet-white transition-colors duration-300 interactive hidden md:block"
            >
              Collection
            </Link>
            <Link
              href="/about"
              className="text-[10px] tracking-widest uppercase text-velvet-muted hover:text-velvet-white transition-colors duration-300 interactive hidden xs:block"
            >
              About
            </Link>
          </div>

          {/* Right side: Search + Actions */}
          <div className="flex items-center gap-3 md:gap-5 flex-1 justify-end">

            {/* Search Container */}
            <div className={`flex-1 transition-all duration-500 ${isSearchOpen ? 'max-w-full' : 'max-w-[260px]'}`}>
              {/* Desktop: Always SearchBar. Mobile: Toggleable */}
              <div className="hidden md:block">
                <SearchBar />
              </div>
              
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div 
                    className="md:hidden absolute inset-0 bg-velvet-black z-50 flex items-center px-4 gap-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <div className="flex-1">
                      <SearchBar autoFocus />
                    </div>
                    <button 
                      onClick={() => setIsSearchOpen(false)}
                      className="text-velvet-muted hover:text-velvet-white p-2"
                    >
                      <X size={17} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`md:hidden text-velvet-muted hover:text-velvet-white transition-colors interactive ${isSearchOpen ? 'hidden' : 'block'}`}
            >
              <Search size={17} />
            </button>

            {/* Auth */}
            <div className={`${isSearchOpen ? 'hidden md:flex' : 'flex'} items-center gap-4`}>
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  {user?.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="text-[10px] tracking-widest uppercase text-velvet-muted hover:text-velvet-white transition-colors interactive hidden md:block"
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/account"
                    className="text-velvet-muted hover:text-velvet-white transition-colors interactive"
                  >
                    <User size={17} />
                  </Link>
                  <button
                    onClick={() => useAuthStore.getState().logout()}
                    className="text-[10px] tracking-widest uppercase text-velvet-muted hover:text-velvet-white transition-colors interactive hidden md:block"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-velvet-muted hover:text-velvet-white transition-colors interactive"
                >
                  <User size={17} />
                </Link>
              )}
            </div>

            {/* Cart */}
            <div className={`${isSearchOpen ? 'hidden md:block' : 'block'}`}>
              <button
                onClick={toggleCart}
                className="relative text-velvet-muted hover:text-velvet-white transition-colors interactive"
              >
                <ShoppingBag size={17} />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-velvet-accent rounded-full text-[10px] flex items-center justify-center text-velvet-white">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </motion.nav>
  )
}
