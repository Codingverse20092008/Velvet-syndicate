'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Crown,
  Sparkles,
  Ticket,
  Clock,
  ShieldCheck,
  ArrowRight,
  Calendar,
  Wallet,
  CheckCircle2,
  Bell,
  Star,
  Zap,
  Lock
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { formatPrice } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

const EASE = [0.22, 1, 0.36, 1]

interface UpcomingDrop {
  id: string
  title: string
  edition: string
  releaseDate: string
  releaseTime: string
  tierAccess: string
  price: number
  imageUrl: string
  status: 'RESERVE_OPEN' | 'UPCOMING' | 'BALLOT_ONLY'
}

interface ActiveRaffle {
  id: string
  title: string
  description: string
  drawDate: string
  totalAllocations: number
  tierRequirement: string
  entryStatus: 'OPEN' | 'ENTERED'
  retailPrice: number
}

const UPCOMING_DROPS: UpcomingDrop[] = [
  {
    id: 'drop-01',
    title: 'Air Jordan 1 Low Travis Scott Style',
    edition: 'Limited Run • 25 Pairs',
    releaseDate: 'OCT 12, 2026',
    releaseTime: '10:00 AM IST',
    tierAccess: '15m VIP Priority Window',
    price: 2899,
    imageUrl: '/images/placeholder-product.png',
    status: 'RESERVE_OPEN'
  },
  {
    id: 'drop-02',
    title: 'Nike SB Dunk Low “Chunky Dunky”',
    edition: 'Special Box Edition • 30 Pairs',
    releaseDate: 'OCT 26, 2026',
    releaseTime: '06:00 PM IST',
    tierAccess: 'Silver & Gold Early Window',
    price: 2699,
    imageUrl: '/images/placeholder-product.png',
    status: 'UPCOMING'
  },
  {
    id: 'drop-03',
    title: 'Nike Air Force 1 Low “Coffee Milk Shadow”',
    edition: 'Bespoke Velvet Capsule',
    releaseDate: 'NOV 04, 2026',
    releaseTime: '12:00 PM IST',
    tierAccess: 'Members Only Ballot',
    price: 3199,
    imageUrl: '/images/placeholder-product.png',
    status: 'BALLOT_ONLY'
  }
]

const ACTIVE_RAFFLES: ActiveRaffle[] = [
  {
    id: 'raffle-01',
    title: 'Community Ballot: Air Jordan 1 Low Travis Scott Style',
    description: 'Exclusive member ballot allocation for the iconic reverse mocha low silhouette with premium tumbled leather.',
    drawDate: 'OCT 15, 2026',
    totalAllocations: 20,
    tierRequirement: 'All Syndicate Members',
    entryStatus: 'OPEN',
    retailPrice: 2899
  },
  {
    id: 'raffle-02',
    title: 'Vault Reserve Draw: Nike SB Dunk Low “Chunky Dunky”',
    description: 'Community allocation draw for the coveted Ben & Jerry’s tribute dunk with faux cowhide accents and cloud insoles.',
    drawDate: 'OCT 29, 2026',
    totalAllocations: 15,
    tierRequirement: 'Silver (Initiate) & Gold Members',
    entryStatus: 'OPEN',
    retailPrice: 2699
  }
]

const TIER_BENEFITS = [
  {
    tier: 'Silver Member (Initiate)',
    badge: 'Tier 1 • Default',
    perks: ['Standard Drop Access', 'Curated Editorial', '₹150 Welcome Drop Credit', 'Community Ballot Entries']
  },
  {
    tier: 'Gold Insider',
    badge: 'Tier 2 • ₹25k Spend',
    perks: ['15-Minute Early Drop Window', 'Priority Allocation Ballots', 'Free Express Shipping', '1.25x Credit Multiplier']
  },
  {
    tier: 'Platinum Syndicate',
    badge: 'Tier 3 • VIP Elite',
    perks: ['1-Hour Priority Allocation Window', '2x Ballot Draw Multiplier', 'Access to Archived Vault Sneakers', 'Dedicated WhatsApp Concierge']
  }
]

