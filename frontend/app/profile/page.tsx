'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  User, 
  Camera, 
  Package, 
  IndianRupee, 
  Coins, 
  Heart, 
  Landmark, 
  LogOut, 
  Loader2, 
  Sparkles, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useWishlistStore } from '@/store/wishlistStore'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { BankDetailsModal } from '@/components/profile/BankDetailsModal'
import { apiFetch } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface UserStatsData {
  totalOrders: number
  totalSpent: number
  loyaltyPoints: number
  credits?: number
  walletBalance?: number
  activeOrder?: {
    id: string
    status: string
    total: number
  } | null
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, setUser, logout, isAuthenticated, isLoading } = useAuthStore()
  const { count: wishlistCount, fetchWishlist } = useWishlistStore()

  const [stats, setStats] = useState<UserStatsData | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Redirect if unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/profile')
    }
  }, [isAuthenticated, isLoading, router])

  // Load wishlist count
  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist()
    }
  }, [isAuthenticated, fetchWishlist])

  // Load user stats
  useEffect(() => {
    let isMounted = true
    const loadStats = async () => {
      try {
        const res = await apiFetch('/user/stats')
        const data = await res.json()
        if (isMounted && data?.success && data.data?.stats) {
          setStats(data.data.stats)
        }
      } catch (err) {
        console.warn('Failed to load stats:', err)
      } finally {
        if (isMounted) setStatsLoading(false)
      }
    }

    if (isAuthenticated) {
      loadStats()
    }
    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  // Avatar upload handler
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPEG, PNG, WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB.')
      return
    }

    setIsUploadingAvatar(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        try {
          const res = await apiFetch('/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: user?.name,
              avatar: base64,
            }),
          })
          const data = await res.json()
          if (data.success && user) {
            setUser({ ...user, avatar: base64 })
          }
        } catch (uploadErr) {
          console.error('Failed to update avatar:', uploadErr)
        } finally {
          setIsUploadingAvatar(false)
        }
      }
      reader.readAsDataURL(file)
    } catch {
      setIsUploadingAvatar(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
      setIsLoggingOut(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-velvet-black flex items-center justify-center">
        <div className="w-8 h-8 border border-white/20 border-t-[#C9A961] rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  // Format creation date
  const memberSinceYear = user.createdAt 
    ? new Date(user.createdAt).getFullYear() 
    : new Date().getFullYear()

  const creditsDisplay = stats?.credits ?? stats?.walletBalance ?? 150

  return (
    <div className="min-h-screen bg-velvet-black pt-28 pb-20 text-white selection:bg-[#C9A961]/20">
      {/* Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 md:mb-12"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-[0.25em] text-[#C9A961] font-medium">
              SYNDICATE IDENTITY // MEMBER VAULT
            </span>
            <div className="h-[1px] w-12 bg-[#C9A961]/30 hidden sm:block" />
          </div>
          <h1 className="font-heading text-3xl md:text-5xl text-white tracking-tight">
            Profile & Account Settings
          </h1>
          <p className="text-sm text-white/50 mt-2 max-w-xl">
            Manage your personal credentials, deadstock allocations, and delivery destinations.
          </p>
        </motion.div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: Syndicate Member Card (Sticky Identity Hub) */}
          {/* ======================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-4"
          >
            {/* Member Identity Card */}
            <div className="bg-[#0A0A0A] border border-[#222222] border-t-[#C9A961]/40 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
              
              {/* Subtle Ambient Gold Glow in Top-Right Corner */}
              <div 
                className="absolute -top-16 -right-16 w-36 h-36 rounded-full pointer-events-none filter blur-3xl opacity-20"
                style={{ background: 'radial-gradient(circle, #C9A961 0%, transparent 70%)' }}
              />

              {/* Avatar & Member Details */}
              <div className="flex flex-col items-center text-center relative z-10">
                
                {/* Circular Avatar with Metallic Gold Ring */}
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-[#161616] ring-2 ring-[#C9A961]/50 ring-offset-2 ring-offset-black flex items-center justify-center transition-all group-hover:ring-[#C9A961] shadow-lg">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || 'Member Avatar'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-heading text-2xl font-bold text-[#C9A961]">
                        {user.name ? user.name.slice(0, 2).toUpperCase() : 'VS'}
                      </div>
                    )}

                    {/* Camera Edit Overlay */}
                    <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[10px] text-white tracking-widest uppercase">
                      {isUploadingAvatar ? (
                        <Loader2 size={18} className="animate-spin text-[#C9A961]" />
                      ) : (
                        <Camera size={18} className="text-[#C9A961]" />
                      )}
                    </div>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarSelect}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                </div>

                {/* Floating VIP / Syndicate Badge */}
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C9A961]/10 border border-[#C9A961]/30 text-[#C9A961] text-[10px] uppercase tracking-[0.2em] font-medium shadow-sm">
                  <Sparkles size={11} className="text-[#C9A961]" />
                  <span>{user.role === 'admin' ? 'SYNDICATE ARCHITECT' : 'SYNDICATE MEMBER'}</span>
                </div>

                {/* User Name & Email */}
                <h3 className="font-heading text-2xl text-white font-medium mt-3 tracking-wide">
                  {user.name || 'Syndicate Member'}
                </h3>
                <p className="text-xs text-white/50 truncate max-w-[240px] mt-0.5">
                  {user.email}
                </p>

                <p className="text-[11px] text-white/30 uppercase tracking-widest mt-2">
                  Member Since {memberSinceYear}
                </p>
              </div>

              {/* Stats Grid: 3-Tile Micro Cards */}
              <div className="grid grid-cols-3 gap-2.5 mt-6 pt-6 border-t border-white/5">
                {/* Total Orders */}
                <div className="bg-[#121212] border border-white/5 rounded-xl p-3 text-center flex flex-col items-center justify-center">
                  <Package size={14} className="text-[#C9A961] mb-1 opacity-80" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40 block">Orders</span>
                  <span className="font-heading text-lg text-white font-semibold mt-0.5">
                    {statsLoading ? '...' : (stats?.totalOrders ?? 0)}
                  </span>
                </div>

                {/* Total Spent */}
                <div className="bg-[#121212] border border-white/5 rounded-xl p-3 text-center flex flex-col items-center justify-center">
                  <IndianRupee size={14} className="text-[#C9A961] mb-1 opacity-80" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40 block">Spent</span>
                  <span className="font-heading text-lg text-white font-semibold mt-0.5 truncate max-w-full">
                    {statsLoading ? '...' : `₹${Math.round(stats?.totalSpent ?? 0)}`}
                  </span>
                </div>

                {/* Loyalty / Vault Credits */}
                <div className="bg-[#121212] border border-[#C9A961]/20 rounded-xl p-3 text-center flex flex-col items-center justify-center relative overflow-hidden group">
                  <Coins size={14} className="text-[#C9A961] mb-1" />
                  <span className="text-[10px] uppercase tracking-wider text-[#C9A961] block font-medium">Credits</span>
                  <span className="font-heading text-lg text-white font-semibold mt-0.5">
                    {statsLoading ? '...' : `₹${creditsDisplay}`}
                  </span>
                  {/* Subtle Welcome Badge Indicator */}
                  <span className="text-[8px] uppercase tracking-tighter text-[#C9A961]/80 mt-0.5">
                    Active
                  </span>
                </div>
              </div>

              {/* Quick Action Links (Pillars) */}
              <div className="space-y-2 mt-6 pt-6 border-t border-white/5">
                
                {/* 1. Wishlist Pillar */}
                <Link
                  href="/profile/wishlist"
                  className="w-full flex items-center justify-between p-3.5 bg-[#121212] hover:bg-[#161616] border border-white/5 hover:border-white/15 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/70 group-hover:text-[#C9A961] transition-colors">
                      <Heart size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-white block">Wishlist Archive</span>
                      <span className="text-[10px] text-white/40">Saved silhouettes</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[#C9A961] border border-white/10 font-mono">
                      {wishlistCount}
                    </span>
                    <ChevronRight size={14} className="text-white/30 group-hover:text-white transition-colors" />
                  </div>
                </Link>

                {/* 2. Order History Pillar */}
                <Link
                  href="/orders"
                  className="w-full flex items-center justify-between p-3.5 bg-[#121212] hover:bg-[#161616] border border-white/5 hover:border-white/15 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/70 group-hover:text-[#C9A961] transition-colors">
                      <Package size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-white block">Order History</span>
                      <span className="text-[10px] text-white/40">Track drops & shipments</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-white/30 group-hover:text-white transition-colors" />
                </Link>

                {/* 3. Bank Account / Refund Details Modal Trigger */}
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(true)}
                  className="w-full flex items-center justify-between p-3.5 bg-[#121212] hover:bg-[#161616] border border-white/5 hover:border-white/15 rounded-xl transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/70 group-hover:text-[#C9A961] transition-colors">
                      <Landmark size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-white block">Bank Account Details</span>
                      <span className="text-[10px] text-white/40">Return & refund settlement</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-white/30 group-hover:text-white transition-colors" />
                </button>
              </div>

              {/* Minimal Logout Button */}
              <div className="mt-6 pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full text-xs uppercase tracking-[0.25em] text-white/50 hover:text-[#C9A961] transition-all flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 hover:border-[#C9A961]/30 hover:bg-[#C9A961]/5 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {isLoggingOut ? (
                    <Loader2 size={14} className="animate-spin text-[#C9A961]" />
                  ) : (
                    <LogOut size={14} />
                  )}
                  <span>Sign Out</span>
                </button>
              </div>

            </div>
          </motion.div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Personal Information & Delivery Hub       */}
          {/* ======================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 xl:col-span-8"
          >
            <ProfileForm />
          </motion.div>

        </div>
      </div>

      {/* Bank Account Modal */}
      <BankDetailsModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
      />
    </div>
  )
}
