'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Gift, ShieldCheck, Sparkles } from 'lucide-react'
import { RewardCard } from '@/components/game/RewardCard'
import { Button } from '@/components/ui/Button'
import { useGameStore } from '@/store/gameStore'

const rewards = [
  {
    id: 'discount-10',
    title: '10% Off Coupon',
    description: 'Redeem 100 points for a shopwide 10% discount on your next order.',
    cost: 100,
  },
  {
    id: 'free-shipping',
    title: 'Free Shipping',
    description: 'Spend 200 points to remove delivery fees on your next purchase.',
    cost: 200,
  },
  {
    id: 'bundle-pass',
    title: 'Limited Bundle Pass',
    description: 'Use 300 points to unlock a special product bundle offer.',
    cost: 300,
  },
  {
    id: 'early-access',
    title: 'VIP Early Access',
    description: 'Reserve 500 points for early access to the next release drop.',
    cost: 500,
  },
]

export default function GameRewardsPage() {
  const points = useGameStore((state) => state.points)
  const redeemedRewards = useGameStore((state) => state.redeemedRewards)
  const redeemReward = useGameStore((state) => state.redeemReward)
  const [message, setMessage] = useState<string | null>(null)

  const availableRewards = useMemo(
    () => rewards.map((reward) => ({
      ...reward,
      redeemed: redeemedRewards.includes(reward.id),
      disabled: points < reward.cost,
    })),
    [points, redeemedRewards]
  )

  const handleRedeem = (reward: { id: string; title: string; cost: number }) => {
    const success = redeemReward(reward.id, reward.cost)
    setMessage(success ? `Redeemed ${reward.title}! Use it at checkout.` : 'Not enough points or reward already claimed.')
  }

  return (
    <main className="min-h-screen bg-velvet-black px-4 py-16 sm:px-6 md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl space-y-12">
        <div className="rounded-[2rem] border border-white/10 bg-velvet-card/70 p-8 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-velvet-muted">Points shop</p>
              <h1 className="mt-4 text-4xl font-heading uppercase tracking-[0.04em] text-velvet-white">Rewards redemption</h1>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/40 px-5 py-4 text-right">
              <p className="text-[10px] uppercase tracking-[0.3em] text-velvet-muted">Balance</p>
              <p className="mt-2 text-3xl font-semibold text-velvet-white">{points} pts</p>
            </div>
          </div>

          <p className="mt-6 max-w-2xl text-sm leading-7 text-velvet-muted">
            Use your Velvet Vault points to claim special offers. Redeemed rewards are ready to use in checkout or can be held for your next order.
          </p>
        </div>

        {message && (
          <div className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/10 p-5 text-velvet-white">
            {message}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          {availableRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              title={reward.title}
              description={reward.description}
              cost={reward.cost}
              redeemed={reward.redeemed}
              disabled={reward.disabled}
              onRedeem={() => handleRedeem(reward)}
            />
          ))}
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/40 p-6">
            <p className="text-sm uppercase tracking-[0.28em] text-velvet-muted">Tip</p>
            <p className="mt-3 text-sm leading-7 text-velvet-white">Stay on a 3-day streak to earn a bonus and scale your points faster.</p>
          </div>
          <Link
            href="/game/challenge"
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-8 py-4 text-[10px] uppercase tracking-[0.28em] text-velvet-white transition hover:border-white/30 hover:bg-white/10"
          >
            Play another challenge
          </Link>
        </div>
      </div>
    </main>
  )
}
