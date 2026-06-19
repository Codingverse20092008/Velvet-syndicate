'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Save, AlertTriangle } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1]

interface RewardPool {
  type: string
  value: number
  label: string
  probability: number
}

interface RarityConfig {
  common: { percentage: number; rewards: RewardPool[] }
  rare: { percentage: number; rewards: RewardPool[] }
  epic: { percentage: number; rewards: RewardPool[] }
  legendary: { percentage: number; rewards: RewardPool[] }
}

interface CrateConfig {
  basic: RarityConfig
  premium: RarityConfig
}

const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const
const CRATE_KEYS = ['basic', 'premium'] as const
const CRATE_LABELS: Record<string, string> = {
  basic: 'Basic Mystery Crate',
  premium: 'Premium Crate',
}

const emptyRewardPool = (): RewardPool => ({ type: 'xp', value: 0, label: '', probability: 0 })

const emptyRarity = (): RarityConfig => ({
  common: { percentage: 25, rewards: [emptyRewardPool()] },
  rare: { percentage: 35, rewards: [emptyRewardPool()] },
  epic: { percentage: 25, rewards: [emptyRewardPool()] },
  legendary: { percentage: 15, rewards: [emptyRewardPool()] },
})

export default function CratesPage() {
  const [config, setConfig] = useState<CrateConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/velvet-vault/crate-config')
      .then(r => {
        if (r.status === 401) return null
        return r.json()
      })
      .then(d => {
        if (cancelled) return
        if (d && d.success) setConfig(d.data)
        else if (d) setError(d.error || 'Failed to load config')
      })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const getRarityTotal = (crate: typeof CRATE_KEYS[number]) => {
    if (!config) return 0
    const c = config[crate]
    return RARITIES.reduce((sum, r) => sum + (c[r]?.percentage || 0), 0)
  }

  const updateRarityPercentage = (crate: typeof CRATE_KEYS[number], rarity: typeof RARITIES[number], value: number) => {
    setConfig(prev => {
      if (!prev) return prev
      const clone = JSON.parse(JSON.stringify(prev))
      clone[crate][rarity].percentage = value
      return clone
    })
  }

  const updateReward = (crate: typeof CRATE_KEYS[number], rarity: typeof RARITIES[number], index: number, field: string, value: any) => {
    setConfig(prev => {
      if (!prev) return prev
      const clone = JSON.parse(JSON.stringify(prev))
      clone[crate][rarity].rewards[index][field] = value
      return clone
    })
  }

  const addReward = (crate: typeof CRATE_KEYS[number], rarity: typeof RARITIES[number]) => {
    setConfig(prev => {
      if (!prev) return prev
      const clone = JSON.parse(JSON.stringify(prev))
      clone[crate][rarity].rewards.push(emptyRewardPool())
      return clone
    })
  }

  const removeReward = (crate: typeof CRATE_KEYS[number], rarity: typeof RARITIES[number], index: number) => {
    setConfig(prev => {
      if (!prev) return prev
      const clone = JSON.parse(JSON.stringify(prev))
      clone[crate][rarity].rewards.splice(index, 1)
      return clone
    })
  }

  const handleSave = async () => {
    if (!config) return
    const basicTotal = getRarityTotal('basic')
    const premiumTotal = getRarityTotal('premium')
    if (basicTotal !== 100) { setError(`Basic crate rarity percentages must total 100% (currently ${basicTotal}%)`); return }
    if (premiumTotal !== 100) { setError(`Premium crate rarity percentages must total 100% (currently ${premiumTotal}%)`); return }
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/admin/velvet-vault/crate-config', {
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
        <h1 className="font-heading text-3xl text-velvet-white tracking-tight">Crate Management</h1>
        <p className="text-sm text-velvet-muted mt-2">Manage crate reward pools and rarity distributions</p>
      </motion.div>

      {error && <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>}
      {success && <div className="p-4 border border-emerald-400/20 bg-emerald-500/10 rounded-xl text-emerald-300 text-sm">Crate configuration saved successfully.</div>}

      {config && CRATE_KEYS.map((crateKey, ci) => {
        const crate = config[crateKey]
        const totalPct = getRarityTotal(crateKey)
        const isValid = totalPct === 100
        return (
          <motion.div
            key={crateKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.1 }}
            className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Package className="text-orange-400" size={18} />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-velvet-white">{CRATE_LABELS[crateKey]}</h3>
                  <p className="text-xs text-velvet-muted">Configure rarity and reward pools</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold ${isValid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {isValid ? '100%' : `${totalPct}%`}
                {!isValid && <AlertTriangle size={12} />}
              </div>
            </div>

            <div className="p-6 space-y-8">
              {RARITIES.map((rarity) => {
                const rarityColor = {
                  common: 'text-gray-400',
                  rare: 'text-blue-400',
                  epic: 'text-purple-400',
                  legendary: 'text-yellow-400',
                }[rarity]
                const rarityBg = {
                  common: 'bg-gray-500/10',
                  rare: 'bg-blue-500/10',
                  epic: 'bg-purple-500/10',
                  legendary: 'bg-yellow-500/10',
                }[rarity]
                return (
                  <div key={rarity} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${rarityBg}`} />
                        <h4 className={`text-sm font-heading uppercase tracking-wider ${rarityColor}`}>{rarity}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-velvet-muted">Percentage:</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={crate[rarity].percentage}
                          onChange={e => updateRarityPercentage(crateKey, rarity, Number(e.target.value))}
                          className="w-20 bg-black border border-white/15 rounded-lg px-3 py-1.5 text-sm text-velvet-white text-center"
                        />
                        <span className="text-xs text-velvet-muted">%</span>
                      </div>
                    </div>

                    {/* Reward Pools Table */}
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-velvet-muted bg-white/5 border-b border-white/10">
                        <div className="col-span-3">Type</div>
                        <div className="col-span-2">Value</div>
                        <div className="col-span-4">Label</div>
                        <div className="col-span-2">Probability</div>
                        <div className="col-span-1" />
                      </div>
                      {crate[rarity].rewards.map((reward, ri) => (
                        <div key={ri} className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-white/5 last:border-0 items-center">
                          <div className="col-span-3">
                            <select
                              value={reward.type}
                              onChange={e => updateReward(crateKey, rarity, ri, 'type', e.target.value)}
                              className="w-full bg-black border border-white/15 rounded-lg px-2 py-1.5 text-xs text-velvet-white"
                            >
                              <option value="xp">XP</option>
                              <option value="coins">Coins</option>
                              <option value="badge">Badge</option>
                              <option value="item">Item</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              value={reward.value}
                              onChange={e => updateReward(crateKey, rarity, ri, 'value', Number(e.target.value))}
                              className="w-full bg-black border border-white/15 rounded-lg px-2 py-1.5 text-xs text-velvet-white"
                            />
                          </div>
                          <div className="col-span-4">
                            <input
                              type="text"
                              value={reward.label}
                              onChange={e => updateReward(crateKey, rarity, ri, 'label', e.target.value)}
                              className="w-full bg-black border border-white/15 rounded-lg px-2 py-1.5 text-xs text-velvet-white"
                              placeholder="Reward label..."
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={reward.probability}
                              onChange={e => updateReward(crateKey, rarity, ri, 'probability', Number(e.target.value))}
                              className="w-full bg-black border border-white/15 rounded-lg px-2 py-1.5 text-xs text-velvet-white"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button
                              onClick={() => removeReward(crateKey, rarity, ri)}
                              className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="px-4 py-2">
                        <button
                          onClick={() => addReward(crateKey, rarity)}
                          className="text-[10px] text-velvet-muted hover:text-velvet-white transition-colors uppercase tracking-[0.2em]"
                        >
                          + Add Reward
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )
      })}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-velvet-white text-velvet-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  )
}
