'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Ticket,
  Calendar,
  Users,
  Award,
  CheckCircle2,
  Plus,
  Play,
  Trash2,
  DollarSign
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface AdminRaffle {
  id: string
  title: string
  edition: string
  drawDate: string
  totalUnits: number
  totalEntries: number
  retailPrice: number
  status: 'OPEN' | 'DRAWN' | 'SCHEDULED'
  winnerCount?: number
}

const INITIAL_RAFFLES: AdminRaffle[] = [
  {
    id: 'raffle-01',
    title: "Allocation Ballot #09: Velvet 1-of-50 Prototype",
    edition: 'Numbered Syndicate Collector Edition',
    drawDate: '2026-10-15',
    totalUnits: 50,
    totalEntries: 218,
    retailPrice: 21999,
    status: 'OPEN'
  },
  {
    id: 'raffle-02',
    title: "Private Archive Draw: Founders Edition Lows",
    edition: 'Vault Reserve Release (Gold Hardware)',
    drawDate: '2026-10-29',
    totalUnits: 15,
    totalEntries: 89,
    retailPrice: 24999,
    status: 'SCHEDULED'
  }
]

export default function RaffleDrawsAdminPage() {
  const [raffles, setRaffles] = useState<AdminRaffle[]>(INITIAL_RAFFLES)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    edition: '',
    drawDate: '',
    totalUnits: 25,
    retailPrice: 19999
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.drawDate) return
    const newRaffle: AdminRaffle = {
      id: `raffle-${Date.now()}`,
      title: form.title,
      edition: form.edition || 'Syndicate Limited Ballot',
      drawDate: form.drawDate,
      totalUnits: Number(form.totalUnits),
      totalEntries: 0,
      retailPrice: Number(form.retailPrice),
      status: 'OPEN'
    }
    setRaffles([newRaffle, ...raffles])
    setIsCreating(false)
    setForm({
      title: '',
      edition: '',
      drawDate: '',
      totalUnits: 25,
      retailPrice: 19999
    })
  }

  const triggerDraw = (id: string) => {
    if (!window.confirm('Trigger randomized winner selection for this raffle? Selected members will receive allocation reservation links.')) return
    setRaffles(raffles.map(r => {
      if (r.id === id) {
        return { ...r, status: 'DRAWN', winnerCount: r.totalUnits }
      }
      return r
    }))
  }

  const handleDelete = (id: string) => {
    setRaffles(raffles.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">
            Syndicate Raffle Draws
          </h1>
          <p className="text-velvet-muted text-sm mt-1">
            Oversee member allocation ballots, monitor entry counts, and execute verifiable draws.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C9A961] hover:bg-[#d8b870] text-black font-heading text-xs uppercase tracking-[0.15em] font-bold transition-all active:scale-95 cursor-pointer shadow-lg shadow-[#C9A961]/15"
        >
          <Plus size={16} />
          <span>{isCreating ? 'Close Form' : 'New Member Ballot'}</span>
        </button>
      </div>

      {isCreating && (
        <motion.form
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate}
          className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4"
        >
          <h3 className="text-sm uppercase tracking-widest text-[#C9A961] font-medium mb-3">
            New Allocation Ballot Setup
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5">Ballot Title</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Allocation Ballot #10: Obsidian Low"
                required
                className="w-full bg-black border border-neutral-800 text-xs text-velvet-white px-3 py-2.5 rounded-xl outline-none focus:border-[#C9A961]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5">Edition Badge</label>
              <input
                value={form.edition}
                onChange={e => setForm({ ...form, edition: e.target.value })}
                placeholder="e.g. 1-of-50 Limited Edition"
                className="w-full bg-black border border-neutral-800 text-xs text-velvet-white px-3 py-2.5 rounded-xl outline-none focus:border-[#C9A961]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5">Draw Date</label>
              <input
                type="date"
                value={form.drawDate}
                onChange={e => setForm({ ...form, drawDate: e.target.value })}
                required
                className="w-full bg-black border border-neutral-800 text-xs text-velvet-white px-3 py-2 rounded-xl outline-none focus:border-[#C9A961]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5">Allocation Pairs</label>
              <input
                type="number"
                value={form.totalUnits}
                onChange={e => setForm({ ...form, totalUnits: Number(e.target.value) })}
                className="w-full bg-black border border-neutral-800 text-xs text-velvet-white px-3 py-2.5 rounded-xl outline-none focus:border-[#C9A961]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5">Retail Price (₹)</label>
              <input
                type="number"
                value={form.retailPrice}
                onChange={e => setForm({ ...form, retailPrice: Number(e.target.value) })}
                className="w-full bg-black border border-neutral-800 text-xs text-velvet-white px-3 py-2.5 rounded-xl outline-none focus:border-[#C9A961]"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#C9A961] text-black font-heading text-xs uppercase tracking-wider font-bold hover:bg-[#d8b870] transition-colors cursor-pointer"
            >
              Open Member Ballot
            </button>
          </div>
        </motion.form>
      )}

      {/* Raffles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {raffles.map(raffle => (
          <div
            key={raffle.id}
            className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-medium ${
                  raffle.status === 'DRAWN'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : raffle.status === 'OPEN'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/10 text-neutral-400 border border-white/10'
                }`}>
                  {raffle.status === 'DRAWN' ? 'COMPLETED (DRAWN)' : raffle.status}
                </span>
                <span className="text-sm font-heading text-[#C9A961]">
                  {formatPrice(raffle.retailPrice)}
                </span>
              </div>

              <h3 className="font-heading text-xl text-velvet-white">{raffle.title}</h3>
              <p className="text-xs text-neutral-400 mt-0.5">{raffle.edition}</p>

              <div className="grid grid-cols-2 gap-3 mt-4 p-3.5 bg-black/60 rounded-xl border border-white/5 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-[#C9A961]" />
                  <span>Draw: {raffle.drawDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ticket size={13} className="text-cyan-400" />
                  <span>{raffle.totalUnits} Allocations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={13} className="text-amber-400" />
                  <span>{raffle.totalEntries} Total Entries</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award size={13} className="text-emerald-400" />
                  <span>{raffle.winnerCount ? `${raffle.winnerCount} Winners Chosen` : 'Draw Pending'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
              <span className="text-[11px] text-neutral-500">ID: {raffle.id}</span>
              <div className="flex items-center gap-2">
                {raffle.status === 'OPEN' && (
                  <button
                    onClick={() => triggerDraw(raffle.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-medium border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    <Play size={12} />
                    <span>Execute Draw</span>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(raffle.id)}
                  className="text-neutral-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                  title="Remove Ballot"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
