'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cooldown > 0) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setIsSubmitted(true)
      setCooldown(60) // 60 seconds cooldown
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-black">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
      >
        <Link 
          href="/login" 
          className="inline-flex items-center text-xs text-velvet-muted hover:text-velvet-white transition-colors mb-12 uppercase tracking-widest gap-2 interactive"
        >
          <ArrowLeft size={12} /> Back to login
        </Link>

        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-12">
                <h1 className="font-heading text-3xl tracking-[0.2em] text-velvet-white mb-4 uppercase">
                  Forgot Password
                </h1>
                <p className="text-sm text-velvet-muted leading-relaxed">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <Input
                  type="email"
                  label="Email Address"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  error={error || undefined}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg" 
                  isLoading={isLoading}
                  disabled={cooldown > 0}
                >
                  {cooldown > 0 ? `Wait ${cooldown}s` : 'Send Reset Link'}
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-12 px-8 border border-white/10 rounded-2xl bg-white/[0.02] backdrop-blur-xl"
            >
              <div className="w-16 h-16 bg-velvet-white/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <Mail className="text-velvet-white" size={32} />
              </div>
              <h2 className="text-2xl font-heading tracking-widest text-velvet-white mb-4 uppercase">Check Your Inbox</h2>
              <p className="text-sm text-velvet-muted leading-relaxed mb-8">
                If an account exists for <span className="text-velvet-white font-medium">{email}</span>, you will receive a reset link shortly.
              </p>
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-widest text-velvet-muted">
                  Didn't receive the email?
                </p>
                <button
                  onClick={handleSubmit}
                  disabled={cooldown > 0 || isLoading}
                  className="text-xs uppercase tracking-widest text-velvet-white hover:text-velvet-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Try again'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
