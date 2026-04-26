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
    set({ isLoading: true })
    try {
      const res = await apiFetch('/auth/me')
      const data = await res.json()
      if (data.success) {
        set({ user: data.data.user, isAuthenticated: true })
      } else {
        set({ user: null, isAuthenticated: false })
      }
    } catch {
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