export default function VaultPage() {
  const { user } = useAuthStore()
  const [notifiedDrops, setNotifiedDrops] = useState<string[]>([])
  const [enteredRaffles, setEnteredRaffles] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'drops' | 'raffles' | 'tiers'>('drops')

  // Dynamic user wallet balance & tier standing (defaults to Silver Initiate with ₹150 welcome credit)
  const [walletBalance, setWalletBalance] = useState<number>(150)
  const [memberTier, setMemberTier] = useState<string>('Silver Member (Initiate)')

  useEffect(() => {
    let isCancelled = false

    if (user) {
      apiFetch('/user/stats')
        .then(res => (res.ok ? res.json() : null))
        .then(res => {
          if (isCancelled || !res) return
          if (res.success && res.data?.stats) {
            const stats = res.data.stats
            const points = Number(stats.loyaltyPoints) || 0
            // Display user points or default to ₹150 welcome credit
            setWalletBalance(points > 0 ? points : 150)

            const totalSpent = Number(stats.totalSpent) || 0
            if (totalSpent >= 75000) {
              setMemberTier('Platinum Syndicate')
            } else if (totalSpent >= 25000) {
              setMemberTier('Gold Insider')
            } else {
              setMemberTier('Silver Member (Initiate)')
            }
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setWalletBalance(150)
            setMemberTier('Silver Member (Initiate)')
          }
        })
    } else {
      setWalletBalance(150)
      setMemberTier('Silver Member (Initiate)')
    }

    return () => {
      isCancelled = true
    }
  }, [user])

  const toggleNotify = (id: string) => {
    setNotifiedDrops(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const enterRaffle = (id: string) => {
    if (!enteredRaffles.includes(id)) {
      setEnteredRaffles(prev => [...prev, id])
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-velvet-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#161616] via-[#101010] to-[#0A0A0A] p-8 md:p-12 mb-10 shadow-2xl"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-[#C9A961]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A961]/10 border border-[#C9A961]/30 text-[#C9A961] text-[11px] uppercase tracking-[0.25em] font-medium">
              <Crown size={13} />
              The Syndicate VIP Club
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-velvet-white uppercase tracking-tight">
              Private Drops & Member Access
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 max-w-2xl leading-relaxed">
              Welcome to the inner circle. Your member standing unlocks authentic streetwear allocations,
              priority drop windows, and verified sneaker community ballots.
            </p>
          </div>

          <div className="flex md:flex-col items-center md:items-end gap-3 shrink-0">
            <Link
              href="/collection"
              className="px-6 py-3.5 rounded-xl bg-[#C9A961] hover:bg-[#d8b870] text-black font-heading text-xs uppercase tracking-[0.2em] font-bold transition-all shadow-lg shadow-[#C9A961]/20 active:scale-95"
            >
              Explore Collection
            </Link>
          </div>
        </div>

        {/* Member Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-white/5">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-mono">Membership Tier</div>
            <div className="font-heading text-xl sm:text-2xl text-velvet-white mt-1 flex items-center gap-2">
              <span className="truncate">{memberTier}</span>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-[#C9A961]/20 text-[#C9A961] border border-[#C9A961]/30 shrink-0">Active</span>
            </div>
            <div className="text-xs text-neutral-400 mt-1">Standard drop access & community ballots</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-mono">Syndicate Credits</div>
            <div className="font-heading text-2xl text-[#C9A961] mt-1 flex items-center gap-1.5 font-semibold">
              <Wallet size={18} />
              <span>{formatPrice(walletBalance)}</span>
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              {walletBalance === 150 ? '₹150 Welcome Credits for initiates' : 'Available for drop checkout deduction'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-mono">Next Scheduled Drop</div>
            <div className="font-heading text-xl text-velvet-white mt-1">OCT 12, 10:00 AM</div>
            <div className="text-xs text-[#C9A961] mt-1 truncate">Air Jordan 1 Low Travis Scott Style</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-mono">Live Ballot Entries</div>
            <div className="font-heading text-2xl text-velvet-white mt-1 flex items-center gap-1.5">
              <Ticket size={18} className="text-cyan-400" />
              <span>{enteredRaffles.length > 0 ? `${enteredRaffles.length} Active` : '0 Active'}</span>
            </div>
            <div className="text-xs text-neutral-400 mt-1">Community ballot reservations pending</div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('drops')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs uppercase tracking-[0.18em] font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'drops'
              ? 'bg-[#C9A961] text-black font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles size={14} />
          Upcoming Drops ({UPCOMING_DROPS.length})
        </button>

        <button
          onClick={() => setActiveTab('raffles')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs uppercase tracking-[0.18em] font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'raffles'
              ? 'bg-[#C9A961] text-black font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Ticket size={14} />
          Member Raffles ({ACTIVE_RAFFLES.length})
        </button>

        <button
          onClick={() => setActiveTab('tiers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs uppercase tracking-[0.18em] font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tiers'
              ? 'bg-[#C9A961] text-black font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Crown size={14} />
          VIP Tier Privileges
        </button>
      </div>

      {/* Tab 1: Upcoming Drops */}
      {activeTab === 'drops' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {UPCOMING_DROPS.map((drop, idx) => {
            const isNotified = notifiedDrops.includes(drop.id)

            return (
              <motion.div
                key={drop.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.5, ease: EASE }}
                className="bg-[#111111] border border-neutral-800 rounded-3xl overflow-hidden hover:border-[#C9A961]/40 transition-all flex flex-col justify-between p-6 shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#C9A961] bg-[#C9A961]/10 px-2.5 py-1 rounded-full border border-[#C9A961]/20 font-medium">
                      {drop.tierAccess}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                      {drop.edition}
                    </span>
                  </div>

                  <h3 className="font-heading text-2xl text-velvet-white tracking-tight mt-2 mb-1">
                    {drop.title}
                  </h3>

                  <div className="text-xl font-heading text-[#C9A961] mb-4 font-semibold">
                    {formatPrice(drop.price)}
                  </div>

                  <div className="p-4 rounded-2xl bg-black/60 border border-white/5 space-y-2 mb-6 text-xs text-neutral-300">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-[#C9A961]" />
                      <span>{drop.releaseDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-[#C9A961]" />
                      <span>{drop.releaseTime}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => toggleNotify(drop.id)}
                    className={`w-full py-3 rounded-xl text-xs uppercase tracking-[0.2em] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isNotified
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-velvet-white border border-white/10'
                    }`}
                  >
                    {isNotified ? (
                      <>
                        <CheckCircle2 size={14} />
                        Reminder Set
                      </>
                    ) : (
                      <>
                        <Bell size={14} />
                        Set VIP Drop Reminder
                      </>
                    )}
                  </button>

                  <Link
                    href="/collection"
                    className="w-full py-2.5 rounded-xl text-[11px] uppercase tracking-[0.18em] text-neutral-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
                  >
                    View Collection Specs <ArrowRight size={12} />
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Tab 2: Member Raffles */}
      {activeTab === 'raffles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ACTIVE_RAFFLES.map((raffle, idx) => {
            const hasEntered = enteredRaffles.includes(raffle.id)

            return (
              <motion.div
                key={raffle.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.5, ease: EASE }}
                className="bg-[#111111] border border-neutral-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-[#C9A961]/40 transition-all shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20 font-medium">
                      Community Ballot
                    </span>
                    <span className="text-xs text-[#C9A961] font-heading font-medium">
                      Draw: {raffle.drawDate}
                    </span>
                  </div>

                  <h3 className="font-heading text-2xl text-velvet-white tracking-tight mb-2">
                    {raffle.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-neutral-400 mb-6 leading-relaxed">
                    {raffle.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-6 p-4 rounded-2xl bg-black/60 border border-white/5 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono">Allocation Size</div>
                      <div className="font-heading text-lg text-velvet-white mt-0.5">{raffle.totalAllocations} Pairs Allocation</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-mono">Retail Price</div>
                      <div className="font-heading text-lg text-[#C9A961] mt-0.5 font-semibold">{formatPrice(raffle.retailPrice)}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => enterRaffle(raffle.id)}
                    className={`w-full py-3.5 rounded-xl text-xs uppercase tracking-[0.2em] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      hasEntered
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                        : 'bg-[#C9A961] hover:bg-[#d8b870] text-black shadow-lg shadow-[#C9A961]/20 active:scale-95'
                    }`}
                  >
                    {hasEntered ? (
                      <>
                        <CheckCircle2 size={16} />
                        Ballot Confirmed (Entry #418)
                      </>
                    ) : (
                      <>
                        <Ticket size={16} />
                        Enter Allocation Ballot
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-neutral-400 mt-2">
                    Winners chosen via transparent randomized draw. No payment charged unless your ballot is selected.
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Tab 3: Tier Privileges */}
      {activeTab === 'tiers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIER_BENEFITS.map((tier, idx) => (
            <motion.div
              key={tier.tier}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.5, ease: EASE }}
              className={`rounded-3xl p-6 sm:p-8 border flex flex-col justify-between shadow-xl ${
                idx === 2
                  ? 'bg-gradient-to-b from-[#1c1811] via-[#14120e] to-[#0d0c0a] border-[#C9A961]/50 shadow-[#C9A961]/5'
                  : 'bg-[#111111] border-neutral-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border font-medium ${
                    idx === 2
                      ? 'bg-[#C9A961]/20 text-[#C9A961] border-[#C9A961]/30'
                      : 'bg-white/10 text-neutral-300 border-white/10'
                  }`}>
                    {tier.badge}
                  </span>
                  <Crown size={16} className={idx === 2 ? 'text-[#C9A961]' : 'text-neutral-500'} />
                </div>

                <h3 className="font-heading text-2xl text-velvet-white tracking-tight mb-6">
                  {tier.tier}
                </h3>

                <ul className="space-y-3 mb-8">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5 text-xs text-neutral-300">
                      <CheckCircle2 size={14} className={idx === 2 ? 'text-[#C9A961] shrink-0 mt-0.5' : 'text-neutral-500 shrink-0 mt-0.5'} />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-white/5">
                <span className="text-[10px] uppercase tracking-widest text-neutral-400">
                  {idx === 0 ? 'Default on Signup (Initiate)' : idx === 1 ? 'Unlocked at ₹25,000 Spend' : 'Unlocked at ₹75,000 Spend'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
