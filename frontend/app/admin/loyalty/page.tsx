'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Award, Gift, Users, TrendingUp, Search, Plus, Minus, History } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

interface LoyaltyUser {
  id: string
  name: string
  email: string
  phone: string | null
  totalPoints: number
  redeemedPoints: number
  availablePoints: number
  lastActivity: string
  transactionCount: number
}

interface PointsTransaction {
  id: string
  userId: string
  userName: string
  points: number
  type: 'earned' | 'redeemed' | 'bonus' | 'penalty'
  description: string
  createdAt: string
}

export default function LoyaltyPage() {
  const [users, setUsers] = useState<LoyaltyUser[]>([])
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<LoyaltyUser | null>(null)
  const [adjustPoints, setAdjustPoints] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions'>('overview')

  const totals = {
    totalPointsIssued: users.reduce((sum, u) => sum + u.totalPoints, 0),
    totalPointsRedeemed: users.reduce((sum, u) => sum + u.redeemedPoints, 0),
    totalPointsActive: users.reduce((sum, u) => sum + u.availablePoints, 0),
    totalUsers: users.length,
    activeUsers: users.filter(u => u.availablePoints > 0).length,
  }

  useEffect(() => {
    fetchLoyaltyData()
  }, [])

  const fetchLoyaltyData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [usersRes, transRes] = await Promise.all([
        apiFetch('/admin/loyalty/users'),
        apiFetch('/admin/loyalty/transactions'),
      ])
      
      const usersData = await usersRes.json()
      const transData = await transRes.json()
      
      if (usersData.success) setUsers(usersData.users)
      if (transData.success) setTransactions(transData.transactions)
      
      if (!usersData.success || !transData.success) {
        setError(usersData.error || transData.error || 'Failed to load loyalty data')
      }
    } catch (err) {
      console.error('Failed to load loyalty data:', err)
      setError('Failed to load loyalty data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdjustPoints = async () => {
    if (!selectedUser || !adjustPoints || !adjustReason) return
    
    try {
      const res = await apiFetch(`/admin/loyalty/users/${selectedUser.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          points: parseInt(adjustPoints),
          reason: adjustReason,
        }),
      })
      
      const data = await res.json()
      if (data.success) {
        await fetchLoyaltyData()
        setSelectedUser(null)
        setAdjustPoints('')
        setAdjustReason('')
      }
    } catch (err) {
      console.error('Failed to adjust points:', err)
    }
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery)
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">Loyalty Program</h1>
        <div className="text-velvet-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-velvet-white tracking-wider uppercase">Loyalty Program</h1>
          <p className="text-velvet-muted text-sm mt-2">Manage customer points and rewards.</p>
        </div>
      </div>

      {error && <div className="p-4 border border-red-400/20 bg-red-500/10 rounded-xl text-red-300 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'transactions', label: 'Transactions', icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-widest transition-colors ${
              activeTab === tab.id
                ? 'text-velvet-accent border-b-2 border-velvet-accent'
                : 'text-velvet-muted hover:text-velvet-white'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Total Points Issued</div>
                  <div className="text-3xl font-heading text-velvet-white mt-2">{totals.totalPointsIssued.toLocaleString()}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Award className="text-emerald-400" size={20} />
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Points Redeemed</div>
                  <div className="text-3xl font-heading text-amber-400 mt-2">{totals.totalPointsRedeemed.toLocaleString()}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Gift className="text-amber-400" size={20} />
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-velvet-card border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Active Points</div>
                  <div className="text-3xl font-heading text-cyan-400 mt-2">{totals.totalPointsActive.toLocaleString()}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Users className="text-cyan-400" size={20} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Program Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
              <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-4">Program Statistics</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-velvet-muted">Total Enrolled Users</span>
                  <span className="text-lg font-heading text-velvet-white">{totals.totalUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-velvet-muted">Users with Active Points</span>
                  <span className="text-lg font-heading text-emerald-400">{totals.activeUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-velvet-muted">Redemption Rate</span>
                  <span className="text-lg font-heading text-amber-400">
                    {totals.totalPointsIssued > 0 ? ((totals.totalPointsRedeemed / totals.totalPointsIssued) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-velvet-card border border-white/10 rounded-2xl p-6">
              <div className="text-[10px] uppercase tracking-widest text-velvet-muted mb-4">Point Value</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-velvet-muted">1 Point Value</span>
                  <span className="text-lg font-heading text-velvet-white">₹1.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-velvet-muted">Active Points Value</span>
                  <span className="text-lg font-heading text-emerald-400">{formatPrice(totals.totalPointsActive)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-velvet-muted">Total Program Liability</span>
                  <span className="text-lg font-heading text-cyan-400">{formatPrice(totals.totalPointsActive)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-velvet-muted" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-lg pl-10 pr-4 py-2 text-sm text-velvet-white"
              />
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {filteredUsers.map((user) => (
              <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-velvet-white">{user.name[0]}</span>
                  </div>
                  <div>
                    <div className="text-sm text-velvet-white font-medium">{user.name}</div>
                    <div className="text-xs text-velvet-muted">{user.email}</div>
                    {user.phone && <div className="text-xs text-velvet-muted">{user.phone}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm font-heading text-emerald-400">{user.availablePoints} pts</div>
                    <div className="text-[10px] text-velvet-muted">available</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-velvet-white">{user.totalPoints}</div>
                    <div className="text-[10px] text-velvet-muted">total</div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="px-3 py-1.5 bg-velvet-accent/20 text-velvet-accent text-xs rounded-lg hover:bg-velvet-accent/30 transition-colors"
                  >
                    Adjust
                  </button>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-velvet-muted">No users found.</div>
            )}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-velvet-card border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <div className="text-[10px] uppercase tracking-widest text-velvet-muted">Recent Transactions</div>
          </div>
          <div className="divide-y divide-white/5">
            {transactions.map((tx) => (
              <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    tx.type === 'earned' ? 'bg-emerald-500/10' :
                    tx.type === 'redeemed' ? 'bg-amber-500/10' :
                    tx.type === 'bonus' ? 'bg-cyan-500/10' : 'bg-red-500/10'
                  }`}>
                    {tx.type === 'earned' ? <Plus size={14} className="text-emerald-400" /> :
                     tx.type === 'redeemed' ? <Minus size={14} className="text-amber-400" /> :
                     tx.type === 'bonus' ? <Gift size={14} className="text-cyan-400" /> :
                     <Minus size={14} className="text-red-400" />}
                  </div>
                  <div>
                    <div className="text-sm text-velvet-white">{tx.userName}</div>
                    <div className="text-xs text-velvet-muted">{tx.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-heading ${
                    tx.points > 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {tx.points > 0 ? '+' : ''}{tx.points}
                  </div>
                  <div className="text-[10px] text-velvet-muted">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-velvet-muted">No transactions yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Adjust Points Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-velvet-card border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-heading text-xl text-velvet-white mb-4">Adjust Points</h3>
            <div className="mb-4">
              <div className="text-sm text-velvet-muted">User</div>
              <div className="text-velvet-white font-medium">{selectedUser.name}</div>
              <div className="text-xs text-velvet-muted">Current: {selectedUser.availablePoints} points</div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">Points to Add/Remove</label>
                <input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  placeholder="Use negative for removal"
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-velvet-muted block mb-2">Reason</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g., Birthday bonus, Complaint resolution"
                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-velvet-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 px-4 py-2 border border-white/15 rounded-lg text-sm text-velvet-muted hover:text-velvet-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustPoints}
                disabled={!adjustPoints || !adjustReason}
                className="flex-1 px-4 py-2 bg-velvet-accent text-black rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
