import { create } from 'zustand'
import { api, getStoredAccessToken, setStoredAccessToken, setStoredRefreshToken, clearStoredTokens } from '@/lib/api'

function setEdgeAuthCookie(token: string | null) {
  if (typeof document === 'undefined') return
  const isProduction = window.location.protocol === 'https:'
  const secure = isProduction ? '; Secure' : ''
  if (token) {
    document.cookie = `access_token=${token}; Path=/; Max-Age=900; SameSite=Lax${secure}`
  } else {
    document.cookie = `access_token=; Path=/; Max-Age=0; SameSite=Lax${secure}`
  }
}

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
  refreshProfile: () => Promise<void>
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
    setEdgeAuthCookie(null)
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
        setEdgeAuthCookie(token)
        // 🚫 BLOCK SYNC DURING CHECKOUT - Prevent cart mutations
        const { useCartStore } = await import('@/store/cartStore')
        if (!useCartStore.getState().checkoutInProgress) {
          await useCartStore.getState().syncCart()
        } else {
          console.log('🚫 Cart sync blocked during checkout - auth check')
        }
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
        setEdgeAuthCookie(data.data.accessToken)
        if (data.data.refreshToken) {
          setStoredRefreshToken(data.data.refreshToken)
        }

        // Fetch user data
        const userRes = await api.get('/auth/me')
        const userData = await userRes.json()

        if (userData.success && userData.data.user) {
          set({ user: userData.data.user, isAuthenticated: true, isLoading: false })
          setEdgeAuthCookie(data.data.accessToken)
          // 🚫 BLOCK SYNC DURING CHECKOUT - Prevent cart mutations
          const { useCartStore } = await import('@/store/cartStore')
          if (!useCartStore.getState().checkoutInProgress) {
            await useCartStore.getState().syncCart()
          } else {
            console.log('🚫 Cart sync blocked during checkout - login')
          }
          return { success: true }
        }
      }

      setEdgeAuthCookie(null)
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
  
  refreshProfile: async () => {
    try {
      const res = await api.get('/auth/me')
      const data = await res.json()
      if (data.success && data.data.user) {
        set({ user: data.data.user })
      }
    } catch (err) {
      console.warn('Profile refresh failed:', err)
    }
  },
}))
