'use client'

import { AdminGuard } from '@/components/admin/AdminGuard'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen pt-28 pb-16 px-6 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
          <AdminSidebar />
          <section className="flex-1">{children}</section>
        </div>
      </div>
    </AdminGuard>
  )
}
