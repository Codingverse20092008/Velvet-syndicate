'use client'

import { useEffect, useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const { login, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Sanitize redirect path to prevent open redirect vulnerabilities
  const rawRedirect = searchParams.get('redirect')
  const redirectPath = rawRedirect?.startsWith('/') ? rawRedirect : '/'

  useEffect(() => {
    // If already authenticated, redirect immediately
    if (isAuthenticated && !authLoading) {
      router.replace(redirectPath)
    }
  }, [isAuthenticated, authLoading, router, redirectPath])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    const result = await login(formData.email, formData.password)

    if (!result.success) {
      setErrors({ form: result.error || 'Failed to login' })
      setIsLoading(false)
      return
    }

    // Redirect on success
    router.replace(redirectPath)
  }

  return (
    <>
      {/* Header */}
      <div className="text-center mb-6 md:mb-12">
        <motion.h1
          className="font-heading text-3xl tracking-widest text-velvet-white mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          WELCOME BACK
        </motion.h1>
        <motion.p
          className="text-sm text-velvet-muted tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Enter the Syndicate
        </motion.p>
        {message && (
          <motion.p
            className="text-[10px] uppercase tracking-[0.2em] text-velvet-accent mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {message}
          </motion.p>
        )}
      </div>

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-5 md:space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Input
          type="email"
          label="Email"
          placeholder="your@email.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          required
        />

        <div className="relative">
          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            required
          />
          <Link 
            href="/forgot-password" 
            className="absolute right-0 -bottom-6 text-[10px] uppercase tracking-widest text-velvet-muted hover:text-velvet-white transition-colors interactive"
          >
            Forgot Password?
          </Link>
        </div>

        {errors.form && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-velvet-muted text-center space-y-2"
          >
            <p>{errors.form}</p>
            {errors.form.toLowerCase().includes('verify') && (
              <Link 
                href={`/verify-otp?email=${encodeURIComponent(formData.email)}`}
                className="block text-velvet-accent hover:text-velvet-white transition-colors uppercase text-[10px] tracking-widest"
              >
                Verify Now
              </Link>
            )}
          </motion.div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Enter
        </Button>
      </motion.form>

      {/* Switch to Signup */}
      <motion.p
        className="text-center mt-8 text-sm text-velvet-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        New to Velvet Syndicate?{' '}
        <Link href={`/signup?redirect=${encodeURIComponent(redirectPath)}`} className="text-velvet-white hover:text-velvet-accent transition-colors interactive">
          Create Account
        </Link>
      </motion.p>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center animate-pulse uppercase tracking-widest text-velvet-muted">Loading Vault...</div>}>
      <LoginContent />
    </Suspense>
  )
}
