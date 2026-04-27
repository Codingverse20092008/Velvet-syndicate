'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Star, Send, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { apiFetch } from '@/lib/api'

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { user } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await apiFetch('/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          rating,
          page: window.location.pathname,
        }),
      })

      if (res.ok) {
        setSubmitted(true)
        setMessage('')
        setRating('')
        setTimeout(() => {
          setSubmitted(false)
          setIsOpen(false)
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-velvet-accent text-black rounded-full shadow-lg shadow-velvet-accent/30 flex items-center justify-center hover:bg-velvet-accent/90 transition-colors"
        aria-label="Give feedback"
      >
        <MessageCircle size={24} />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
            >
              <div className="bg-velvet-dark border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-heading text-velvet-white tracking-wide">
                    Give Feedback
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-velvet-muted hover:text-velvet-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send size={24} className="text-emerald-400" />
                    </div>
                    <p className="text-velvet-white">Thank you for your feedback!</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Rating */}
                    <div>
                      <label className="text-xs text-velvet-muted uppercase tracking-widest mb-2 block">
                        How was your experience?
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setRating(rating === num.toString() ? '' : num.toString())}
                            className="p-1 transition-transform hover:scale-110"
                          >
                            <Star
                              size={24}
                              className={
                                rating && parseInt(rating) >= num
                                  ? 'fill-velvet-accent text-velvet-accent'
                                  : 'text-velvet-muted'
                              }
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="text-xs text-velvet-muted uppercase tracking-widest mb-2 block">
                        What went wrong? What confused you?
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us what you think..."
                        rows={4}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-velvet-white placeholder-velvet-muted/50 focus:border-velvet-accent focus:outline-none resize-none"
                        maxLength={500}
                        required
                      />
                      <div className="text-right text-[10px] text-velvet-muted mt-1">
                        {message.length}/500
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={!message.trim() || isSubmitting}
                      className="w-full h-12 bg-white text-black rounded-lg text-xs uppercase tracking-widest font-bold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Send Feedback
                          <Send size={16} />
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-velvet-muted text-center">
                      {user ? 'Sent as logged-in user' : 'Anonymous feedback'}
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
