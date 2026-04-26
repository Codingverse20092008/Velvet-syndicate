'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuth, isAuthenticated } = useAuthStore()
  const { syncCart, fetchCart } = useCartStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        await checkAuth()
      } finally {
        setIsInitialized(true)
      }
    }
    init()
  }, [checkAuth])

  // Multi-tab sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'velvet-auth-state' || !e.key) {
        checkAuth()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [checkAuth])

  useEffect(() => {
    const handleAuthChange = async () => {
      if (isInitialized && isAuthenticated) {
        try {
          await syncCart()
        } catch (error) {
          console.warn('Cart sync failed', error)
        } finally {
          await fetchCart()
        }
      }
    }
    handleAuthChange()
  }, [isAuthenticated, isInitialized, syncCart, fetchCart])

  return (
    <>
      {/* Persistent Loading Bar */}
      <div className="fixed top-0 left-0 w-full h-[1px] bg-white/5 z-[10000] pointer-events-none">
        <div 
          className={`h-full bg-velvet-white transition-all duration-700 ease-in-out ${!isInitialized ? "w-full" : "w-0 opacity-0"}`} 
          style={{ transitionProperty: 'width, opacity' }}
        />
      </div>

      {/* Initial Loader Overlay - Always mounted but fades out */}
      <div 
        className={`fixed inset-0 bg-velvet-black flex items-center justify-center z-[9999] pointer-events-none transition-opacity duration-500 ${isInitialized ? "opacity-0" : "opacity-100"}`}
      >
         <div className="w-12 h-[1px] bg-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-velvet-white animate-loading-bar" />
         </div>
      </div>

      {/* Main Content with Fade-in */}
      <div 
        className={`transition-opacity duration-700 ease-out ${isInitialized ? "opacity-100" : "opacity-0"}`}
      >
        {children}
      </div>
    </>
  )
}

