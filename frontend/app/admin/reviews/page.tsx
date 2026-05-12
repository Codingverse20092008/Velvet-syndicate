'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { MessageSquare, Users, Star, TrendingUp, ArrowRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useEffect, useState } from 'react'

interface ReviewStats {
  totalReviews: number
  fakeReviews: number
  realReviews: number
  averageRating: number
  recentReviews: number
}

export default function ReviewsIndexPage() {
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    fakeReviews: 0,
    realReviews: 0,
    averageRating: 0,
    recentReviews: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Get fake reviews stats
        const fakeRes = await apiFetch('/reviews?isFake=true&limit=1000')
        const fakeData = await fakeRes.json()
        
        // Get real reviews stats
        const realRes = await apiFetch('/reviews?isFake=false&limit=1000')
        const realData = await realRes.json()
        
        if (fakeData?.success && realData?.success) {
          const fakeReviews = fakeData.data.reviews.length
          const realReviews = realData.data.reviews.length
          const totalReviews = fakeReviews + realReviews
          
          const allReviews = [...fakeData.data.reviews, ...realData.data.reviews]
          const averageRating = totalReviews > 0 
            ? allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews 
            : 0
          
          const recentReviews = allReviews.filter((r: any) => 
            new Date(r.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length
          
          setStats({
            totalReviews,
            fakeReviews,
            realReviews,
            averageRating,
            recentReviews
          })
        }
      } catch (error) {
        console.error('Failed to load review stats:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadStats()
  }, [])

  const cards = [
    {
      title: 'Fake Reviews',
      description: 'Manage auto-generated social proof reviews',
      icon: Users,
      href: '/admin/reviews/fake-reviews',
      count: stats.fakeReviews,
      color: 'from-blue-500/20 to-blue-600/20',
      iconColor: 'text-blue-400'
    },
    {
      title: 'Real User Reviews',
      description: 'View and manage authentic customer feedback',
      icon: Star,
      href: '/admin/reviews/real-reviews',
      count: stats.realReviews,
      color: 'from-green-500/20 to-green-600/20',
      iconColor: 'text-green-400'
    }
  ]

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Reviews Management</h1>
        <p className="text-gray-400">Manage fake and real customer reviews</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <MessageSquare size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Reviews</p>
              <p className="text-white text-xl font-bold">{stats.totalReviews}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Star size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Average Rating</p>
              <p className="text-white text-xl font-bold">{stats.averageRating.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Fake Reviews</p>
              <p className="text-white text-xl font-bold">{stats.fakeReviews}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">This Week</p>
              <p className="text-white text-xl font-bold">{stats.recentReviews}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card, index) => (
          <Link key={card.title} href={card.href}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-lg flex items-center justify-center`}>
                  <card.icon size={24} className={card.iconColor} />
                </div>
                <ArrowRight size={20} className="text-gray-400 group-hover:text-white transition-colors" />
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>
              <p className="text-gray-400 text-sm mb-4">{card.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-white">{card.count}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Manage</div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/reviews/fake-reviews">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-left hover:bg-blue-500/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users size={20} className="text-blue-400" />
                <div>
                  <p className="text-white font-medium">Generate Fake Reviews</p>
                  <p className="text-gray-400 text-sm">Create social proof for products</p>
                </div>
              </div>
            </motion.button>
          </Link>
          
          <Link href="/admin/reviews/real-reviews">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-left hover:bg-green-500/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Star size={20} className="text-green-400" />
                <div>
                  <p className="text-white font-medium">Review Real Reviews</p>
                  <p className="text-gray-400 text-sm">Verify customer feedback</p>
                </div>
              </div>
            </motion.button>
          </Link>
        </div>
      </div>
    </div>
  )
}
