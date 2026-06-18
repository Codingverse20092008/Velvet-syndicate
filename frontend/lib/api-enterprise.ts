import { apiFetch } from './api'

interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  retryCondition?: (error: any) => boolean
}

/**
 * Enterprise-grade API fetch with automatic retry for network failures
 * Only retries on safe errors (network issues, 5xx server errors)
 * Never retries on 4xx client errors (bad requests, auth issues)
 */
export async function enterpriseFetch(
  url: string,
  options: RequestInit & { retry?: RetryOptions } = {}
): Promise<Response> {
  const {
    retry: { maxRetries = 3, retryDelay = 1000, retryCondition } = {},
    ...fetchOptions
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await apiFetch(url, {
        ...fetchOptions,
        credentials: 'include', // 🛡️ ALWAYS include credentials
      })
      
      // If successful, return immediately
      if (response.ok) {
        return response
      }
      
      // Parse error for retry decision
      const errorData = await response.json().catch(() => ({}))
      const error = {
        status: response.status,
        message: errorData.error || errorData.message || 'Request failed',
        data: errorData
      }

      // Don't retry on client errors (4xx) - these are user issues
      if (response.status >= 400 && response.status < 500) {
        throw error
      }

      // Don't retry on specific conditions if provided
      if (retryCondition && !retryCondition(error)) {
        throw error
      }

      lastError = error

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error
      }

      // Wait before retry with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt)
      console.warn(`🔄 API Retry ${attempt + 1}/${maxRetries} for ${url} - waiting ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))

    } catch (error) {
      lastError = error
      
      // If this is a network error and we have retries left, continue
      if (error instanceof TypeError && attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt)
        console.warn(`🔄 Network Retry ${attempt + 1}/${maxRetries} for ${url} - waiting ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // If this is the last attempt or a non-retryable error, throw
      if (attempt === maxRetries) {
        throw error
      }
    }
  }

  throw lastError
}

/**
 * Order creation is intentionally non-retriable.
 * Safe replay must happen only via the same idempotency key.
 */
export async function createOrderWithRetry(
  addressId: string,
  paymentMethod: string = 'COD',
  options: { idempotencyKey: string; expectedVersion?: number; rewardId?: string }
) {
  return enterpriseFetch('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      addressId,
      paymentMethod,
      idempotencyKey: options.idempotencyKey,
      expectedVersion: options.expectedVersion,
      rewardId: options.rewardId,
    }),
    credentials: 'include', // 🛡️ ALWAYS include credentials
    retry: {
      maxRetries: 0,
      retryDelay: 0,
      retryCondition: () => false
    }
  })
}
