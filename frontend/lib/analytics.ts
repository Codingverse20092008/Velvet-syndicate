const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://velvet-syndicate.onrender.com'

/**
 * Track a user event - fire-and-forget (never blocks UI)
 * Silently fails if network error occurs
 */
export const trackEvent = (eventType: string, metadata?: Record<string, any>) => {
  // Fire-and-forget: use fetch without await
  // Use requestIdleCallback for better performance if available
  const sendEvent = () => {
    fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, metadata }),
      keepalive: true, // Ensures event is sent even if page unloads
    }).catch(() => {
      // Silently fail - never block UI or throw
    })
  }

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${eventType}`, metadata)
  }

  // Also send to gtag if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    try {
      (window as any).gtag('event', eventType, metadata)
    } catch {
      // Silently fail
    }
  }

  // Use requestIdleCallback for non-blocking send, fallback to setTimeout
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(sendEvent, { timeout: 2000 })
  } else {
    setTimeout(sendEvent, 0)
  }
}

// Pre-defined event helpers for common actions
export const events = {
  viewProduct: (productId: string) => trackEvent('VIEW_PRODUCT', { productId }),
  addToCart: (productId: string, quantity?: number) => trackEvent('ADD_TO_CART', { productId, quantity }),
  removeFromCart: (productId: string) => trackEvent('REMOVE_FROM_CART', { productId }),
  checkoutStarted: (idempotencyKey?: string) => trackEvent('CHECKOUT_STARTED', { idempotencyKey }),
  checkoutAbandoned: (idempotencyKey?: string, itemsCount?: number, total?: number) =>
    trackEvent('CHECKOUT_ABANDONED', { idempotencyKey, itemsCount, total }),
  orderCreated: (orderId: string, total: number) => trackEvent('ORDER_CREATED', { orderId, total }),
  orderFailed: (error?: string) => trackEvent('ORDER_FAILED', { error }),
  trackOrderClicked: (orderId: string) => trackEvent('TRACK_ORDER_CLICKED', { orderId }),
  returnVisit: () => trackEvent('RETURN_VISIT'),
  recommendationClicked: (productId: string) => trackEvent('RECOMMENDATION_CLICKED', { productId }),
  profileUpdated: () => trackEvent('PROFILE_UPDATED'),
  addressAdded: () => trackEvent('ADDRESS_ADDED'),
}
