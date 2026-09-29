'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  Plus,
  Sparkles,
  Lock,
  CheckCircle2,
  Trash2,
  Tag,
  DollarSign
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface ScheduledDrop {
  id: string
  name: string
  edition: string
  dropDate: string
  dropTime: string
  vipWindowMinutes: number
  tierRequired: string
  totalUnits: number
  retailPrice: number
  status: 'SCHEDULED' | 'RESERVE_OPEN' | 'COMPLETED'
}

const INITIAL_DROPS: ScheduledDrop[] = [
  {
    id: 'drop-01',
    name: "Velvet Obsidian 'Midnight Noir'",
    edition: '1-of-75 Bespoke Handcrafted',
    dropDate: '2026-10-12',
    dropTime: '10:00 AM',
    vipWindowMinutes: 15,
    tierRequired: 'Black Velvet Tier',
    totalUnits: 75,
    retailPrice: 18999,
    status: 'RESERVE_OPEN'
  },
  {
    id: 'drop-02',
    name: "Syndicate Ghost Runner 'Alabaster'",
    edition: 'Limited Run of 120 Pairs',
    dropDate: '2026-10-26',
    dropTime: '06:00 PM',
    vipWindowMinutes: 30,
    tierRequired: 'Gold & Black Velvet',
    totalUnits: 120,
    retailPrice: 14499,
    status: 'SCHEDULED'
  }
]

export default function DropSchedulerPage() {
  const [drops, setDrops] = useState<ScheduledDrop[]>(INITIAL_DROPS)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    edition: '',
    dropDate: '',
    dropTime: '10:00 AM',
    vipWindowMinutes: 15,
    tierRequired: 'Gold & Black Velvet',
    totalUnits: 50,
    retailPrice: 16999
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.dropDate) return
    const newDrop: ScheduledDrop = {
      id: `drop-${Date.now()}`,
      name: form.name,
      edition: form.edition || 'Numbered Syndicate Edition',
      dropDate: form.dropDate,
      dropTime: form.dropTime,
      vipWindowMinutes: Number(form.vipWindowMinutes),
      tierRequired: form.tierRequired,
      totalUnits: Number(form.totalUnits),
      retailPrice: Number(form.retailPrice),
      status: 'SCHEDULED'
    }
    setDrops([newDrop, ...drops])
    setIsCreating(false)
    setForm({
      name: '',
      edition: '',
      dropDate: '',
      dropTime: '10:00 AM',
      vipWindowMinutes: 15,
      tierRequired: 'Gold & Black Velvet',
      totalUnits: 50,
      retailPrice: 16999
    })
  }

  const handleDelete = (id: string) => {
    setDrops(drops.filter(d => d.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">
            Syndicate Drop Scheduler
          </h1>
          <p className="text-velvet-muted text-sm mt-1">
            Schedule limited-edition shoe drops, define tier priority windows, and manage reservations.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C9A961] hover:bg-[#d8b870] text-black font-heading text-xs uppercase tracking-[0.15em] font-bold transition-all active:scale-95 cursor-pointer shadow-lg shadow-[#C9A961]/15"
        >
          <Plus size={16} />
          <span>{isCreating ? 'Close Form' : 'Schedule Drop'}</span>
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
            New Syndicate Drop Setup
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5">Drop Name</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Velvet Onyx High"
                required
                className="w-full bg-black border border-neutral-800 text-xs text-velvet-white px-3 py-2.5 rounded-xl outline-none focus:border-[#C9A961]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5">Edition Badge</label>
              <input
                value={form.edition}
                onChange={e => setForm({ ...form, edition: e.target.value })}
                placeholder="e.g. 1-of-50 Collector's Cut"
                className="w-full bg-black border border-neutral-800 text-xs text-velvet-white px-3 py-2.5 rounded-xl outline-none focus:border-[#C9A961]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5">Drop Date</label>
              <input
                type="date"
                value={form.dropDate}
                onChange={e => setForm({ ...form, dropDate: e.target.value })}
                required
                className="w-full bg-black border border-neutral-800 text-xs text-velvet-white px-3 py-2 rounded-xl outline-none focus:border-[#C9A961]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5">Drop Time</label>
              <input
                value={form.dropTime}
                onChange={e => setForm({ ...form, dropTime: e.target.value })}
                placeholder="10:00 AM IST"
                className="w-full bg-black border border-neutral-800 text-xs text-velvet-white px-3 py-2.5 rounded-xl outline-none focus:border-[#C9A961]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5">Early Access Window (Mins)</label>
              <input
                type="number"
                value={form.vipWindowMinutes}
                onChange={e => setForm({ ...form, vipWindowMinutes: Number(e.target.value) })}
                className="w-full bg-black border border-neutral-800 text-xs text-velvet-white px-3 py-2.5 rounded-xl outline-none focus:border-[#C9A961]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5">Required Tier</label>
              <select
                value={form.tierRequired}
                onChange={e => setForm({ ...form, tierRequired: e.target.value })}
                className="w-full bg-black border border-neutral-800 text-xs text-velvet-white px-3 py-2.5 rounded-xl outline-none focus:border-[#C9A961]"
              >
                <option value="All Members">All Members</option>
                <option value="Gold & Black Velvet">Gold & Black Velvet</option>
                <option value="Black Velvet Tier">Black Velvet Tier Exclusive</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-1.5">Total Allocation Units</label>
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
              Publish Scheduled Drop
            </button>
          </div>
        </motion.form>
      )}

      {/* Drops Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {drops.map(drop => (
          <div
            key={drop.id}
            className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-medium ${
                  drop.status === 'RESERVE_OPEN'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-[#C9A961]/10 text-[#C9A961] border border-[#C9A961]/20'
                }`}>
                  {drop.status.replace('_', ' ')}
                </span>
                <span className="text-sm font-heading text-[#C9A961]">
                  {formatPrice(drop.retailPrice)}
                </span>
              </div>

              <h3 className="font-heading text-xl text-velvet-white">{drop.name}</h3>
              <p className="text-xs text-neutral-400 mt-0.5">{drop.edition}</p>

              <div className="grid grid-cols-2 gap-3 mt-4 p-3.5 bg-black/60 rounded-xl border border-white/5 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-[#C9A961]" />
                  <span>{drop.dropDate} ({drop.dropTime})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-cyan-400" />
                  <span>{drop.vipWindowMinutes}m VIP Early Window</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag size={13} className="text-purple-400" />
                  <span>{drop.totalUnits} Pairs Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock size={13} className="text-amber-400" />
                  <span className="truncate">{drop.tierRequired}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
              <span className="text-[11px] text-neutral-500">ID: {drop.id}</span>
              <button
                onClick={() => handleDelete(drop.id)}
                className="text-neutral-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                title="Remove Drop"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
