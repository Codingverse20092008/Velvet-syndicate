'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, X, Send, User } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { apiFetch } from '@/lib/api'

interface ReviewSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
  onReviewSubmitted: () => void
}

export function ReviewSubmissionModal({ isOpen, onClose, productId, productName, onReviewSubmitted }: ReviewSubmissionModalProps) {
  const { isAuthenticated } = useAuthStore()
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAuthenticated) {
      setError('Please log in to leave a review')
      return
    }

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    if (content.trim().length < 10) {
      setError('Review must be at least 10 characters long')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          content: content.trim()
        })
      })

      const data = await response.json()
      
      if (data?.success) {
        // Reset form
        setRating(0)
        setTitle('')
        setContent('')
        onClose()
        onReviewSubmitted()
      } else {
        setError(data?.error || 'Failed to submit review')
      }
    } catch (err) {
      setError('Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = (interactive = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => interactive && setRating(i + 1)}
        disabled={!interactive}
        className={`transition-colors ${
          interactive ? 'hover:scale-110 cursor-pointer' : 'cursor-default'
        }`}
      >
        <Star
          size={interactive ? 24 : 20}
          className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
        />
      </button>
    ))
  }

  if (!isAuthenticated) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-800"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">Login Required</h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="text-center py-8">
                <User size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-300 mb-6">Please log in to leave a review for {productName}</p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => window.location.href = '/auth'}
                    className="flex-1 px-4 py-2 bg-velvet-accent text-black rounded-lg hover:bg-velvet-accent/90 transition-colors font-medium"
                  >
                    Log In
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full border border-gray-800 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Write a Review</h3>
                <p className="text-gray-400 text-sm">{productName}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Rating <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2 justify-center">
                  {renderStars(true)}
                </div>
                {rating > 0 && (
                  <p className="text-center text-gray-400 text-sm mt-2">
                    {rating === 5 && 'Excellent!'}
                    {rating === 4 && 'Very Good'}
                    {rating === 3 && 'Good'}
                    {rating === 2 && 'Fair'}
                    {rating === 1 && 'Poor'}
                  </p>
                )}
              </div>

              {/* Title (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Review Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your experience..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-velvet-accent transition-colors"
                  maxLength={100}
                />
              </div>

              {/* Review Content */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Review <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your experience with this product..."
                  rows={5}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-velvet-accent transition-colors resize-none"
                  minLength={10}
                  maxLength={1000}
                />
                <p className="text-gray-500 text-xs mt-1">
                  {content.length}/1000 characters
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || rating === 0 || content.trim().length < 10}
                  className="flex-1 px-4 py-3 bg-velvet-accent text-black rounded-lg hover:bg-velvet-accent/90 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Review
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
