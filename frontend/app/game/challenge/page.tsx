'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/store/gameStore'
import { useAuthStore } from '@/store/authStore'
import { apiFetch } from '@/lib/api'

// Fallback static challenges (used if API is unavailable)
const fallbackChallenges = [
  {
    id: 'street-party',
    title: 'Rooftop Outfit Match',
    prompt: 'Choose the sneaker that completes a rooftop night look.',
    options: ['Camo high-top', 'Clean white runner', 'Chunky dad shoe'],
    answerIndex: 1,
    points: 20,
  },
  {
    id: 'city-vibe',
    title: 'City Vibe Pick',
    prompt: 'Which pair pairs best with monochrome streetwear?',
    options: ['Low-profile black trainer', 'White high-top', 'Retro skate shoe'],
    answerIndex: 0,
    points: 20,
  },
  {
    id: 'drop-day',
    title: 'Launch Day Choice',
    prompt: 'Select the bold silhouette for a limited drop moment.',
    options: ['Minimal leather shoe', 'Metallic runner', 'Classic suede sneaker'],
    answerIndex: 1,
    points: 25,
  },
  {
    id: 'late-night-drop',
    title: 'Late Night Drop',
    prompt: 'Which silhouette best fits an exclusive midnight streetwear drop?',
    options: ['High-gloss runner', 'Chunky dad shoe', 'Retro low-top'],
    answerIndex: 2,
    points: 20,
  },
  {
    id: 'street-kick',
    title: 'Street Kick',
    prompt: 'Pick the sneaker that pairs best with an oversized hoodie.',
    options: ['Minimal leather shoe', 'Bold platform trainer', 'Classic skate sneaker'],
    answerIndex: 0,
    points: 20,
  },
]

interface Challenge {
  id: string
  title: string
  prompt: string
  options: string[]
  answerIndex: number
  points: number
}

