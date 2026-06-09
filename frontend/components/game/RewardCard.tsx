'use client'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface RewardCardProps {
  title: string
  description: string
  cost: number
  disabled: boolean
  redeemed: boolean
  onRedeem: () => void
}

export function RewardCard({ title, description, cost, disabled, redeemed, onRedeem }: RewardCardProps) {
  return (
    <div className={cn(
      'rounded-[1.75rem] border border-white/10 bg-black/40 p-6 shadow-lg shadow-black/10 transition-colors',
      redeemed ? 'opacity-70' : 'hover:border-velvet-white/40 hover:bg-white/5'
    )}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-velvet-muted">{title}</p>
          <p className="mt-3 text-sm leading-6 text-velvet-muted">{description}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.28em] text-velvet-muted">cost</p>
          <p className="mt-1 text-2xl font-semibold text-velvet-white">{cost}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onRedeem}
          disabled={disabled || redeemed}
          className={cn(
            'inline-flex items-center justify-center rounded-full px-5 py-3 text-[10px] uppercase tracking-[0.26em] transition-all duration-300',
            redeemed
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 cursor-default'
              : disabled
                ? 'bg-white/10 text-velvet-muted border border-white/10 cursor-not-allowed'
                : 'bg-velvet-white text-velvet-black hover:bg-transparent hover:text-velvet-white border border-velvet-white'
          )}
        >
          {redeemed ? 'Redeemed' : 'Redeem'}
        </button>
      </div>
    </div>
  )
}
