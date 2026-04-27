/**
 * Lightweight A/B testing utility
 * Assigns variant based on userId + experiment key (deterministic)
 * Tracks variant exposure via analytics events
 */

import { trackEvent } from './analytics'

interface Experiment {
  id: string
  variants: string[]
}

// Active experiments
const EXPERIMENTS: Record<string, Experiment> = {
  checkout_cta: {
    id: 'checkout_cta',
    variants: ['place_order', 'complete_your_order'],
  },
  product_trust_badge: {
    id: 'product_trust_badge',
    variants: ['hidden', 'shown'],
  },
  cart_urgency: {
    id: 'cart_urgency',
    variants: ['none', 'reserved_timer'],
  },
}

// Deterministic hash: same userId + experiment always returns same variant
function hashAssign(userId: string, experimentId: string, variantCount: number): number {
  let hash = 0
  const str = `${userId}:${experimentId}`
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32-bit integer
  }
  return Math.abs(hash) % variantCount
}

/**
 * Get the assigned variant for an experiment
 * Returns the variant name and tracks exposure
 */
export function getVariant(
  experimentKey: string,
  userId?: string
): string {
  const experiment = EXPERIMENTS[experimentKey]
  if (!experiment) return 'control'

  // If no userId, use random assignment stored in localStorage
  if (!userId) {
    if (typeof window === 'undefined') return experiment.variants[0]
    
    const storageKey = `velvet_ab_${experiment.id}`
    const stored = localStorage.getItem(storageKey)
    if (stored && experiment.variants.includes(stored)) return stored

    const randomIdx = Math.floor(Math.random() * experiment.variants.length)
    const variant = experiment.variants[randomIdx]
    localStorage.setItem(storageKey, variant)
    
    trackEvent('AB_EXPOSURE', {
      experimentId: experiment.id,
      variant,
      anonymous: true,
    })
    
    return variant
  }

  const idx = hashAssign(userId, experiment.id, experiment.variants.length)
  const variant = experiment.variants[idx]

  // Track exposure (fire-and-forget)
  trackEvent('AB_EXPOSURE', {
    experimentId: experiment.id,
    variant,
    userId,
  })

  return variant
}

/**
 * Track a conversion event for an A/B test
 */
export function trackABConversion(
  experimentKey: string,
  variant: string,
  conversionEvent: string
) {
  trackEvent('AB_CONVERSION', {
    experimentId: experimentKey,
    variant,
    conversionEvent,
  })
}

/**
 * Get all active experiments (for admin UI)
 */
export function getActiveExperiments() {
  return Object.entries(EXPERIMENTS).map(([key, exp]) => ({
    key,
    id: exp.id,
    variants: exp.variants,
  }))
}
