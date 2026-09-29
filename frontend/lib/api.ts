// API configuration for separate backend
// MUST be set in .env.local: NEXT_PUBLIC_API_URL=https://velvet-syndicate.onrender.com
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://velvet-syndicate.onrender.com'

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not set. Falling back to default backend URL.')
}

const TOKEN_KEY = 'velvet_access_token'
const REFRESH_TOKEN_KEY = 'velvet_refresh_token'

// Cloudinary Optimization Helper - injects f_auto,q_auto for optimal WebP/AVIF compression
export const optimizeCloudinaryUrl = (url: string, transformations = 'f_auto,q_auto'): string => {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) {
    return url
  }
  // Check if f_auto or q_auto already present
  if (url.includes('/f_auto') || url.includes('/q_auto') || url.includes(transformations)) {
    return url
  }
  return url.replace('/image/upload/', `/image/upload/${transformations}/`)
}

// Helper to get full image URL (handles relative paths from backend & optimizes Cloudinary)
export const getFullImageUrl = (url: any): string => {
  // If url is null, undefined, or empty string, return placeholder
  if (!url) return '/images/placeholder-product.png'
  
  // If url is an object (common bug when backend returns relations), extract imageUrl
  let finalUrl = ''
  if (typeof url === 'string') {
    finalUrl = url
  } else if (typeof url === 'object') {
    finalUrl = url.imageUrl || url.image_url || ''
    if (!finalUrl) return '/images/placeholder-product.png'
  } else {
    return '/images/placeholder-product.png'
  }
  
  // If URL starts with /uploads, prepend the API URL
  if (finalUrl.startsWith('/uploads')) {
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
    finalUrl = `${baseUrl}${finalUrl}`
  }
  // If it's a relative path but not starting with /uploads, maybe it's just the filename
  else if (!finalUrl.startsWith('/') && !finalUrl.startsWith('http') && finalUrl.includes('.')) {
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
    finalUrl = `${baseUrl}/uploads/products/${finalUrl}`
  }
  
  // Encode the URL to handle spaces and special characters, then optimize Cloudinary
  try {
    const encoded = encodeURI(finalUrl)
    return optimizeCloudinaryUrl(encoded)
  } catch (e) {
    console.error('Failed to encode image URL:', finalUrl, e)
    return optimizeCloudinaryUrl(finalUrl)
  }
}

// Token storage helpers
export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setStoredRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

export function clearStoredTokens(): void {
  setStoredAccessToken(null)
  setStoredRefreshToken(null)
}

// Refresh token from backend
// Strategy: cookie (primary) + body fallback (cross-domain safety)
async function refreshAuthToken(): Promise<string | null> {
  try {
    // Always attempt to read from storage — browsers in strict/incognito mode
    // may silently drop SameSite=None cookies across domains (Vercel → Render).
    // The backend /api/auth/refresh already reads req.body?.refreshToken as fallback.
    const storedRefreshToken = getStoredRefreshToken()

    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Primary: send refresh_token cookie
      // Fallback: also send token in body so cross-domain requests succeed
      body: storedRefreshToken
        ? JSON.stringify({ refreshToken: storedRefreshToken })
        : undefined,
    })

    if (!res.ok) {
      console.warn('Token refresh failed with status:', res.status)
      return null
    }

    const data = await res.json()
    if (data.success && data.data?.accessToken) {
      // Store new tokens
      setStoredAccessToken(data.data.accessToken)
      if (data.data.refreshToken) {
        setStoredRefreshToken(data.data.refreshToken)
      }
      return data.data.accessToken
    }

    return null
  } catch (err) {
    console.error('Token refresh error:', err)
    return null
  }
}

// Retry configuration
const MAX_RETRIES = 1
const REQUEST_TIMEOUT_MS = 45000

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}

interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean // Skip adding auth header (for public endpoints)
  skipRetry?: boolean // Skip retry on 401
}

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token))
  refreshSubscribers = []
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipAuth, skipRetry, headers, ...restOptions } = options

  // Build URL - ALWAYS use absolute URL in production
  const url = path.startsWith('http') ? path : `${API_URL}/api${path}`

  // Get stored access token
  const accessToken = getStoredAccessToken()

  // Build headers with Authorization if token exists
  // Don't set Content-Type for FormData - browser sets it with boundary
  const isFormData = restOptions.body instanceof FormData
  const authHeaders: Record<string, string> = {
    ...headers as Record<string, string>,
  }

  if (!isFormData) {
    authHeaders['Content-Type'] = 'application/json'
  }

  if (accessToken && !skipAuth) {
    authHeaders['Authorization'] = `Bearer ${accessToken}`
  }

  // Helper to execute request with given token
  const executeRequest = async (token: string | null) => {
    const headers = { ...authHeaders }
    if (token && !skipAuth) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return await fetchWithTimeout(url, {
      ...restOptions,
      headers,
      credentials: 'include',
    })
  }

  // First attempt
  let res = await executeRequest(accessToken)

  // Handle 401 - Token expired, try to refresh and retry
  if (res.status === 401 && !skipRetry && !path.includes('/auth/login') && !path.includes('/auth/signup')) {
    if (isRefreshing) {
      // 🛡️ QUEUE REQUEST: If already refreshing, wait for the new token
      return new Promise((resolve) => {
        subscribeTokenRefresh(async (token: string) => {
          resolve(await executeRequest(token))
        })
      })
    }

    isRefreshing = true
    console.warn('Received 401, attempting token refresh...')

    try {
      const newAccessToken = await refreshAuthToken()

      if (newAccessToken) {
        console.log('Token refreshed successfully, retrying original request...')
        isRefreshing = false
        onTokenRefreshed(newAccessToken)
        
        // Retry original request
        return await executeRequest(newAccessToken)
      } else {
        throw new Error('Token refresh failed')
      }
    } catch (err) {
      isRefreshing = false
      // 🛡️ CRITICAL: Notify all subscribers that refresh failed so they don't hang
      onTokenRefreshed('') // Send empty string to signify failure
      
      console.warn('Token refresh failed, clearing tokens...')
      clearStoredTokens()
      if (typeof window !== 'undefined') {
        const { useAuthStore } = await import('@/store/authStore')
        useAuthStore.getState().clearUser()
      }
      return res // Return the original 401
    }
  }

  return res
}

// Convenience methods for common HTTP methods
export const api = {
  get: (path: string, options?: Omit<ApiFetchOptions, 'method'>) =>
    apiFetch(path, { ...options, method: 'GET' }),

  post: (path: string, body?: unknown, options?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
    apiFetch(path, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  put: (path: string, body?: unknown, options?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
    apiFetch(path, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),

  patch: (path: string, body?: unknown, options?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
    apiFetch(path, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),

  delete: (path: string, options?: Omit<ApiFetchOptions, 'method'>) =>
    apiFetch(path, { ...options, method: 'DELETE' }),
}

// ─── Abandoned Cart Sync Helper ──────────────────────────────────────
export interface AbandonedCartSyncPayload {
  email?: string | null
  phone?: string | null
  items: any[]
  totalAmount: number
  recovered?: boolean
}

export async function syncAbandonedCart(payload: AbandonedCartSyncPayload) {
  try {
    const res = await apiFetch('/cart/abandoned', {
      method: 'POST',
      skipAuth: true,
      skipRetry: true,
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch (err) {
    console.warn('[syncAbandonedCart] Failed to sync lead:', err)
    return null
  }
}

