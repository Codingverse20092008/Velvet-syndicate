'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { apiFetch } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const redirectPath = searchParams.get('redirect') || '/collection'
  const { user, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    if (user) {
      router.replace(redirectPath)
    }
  }, [user, router, redirectPath])

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrors({ form: data.error || 'Failed to login' })
        setIsLoading(false)
        return
      }

      setUser(data.data.user)
      router.push(redirectPath)
    } catch {
      setErrors({ form: 'An unexpected error occurred' })
      setIsLoading(false)
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
          className="space-y-8"
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

          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
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
          <Link href={`/signup?redirect=${encodeURIComponent(redirectPath)}`} className="text-velvet-white hover:text-velvet-accent transition-colors cursor-none interactive">
            Create Account
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}
