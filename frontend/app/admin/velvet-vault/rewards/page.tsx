'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Zap, CalendarDays, Flame, ShoppingCart, Users } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1]

interface StreakDay {
  day: number
  xp: number
  coins: number
}

interface RewardConfig {
  quiz: { mcqXp: number; fillBlankXp: number }
  dailyLogin: { xp: number; coins: number }
  streaks: StreakDay[]
  purchase: { xpMultiplier: number; coinsPerAmount: number }
  referral: { xp: number; coins: number }
}

export default function RewardsPage() {
  const [config, setConfig] = useState<RewardConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/velvet-vault/reward-config')
      .then(r => {
        if (r.status === 401) return null
        return r.json()
      })
      .then(d => {
        if (cancelled) return
        if (d && d.success) setConfig(d.data?.config ?? d.data)
        else if (d) setError(d.error || 'Failed to load config')
      })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const updateNested = (path: string[], value: any) => {
    if (!config) return
    setConfig(prev => {
      if (!prev) return prev
      const clone = JSON.parse(JSON.stringify(prev))
      let obj = clone
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]]
      obj[path[path.length - 1]] = value
      return clone
    })
  }

  const updateStreakDay = (index: number, field: string, value: number) => {
    if (!config) return
    setConfig(prev => {
      if (!prev) return prev
      const clone = JSON.parse(JSON.stringify(prev))
      clone.streaks[index][field] = value
      return clone
    })
  }

  const addStreakDay = () => {
    if (!config) return
    const nextDay = (config.streaks?.length || 0) + 1
    setConfig(prev => {
      if (!prev) return prev
      return { ...prev, streaks: [...prev.streaks, { day: nextDay, xp: 0, coins: 0 }] }
    })
  }

  const removeStreakDay = (index: number) => {
    if (!config) return
    setConfig(prev => {
      if (!prev) return prev
      return { ...prev, streaks: prev.streaks.filter((_, i) => i !== index) }
    })
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setSuccess(false)
    setError(null)
    try {
      const res = await fetch('/api/admin/velvet-vault/reward-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const d = await res.json()
      if (d.success) setSuccess(true)
      else setError(d.error || 'Failed to save')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <h1 className="font-heading text-3xl text-velvet-white tracking-tight">Reward Economy Editor</h1>
        <p className="text-sm text-velvet-muted mt-2">Configure reward values for vault systems</p>
      </motion.div>

      {error && <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>}
      {success && <div className="p-4 border border-emerald-400/20 bg-emerald-500/10 rounded-xl text-emerald-300 text-sm">Configuration saved successfully.</div>}

      {config && (
        <div className="space-y-6">
          {/* Quiz Rewards */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Zap className="text-yellow-400" size={18} />
              </div>
              <div>
                <h3 className="font-heading text-lg text-velvet-white">Quiz Rewards</h3>
                <p className="text-xs text-velvet-muted">XP earned per question type</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">MCQ XP</label>
                <input
                  type="number"
                  value={config.quiz.mcqXp}
                  onChange={e => updateNested(['quiz', 'mcqXp'], Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Fill Blank XP</label>
                <input
                  type="number"
                  value={config.quiz.fillBlankXp}
                  onChange={e => updateNested(['quiz', 'fillBlankXp'], Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                />
              </div>
            </div>
          </motion.div>

          {/* Daily Login */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CalendarDays className="text-emerald-400" size={18} />
              </div>
              <div>
                <h3 className="font-heading text-lg text-velvet-white">Daily Login</h3>
                <p className="text-xs text-velvet-muted">Rewards for daily login</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Login XP</label>
                <input
                  type="number"
                  value={config.dailyLogin.xp}
                  onChange={e => updateNested(['dailyLogin', 'xp'], Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Login Coins</label>
                <input
                  type="number"
                  value={config.dailyLogin.coins}
                  onChange={e => updateNested(['dailyLogin', 'coins'], Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                />
              </div>
            </div>
          </motion.div>

          {/* Streak Rewards */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Flame className="text-red-400" size={18} />
              </div>
              <div>
                <h3 className="font-heading text-lg text-velvet-white">Streak Rewards</h3>
                <p className="text-xs text-velvet-muted">Per-day streak milestone rewards</p>
              </div>
            </div>
            <div className="space-y-3">
              {config.streaks?.map((streak, i) => (
                <div key={i} className="flex items-end gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-20">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Day</label>
                    <input
                      type="number"
                      value={streak.day}
                      onChange={e => updateStreakDay(i, 'day', Number(e.target.value))}
                      className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">XP</label>
                    <input
                      type="number"
                      value={streak.xp}
                      onChange={e => updateStreakDay(i, 'xp', Number(e.target.value))}
                      className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Coins</label>
                    <input
                      type="number"
                      value={streak.coins}
                      onChange={e => updateStreakDay(i, 'coins', Number(e.target.value))}
                      className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                    />
                  </div>
                  <button
                    onClick={() => removeStreakDay(i)}
                    className="px-3 py-2 rounded-lg border border-red-500/20 text-red-400 text-[10px] hover:bg-red-500/10 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={addStreakDay}
                className="px-4 py-2 rounded-xl border border-white/10 text-velvet-muted text-[10px] uppercase tracking-[0.2em] hover:text-velvet-white transition-colors"
              >
                + Add Streak Day
              </button>
            </div>
          </motion.div>

          {/* Purchase Rewards */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <ShoppingCart className="text-blue-400" size={18} />
              </div>
              <div>
                <h3 className="font-heading text-lg text-velvet-white">Purchase Rewards</h3>
                <p className="text-xs text-velvet-muted">Rewards for store purchases</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">XP Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.purchase.xpMultiplier}
                  onChange={e => updateNested(['purchase', 'xpMultiplier'], Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Coins per Amount</label>
                <input
                  type="number"
                  value={config.purchase.coinsPerAmount}
                  onChange={e => updateNested(['purchase', 'coinsPerAmount'], Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                />
              </div>
            </div>
          </motion.div>

          {/* Referral Rewards */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Users className="text-cyan-400" size={18} />
              </div>
              <div>
                <h3 className="font-heading text-lg text-velvet-white">Referral Rewards</h3>
                <p className="text-xs text-velvet-muted">Rewards for referring new users</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Referral XP</label>
                <input
                  type="number"
                  value={config.referral.xp}
                  onChange={e => updateNested(['referral', 'xp'], Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Referral Coins</label>
                <input
                  type="number"
                  value={config.referral.coins}
                  onChange={e => updateNested(['referral', 'coins'], Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                />
              </div>
            </div>
          </motion.div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
