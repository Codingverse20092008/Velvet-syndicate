'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, Trash2, Eye, Users, MessageSquare, TrendingUp, Calendar, Verified, Filter } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface RealReview {
  id: string
  productId: string
  productName: string
  userId: string
  userName: string
  rating: number
  title: string
  content: string
  isVerified: boolean
  helpfulCount: number
  createdAt: string
}

export default function RealReviewsPage() {
  const [reviews, setReviews] = useState<RealReview[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    averageRating: 0,
    recentCount: 0
  })

  // Load real reviews
  const loadReviews = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('isFake', 'false')
      params.append('limit', '100')
      
      if (filter !== 'all') {
        params.append('verified', filter === 'verified' ? 'true' : 'false')
      }
      
      if (ratingFilter) {
        params.append('rating', ratingFilter.toString())
      }
      
      const res = await apiFetch(`/reviews?${params.toString()}`)
      const data = await res.json()
      if (data?.success) {
        setReviews(data.data.reviews)
        calculateStats(data.data.reviews)
      }
    } catch (error) {
      console.error('Failed to load real reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const calculateStats = (reviewData: RealReview[]) => {
    const total = reviewData.length
    const verified = reviewData.filter(r => r.isVerified).length
    const averageRating = total > 0 
      ? reviewData.reduce((sum, r) => sum + r.rating, 0) / total 
      : 0
    const recentCount = reviewData.filter(r => 
      new Date(r.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length

    setStats({ total, verified, averageRating, recentCount })
  }

  // Delete a review
  const deleteReview = async (reviewId: string) => {
    try {
      await apiFetch(`/reviews/${reviewId}`, { method: 'DELETE' })
      setReviews(prev => prev.filter(r => r.id !== reviewId))
      calculateStats(reviews.filter(r => r.id !== reviewId))
    } catch (error) {
      console.error('Failed to delete review:', error)
    }
  }

  // Toggle verified status
  const toggleVerified = async (reviewId: string, currentStatus: boolean) => {
    try {
      await apiFetch(`/reviews/${reviewId}`, { 
        method: 'PUT',
        body: JSON.stringify({ isVerified: !currentStatus })
      })
      setReviews(prev => prev.map(r => 
        r.id === reviewId ? { ...r, isVerified: !currentStatus } : r
      ))
      calculateStats(reviews.map(r => 
        r.id === reviewId ? { ...r, isVerified: !currentStatus } : r
      ))
    } catch (error) {
      console.error('Failed to update review:', error)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [filter, ratingFilter])

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
      />
    ))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
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
        <h1 className="text-2xl font-bold text-white mb-2">Real User Reviews</h1>
        <p className="text-gray-400">Manage authentic customer reviews and feedback</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <MessageSquare size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Reviews</p>
              <p className="text-white text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Verified size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Verified</p>
              <p className="text-white text-xl font-bold">{stats.verified}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Star size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Avg Rating</p>
              <p className="text-white text-xl font-bold">{stats.averageRating.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">This Week</p>
              <p className="text-white text-xl font-bold">{stats.recentCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-gray-400 text-sm">Filters:</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter === 'all' 
                  ? 'bg-velvet-accent text-black' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Reviews
            </button>
            <button
              onClick={() => setFilter('verified')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter === 'verified' 
                  ? 'bg-velvet-accent text-black' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Verified
            </button>
            <button
              onClick={() => setFilter('unverified')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter === 'unverified' 
                  ? 'bg-velvet-accent text-black' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Unverified
            </button>
          </div>

          <div className="flex gap-2">
            <span className="text-gray-400 text-sm">Rating:</span>
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => setRatingFilter(ratingFilter === rating ? null : rating)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  ratingFilter === rating 
                    ? 'bg-velvet-accent text-black' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {rating} ⭐
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {filter === 'all' ? 'All Reviews' : filter === 'verified' ? 'Verified Reviews' : 'Unverified Reviews'}
            {ratingFilter && ` - ${ratingFilter} Star${ratingFilter > 1 ? 's' : ''}`}
          </h2>
        </div>
        
        {reviews.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">No reviews found matching your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-velvet-accent to-black rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {review.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{review.userName}</p>
                          {review.isVerified && (
                            <Verified size={14} className="text-green-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{review.productName}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    
                    {review.title && (
                      <p className="font-medium text-white">{review.title}</p>
                    )}
                    
                    <p className="text-gray-300 text-sm">{review.content}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(review.createdAt)}
                      </span>
                      <span>👍 {review.helpfulCount} helpful</span>
                      {!review.isVerified && (
                        <span className="text-yellow-400">⚠️ Pending verification</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleVerified(review.id, review.isVerified)}
                      className={`p-2 rounded-lg transition-colors ${
                        review.isVerified 
                          ? 'text-green-400 hover:bg-green-400/10' 
                          : 'text-yellow-400 hover:bg-yellow-400/10'
                      }`}
                      title={review.isVerified ? 'Unverify review' : 'Verify review'}
                    >
                      <Verified size={16} />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteReview(review.id)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
