'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export function LogoutButton() {
  const router = useRouter()
  const { logout } = useAuthStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="flex items-center gap-2 px-5 py-2.5 border border-white/20 rounded-lg text-[11px] uppercase tracking-[0.3em] text-velvet-muted hover:text-velvet-white hover:border-white/40 transition-all duration-300 disabled:opacity-50"
    >
      {isLoggingOut ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <LogOut size={14} />
      )}
      Logout
    </button>
  )
}
