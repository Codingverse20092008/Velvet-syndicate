'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function OrderSecureRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/checkout')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={30} className="animate-spin text-velvet-accent" />
    </div>
  )
}
