// API configuration for separate backend
// MUST be set in .env.local: NEXT_PUBLIC_API_URL=https://velvet-syndicate.onrender.com
const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  console.error('NEXT_PUBLIC_API_URL is not set. API calls will fail.')
}

const TOKEN_KEY = 'velvet_access_token'
const REFRESH_TOKEN_KEY = 'velvet_refresh_token'

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
async function refreshAuthToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send refresh token cookie
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
const REQUEST_TIMEOUT_MS = 15000

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

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipAuth, skipRetry, headers, ...restOptions } = options

  // Build URL - ALWAYS use absolute URL in production
  const url = path.startsWith('http') ? path : `${API_URL}/api${path}`

  // Get stored access token
  const accessToken = getStoredAccessToken()

  // Build headers with Authorization if token exists
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers as Record<string, string>,
  }

  if (accessToken && !skipAuth) {
    authHeaders['Authorization'] = `Bearer ${accessToken}`
  }

  // First attempt
  let res = await fetchWithTimeout(url, {
    ...restOptions,
    headers: authHeaders,
    credentials: 'include', // Send refresh token cookie
  })

  // Handle 401 - Token expired, try to refresh and retry
  if (res.status === 401 && !skipRetry && !path.includes('/auth/login') && !path.includes('/auth/signup')) {
    console.warn('Received 401, attempting token refresh...')

    // Try to refresh the token
    const newAccessToken = await refreshAuthToken()

    if (newAccessToken) {
      console.log('Token refreshed successfully, retrying original request...')

      // Retry original request with new token
      res = await fetchWithTimeout(url, {
        ...restOptions,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          'Authorization': `Bearer ${newAccessToken}`,
        },
        credentials: 'include',
      })

      // If retry also fails with 401, clear tokens
      if (res.status === 401) {
        console.warn('Retry also failed with 401, clearing tokens...')
        clearStoredTokens()
        if (typeof window !== 'undefined') {
          const { useAuthStore } = await import('@/store/authStore')
          useAuthStore.getState().clearUser()
        }
      }
    } else {
      // Refresh failed, clear tokens
      console.warn('Token refresh failed, clearing tokens...')
      clearStoredTokens()
      if (typeof window !== 'undefined') {
        const { useAuthStore } = await import('@/store/authStore')
        useAuthStore.getState().clearUser()
      }
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
