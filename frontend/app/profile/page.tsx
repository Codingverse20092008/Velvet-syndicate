'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { useAuthStore } from '@/store/authStore'
import { LogoutButton } from '@/components/profile/LogoutButton'

const EASE = [0.22, 1, 0.36, 1]

export default function ProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuthStore()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/profile')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-velvet-black flex items-center justify-center">
        <div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-velvet-black pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-12"
        >
          <span className="text-[10px] uppercase tracking-[0.45em] text-velvet-muted mb-4 block">
            Account
          </span>
          <h1 className="font-heading text-4xl md:text-5xl text-velvet-white tracking-tight">
            My Profile
          </h1>
          <p className="text-sm text-velvet-muted mt-3">
            Manage your personal information and preferences
          </p>
        </motion.div>

        {/* Profile Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        >
          <ProfileForm />
        </motion.div>

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          className="mt-12 pt-12 border-t border-white/10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted mb-2">
                Account Details
              </p>
              <p className="text-sm text-velvet-white">
                {user.email}
              </p>
              <p className="text-xs text-velvet-muted mt-1">
                Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <LogoutButton />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
