'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, Package, ShoppingBag, Users, Award, Settings, Menu, X, Layers, MessageSquare, Gamepad2, Sun, Zap, PackageOpen, BadgeCheck, Trophy, Thermometer } from 'lucide-react'

const mainLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Order Control', icon: ShoppingBag },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/products', label: 'Inventory', icon: Package },
  { href: '/admin/collections', label: 'Collections', icon: Layers },
]

const gamificationLinks = [
  { href: '/admin/velvet-vault', label: 'Velvet Vault', icon: Gamepad2 },
  { href: '/admin/events', label: 'Seasonal Events', icon: Sun },
]

const vaultSubLinks = [
  { href: '/admin/velvet-vault/rewards', label: 'Reward Economy', icon: Zap },
  { href: '/admin/velvet-vault/crates', label: 'Crates', icon: PackageOpen },
  { href: '/admin/velvet-vault/badges', label: 'Badges', icon: BadgeCheck },
  { href: '/admin/velvet-vault/leaderboards', label: 'Leaderboards', icon: Trophy },
]

const eventSubLinks = [
  { href: '/admin/events/joto-gorom', label: 'Joto Gorom Toto Char', icon: Thermometer },
]

const reviewLinks = [
  { href: '/admin/reviews', label: 'Review Management', icon: MessageSquare },
]

const systemLinks = [
  { href: '/admin/loyalty', label: 'Loyalty Points', icon: Award },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-4 flex items-center justify-between sticky top-24 z-30">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Velvet Ops</div>
          <h2 className="font-heading text-base text-velvet-white tracking-wide">Admin Console</h2>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-velvet-white bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Overlay Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Overlay on mobile, static on desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-velvet-black border-r border-white/10 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-64 lg:z-0 lg:block lg:min-h-[calc(100vh-7rem)] flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-velvet-muted">Velvet Ops</div>
            <h2 className="font-heading text-xl text-velvet-white mt-2 tracking-wide">Admin Console</h2>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-velvet-muted hover:text-velvet-white">
            <X size={20} />
          </button>
        </div>
        
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-velvet-muted px-4 py-2">Main</div>
          {mainLinks.map((link) => {
            const Icon = link.icon
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                  active
                    ? 'bg-white/10 border-white/20 text-velvet-white shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                    : 'bg-transparent border-transparent text-velvet-muted hover:text-velvet-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold">{link.label}</span>
              </Link>
            )
          })}
          
          <div className="text-[10px] uppercase tracking-widest text-velvet-muted px-4 py-2 mt-6">Gamification</div>
          {gamificationLinks.map((link) => {
            const Icon = link.icon
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                  active
                    ? 'bg-white/10 border-white/20 text-velvet-white shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                    : 'bg-transparent border-transparent text-velvet-muted hover:text-velvet-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold">{link.label}</span>
              </Link>
            )
          })}

          <div className="pl-6 space-y-1 mt-1 mb-2">
            {vaultSubLinks.map((link) => {
              const Icon = link.icon
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-200 ${
                    active
                      ? 'bg-white/5 border-white/10 text-velvet-white'
                      : 'bg-transparent border-transparent text-velvet-muted/60 hover:text-velvet-muted'
                  }`}
                >
                  <Icon size={13} />
                  <span className="text-[9px] uppercase tracking-[0.15em] font-medium">{link.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="pl-6 space-y-1 mb-2">
            {eventSubLinks.map((link) => {
              const Icon = link.icon
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-200 ${
                    active
                      ? 'bg-white/5 border-white/10 text-velvet-white'
                      : 'bg-transparent border-transparent text-velvet-muted/60 hover:text-velvet-muted'
                  }`}
                >
                  <Icon size={13} />
                  <span className="text-[9px] uppercase tracking-[0.15em] font-medium">{link.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="text-[10px] uppercase tracking-widest text-velvet-muted px-4 py-2 mt-2">Reviews</div>
          {reviewLinks.map((link) => {
            const Icon = link.icon
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                  active
                    ? 'bg-white/10 border-white/20 text-velvet-white shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                    : 'bg-transparent border-transparent text-velvet-muted hover:text-velvet-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold">{link.label}</span>
              </Link>
            )
          })}
          
          <div className="text-[10px] uppercase tracking-widest text-velvet-muted px-4 py-2 mt-6">System</div>
          {systemLinks.map((link) => {
            const Icon = link.icon
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                  active
                    ? 'bg-white/10 border-white/20 text-velvet-white shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                    : 'bg-transparent border-transparent text-velvet-muted hover:text-velvet-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold">{link.label}</span>
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="text-[9px] uppercase tracking-widest text-velvet-muted px-4 py-2">
            Administrator Mode
          </div>
        </div>
      </aside>
    </>
  )
}
