import { create } from 'zustand'
import { api, getStoredAccessToken, setStoredAccessToken, setStoredRefreshToken, clearStoredTokens } from '@/lib/api'

function setEdgeAuthCookie(token: string | null) {
  if (typeof document === 'undefined') return
  const isProduction = window.location.protocol === 'https:'
  const secure = isProduction ? '; Secure' : ''
  if (token) {
    // Max-Age matches refresh token TTL (7 days) — middleware verifies JWT expiry itself
    document.cookie = `access_token=${token}; Path=/; Max-Age=604800; SameSite=Lax${secure}`
    console.log('[AuthStore] Edge auth cookie SET, length:', token.length)
  } else {
    document.cookie = `access_token=; Path=/; Max-Age=0; SameSite=Lax${secure}`
    console.log('[AuthStore] Edge auth cookie CLEARED')
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
    const token = getStoredAccessToken()
    if (token) setEdgeAuthCookie(token)
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
      const initialToken = getStoredAccessToken()
      if (!initialToken) {
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      const res = await api.get('/auth/me')
      const data = await res.json()

      if (data.success && data.data.user) {
        // ⚠️ Re-read token AFTER API call — api.get may have internally refreshed it
        const freshToken = getStoredAccessToken() || initialToken
        set({ user: data.data.user, isAuthenticated: true })
        setEdgeAuthCookie(freshToken)
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
      console.warn('[AuthStore] checkAuth failed:', err)
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
        const token = data.data.accessToken
        // Store tokens
        setStoredAccessToken(token)
        setEdgeAuthCookie(token)
        if (data.data.refreshToken) {
          setStoredRefreshToken(data.data.refreshToken)
        }

        // Fetch user data — skip retry to avoid destructive refresh logic on fresh token
        let userRes = await api.get('/auth/me', { skipRetry: true })
        let userData = await userRes.json()

        // If first attempt failed (transient), retry once directly
        if (!userData.success || !userData.data?.user) {
          const freshToken = getStoredAccessToken() || token
          try {
            const retryRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'https://velvet-syndicate.onrender.com'}/api/auth/me`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${freshToken}`,
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
              }
            )
            userData = await retryRes.json()
            userRes = retryRes
          } catch (retryErr) {
            console.warn('[AuthStore] login: retry failed', retryErr)
          }
        }

        if (userData.success && userData.data?.user) {
          set({ user: userData.data.user, isAuthenticated: true, isLoading: false })
          setEdgeAuthCookie(getStoredAccessToken() || token)
          // 🚫 BLOCK SYNC DURING CHECKOUT - Prevent cart mutations
          const { useCartStore } = await import('@/store/cartStore')
          if (!useCartStore.getState().checkoutInProgress) {
            await useCartStore.getState().syncCart()
          } else {
            console.log('🚫 Cart sync blocked during checkout - login')
          }
          return { success: true }
        }

        // /auth/me failed even after retry — store tokens for checkAuth to retry later
        console.warn('[AuthStore] login: /auth/me failed after retry, user will be loaded by checkAuth')
        set({ isLoading: false })
        setEdgeAuthCookie(getStoredAccessToken() || token)
        return { success: true }
      }

      setEdgeAuthCookie(null)
      set({ isLoading: false })
      return { success: false, error: data?.error || 'Login failed' }
    } catch (err) {
      console.warn('[AuthStore] login: error -', err)
      set({ isLoading: false })
      return { success: false, error: (err as Error).message }
    }
  },

  signup: async (name: string, email: string, password: string) => {
    set({ isLoading: true })
    try {
      console.log('[AuthStore] signup: creating account for', email)
      const res = await api.post('/auth/signup', { name, email, password })
      const data = await res.json()

      set({ isLoading: false })

      if (data.success) {
        console.log('[AuthStore] signup: account created, redirect to verify-otp')
        return { success: true }
      }

      console.log('[AuthStore] signup: failed -', data?.error || 'Unknown error')
      return { success: false, error: data?.error || 'Signup failed' }
    } catch (err) {
      console.warn('[AuthStore] signup: error -', err)
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
