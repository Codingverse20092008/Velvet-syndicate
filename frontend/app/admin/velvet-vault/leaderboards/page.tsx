'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Gift, RefreshCw, History, Search, Award } from 'lucide-react'

const EASE = [0.22, 1, 0.36, 1]

interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  score: number
  xp: number
  level: number
  streak: number
  coins: number
}

interface ResetHistory {
  id: string
  period: string
  resetAt: string
  resetBy: string
}

export default function LeaderboardsPage() {
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([])
  const [resetHistory, setResetHistory] = useState<ResetHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')
  const [manualUserId, setManualUserId] = useState('')
  const [manualRewardType, setManualRewardType] = useState('xp')
  const [manualRewardValue, setManualRewardValue] = useState('')
  const [manualRewardLabel, setManualRewardLabel] = useState('')
  const [sendingReward, setSendingReward] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmReset, setConfirmReset] = useState<'weekly' | 'monthly' | null>(null)

  const fetchRankings = async (p: string) => {
    try {
      const res = await fetch(`/api/admin/velvet-vault/leaderboards?period=${p}&limit=50`)
      const d = await res.json()
      if (d.success) setRankings(d.data?.leaderboard ?? d.data ?? [])
      else setError(d.error || 'Failed to load rankings')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const fetchResetHistory = async () => {
    try {
      const res = await fetch('/api/admin/velvet-vault/leaderboards/reset-history')
      const d = await res.json()
      if (d.success) setResetHistory(d.data?.resets ?? d.data ?? [])
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    Promise.all([fetchRankings(period), fetchResetHistory()]).finally(() => setLoading(false))
  }, [])

  const handlePeriodChange = (p: 'weekly' | 'monthly') => {
    setPeriod(p)
    setLoading(true)
    fetchRankings(p).finally(() => setLoading(false))
  }

  const handleManualReward = async () => {
    if (!manualUserId || !manualRewardValue) return
    setSendingReward(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/velvet-vault/leaderboards/manual-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: manualUserId,
          rewardType: manualRewardType,
          rewardValue: Number(manualRewardValue),
          rewardLabel: manualRewardLabel,
        }),
      })
      const d = await res.json()
      if (d.success) {
        setManualUserId('')
        setManualRewardType('xp')
        setManualRewardValue('')
        setManualRewardLabel('')
        fetchRankings(period)
      } else {
        setError(d.error || 'Failed to send reward')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSendingReward(false)
    }
  }

  const handleReset = async (p: 'weekly' | 'monthly') => {
    setResetting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/velvet-vault/leaderboards/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: p }),
      })
      const d = await res.json()
      if (d.success) {
        setConfirmReset(null)
        fetchRankings(period)
        fetchResetHistory()
      } else {
        setError(d.error || 'Failed to reset')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setResetting(false)
    }
  }

  if (loading && rankings.length === 0) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border border-white/20 border-t-white/60 rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <h1 className="font-heading text-3xl text-velvet-white tracking-tight">Leaderboard Management</h1>
        <p className="text-sm text-velvet-muted mt-2">View rankings, award manual rewards, and reset leaderboards</p>
      </motion.div>

      {error && <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Rankings */}
        <div className="xl:col-span-2 bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Trophy className="text-yellow-400" size={18} />
              </div>
              <div>
                <h3 className="font-heading text-lg text-velvet-white">Current Rankings</h3>
                <p className="text-xs text-velvet-muted capitalize">{period} leaderboard</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePeriodChange('weekly')}
                className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold transition-colors ${
                  period === 'weekly' ? 'bg-velvet-white text-velvet-black' : 'bg-white/5 text-velvet-muted hover:text-velvet-white'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => handlePeriodChange('monthly')}
                className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold transition-colors ${
                  period === 'monthly' ? 'bg-velvet-white text-velvet-black' : 'bg-white/5 text-velvet-muted hover:text-velvet-white'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 px-5 py-4 text-[10px] uppercase tracking-widest text-velvet-muted border-b border-white/5">
            <div className="col-span-1">Rank</div>
            <div className="col-span-3">User</div>
            <div className="col-span-2">Score</div>
            <div className="col-span-2">XP</div>
            <div className="col-span-1">Level</div>
            <div className="col-span-1">Streak</div>
            <div className="col-span-2">Coins</div>
          </div>

          <div className="divide-y divide-white/5">
            {rankings.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-velvet-muted">No rankings yet for this period.</div>
            )}
            {rankings.map((entry) => (
              <div key={entry.rank} className="grid grid-cols-12 px-5 py-4 items-center text-sm">
                <div className="col-span-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                    entry.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                    entry.rank === 3 ? 'bg-amber-600/20 text-amber-500' :
                    'bg-white/5 text-velvet-muted'
                  }`}>
                    {entry.rank}
                  </div>
                </div>
                <div className="col-span-3 text-velvet-white truncate">{entry.userName || entry.userId}</div>
                <div className="col-span-2 text-velvet-white font-heading">{entry.score.toLocaleString()}</div>
                <div className="col-span-2 text-velvet-muted">{entry.xp.toLocaleString()}</div>
                <div className="col-span-1 text-velvet-muted">{entry.level}</div>
                <div className="col-span-1 text-velvet-muted">{entry.streak}</div>
                <div className="col-span-2 text-velvet-muted">{entry.coins.toLocaleString()}</div>
              </div>
            ))}
            {loading && (
              <div className="px-6 py-4 text-center">
                <RefreshCw size={16} className="inline animate-spin text-velvet-muted" />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Manual Reward */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Gift className="text-green-400" size={18} />
              </div>
              <div>
                <h3 className="font-heading text-lg text-velvet-white">Manual Reward</h3>
                <p className="text-xs text-velvet-muted">Award a manual reward to a user</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">User ID</label>
                <input
                  type="text"
                  value={manualUserId}
                  onChange={e => setManualUserId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  placeholder="User ID..."
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Reward Type</label>
                <select
                  value={manualRewardType}
                  onChange={e => setManualRewardType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                >
                  <option value="xp">XP</option>
                  <option value="coins">Coins</option>
                  <option value="crate">Crate</option>
                  <option value="badge">Badge</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Reward Value</label>
                <input
                  type="number"
                  value={manualRewardValue}
                  onChange={e => setManualRewardValue(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  placeholder="Value..."
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted block mb-2">Reward Label</label>
                <input
                  type="text"
                  value={manualRewardLabel}
                  onChange={e => setManualRewardLabel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-velvet-white"
                  placeholder="e.g. Staff Bonus"
                />
              </div>
              <button
                onClick={handleManualReward}
                disabled={sendingReward || !manualUserId || !manualRewardValue}
                className="w-full py-3 bg-green-500 text-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-green-400 transition-colors disabled:opacity-50"
              >
                {sendingReward ? 'Sending...' : 'Award Reward'}
              </button>
            </div>
          </motion.div>

          {/* Reset Controls */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <RefreshCw className="text-red-400" size={18} />
              </div>
              <div>
                <h3 className="font-heading text-lg text-velvet-white">Reset Controls</h3>
                <p className="text-xs text-velvet-muted">Reset leaderboard rankings</p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setConfirmReset('weekly')}
                disabled={resetting}
                className="w-full py-3 border border-red-500/30 text-red-400 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                Reset Weekly Leaderboard
              </button>
              <button
                onClick={() => setConfirmReset('monthly')}
                disabled={resetting}
                className="w-full py-3 border border-red-500/30 text-red-400 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                Reset Monthly Leaderboard
              </button>
            </div>

            {/* Reset History */}
            {resetHistory.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <History size={14} className="text-velvet-muted" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-velvet-muted">Reset History</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {resetHistory.map((h) => (
                    <div key={h.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 text-xs">
                      <span className="text-velvet-muted capitalize">{h.period}</span>
                      <span className="text-velvet-muted text-[10px]">{new Date(h.resetAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Confirm Reset Modal */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-heading text-xl text-velvet-white mb-2">Confirm Reset</h3>
            <p className="text-sm text-velvet-muted mb-6">
              Are you sure you want to reset the <span className="capitalize text-velvet-white">{confirmReset}</span> leaderboard? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReset(null)}
                className="flex-1 px-4 py-2.5 border border-white/15 rounded-xl text-sm text-velvet-muted hover:text-velvet-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReset(confirmReset)}
                disabled={resetting}
                className="flex-1 px-4 py-2.5 bg-red-500 text-black rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-red-400 transition-colors disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
