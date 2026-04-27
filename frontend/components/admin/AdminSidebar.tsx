'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, Users } from 'lucide-react'

const links = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/users', label: 'Users', icon: Users },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-full lg:w-64 bg-[#0A0A0A] border-r border-white/10 lg:min-h-[calc(100vh-7rem)] rounded-2xl lg:rounded-none">
      <div className="p-6 border-b border-white/5">
        <div className="text-[11px] uppercase tracking-[0.35em] text-velvet-muted">Velvet Ops</div>
        <h2 className="font-heading text-xl text-velvet-white mt-2 tracking-wide">Admin Console</h2>
      </div>
      <nav className="p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon
          const active = pathname === link.href
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
    </aside>
  )
}