export default function GameChallengePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [sessionPoints, setSessionPoints] = useState(0)
  const [lastEarned, setLastEarned] = useState(0)
  const [isCorrect, setIsCorrect] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [todayPoolSize, setTodayPoolSize] = useState<number | null>(null)
  const [todayDate, setTodayDate] = useState<string | null>(null)
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false)
  const [playLocked, setPlayLocked] = useState(false)
  const [cooldownLabel, setCooldownLabel] = useState<string | null>(null)
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore()
  const recordSession = useGameStore((state) => state.recordSession)

  const getPlayStorageKey = () => {
    if (isAuthenticated && user?.id) {
      return `velvet-vault-challenge-played-${user.id}`
    }
    return 'velvet-vault-challenge-played-guest'
  }

  const formatCooldownLabel = (expiresAt: Date) => {
    const now = new Date()
    const msLeft = expiresAt.getTime() - now.getTime()
    if (msLeft <= 0) return null

    const hours = Math.floor(msLeft / 3_600_000)
    const minutes = Math.floor((msLeft % 3_600_000) / 60_000)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const checkCooldownState = () => {
    if (typeof window === 'undefined') {
      return { locked: false, label: null, played: false }
    }

    const key = getPlayStorageKey()
    const playTimestamp = window.localStorage.getItem(key)
    if (!playTimestamp) {
      return { locked: false, label: null, played: false }
    }

    const playedAt = new Date(playTimestamp)
    const expiresAt = new Date(playedAt.getTime() + 86_400_000)
    const remaining = formatCooldownLabel(expiresAt)

    if (!remaining) {
      window.localStorage.removeItem(key)
      return { locked: false, label: null, played: false }
    }

    return { locked: true, label: remaining, played: true }
  }

  const updateCooldownState = () => {
    const state = checkCooldownState()
    setPlayLocked(state.locked)
    setCooldownLabel(state.label)
    setHasPlayedOnce(state.played)
    return state.locked
  }

  // Fetch daily quizzes from the backend and evaluate play cooldown
  useEffect(() => {
    if (authLoading) return

    async function loadQuizzes() {
      try {
        setIsLoading(true)
        const [quizRes, statusRes] = await Promise.all([
          apiFetch('/quiz?limit=5'),
          apiFetch('/quiz/status'),
        ])

        const [quizData, statusData] = await Promise.all([quizRes.json(), statusRes.json()])

        if (statusData.success) {
          if (typeof statusData.data.todayQuizCount === 'number') {
            setTodayPoolSize(statusData.data.todayQuizCount)
          }
          if (typeof statusData.data.date === 'string') {
            setTodayDate(statusData.data.date)
          }
        }

        const locked = updateCooldownState()
        if (locked) {
          return
        }

        if (quizData.success && quizData.data.quizzes && quizData.data.quizzes.length > 0) {
          setChallenges(quizData.data.quizzes)
        } else {
          setChallenges(fallbackChallenges)
          setLoadError(true)
        }
      } catch {
        setChallenges(fallbackChallenges)
        setLoadError(true)
      } finally {
        setIsLoading(false)
      }
    }

    loadQuizzes()
  }, [authLoading, isAuthenticated, user?.id])

  const current = useMemo(() => challenges[activeIndex], [activeIndex, challenges])
  const hasMore = activeIndex < challenges.length - 1

  const submitAnswer = () => {
    if (selectedIndex === null || !current) return

    const correct = selectedIndex === current.answerIndex
    const earned = correct ? current.points : Math.max(8, Math.floor(current.points / 2))
    const newTotal = sessionPoints + earned

    setHasSubmitted(true)
    setIsCorrect(correct)
    setLastEarned(earned)
    setSessionPoints(newTotal)

    if (!hasMore) {
      setCompleted(true)
      setHasPlayedOnce(true)
      const key = getPlayStorageKey()
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, new Date().toISOString())
      }
      if (isAuthenticated) {
        recordSession(newTotal)
      }
    }
  }

  const nextChallenge = () => {
    if (hasMore) {
      setActiveIndex((i) => i + 1)
      setSelectedIndex(null)
      setHasSubmitted(false)
      setIsCorrect(false)
      setLastEarned(0)
    }
  }

  // Determine button colour for each option after submission
  const getOptionClass = (index: number): string => {
    if (!hasSubmitted) {
      // Before submission: highlight selected
      return index === selectedIndex
        ? 'border-velvet-white bg-white/5 text-velvet-white'
        : 'border-white/10 bg-black/40 text-velvet-muted hover:border-white/20 hover:bg-white/5'
    }

    // After submission: show correct / wrong
    if (index === current.answerIndex) {
      // Always highlight the correct answer green
      return 'border-emerald-500 bg-emerald-500/10 text-emerald-200 cursor-not-allowed'
    }
    if (index === selectedIndex) {
      // Highlight wrong selection red
      return 'border-red-500 bg-red-500/10 text-red-300 cursor-not-allowed'
    }
    // Unselected, wrong options: dim them
    return 'border-white/5 bg-black/20 text-velvet-muted/40 cursor-not-allowed'
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-velvet-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-velvet-muted">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm uppercase tracking-[0.3em]">Loading today's challenges...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-velvet-black px-4 py-16 sm:px-6 md:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="rounded-[2rem] border border-white/10 bg-velvet-card/70 p-8 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Mission live</p>
              <h1 className="mt-4 text-4xl font-heading uppercase tracking-[0.04em] text-velvet-white">Velvet Vault Challenge</h1>
              {todayPoolSize !== null && todayDate ? (
                <p className="mt-2 text-sm uppercase tracking-[0.24em] text-velvet-muted">
                  {todayDate}: Showing 5 of {todayPoolSize} available questions today
                </p>
              ) : todayPoolSize !== null ? (
                <p className="mt-2 text-sm uppercase tracking-[0.24em] text-velvet-muted">
                  Showing 5 of {todayPoolSize} available questions today
                </p>
              ) : null}
              {!authLoading && !isAuthenticated && (
                <p className="mt-2 text-sm uppercase tracking-[0.24em] text-amber-300">
                  You are not logged in — this play is guest-only and score will not be saved permanently.
                </p>
              )}
              {!authLoading && isAuthenticated && (
                <p className="mt-2 text-sm uppercase tracking-[0.24em] text-emerald-300">
                  You are logged in — your points are saved to your account.
                </p>
              )}
              {loadError && (
                <p className="mt-2 text-[10px] text-velvet-muted/60 uppercase tracking-[0.2em]">Using offline questions</p>
              )}
            </div>
            <Link href="/game/rewards" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[10px] uppercase tracking-[0.28em] text-velvet-white hover:border-velvet-white/40">
              <Sparkles className="h-4 w-4" />
              Rewards
            </Link>
          </div>

          {playLocked && !completed ? (
            <div className="mt-12 rounded-[1.75rem] border border-red-500/20 bg-red-500/5 p-8 text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-400" />
              <h2 className="mt-6 text-3xl font-semibold text-velvet-white">Challenge cooldown active</h2>
              <p className="mt-3 text-sm leading-7 text-velvet-muted">
                You have already completed today’s challenge. This quiz is locked for 24 hours.
              </p>
              {cooldownLabel && (
                <p className="mt-3 text-sm leading-7 text-velvet-white">
                  Come back in {cooldownLabel}.
                </p>
              )}
              <p className="mt-3 text-sm leading-7 text-velvet-muted">
                {isAuthenticated
                  ? 'Your score was saved to your account.'
                  : 'Sign in to save your next play permanently.'}
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link
                  href={isAuthenticated ? '/game' : '/login'}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-10 py-4 text-[10px] uppercase tracking-[0.28em] text-velvet-white transition hover:border-white/30 hover:bg-white/10"
                >
                  {isAuthenticated ? 'Back to game' : 'Log in to save future progress'}
                </Link>
              </div>
            </div>
          ) : completed ? (
            <div className="mt-12 rounded-[1.75rem] border border-white/10 bg-black/40 p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <h2 className="mt-6 text-3xl font-semibold text-velvet-white">Mission complete</h2>
              <p className="mt-3 text-sm leading-7 text-velvet-muted">
                You finished all challenges. Your game points have been saved and your streak is updated.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/30 p-5 text-velvet-white">
                  <p className="text-sm uppercase tracking-[0.28em] text-velvet-muted">Points earned</p>
                  <p className="mt-3 text-3xl font-semibold">{sessionPoints} pts</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/30 p-5 text-velvet-white">
                  <p className="text-sm uppercase tracking-[0.28em] text-velvet-muted">Last reward</p>
                  <p className="mt-3 text-3xl font-semibold">{lastEarned} pts</p>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/game/rewards"
                  className="inline-flex items-center justify-center rounded-full bg-velvet-white px-10 py-4 text-[10px] uppercase tracking-[0.28em] text-velvet-black transition hover:bg-transparent hover:text-velvet-white border border-velvet-white"
                >
                  Redeem rewards
                </Link>
                <Link
                  href="/game"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-10 py-4 text-[10px] uppercase tracking-[0.28em] text-velvet-white transition hover:border-white/30 hover:bg-white/10"
                >
                  Back to game
                </Link>
              </div>
            </div>
          ) : current ? (
            <div className="mt-10 space-y-8">
              {/* Question Card */}
              <div className="rounded-[1.75rem] border border-white/10 bg-black/40 p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">
                      Challenge {activeIndex + 1} of {challenges.length}
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-velvet-white">{current.title}</h2>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Reward</p>
                    <p className="mt-2 text-2xl font-semibold text-velvet-white">{current.points} pts</p>
                  </div>
                </div>
                <p className="mt-6 text-lg leading-8 text-velvet-muted">{current.prompt}</p>
              </div>

              {/* Answer Options */}
              <div className="space-y-4">
                {current.options.map((option, index) => (
                  <button
                    key={`${current.id}-${index}`}
                    type="button"
                    disabled={hasSubmitted}
                    onClick={() => !hasSubmitted && setSelectedIndex(index)}
                    className={`w-full rounded-3xl border px-5 py-5 text-left transition-all duration-200 ${getOptionClass(index)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm uppercase tracking-[0.24em] text-velvet-muted">Option {index + 1}</span>
                        <p className="mt-3 text-base leading-7 text-velvet-white">{option}</p>
                      </div>
                      {/* Show icons after submission */}
                      {hasSubmitted && index === current.answerIndex && (
                        <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 ml-4" />
                      )}
                      {hasSubmitted && index === selectedIndex && index !== current.answerIndex && (
                        <XCircle className="h-6 w-6 text-red-400 shrink-0 ml-4" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Result Banner */}
              {hasSubmitted && (
                <div className={`rounded-[1.75rem] border p-6 transition-all duration-300 ${
                  isCorrect
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-red-500/30 bg-red-500/10'
                }`}>
                  <p className={`uppercase tracking-[0.3em] text-[10px] font-semibold ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                    {isCorrect ? '✅ Correct answer!' : '❌ Wrong answer'}
                  </p>
                  <p className="mt-3 text-lg leading-7 text-velvet-white">
                    {isCorrect
                      ? `Perfect! You earned full ${lastEarned} points.`
                      : `The correct answer was: "${current.options[current.answerIndex]}". You still earned ${lastEarned} partial points.`}
                  </p>
                </div>
              )}

              {/* Action Button */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={hasSubmitted ? nextChallenge : submitAnswer}
                  disabled={selectedIndex === null}
                >
                  {hasSubmitted ? (hasMore ? 'Next challenge →' : 'Finish challenge') : 'Submit answer'}
                </Button>
                {!hasSubmitted && selectedIndex === null && (
                  <div className="text-sm text-velvet-muted">Select an option to proceed.</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
