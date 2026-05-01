'use client'

import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'

function VerifyOTPContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (otp.length !== 6) {
      setError('Enter valid 6-digit OTP')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await api.post('/auth/verify-otp', {
        email,
        otp,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      setSuccess('Verified successfully! Redirecting...')
      
      setTimeout(() => {
        router.replace('/login?message=Email verified successfully. Please login.')
      }, 1500)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    
    try {
      const res = await api.post('/auth/send-otp', { email })
      if (res.ok) {
        alert('Verification code resent to your email')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to resend code')
      }
    } catch {
      alert('Failed to resend code')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1
            className="font-heading text-3xl tracking-widest text-velvet-white mb-3 uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Verify Identity
          </motion.h1>
          <motion.p
            className="text-sm text-velvet-muted tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            Verification code sent to <span className="text-velvet-white">{email || 'your email'}</span>
          </motion.p>
        </div>

        {/* Form */}
        <motion.form
          onSubmit={handleVerify}
          className="space-y-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="flex justify-center">
            <Input
              type="text"
              label="Verification Code"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-[0.8em] font-mono"
              required
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-400 text-center">{success}</p>
          )}

          <div className="space-y-4">
            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Verify Account
            </Button>
            
            <button
              type="button"
              onClick={handleResend}
              className="w-full text-xs tracking-widest text-velvet-muted hover:text-velvet-white uppercase transition-colors"
            >
              Request New Code
            </button>
          </div>
        </motion.form>
      </motion.div>
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center animate-pulse uppercase tracking-widest text-velvet-muted">Synchronizing...</div>}>
      <VerifyOTPContent />
    </Suspense>
  )
}
