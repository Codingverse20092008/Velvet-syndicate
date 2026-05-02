'use client'

import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CheckCircle2, Lock } from 'lucide-react'
import Link from 'next/link'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!token) {
      setError('Invalid or missing reset token')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.push('/login?message=Password reset successful. Please login with your new password.')
      }, 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-heading tracking-widest text-velvet-white mb-4 uppercase">Invalid Link</h1>
          <p className="text-velvet-muted mb-8 text-sm">This password reset link is invalid or has expired.</p>
          <Link href="/forgot-password">
            <Button size="sm">Request New Link</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-black">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
      >
        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 px-8 border border-white/10 rounded-2xl bg-white/[0.02] backdrop-blur-xl"
          >
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="text-green-500" size={32} />
            </div>
            <h2 className="text-2xl font-heading tracking-widest text-velvet-white mb-4 uppercase">Success</h2>
            <p className="text-sm text-velvet-muted leading-relaxed">
              Your password has been reset. Redirecting you to login...
            </p>
          </motion.div>
        ) : (
          <div>
            <div className="mb-12">
              <h1 className="font-heading text-3xl tracking-[0.2em] text-velvet-white mb-4 uppercase">
                New Password
              </h1>
              <p className="text-sm text-velvet-muted leading-relaxed">
                Please enter a secure new password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <Input
                type="password"
                label="New Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Input
                type="password"
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                error={error || undefined}
              />

              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                isLoading={isLoading}
              >
                Reset Password
              </Button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-velvet-muted uppercase tracking-widest">Initialising Secure Vault...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
