import { create } from 'zustand'
import { api, getStoredAccessToken, setStoredAccessToken, setStoredRefreshToken, clearStoredTokens } from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  phone?: string
  address?: string
  avatar?: string
  createdAt?: string
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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    set({ user, isAuthenticated: true, isLoading: false })
  },

  clearUser: () => {
    clearStoredTokens()
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (isLoading) => {
    set({ isLoading })
  },

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const token = getStoredAccessToken()
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      const res = await api.get('/auth/me')
      const data = await res.json()
      if (data.success && data.data.user) {
        set({ user: data.data.user, isAuthenticated: true })
        // Sync local cart to backend after login
        const { useCartStore } = await import('@/store/cartStore')
        await useCartStore.getState().syncCart()
      } else {
        set({ user: null, isAuthenticated: false })
      }
    } catch (err) {
      console.warn('Auth check failed:', err)
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      get().clearUser()
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const res = await api.post('/auth/login', { email, password })
      const data = await res.json()

      if (data.success && data.data?.accessToken) {
        // Store tokens
        setStoredAccessToken(data.data.accessToken)
        if (data.data.refreshToken) {
          setStoredRefreshToken(data.data.refreshToken)
        }

        // Fetch user data
        const userRes = await api.get('/auth/me')
        const userData = await userRes.json()

        if (userData.success && userData.data.user) {
          set({ user: userData.data.user, isAuthenticated: true, isLoading: false })
          // Sync local cart to backend after login
          const { useCartStore } = await import('@/store/cartStore')
          await useCartStore.getState().syncCart()
          return { success: true }
        }
      }

      set({ isLoading: false })
      return { success: false, error: data?.error || 'Login failed' }
    } catch (err) {
      set({ isLoading: false })
      return { success: false, error: (err as Error).message }
    }
  },

  signup: async (name: string, email: string, password: string) => {
    set({ isLoading: true })
    try {
      const res = await api.post('/auth/signup', { name, email, password })
      const data = await res.json()

      set({ isLoading: false })

      if (data.success) {
        return { success: true }
      }

      return { success: false, error: data?.error || 'Signup failed' }
    } catch (err) {
      set({ isLoading: false })
      return { success: false, error: (err as Error).message }
    }
  },
}))
