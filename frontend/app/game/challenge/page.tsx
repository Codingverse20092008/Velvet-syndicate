'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/store/gameStore'

const challenges = [
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
]

export default function GameChallengePage() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [sessionPoints, setSessionPoints] = useState(0)
  const [lastEarned, setLastEarned] = useState(0)
  const [isCorrect, setIsCorrect] = useState(false)
  const [completed, setCompleted] = useState(false)
  const recordSession = useGameStore((state) => state.recordSession)

  const current = useMemo(() => challenges[activeIndex], [activeIndex])
  const hasMore = activeIndex < challenges.length - 1

  const submitAnswer = () => {
    if (selectedIndex === null) return

    const correct = selectedIndex === current.answerIndex
    const earned = correct ? current.points : Math.max(8, Math.floor(current.points / 2))
    const newTotal = sessionPoints + earned

    setHasSubmitted(true)
    setIsCorrect(correct)
    setLastEarned(earned)
    setSessionPoints(newTotal)

    if (!hasMore) {
      setCompleted(true)
      recordSession(newTotal)
    }
  }

  const nextChallenge = () => {
    if (hasMore) {
      setActiveIndex((current) => current + 1)
      setSelectedIndex(null)
      setHasSubmitted(false)
      setIsCorrect(false)
      setLastEarned(0)
    }
  }

  return (
    <main className="min-h-screen bg-velvet-black px-4 py-16 sm:px-6 md:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="rounded-[2rem] border border-white/10 bg-velvet-card/70 p-8 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Mission live</p>
              <h1 className="mt-4 text-4xl font-heading uppercase tracking-[0.04em] text-velvet-white">Velvet Vault Challenge</h1>
            </div>
            <Link href="/game/rewards" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[10px] uppercase tracking-[0.28em] text-velvet-white hover:border-velvet-white/40">
              <Sparkles className="h-4 w-4" />
              Rewards
            </Link>
          </div>

          {completed ? (
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
          ) : (
            <div className="mt-10 space-y-8">
              <div className="rounded-[1.75rem] border border-white/10 bg-black/40 p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Challenge {activeIndex + 1} of {challenges.length}</p>
                    <h2 className="mt-3 text-3xl font-semibold text-velvet-white">{current.title}</h2>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Reward</p>
                    <p className="mt-2 text-2xl font-semibold text-velvet-white">{current.points} pts</p>
                  </div>
                </div>

                <p className="mt-6 text-lg leading-8 text-velvet-muted">{current.prompt}</p>
              </div>

              <div className="space-y-4">
                {current.options.map((option, index) => {
                  const isSelected = index === selectedIndex
                  const optionClasses = isSelected
                    ? 'border-velvet-white bg-white/5 text-velvet-white'
                    : 'border-white/10 bg-black/40 text-velvet-muted hover:border-white/20 hover:bg-white/5'

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedIndex(index)}
                      className={`w-full rounded-3xl border px-5 py-5 text-left transition ${optionClasses}`}
                    >
                      <span className="text-sm uppercase tracking-[0.24em] text-velvet-muted">Option {index + 1}</span>
                      <p className="mt-3 text-base leading-7 text-velvet-white">{option}</p>
                    </button>
                  )
                })}
              </div>

              {hasSubmitted && (
                <div className="rounded-[1.75rem] border border-white/10 bg-emerald-500/10 p-6 text-velvet-white">
                  <p className="uppercase tracking-[0.3em] text-emerald-200 text-[10px]">{isCorrect ? 'Perfect choice' : 'Nice effort'}</p>
                  <p className="mt-3 text-lg leading-7">
                    {isCorrect ? 'You earned full points.' : 'You still earned partial points for the mission.'}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={hasSubmitted ? nextChallenge : submitAnswer}
                  disabled={selectedIndex === null}
                >
                  {hasSubmitted ? (hasMore ? 'Continue' : 'Finish challenge') : 'Submit answer'}
                </Button>
                <div className="text-sm text-velvet-muted">
                  {selectedIndex === null ? 'Select an option to proceed.' : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
