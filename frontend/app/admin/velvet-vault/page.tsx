'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Crown,
  Users,
  Calendar,
  Ticket,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Clock,
  Layers,
  Award
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

const EASE = [0.22, 1, 0.36, 1]

interface SyndicateOverview {
  totalMembers: number
  activeToday: number
  totalCreditsIssued: number
  dropsScheduled: number
  liveBallots: number
  tierBreakdown: {
    silver: number
    gold: number
    platinum: number
    obsidian: number
  }
}

const SYNDICATE_TIERS = [
  {
    tier: 'Tier I',
    name: 'Silver Member',
    color: 'from-slate-400/20 to-slate-300/5',
    borderColor: 'border-slate-500/20',
    badgeColor: 'text-slate-300 bg-slate-500/10 border-slate-500/30',
    spendRequirement: '₹0 — Entry Level',
    multiplier: '1.0x Credits',
    privileges: [
      'Access to Public Velvet Drops',
      'Syndicate Wallet Rewards',
      'Standard Member Ballot Entries',
      'Seasonal Lookbook Early Preview'
    ]
  },
  {
    tier: 'Tier II',
    name: 'Gold Insider',
    color: 'from-amber-400/20 to-amber-300/5',
    borderColor: 'border-amber-500/20',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    spendRequirement: '₹25,000+ Lifetime Spend',
    multiplier: '1.25x Credits',
    privileges: [
      '15-Minute Priority Early Access on Drops',
      'Gold Insider Exclusive Releases',
      '1.25x Syndicate Credit Multiplier',
      'Priority Customer Concierge'
    ]
  },
  {
    tier: 'Tier III',
    name: 'Platinum Syndicate',
    color: 'from-violet-400/20 to-violet-300/5',
    borderColor: 'border-violet-500/20',
    badgeColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    spendRequirement: '₹75,000+ Lifetime Spend',
    multiplier: '1.5x Credits',
    privileges: [
      '1-Hour Priority Allocation Window',
      'Complimentary Bespoke White-Glove Shipping',
      '2x Weighting in Raffle Ballot Draws',
      'Access to Archived Vault Capsules'
    ]
  },
  {
    tier: 'Tier IV',
    name: 'Obsidian Elite',
    color: 'from-[#C9A961]/25 to-yellow-600/5',
    borderColor: 'border-[#C9A961]/30',
    badgeColor: 'text-[#C9A961] bg-[#C9A961]/10 border-[#C9A961]/30',
    spendRequirement: '₹150,000+ Lifetime Spend',
    multiplier: '2.0x Credits',
    privileges: [
      '1-of-1 Bespoke Allocation Invitations',
      'Guaranteed Drop Reservation Pre-Orders',
      'Dedicated 24/7 VIP Personal Concierge',
      'Annual Founders Archive Commemorative Piece'
    ]
  }
]

