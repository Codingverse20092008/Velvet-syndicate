'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Zap, CalendarDays, Flame, ShoppingCart, Users, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'

const EASE = [0.22, 1, 0.36, 1]

export interface StreakDay {
  day: number
  xp: number
  coins: number
}

export interface RewardConfig {
  quiz: {
    mcqXp: number
    fillBlankXp: number
    fillInXp?: number
    perfectBonus?: number
  }
  dailyLogin: {
    xp: number
    coins: number
    baseCoins?: number
    basePoints?: number
  }
  streaks: StreakDay[]
  purchase: {
    xpMultiplier: number
    coinsPerAmount: number
    xpPerRupee?: number
    coinMultiplier?: number
  }
  referral: {
    xp: number
    coins: number
  }
}

const defaultConfig: RewardConfig = {
  quiz: {
    mcqXp: 10,
    fillBlankXp: 15,
    fillInXp: 15,
    perfectBonus: 20,
  },
  dailyLogin: {
    xp: 5,
    coins: 10,
    baseCoins: 5,
    basePoints: 10,
  },
  streaks: [
    { day: 3, xp: 25, coins: 10 },
    { day: 7, xp: 50, coins: 25 },
    { day: 14, xp: 75, coins: 50 },
    { day: 30, xp: 200, coins: 100 },
  ],
  purchase: {
    xpMultiplier: 0.1,
    coinsPerAmount: 0.025,
    xpPerRupee: 1,
    coinMultiplier: 1,
  },
  referral: {
    xp: 20,
    coins: 100,
  },
}

function normalizeConfig(raw: any): RewardConfig {
  if (!raw) return defaultConfig
  const src = raw.config ?? raw
  return {
    quiz: {
      mcqXp: Number(src?.quiz?.mcqXp ?? src?.mcqXp ?? defaultConfig.quiz.mcqXp),
      fillBlankXp: Number(src?.quiz?.fillBlankXp ?? src?.quiz?.fillInXp ?? src?.fillBlankXp ?? defaultConfig.quiz.fillBlankXp),
      fillInXp: Number(src?.quiz?.fillInXp ?? src?.quiz?.fillBlankXp ?? src?.fillBlankXp ?? defaultConfig.quiz.fillInXp),
      perfectBonus: Number(src?.quiz?.perfectBonus ?? defaultConfig.quiz.perfectBonus),
    },
    dailyLogin: {
      xp: Number(src?.dailyLogin?.xp ?? src?.dailyLogin?.basePoints ?? src?.dailyLoginXp ?? defaultConfig.dailyLogin.xp),
      coins: Number(src?.dailyLogin?.coins ?? src?.dailyLogin?.baseCoins ?? src?.dailyLoginCoins ?? defaultConfig.dailyLogin.coins),
      baseCoins: Number(src?.dailyLogin?.baseCoins ?? src?.dailyLogin?.coins ?? src?.dailyLoginCoins ?? defaultConfig.dailyLogin.baseCoins),
      basePoints: Number(src?.dailyLogin?.basePoints ?? src?.dailyLogin?.xp ?? src?.dailyLoginXp ?? defaultConfig.dailyLogin.basePoints),
    },
    streaks: Array.isArray(src?.streaks)
      ? src.streaks
      : Array.isArray(src?.streakRewards)
      ? src.streakRewards
      : defaultConfig.streaks,
    purchase: {
      xpMultiplier: Number(src?.purchase?.xpMultiplier ?? src?.purchaseRewards?.xpMultiplier ?? defaultConfig.purchase.xpMultiplier),
      coinsPerAmount: Number(src?.purchase?.coinsPerAmount ?? src?.purchaseRewards?.coinsPerAmount ?? defaultConfig.purchase.coinsPerAmount),
      xpPerRupee: Number(src?.purchase?.xpPerRupee ?? defaultConfig.purchase.xpPerRupee),
      coinMultiplier: Number(src?.purchase?.coinMultiplier ?? defaultConfig.purchase.coinMultiplier),
    },
    referral: {
      xp: Number(src?.referral?.xp ?? src?.referralRewards?.xp ?? defaultConfig.referral.xp),
      coins: Number(src?.referral?.coins ?? src?.referralRewards?.coins ?? defaultConfig.referral.coins),
    },
  }
}

