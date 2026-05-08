'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, User, Search, LayoutGrid } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { motion } from 'framer-motion'

export function MobileBottomNav() {
  const pathname = usePathname()
  const { items, toggleCart, hasHydrated } = useCartStore()
  const totalItems = hasHydrated ? items.reduce((sum, item) => sum + item.quantity, 0) : 0

  const navItems = [
    { label: 'Home', icon: Home, href: '/' },
    { label: 'Shop', icon: LayoutGrid, href: '/collection' },
    { label: 'Cart', icon: ShoppingBag, onClick: toggleCart, badge: totalItems },
    { label: 'Account', icon: User, href: '/account' },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] md:hidden">
      {/* Background with glassmorphism */}
      <div className="bg-black/80 backdrop-blur-2xl border-t border-white/10 px-6 py-3 pb-safe-offset-2 flex justify-between items-center">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          const content = (
            <div className="flex flex-col items-center gap-1 relative">
              <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-velvet-accent/10 text-velvet-accent' : 'text-velvet-muted'}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[8px] uppercase tracking-[0.1em] font-bold ${isActive ? 'text-velvet-accent' : 'text-velvet-muted/60'}`}>
                {item.label}
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-velvet-accent rounded-full text-[8px] flex items-center justify-center text-velvet-white font-bold border-2 border-black">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute -bottom-1 w-1 h-1 bg-velvet-accent rounded-full"
                />
              )}
            </div>
          )

          return item.href ? (
            <Link key={index} href={item.href} className="interactive">
              {content}
            </Link>
          ) : (
            <button key={index} onClick={item.onClick} className="interactive outline-none">
              {content}
            </button>
          )
        })}
      </div>

      <style jsx global>{`
        .pb-safe-offset-2 {
          padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  )
}
