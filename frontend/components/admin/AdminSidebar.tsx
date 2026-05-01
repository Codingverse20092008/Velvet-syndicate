'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, Package, ShoppingBag, Users, BarChart3, Award, TrendingUp, Settings, Menu, X, Layers } from 'lucide-react'

const mainLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Sales & Profit', icon: BarChart3 },
  { href: '/admin/orders', label: 'Order Control', icon: ShoppingBag },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/products', label: 'Inventory', icon: Package },
  { href: '/admin/collections', label: 'Collections', icon: Layers },
  { href: '/admin/loyalty', label: 'Loyalty Points', icon: Award },
]

const systemLinks = [
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
      <div className="lg:hidden bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.35em] text-velvet-muted">Velvet Ops</div>
          <h2 className="font-heading text-lg text-velvet-white tracking-wide">Admin Console</h2>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-velvet-white hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar - Hidden on mobile unless menu open */}
      <aside className={`${isMobileMenuOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 bg-[#0A0A0A] border border-white/10 lg:border-r lg:border-white/10 rounded-2xl lg:rounded-none lg:min-h-[calc(100vh-7rem)] flex flex-col`}>
      <div className="p-6 border-b border-white/5">
        <div className="text-[11px] uppercase tracking-[0.35em] text-velvet-muted">Velvet Ops</div>
        <h2 className="font-heading text-xl text-velvet-white mt-2 tracking-wide">Admin Console</h2>
      </div>
      
      <nav className="p-4 space-y-1 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-velvet-muted px-4 py-2">Main</div>
        {mainLinks.map((link) => {
          const Icon = link.icon
          const active = isActive(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                active
                  ? 'bg-white/10 border-white/25 text-velvet-white'
                  : 'bg-transparent border-transparent text-velvet-muted hover:text-velvet-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              <span className="text-xs uppercase tracking-widest font-bold">{link.label}</span>
            </Link>
          )
        })}
        
        <div className="text-[10px] uppercase tracking-widest text-velvet-muted px-4 py-2 mt-4">System</div>
        {systemLinks.map((link) => {
          const Icon = link.icon
          const active = isActive(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                active
                  ? 'bg-white/10 border-white/25 text-velvet-white'
                  : 'bg-transparent border-transparent text-velvet-muted hover:text-velvet-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              <span className="text-xs uppercase tracking-widest font-bold">{link.label}</span>
            </Link>
          )
        })}
      </nav>
      
      <div className="p-4 border-t border-white/5">
        <div className="text-[10px] text-velvet-muted px-4 py-2">
          Admin access only
        </div>
      </div>
    </aside>
    </>
  )
}
