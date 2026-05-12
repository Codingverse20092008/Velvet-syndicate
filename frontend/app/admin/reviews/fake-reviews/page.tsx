'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, Trash2, RefreshCw, Users, MessageSquare, TrendingUp, Calendar } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface FakeReview {
  id: string
  productId: string
  productName: string
  rating: number
  title: string
  content: string
  fakeUserName: string
  fakeUserAvatar: string
  helpfulCount: number
  createdAt: string
}

interface GenerationResult {
  generated: number
  productsCount: number
  existingProductsCount?: number
  newProductsCount?: number
  type?: string
  products: Array<{ id: string; name: string; currentReviews?: number; isNew?: boolean; daysElapsed?: number }>
}

export default function FakeReviewsPage() {
  const [reviews, setReviews] = useState<FakeReview[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    averageRating: 0,
    recentCount: 0
  })

  // Load fake reviews
  const loadReviews = async () => {
    try {
      setLoading(true)
      const res = await apiFetch('/reviews?isFake=true&limit=100')
      const data = await res.json()
      if (data?.success) {
        setReviews(data.data.reviews)
        calculateStats(data.data.reviews)
      }
    } catch (error) {
      console.error('Failed to load fake reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const calculateStats = (reviewData: FakeReview[]) => {
    const total = reviewData.length
    const averageRating = total > 0 
      ? reviewData.reduce((sum, r) => sum + r.rating, 0) / total 
      : 0
    const recentCount = reviewData.filter(r => 
      new Date(r.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length

    setStats({ total, averageRating, recentCount })
  }

  // Generate scheduled fake reviews (2-day rule)
  const generateScheduledReviews = async () => {
    try {
      setGenerating(true)
      const res = await apiFetch('/reviews/generate-fake', { method: 'POST' })
      const response = await res.json()
      
      if (response?.success) {
        const result = response.data as GenerationResult;
        await loadReviews() // Reload reviews
        
        // Show detailed success message for 2-day rule
        let message = `Generated ${result.generated} fake reviews for ${result.productsCount} products (2-day rule)`;
        
        console.log('✅', message);
        
        // Show product details in console
        result.products?.forEach(p => {
          console.log(`📦 ${p.name} - Added ${p.daysElapsed} days ago, now has reviews`);
        });
      }
    } catch (error) {
      console.error('Failed to generate scheduled fake reviews:', error)
    } finally {
      setGenerating(false)
    }
  }

  // Generate manual fake reviews (existing products)
  const generateManualReviews = async () => {
    try {
      setGenerating(true)
      const res = await apiFetch('/reviews/generate-manual', { method: 'POST', body: JSON.stringify({ limit: 3 }) })
      const response = await res.json()
      
      if (response?.success) {
        const result = response.data as GenerationResult;
        await loadReviews() // Reload reviews
        
        // Show detailed success message for manual generation
        let message = `Generated ${result.generated} fake reviews for ${result.productsCount} products (manual)`;
        
        if (result.existingProductsCount && result.newProductsCount) {
          message += ` (${result.existingProductsCount} existing, ${result.newProductsCount} new)`;
        }
        
        console.log('✅', message);
        
        // Show product details in console
        result.products?.forEach(p => {
          console.log(`📦 ${p.name} - ${p.isNew ? 'New' : 'Existing'} product (${p.currentReviews || 0} → ${(p.currentReviews || 0) + 3} reviews)`);
        });
      }
    } catch (error) {
      console.error('Failed to generate manual fake reviews:', error)
    } finally {
      setGenerating(false)
    }
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

  useEffect(() => {
    loadReviews()
  }, [])

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Fake Reviews Management</h1>
          <p className="text-gray-400">Manage auto-generated social proof reviews</p>
        </div>
        
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateScheduledReviews}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50"
          >
            <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Running...' : 'Run 2-Day Rule'}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateManualReviews}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-velvet-accent text-black rounded-lg font-medium disabled:opacity-50"
          >
            <Users size={16} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating...' : 'Manual Generate'}
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <MessageSquare size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Fake Reviews</p>
              <p className="text-white text-xl font-bold">{stats.total}</p>
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
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">This Week</p>
              <p className="text-white text-xl font-bold">{stats.recentCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Fake Users</p>
              <p className="text-white text-xl font-bold">{new Set(reviews.map(r => r.fakeUserName)).size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">All Fake Reviews</h2>
        </div>
        
        {reviews.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400 mb-4">No fake reviews found</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generateManualReviews}
              disabled={generating}
              className="px-4 py-2 bg-velvet-accent text-black rounded-lg font-medium"
            >
              Generate First Reviews
            </motion.button>
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
                      <img
                        src={review.fakeUserAvatar}
                        alt={review.fakeUserName}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-white">{review.fakeUserName}</p>
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
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => deleteReview(review.id)}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
