import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const today = () => new Date().toISOString().slice(0, 10)
const yesterday = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

interface GameState {
  points: number
  streakDays: number
  lastPlayedDate: string | null
  totalPointsEarned: number
  redeemedRewards: string[]
  lastSessionEarned: number
  lastSessionBonus: number
  addPoints: (points: number) => void
  recordSession: (earnedPoints: number) => void
  redeemReward: (id: string, cost: number) => boolean
  resetGameProgress: () => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      points: 0,
      streakDays: 0,
      lastPlayedDate: null,
      totalPointsEarned: 0,
      redeemedRewards: [],
      lastSessionEarned: 0,
      lastSessionBonus: 0,

      addPoints: (points) => {
        if (points <= 0) return
        set((state) => ({
          points: state.points + points,
          totalPointsEarned: state.totalPointsEarned + points,
        }))
      },

      recordSession: (earnedPoints) => {
        const todayDate = today()
        const lastPlayedDate = get().lastPlayedDate
        const nextStreak = lastPlayedDate === todayDate
          ? get().streakDays
          : lastPlayedDate === yesterday()
            ? get().streakDays + 1
            : 1

        const streakBonus = nextStreak >= 3 && lastPlayedDate !== todayDate ? 15 : 0
        const earnedWithBonus = Math.max(0, earnedPoints) + streakBonus

        set((state) => ({
          points: state.points + earnedWithBonus,
          totalPointsEarned: state.totalPointsEarned + earnedWithBonus,
          streakDays: nextStreak,
          lastPlayedDate: todayDate,
          lastSessionEarned: earnedPoints,
          lastSessionBonus: streakBonus,
        }))
      },

      redeemReward: (id, cost) => {
        const state = get()
        if (state.points < cost || state.redeemedRewards.includes(id)) {
          return false
        }

        set((state) => ({
          points: state.points - cost,
          redeemedRewards: [...state.redeemedRewards, id],
        }))

        return true
      },

      resetGameProgress: () => {
        set({
          points: 0,
          streakDays: 0,
          lastPlayedDate: null,
          totalPointsEarned: 0,
          redeemedRewards: [],
          lastSessionEarned: 0,
          lastSessionBonus: 0,
        })
      },
    }),
    {
      name: 'velvet-vault-game-state',
    }
  )
)
