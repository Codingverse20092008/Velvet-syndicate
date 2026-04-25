// API configuration for separate backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export async function apiFetch(path: string, options?: RequestInit) {
  // Use relative path for Next.js rewrites if no absolute URL is provided
  // If API_URL is provided, it should be the base (e.g. 'https://api.velvet.com')
  const url = path.startsWith('http') ? path : `${API_URL}/api${path}`
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
