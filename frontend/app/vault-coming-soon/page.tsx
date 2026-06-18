'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Gem, Mail, CheckCircle2, Clock, Sparkles, Gift, Package, Award, Trophy, Zap } from 'lucide-react'
import { getRemainingTime, getLaunchDateString, getLaunchDate, isVaultLive, TIMEZONE } from '@/lib/vault-launch'
import { trackEvent } from '@/lib/analytics'

const LAUNCH_FEATURES = [
  { title: 'Daily Quizzes', icon: Zap, description: 'Test your style knowledge daily' },
  { title: 'Reward Shop', icon: Gift, description: 'Spend coins on exclusive rewards' },
  { title: 'Mystery Crates', icon: Package, description: 'Open crates for surprise rewards' },
  { title: 'Badges', icon: Award, description: 'Collect achievements and badges' },
  { title: 'Leaderboards', icon: Trophy, description: 'Compete for the top spot' },
]

export default function VaultComingSoonPage() {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(getRemainingTime())
  const [email, setEmail] = useState('')
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [waitlistMessage, setWaitlistMessage] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (typeof window !== 'undefined') {
      trackEvent('VAULT_COUNTDOWN_PAGE_VISIT', { timestamp: new Date().toISOString() })
    }

    if (isVaultLive()) {
      router.replace('/vault')
      return
    }

    const interval = setInterval(() => {
      const remaining = getRemainingTime()
      setTimeLeft(remaining)

      if (remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0) {
        clearInterval(interval)
        router.replace('/vault')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [router])

  const handleWaitlistSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setWaitlistStatus('loading')

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setWaitlistStatus('error')
      setWaitlistMessage('Please enter a valid email address.')
      return
    }

    try {
      const res = await fetch('/api/vault/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (data.success) {
        setWaitlistStatus('success')
        setWaitlistMessage("You're on the list. We'll notify you when Velvet Vault unlocks.")
        trackEvent('VAULT_WAITLIST_SIGNUP', { email })
      } else {
        setWaitlistStatus('error')
        setWaitlistMessage(data.message || data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setWaitlistStatus('error')
      setWaitlistMessage('Something went wrong. Please try again.')
    }
  }, [email])

  if (!mounted) {
    return null
  }

  const pad = (n: number) => n.toString().padStart(2, '0')

  return (
    <main className="min-h-screen bg-velvet-black">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-32 pb-20 sm:px-6 md:px-10 lg:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/5 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-amber-500/20 bg-amber-500/5 px-5 py-2">
              <Gem className="h-4 w-4 text-amber-400" />
              <span className="text-[10px] uppercase tracking-[0.28em] text-amber-200">
                Velvet Vault
              </span>
            </div>

            <h1 className="font-heading text-5xl uppercase tracking-[0.06em] text-velvet-white sm:text-7xl md:text-8xl">
              Play.
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                Earn.
              </span>
              <br />
              Unlock.
            </h1>

            <p className="mx-auto mt-8 max-w-xl text-sm leading-7 text-velvet-muted sm:text-base">
              The next generation of rewards, quizzes, crates, badges and community progression
              is almost here.
            </p>
          </motion.div>

          {/* Countdown Timer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mx-auto mt-12 grid max-w-lg grid-cols-4 gap-4"
          >
            {[
              { label: 'Days', value: pad(timeLeft.days) },
              { label: 'Hours', value: pad(timeLeft.hours) },
              { label: 'Minutes', value: pad(timeLeft.minutes) },
              { label: 'Seconds', value: pad(timeLeft.seconds) },
            ].map((unit) => (
              <div
                key={unit.label}
                className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm"
              >
                <p className="font-heading text-3xl font-bold tracking-[0.04em] text-velvet-white sm:text-4xl">
                  {unit.value}
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.28em] text-velvet-muted">
                  {unit.label}
                </p>
              </div>
            ))}
          </motion.div>

          <p className="mt-6 text-sm text-velvet-muted">
            <Clock className="mr-2 inline-block h-4 w-4" />
            Unlocks: {getLaunchDateString()}
          </p>
        </div>
      </section>

      {/* Features Preview Section */}
      <section className="px-4 py-20 sm:px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">
              Coming Features
            </p>
            <h2 className="mt-3 font-heading text-3xl uppercase tracking-[0.04em] text-velvet-white">
              What Awaits You
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {LAUNCH_FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="group rounded-2xl border border-white/10 bg-black/40 p-6 transition-all hover:border-amber-500/20"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <feature.icon className="h-6 w-6 text-velvet-muted group-hover:text-amber-400" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-velvet-white">
                    {feature.title}
                  </h3>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-velvet-muted">
                    Locked
                  </span>
                </div>
                <p className="mt-2 text-xs leading-6 text-velvet-muted">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section className="px-4 py-20 sm:px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-lg">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-b from-black/60 to-transparent p-8 text-center backdrop-blur-sm">
            {waitlistStatus === 'success' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-lg font-semibold text-velvet-white">
                  You're on the list.
                </p>
                <p className="text-sm text-velvet-muted">
                  We'll notify you when Velvet Vault unlocks.
                </p>
              </motion.div>
            ) : (
              <>
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <Mail className="h-7 w-7 text-amber-400" />
                </div>

                <h3 className="text-xl font-heading uppercase tracking-[0.04em] text-velvet-white">
                  Notify Me At Launch
                </h3>
                <p className="mt-3 text-sm leading-6 text-velvet-muted">
                  Be the first to know when Velvet Vault goes live. Get early access updates
                  and exclusive launch-day rewards.
                </p>

                <form onSubmit={handleWaitlistSubmit} className="mt-8 space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm text-velvet-white placeholder:text-velvet-muted/50 focus:border-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                    disabled={waitlistStatus === 'loading'}
                  />

                  {waitlistStatus === 'error' && (
                    <p className="text-xs text-red-400">{waitlistMessage}</p>
                  )}

                  <button
                    type="submit"
                    disabled={waitlistStatus === 'loading'}
                    className="w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 text-[10px] uppercase tracking-[0.28em] font-bold text-black transition-all hover:from-amber-400 hover:to-orange-400 disabled:opacity-50"
                  >
                    {waitlistStatus === 'loading' ? (
                      <span className="flex items-center justify-center gap-2">
                        <Zap className="h-4 w-4 animate-pulse" />
                        Joining...
                      </span>
                    ) : (
                      'Join Waitlist'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}