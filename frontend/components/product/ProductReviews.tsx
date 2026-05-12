'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MessageSquare, ThumbsUp, Calendar, User, Verified, Filter, Plus } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { ReviewSubmissionModal } from './ReviewSubmissionModal'

interface Review {
  id: string
  productId: string
  userId?: string
  userName?: string
  rating: number
  title?: string
  content: string
  isFake: boolean
  isVerified: boolean
  helpfulCount: number
  fakeUserName?: string
  fakeUserAvatar?: string
  createdAt: string
}

interface ReviewStats {
  totalReviews: number
  averageRating: number
  ratingDistribution: Array<{ rating: number; count: number }>
  fakeReviews: number
  realReviews: number
}

interface ProductReviewsProps {
  productId: string
  productName?: string
  className?: string
}

export function ProductReviews({ productId, productName, className = '' }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'real' | 'fake'>('all')
  const [showMore, setShowMore] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)

  // Load reviews and stats
  const loadReviews = async () => {
    try {
      setLoading(true)
      
      // Load reviews
      const reviewParams = new URLSearchParams()
      reviewParams.append('productId', productId)
      reviewParams.append('limit', '20')
      
      if (filter === 'real') reviewParams.append('isFake', 'false')
      if (filter === 'fake') reviewParams.append('isFake', 'true')
      
      const reviewsRes = await apiFetch(`/reviews/product/${productId}?${reviewParams.toString()}`)
      const reviewsData = await reviewsRes.json()
      
      if (reviewsData?.success) {
        setReviews(reviewsData.data.reviews)
        setStats(reviewsData.data.stats)
      }
    } catch (error) {
      console.error('Failed to load reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [productId, filter])

  // Mark review as helpful
  const markHelpful = async (reviewId: string) => {
    try {
      await apiFetch(`/reviews/${reviewId}/helpful`, { method: 'POST' })
      setReviews(prev => prev.map(r => 
        r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
      ))
    } catch (error) {
      console.error('Failed to mark review as helpful:', error)
    }
  }

  // Handle review submission
  const handleReviewSubmitted = () => {
    loadReviews() // Reload reviews to show the new one
  }

  // Render stars
  const renderStars = (rating: number, size: number = 14) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={size}
        className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
      />
    ))
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get rating distribution
  const getRatingDistribution = () => {
    if (!stats?.ratingDistribution) return []
    return Array.from({ length: 5 }, (_, i) => {
      const rating = 5 - i
      const found = stats.ratingDistribution.find(r => r.rating === rating)
      return { rating, count: found?.count || 0 }
    })
  }

  // Display reviews (limit based on showMore)
  const displayReviews = showMore ? reviews : reviews.slice(0, 3)

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats || stats.totalReviews === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <MessageSquare size={48} className="mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400 mb-2">No reviews yet</p>
        <p className="text-gray-500 text-sm mb-6">Be the first to review this product</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsReviewModalOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-velvet-accent text-black rounded-lg hover:bg-velvet-accent/90 transition-colors font-medium"
        >
          <Plus size={16} />
          Write First Review
        </motion.button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Customer Reviews</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex">
                {renderStars(Math.round(stats.averageRating))}
              </div>
              <span className="text-white font-bold text-lg">{stats.averageRating.toFixed(1)}</span>
            </div>
            <span className="text-gray-400">{stats.totalReviews} reviews</span>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsReviewModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-velvet-accent text-black rounded-lg hover:bg-velvet-accent/90 transition-colors font-medium"
        >
          <Plus size={16} />
          Write Review
        </motion.button>
      </div>

      {/* Rating Distribution */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Rating Distribution</h3>
        <div className="space-y-2">
          {getRatingDistribution().map(({ rating, count }) => {
            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0
            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-white text-sm">{rating}</span>
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-gray-400 text-sm w-12 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            filter === 'all' 
              ? 'bg-velvet-accent text-black' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          All ({stats.totalReviews})
        </button>
        <button
          onClick={() => setFilter('real')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            filter === 'real' 
              ? 'bg-velvet-accent text-black' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Verified ({stats.realReviews})
        </button>
        <button
          onClick={() => setFilter('fake')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            filter === 'fake' 
              ? 'bg-velvet-accent text-black' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Social Proof ({stats.fakeReviews})
        </button>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        <AnimatePresence>
          {displayReviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gray-800 rounded-xl p-6"
            >
              <div className="flex items-start gap-4">
                {/* User Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  {review.isFake ? (
                    <img
                      src={review.fakeUserAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                      alt={review.fakeUserName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-velvet-accent to-black flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {review.userName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Review Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">
                          {review.isFake ? review.fakeUserName : review.userName}
                        </p>
                        {review.isVerified && !review.isFake && (
                          <Verified size={14} className="text-green-400" />
                        )}
                        {review.isFake && (
                          <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                            Social Proof
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-gray-400 text-sm">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {review.title && (
                    <p className="font-medium text-white">{review.title}</p>
                  )}

                  <p className="text-gray-300">{review.content}</p>

                  <div className="flex items-center gap-4 pt-2">
                    <button
                      onClick={() => markHelpful(review.id)}
                      className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      <ThumbsUp size={14} />
                      Helpful ({review.helpfulCount})
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Show More/Less */}
      {reviews.length > 3 && (
        <div className="text-center">
          <button
            onClick={() => setShowMore(!showMore)}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {showMore ? 'Show Less' : `Show All ${reviews.length} Reviews`}
          </button>
        </div>
      )}

      {/* Review Submission Modal */}
      <ReviewSubmissionModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        productId={productId}
        productName={productName || 'This Product'}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </div>
  )
}
