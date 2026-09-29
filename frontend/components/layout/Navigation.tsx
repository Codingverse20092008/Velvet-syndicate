'use client'

/**
 * Navigation.refactored.tsx
 * -------------------------
 * CRO-Optimized Sticky Header/Navbar
 *
 * Key Improvements:
 * - Enhanced logo visibility (40px desktop, 32px mobile)
 * - Clear center navigation: Shop | Trending Drops | Velvet Vault | About
 * - Prominent search bar with better UX
 * - Interactive cart with item count badge
 * - WCAG AA compliant contrast ratios
 * - Mobile: Logo left, Cart + Hamburger right
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useWishlistStore } from '@/store/wishlistStore'
import { ShoppingBag, User, Search, X, Menu, Heart, Package } from 'lucide-react'
import Image from 'next/image'

const POPULAR_SEARCHES = [
  'Nike Air Jordan',
  'Adidas Yeezy',
  'New Balance',
  'Exclusive Drops',
  'Basketball Sneakers',
]

const tagsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const tagItemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 300,
    },
  },
}

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { items, toggleCart, hasHydrated } = useCartStore()
  const totalItems = hasHydrated ? items.reduce((sum, item) => sum + item.quantity, 0) : 0
  const { isAuthenticated, user } = useAuthStore()
  const wishlistCount = useWishlistStore((s) => s.count)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  const pathname = usePathname()
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setIsSearchOpen(false)
  }, [pathname])


  const navLinks = [
    { label: 'Shop', href: '/collection' },
    { label: 'Trending Drops', href: '/collection?filter=trending' },
    { label: 'Velvet Vault', href: '/vault' },
    { label: 'About', href: '/about' },
  ]

  // Handle ESC key and prevent body scroll when search overlay is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false)
      }
    }

    if (isSearchOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSearchOpen])

  const executeSearch = (query: string) => {
    const cleanQuery = query.trim()
    if (cleanQuery) {
      window.location.href = `/collection?search=${encodeURIComponent(cleanQuery)}`
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    executeSearch(searchQuery)
  }

  return (
    <>
      {/* Sticky Header */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-black/98 backdrop-blur-xl border-b border-white/10 shadow-2xl'
            : 'bg-black/95 backdrop-blur-md'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">

            {/* LEFT: Enhanced Logo */}
            <Link href="/" className="flex items-center gap-3 group flex-shrink-0 z-10">
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-300 group-hover:scale-110">
                <Image
                  src="/logo.png"
                  alt="Velvet Syndicate"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="hidden sm:block font-heading text-sm lg:text-base uppercase tracking-[0.15em] text-white">
                Velvet Syndicate
              </span>
            </Link>

            {/* CENTER: Desktop Navigation Links - Clean, Flexible Spacing */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-8 absolute left-1/2 -translate-x-1/2 z-20">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs uppercase tracking-[0.2em] font-medium transition-colors duration-300 relative group whitespace-nowrap ${
                    pathname === link.href
                      ? 'text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {link.label}
                  <span className={`absolute -bottom-1 left-0 h-[2px] bg-white transition-all duration-300 ${
                    pathname === link.href ? 'w-full' : 'w-0 group-hover:w-full'
                  }`} />
                </Link>
              ))}
            </nav>

            {/* RIGHT: Actions */}
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">

              {/* Search Icon - All Devices */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-neutral-300 hover:text-white transition-colors duration-300"
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              {/* User Account */}
              <Link
                href={isAuthenticated ? '/account' : '/login'}
                className="hidden sm:flex p-2 text-neutral-400 hover:text-white transition-colors"
                aria-label={isAuthenticated ? 'Account' : 'Login'}
              >
                <User size={20} />
              </Link>

              {/* Wishlist - Desktop Only */}
              {isAuthenticated && (
                <Link
                  href="/profile/wishlist"
                  className="hidden lg:flex relative p-2 text-neutral-400 hover:text-white transition-colors"
                  aria-label="Wishlist"
                >
                  <Heart size={20} />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart Button - High Contrast CTA */}
              <button
                onClick={toggleCart}
                className="relative p-2.5 sm:px-4 sm:py-2.5 bg-white text-black rounded-lg hover:bg-neutral-200 transition-all duration-300 flex items-center gap-2 group min-h-[44px]"
                aria-label={`Cart with ${totalItems} items`}
              >
                <ShoppingBag size={20} className="group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">
                  Cart
                </span>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 min-w-[20px] h-5 px-1.5 bg-black text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Hamburger Menu - Mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 text-neutral-400 hover:text-white transition-colors"
                aria-label="Menu"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Search Overlay - All Devices */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsSearchOpen(false)
            }}
          >
            {/* Close Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-6 right-6 p-2.5 text-neutral-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close search"
            >
              <X size={26} />
            </motion.button>

            {/* Search Container (Input + Tags) */}
            <motion.div
              className="w-full max-w-3xl"
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <form onSubmit={handleSearch} className="relative">
                <div className="group relative flex items-center w-full rounded-2xl bg-white/5 border-2 border-white/20 transition-all duration-300 focus-within:border-[#C9A961]/80 focus-within:shadow-[0_0_20px_rgba(201,169,97,0.15)] focus-within:bg-white/[0.07] overflow-hidden">
                  <input
                    type="text"
                    placeholder="Search for sneakers, brands, or styles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full h-16 md:h-20 pl-6 pr-24 bg-transparent text-xl md:text-2xl text-white placeholder:text-neutral-500 focus:outline-none"
                  />

                  {/* Actions inside input: Clear & Submit */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <AnimatePresence>
                      {searchQuery && (
                        <motion.button
                          type="button"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => setSearchQuery('')}
                          className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                          aria-label="Clear search query"
                        >
                          <X size={18} />
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-3 bg-white text-black rounded-xl hover:bg-[#C9A961] hover:text-black transition-all duration-300 flex-shrink-0"
                      aria-label="Submit search"
                    >
                      <Search size={22} />
                    </motion.button>
                  </div>

                  {/* Subtle Luxury Gold Accent Line */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A961] to-transparent pointer-events-none"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{
                      opacity: searchQuery ? 1 : 0,
                      scaleX: searchQuery ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
              </form>

              {/* Staggered Suggestions */}
              <motion.div
                className="mt-8 space-y-3"
                variants={tagsContainerVariants}
                initial="hidden"
                animate="visible"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 font-medium mb-4">
                  Popular Searches
                </p>
                <div className="flex flex-wrap gap-2.5 sm:gap-3">
                  {POPULAR_SEARCHES.map((term) => (
                    <motion.button
                      key={term}
                      type="button"
                      variants={tagItemVariants}
                      whileHover={{
                        scale: 1.05,
                        borderColor: 'rgba(201, 169, 97, 0.6)',
                        backgroundColor: 'rgba(201, 169, 97, 0.1)',
                      }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                      onClick={() => {
                        setSearchQuery(term)
                        executeSearch(term)
                      }}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-neutral-300 hover:text-white transition-all duration-200 cursor-pointer"
                    >
                      {term}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[55] bg-black/80 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className="fixed top-0 right-0 bottom-0 z-[60] w-[85%] max-w-sm bg-black border-l border-white/10 lg:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <h2 className="text-lg font-heading uppercase tracking-wider text-white">Menu</h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-neutral-400 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto py-6">
                  <div className="space-y-1 px-4">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`block px-4 py-4 rounded-lg text-sm uppercase tracking-[0.15em] transition-colors ${
                          pathname === link.href
                            ? 'bg-white/10 text-white font-bold'
                            : 'text-neutral-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  {/* Account Section */}
                  <div className="mt-8 pt-6 border-t border-white/10 px-4 space-y-1">
                    {isAuthenticated ? (
                      <>
                        <Link
                          href="/account"
                          className="flex items-center gap-3 px-4 py-4 text-sm text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <User size={18} />
                          My Account
                        </Link>
                        <Link
                          href="/profile/orders"
                          className="flex items-center gap-3 px-4 py-4 text-sm text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Package size={18} />
                          My Orders
                        </Link>
                        <Link
                          href="/profile/wishlist"
                          className="flex items-center gap-3 px-4 py-4 text-sm text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Heart size={18} />
                          Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
                        </Link>
                        {user?.role === 'admin' && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-4 text-sm text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            useAuthStore.getState().logout()
                            setIsMobileMenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-4 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          Logout
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/login"
                        className="flex items-center gap-3 px-4 py-4 text-sm text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <User size={18} />
                        Login / Sign Up
                      </Link>
                    )}
                  </div>
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
