'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { ShoppingBag, User } from 'lucide-react'

import Image from 'next/image'

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const { totalItems, toggleCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
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
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="interactive flex items-center">
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

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-10">
            <Link
              href="/collection"
              className="text-xs tracking-widest uppercase text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive"
            >
              Collection
            </Link>
            <Link
              href="/about"
              className="text-xs tracking-widest uppercase text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive"
            >
              About
            </Link>
          </div>


          {/* Right Actions */}
          <div className="flex items-center gap-6">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/account"
                  className="text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive"
                >
                  <User size={18} />
                </Link>
                <button
                  onClick={() => useAuthStore.getState().logout()}
                  className="text-[10px] tracking-widest uppercase text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive"
              >
                <User size={18} />
              </Link>
            )}

            <button
              onClick={toggleCart}
              className="relative text-velvet-muted hover:text-velvet-white transition-colors cursor-none interactive"
            >
              <ShoppingBag size={18} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-velvet-accent rounded-full text-[10px] flex items-center justify-center text-velvet-white">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