export default function RewardsPage() {
  const [config, setConfig] = useState<RewardConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false

    apiFetch('/admin/velvet-vault/reward-config')
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Failed to load reward config (HTTP ${r.status})`)
        }
        return r.json()
      })
      .then((d) => {
        if (cancelled) return
        if (d && d.success) {
          setConfig(normalizeConfig(d.data))
        } else if (d) {
          setError(d.error || 'Failed to load config')
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Error connecting to rewards service')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const updateNested = (path: string[], value: any) => {
    setConfig((prev) => {
      const clone = JSON.parse(JSON.stringify(prev || defaultConfig))
      let obj = clone
      for (let i = 0; i < path.length - 1; i++) {
        if (!obj[path[i]]) obj[path[i]] = {}
        obj = obj[path[i]]
      }
      obj[path[path.length - 1]] = value
      return clone
    })
  }

  const updateStreakDay = (index: number, field: string, value: number) => {
    setConfig((prev) => {
      const clone = JSON.parse(JSON.stringify(prev || defaultConfig))
      if (!Array.isArray(clone.streaks)) clone.streaks = []
      if (clone.streaks[index]) {
        clone.streaks[index][field] = value
      }
      return clone
    })
  }

  const addStreakDay = () => {
    setConfig((prev) => {
      const streaks = Array.isArray(prev?.streaks) ? [...prev.streaks] : []
      const nextDay = (streaks[streaks.length - 1]?.day || 0) + 7
      return {
        ...prev,
        streaks: [...streaks, { day: nextDay, xp: 50, coins: 25 }],
      }
    })
  }

  const removeStreakDay = (index: number) => {
    setConfig((prev) => {
      const streaks = Array.isArray(prev?.streaks) ? prev.streaks.filter((_, i) => i !== index) : []
      return { ...prev, streaks }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    setError(null)
    try {
      const res = await apiFetch('/admin/velvet-vault/reward-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const d = await res.json()
      if (d.success) {
        setSuccess(true)
        if (d.data?.config) {
          setConfig(normalizeConfig(d.data.config))
        }
      } else {
        setError(d.error || 'Failed to save reward config')
      }
    } catch (e: any) {
      setError(e.message || 'Connection error while saving')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-64 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-4 w-96 bg-white/5 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 gap-6">
          <div className="h-44 bg-velvet-card border border-white/10 rounded-2xl animate-pulse" />
          <div className="h-44 bg-velvet-card border border-white/10 rounded-2xl animate-pulse" />
          <div className="h-44 bg-velvet-card border border-white/10 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <h1 className="font-heading text-3xl text-velvet-white tracking-tight uppercase">Reward Economy Editor</h1>
        <p className="text-sm text-velvet-muted mt-2">Configure XP, coin bonuses, and milestone rewards for Velvet Vault</p>
      </motion.div>

      {error && <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>}
      {success && <div className="p-4 border border-emerald-400/20 bg-emerald-500/10 rounded-xl text-emerald-300 text-sm">Configuration saved successfully.</div>}

      <div className="space-y-6">
        {/* Quiz Rewards */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Zap className="text-yellow-400" size={18} />
            </div>
            <div>
              <h3 className="font-heading text-lg text-velvet-white">Quiz Rewards</h3>
              <p className="text-xs text-velvet-muted">XP and bonuses earned per question type</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">MCQ XP</label>
              <input
                type="number"
                value={config?.quiz?.mcqXp ?? 0}
                onChange={(e) => updateNested(['quiz', 'mcqXp'], Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 focus:border-[#C9A961]/80 rounded-xl px-4 py-3 text-sm text-velvet-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Fill Blank XP</label>
              <input
                type="number"
                value={config?.quiz?.fillBlankXp ?? config?.quiz?.fillInXp ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  updateNested(['quiz', 'fillBlankXp'], val)
                  updateNested(['quiz', 'fillInXp'], val)
                }}
                className="w-full bg-black/60 border border-white/10 focus:border-[#C9A961]/80 rounded-xl px-4 py-3 text-sm text-velvet-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Perfect Score Bonus</label>
              <input
                type="number"
                value={config?.quiz?.perfectBonus ?? 20}
                onChange={(e) => updateNested(['quiz', 'perfectBonus'], Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 focus:border-[#C9A961]/80 rounded-xl px-4 py-3 text-sm text-velvet-white outline-none"
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
              <p className="text-xs text-velvet-muted">Base points and coin drops for consecutive app check-ins</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Base Points (XP)</label>
              <input
                type="number"
                value={config?.dailyLogin?.xp ?? config?.dailyLogin?.basePoints ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  updateNested(['dailyLogin', 'xp'], val)
                  updateNested(['dailyLogin', 'basePoints'], val)
                }}
                className="w-full bg-black/60 border border-white/10 focus:border-[#C9A961]/80 rounded-xl px-4 py-3 text-sm text-velvet-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Base Coins</label>
              <input
                type="number"
                value={config?.dailyLogin?.coins ?? config?.dailyLogin?.baseCoins ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  updateNested(['dailyLogin', 'coins'], val)
                  updateNested(['dailyLogin', 'baseCoins'], val)
                }}
                className="w-full bg-black/60 border border-white/10 focus:border-[#C9A961]/80 rounded-xl px-4 py-3 text-sm text-velvet-white outline-none"
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
              <p className="text-xs text-velvet-muted">Per-day milestone bonuses unlocked across streak tiers</p>
            </div>
          </div>
          <div className="space-y-3">
            {(config?.streaks || []).map((streak, i) => (
              <div key={i} className="flex items-end gap-3 p-3 rounded-xl bg-black/40 border border-white/10">
                <div className="w-24">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Day</label>
                  <input
                    type="number"
                    value={streak?.day ?? 0}
                    onChange={(e) => updateStreakDay(i, 'day', Number(e.target.value))}
                    className="w-full bg-black border border-white/15 focus:border-[#C9A961]/80 rounded-lg px-3 py-2 text-sm text-velvet-white outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">XP Bonus</label>
                  <input
                    type="number"
                    value={streak?.xp ?? 0}
                    onChange={(e) => updateStreakDay(i, 'xp', Number(e.target.value))}
                    className="w-full bg-black border border-white/15 focus:border-[#C9A961]/80 rounded-lg px-3 py-2 text-sm text-velvet-white outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Coins Bonus</label>
                  <input
                    type="number"
                    value={streak?.coins ?? 0}
                    onChange={(e) => updateStreakDay(i, 'coins', Number(e.target.value))}
                    className="w-full bg-black border border-white/15 focus:border-[#C9A961]/80 rounded-lg px-3 py-2 text-sm text-velvet-white outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeStreakDay(i)}
                  className="px-3 py-2 rounded-lg border border-red-500/20 text-red-400 text-[10px] uppercase tracking-wider hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addStreakDay}
              className="px-4 py-2 rounded-xl border border-white/10 text-velvet-muted text-[10px] uppercase tracking-[0.2em] hover:text-velvet-white hover:border-white/20 transition-colors cursor-pointer"
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
              <p className="text-xs text-velvet-muted">XP and Coin multipliers for store footwear orders</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">XP Multiplier (per ₹)</label>
              <input
                type="number"
                step="0.05"
                value={config?.purchase?.xpMultiplier ?? config?.purchase?.xpPerRupee ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  updateNested(['purchase', 'xpMultiplier'], val)
                  updateNested(['purchase', 'xpPerRupee'], val)
                }}
                className="w-full bg-black/60 border border-white/10 focus:border-[#C9A961]/80 rounded-xl px-4 py-3 text-sm text-velvet-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Coin Multiplier</label>
              <input
                type="number"
                step="0.01"
                value={config?.purchase?.coinsPerAmount ?? config?.purchase?.coinMultiplier ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  updateNested(['purchase', 'coinsPerAmount'], val)
                  updateNested(['purchase', 'coinMultiplier'], val)
                }}
                className="w-full bg-black/60 border border-white/10 focus:border-[#C9A961]/80 rounded-xl px-4 py-3 text-sm text-velvet-white outline-none"
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
              <p className="text-xs text-velvet-muted">Rewards awarded for invited members joining the Syndicate</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Referral XP</label>
              <input
                type="number"
                value={config?.referral?.xp ?? 0}
                onChange={(e) => updateNested(['referral', 'xp'], Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 focus:border-[#C9A961]/80 rounded-xl px-4 py-3 text-sm text-velvet-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Referral Coins</label>
              <input
                type="number"
                value={config?.referral?.coins ?? 0}
                onChange={(e) => updateNested(['referral', 'coins'], Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 focus:border-[#C9A961]/80 rounded-xl px-4 py-3 text-sm text-velvet-white outline-none"
              />
            </div>
          </div>
        </motion.div>

        {/* Save CTA */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#C9A961] text-black font-semibold rounded-xl text-xs uppercase tracking-[0.15em] hover:bg-[#d8b870] active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-[#C9A961]/10"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}