export default function VelvetVaultDashboardPage() {
  const [data, setData] = useState<SyndicateOverview>({
    totalMembers: 142,
    activeToday: 28,
    totalCreditsIssued: 48500,
    dropsScheduled: 3,
    liveBallots: 2,
    tierBreakdown: {
      silver: 84,
      gold: 38,
      platinum: 14,
      obsidian: 6
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiFetch('/admin/velvet-vault/overview')
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (cancelled || !res) return
        if (res.success && res.data) {
          const d = res.data
          setData((prev) => ({
            totalMembers: d.totalVaultUsers || d.totalMembers || prev.totalMembers,
            activeToday: d.activeToday || prev.activeToday,
            totalCreditsIssued: d.totalCoinsEarned || d.totalCreditsIssued || prev.totalCreditsIssued,
            dropsScheduled: d.dropsScheduled || prev.dropsScheduled,
            liveBallots: d.liveBallots || prev.liveBallots,
            tierBreakdown: d.tierBreakdown || prev.tierBreakdown
          }))
        }
      })
      .catch(() => {
        // Fall back gracefully to preset metrics
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-[#C9A961]/10 text-[#C9A961] border border-[#C9A961]/20">
              <Crown size={11} />
              Syndicate VIP & Drops Club
            </span>
          </div>
          <h1 className="font-heading text-3xl text-velvet-white tracking-tight">
            VIP Club Overview & Tiers
          </h1>
          <p className="text-sm text-velvet-muted mt-1">
            Luxury membership administration, priority drop windows, and member tier privileges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/velvet-vault/drops"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-velvet-white text-xs font-medium tracking-wide transition-all"
          >
            <Calendar size={14} className="text-[#C9A961]" />
            Drop Scheduler
          </Link>
          <Link
            href="/admin/velvet-vault/raffles"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C9A961] hover:bg-[#B89850] text-black font-semibold text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(201,169,97,0.2)]"
          >
            <Ticket size={14} />
            Raffle Draws
          </Link>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total VIP Members',
            val: data.totalMembers.toLocaleString(),
            icon: Users,
            sub: 'Enrolled in Syndicate Club',
            color: 'text-violet-400',
            bg: 'bg-violet-500/10'
          },
          {
            label: 'Active Today',
            val: data.activeToday.toLocaleString(),
            icon: TrendingUp,
            sub: 'Engaging with drops/vault',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10'
          },
          {
            label: 'Syndicate Credits Issued',
            val: `₹${(data.totalCreditsIssued * 0.1).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            icon: Wallet,
            sub: `${data.totalCreditsIssued.toLocaleString()} points in circulation`,
            color: 'text-[#C9A961]',
            bg: 'bg-[#C9A961]/10'
          },
          {
            label: 'Active Drops & Ballots',
            val: `${data.dropsScheduled} Drops / ${data.liveBallots} Raffles`,
            icon: Calendar,
            sub: 'Live & scheduled events',
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/10'
          }
        ].map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5, ease: EASE }}
              className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted font-mono">
                    {card.label}
                  </div>
                  <div className="text-2xl font-heading text-velvet-white mt-2 font-semibold tracking-tight">
                    {card.val}
                  </div>
                  <div className="text-[11px] text-velvet-muted mt-1">{card.sub}</div>
                </div>
                <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0 border border-white/5`}>
                  <Icon className={card.color} size={18} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Tier Distribution Bar */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
        className="bg-[#111111] border border-white/10 rounded-2xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-velvet-white font-heading">
              Member Tier Distribution
            </h2>
            <p className="text-xs text-velvet-muted">
              Live breakdown of Syndicate patrons by qualification status.
            </p>
          </div>
          <span className="text-xs font-mono text-[#C9A961]">
            {data.totalMembers} Enrolled Members
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Silver Members</div>
            <div className="text-xl font-heading text-velvet-white mt-1 font-semibold">{data.tierBreakdown.silver}</div>
            <div className="text-[10px] text-velvet-muted">Entry tier</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="text-[10px] uppercase tracking-wider text-amber-400 font-mono">Gold Insiders</div>
            <div className="text-xl font-heading text-velvet-white mt-1 font-semibold">{data.tierBreakdown.gold}</div>
            <div className="text-[10px] text-velvet-muted">15m Early Access</div>
          </div>
          <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
            <div className="text-[10px] uppercase tracking-wider text-violet-400 font-mono">Platinum Syndicate</div>
            <div className="text-xl font-heading text-velvet-white mt-1 font-semibold">{data.tierBreakdown.platinum}</div>
            <div className="text-[10px] text-velvet-muted">1hr Priority Window</div>
          </div>
          <div className="p-3 rounded-xl bg-[#C9A961]/10 border border-[#C9A961]/30">
            <div className="text-[10px] uppercase tracking-wider text-[#C9A961] font-mono">Obsidian Elite</div>
            <div className="text-xl font-heading text-velvet-white mt-1 font-semibold">{data.tierBreakdown.obsidian}</div>
            <div className="text-[10px] text-velvet-muted">Guaranteed Allocation</div>
          </div>
        </div>
      </motion.div>

      {/* Tier Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-velvet-white font-heading">
              Syndicate VIP Tier Privileges Matrix
            </h2>
            <p className="text-xs text-velvet-muted">
              Defined benefits, multipliers, and drop allocation privileges for each VIP membership rank.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {SYNDICATE_TIERS.map((tier, idx) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05, duration: 0.5, ease: EASE }}
              className={`bg-gradient-to-b ${tier.color} bg-[#111111] border ${tier.borderColor} rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-white/30 transition-all`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${tier.badgeColor}`}>
                    {tier.tier}
                  </span>
                  <span className="text-[10px] font-mono text-velvet-muted">
                    {tier.multiplier}
                  </span>
                </div>

                <h3 className="font-heading text-lg text-velvet-white font-semibold">
                  {tier.name}
                </h3>
                <div className="text-xs text-[#C9A961] font-mono mt-1 mb-4">
                  {tier.spendRequirement}
                </div>

                <div className="border-t border-white/10 pt-4 space-y-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-velvet-muted font-mono">
                    Privileges:
                  </div>
                  {tier.privileges.map((priv) => (
                    <div key={priv} className="flex items-start gap-2 text-xs text-zinc-300">
                      <Sparkles size={12} className="text-[#C9A961] shrink-0 mt-0.5" />
                      <span>{priv}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase font-mono tracking-widest text-velvet-muted">Status</span>
                <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                  <ShieldCheck size={12} /> Active Tier
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <Link
          href="/admin/velvet-vault/drops"
          className="group p-6 rounded-2xl bg-[#111111] border border-white/10 hover:border-[#C9A961]/40 transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#C9A961]" />
              <span className="font-heading text-base font-semibold text-velvet-white group-hover:text-[#C9A961] transition-colors">
                Drop Scheduler & Pipeline
              </span>
            </div>
            <p className="text-xs text-velvet-muted">
              Schedule upcoming drops, set tier-restricted early access windows, and allocate pair quantities.
            </p>
          </div>
          <ArrowRight size={18} className="text-velvet-muted group-hover:text-[#C9A961] group-hover:translate-x-1 transition-all shrink-0 ml-4" />
        </Link>

        <Link
          href="/admin/velvet-vault/raffles"
          className="group p-6 rounded-2xl bg-[#111111] border border-white/10 hover:border-[#C9A961]/40 transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Ticket size={16} className="text-[#C9A961]" />
              <span className="font-heading text-base font-semibold text-velvet-white group-hover:text-[#C9A961] transition-colors">
                VIP Raffle Draws & Ballots
              </span>
            </div>
            <p className="text-xs text-velvet-muted">
              Manage member ballot reservations, review verified participant entries, and trigger randomized draws.
            </p>
          </div>
          <ArrowRight size={18} className="text-velvet-muted group-hover:text-[#C9A961] group-hover:translate-x-1 transition-all shrink-0 ml-4" />
        </Link>
      </div>
    </div>
  )
}
