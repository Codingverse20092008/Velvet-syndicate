'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      router.replace('/')
    }
  }, [isAuthenticated, isLoading, router, user])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-velvet-accent animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-red-400 text-sm uppercase tracking-widest">
          <ShieldAlert size={18} />
          Access Restricted
        </div>
      </div>
    )
  }

  return <>{children}</>
}
