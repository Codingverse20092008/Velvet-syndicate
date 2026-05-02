'use client'

import { useEffect, useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signup, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
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

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsLoading(true)

    const result = await signup(formData.name, formData.email, formData.password)

    if (!result.success) {
      setErrors({ form: result.error || 'Failed to create account' })
      setIsLoading(false)
      return
    }

    // On successful signup, redirect to OTP verification
    router.replace(`/verify-otp?email=${encodeURIComponent(formData.email)}`)
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
            className="font-heading text-3xl tracking-widest text-velvet-white mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            JOIN THE SYNDICATE
          </motion.h1>
          <motion.p
            className="text-sm text-velvet-muted tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            Wear the Unspoken
          </motion.p>
        </div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Input
            type="text"
            label="Name"
            placeholder="Your name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
          />

          <Input
            type="email"
            label="Email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
          />

          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            required
          />

          <Input
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            error={errors.confirmPassword}
            required
          />

          {errors.form && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-velvet-muted text-center"
            >
              {errors.form}
            </motion.p>
          )}

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Create Account
          </Button>
        </motion.form>

        {/* Switch to Login */}
        <motion.p
          className="text-center mt-8 text-sm text-velvet-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          Already a member?{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="text-velvet-white hover:text-velvet-accent transition-colors interactive">
            Enter Syndicate
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center animate-pulse uppercase tracking-widest text-velvet-muted">Loading Vault...</div>}>
      <SignupContent />
    </Suspense>
  )
}
