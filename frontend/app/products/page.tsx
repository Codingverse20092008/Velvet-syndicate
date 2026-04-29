'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProductsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to collection page which has the products
    router.replace('/collection')
  }, [router])

  return (
    <div className="min-h-screen bg-velvet-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-[1px] bg-white/10 relative overflow-hidden mx-auto mb-8">
          <div className="absolute inset-0 bg-velvet-white animate-loading-bar" />
        </div>
        <p className="text-velvet-muted animate-pulse">Redirecting to products...</p>
      </div>
    </div>
  )
}
