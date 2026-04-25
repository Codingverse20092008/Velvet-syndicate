// API configuration for separate backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export async function apiFetch(path: string, options?: RequestInit) {
  const url = `${API_URL}${path}`
  const res = await fetch(url, {
    ...options,
    credentials: 'include', // Send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  return res
}
