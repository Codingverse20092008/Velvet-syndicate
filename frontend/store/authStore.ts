import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User) => void
  clearUser: () => void
  setLoading: (loading: boolean) => void
  checkAuth: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    set({ user, isAuthenticated: true, isLoading: false })
  },

  clearUser: () => {
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (isLoading) => {
    set({ isLoading })
  },

  checkAuth: async () => {
    try {
      const res = await apiFetch('/auth/me')
      const data = await res.json()
      if (data.success) {
        set({ user: data.data.user, isAuthenticated: true, isLoading: false })
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
      set({ user: null, isAuthenticated: false, isLoading: false })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  },
}))
