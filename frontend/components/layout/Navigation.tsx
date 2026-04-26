'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { ShoppingBag, User } from 'lucide-react'
import Image from 'next/image'
import { SearchBar } from './SearchBar'

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const { totalItems, toggleCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()

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
        <div className="flex items-center justify-between gap-6">

          {/* Logo */}
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

          {/* Center Links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-10 flex-shrink-0">
            <Link
              href="/collection"
              className="text-[10px] tracking-widest uppercase text-velvet-muted hover:text-velvet-white transition-colors duration-300 cursor-none interactive"
            >
              Collection
            </Link>
            <Link
              href="/about"
              className="text-[10px] tracking-widest uppercase text-velvet-muted hover:text-velvet-white transition-colors duration-300 cursor-none interactive"
            >
              About
            </Link>
          </div>

          {/* Right side: Search + Actions */}
          <div className="flex items-center gap-5 flex-1 justify-end">

            {/* Search — visible desktop, collapses on mobile */}
            <div className="hidden sm:block flex-1 max-w-[260px]">
              <SearchBar />
            </div>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/account"
                  className="text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive"
                >
                  <User size={17} />
                </Link>
                <button
                  onClick={() => useAuthStore.getState().logout()}
                  className="text-[10px] tracking-widest uppercase text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive hidden md:block"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive"
              >
                <User size={17} />
              </Link>
            )}

            {/* Cart */}
            <button
              onClick={toggleCart}
              className="relative text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive"
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

        {/* Mobile search row — full width below nav items */}
        <div className="sm:hidden mt-3 pb-1">
          <SearchBar />
        </div>
      </div>
    </motion.nav>
  )
}
