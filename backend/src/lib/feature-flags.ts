import { logger } from './logger';

/**
 * Simple environment-based feature flags.
 * Enables safe, gradual rollout of new features without redeploying.
 * 
 * Usage:
 *   if (isFeatureEnabled('NEW_SEARCH')) { ... }
 * 
 * Set in .env:
 *   FEATURE_NEW_SEARCH=true
 */

const FLAGS: Record<string, boolean> = {};

function loadFlags() {
  const prefix = 'FEATURE_';
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(prefix)) {
      const flagName = key.slice(prefix.length);
      FLAGS[flagName] = value === 'true' || value === '1';
    }
  }
  const enabledFlags = Object.entries(FLAGS).filter(([, v]) => v).map(([k]) => k);
  if (enabledFlags.length > 0) {
    logger.info({ flags: enabledFlags }, 'Feature flags loaded');
  }
}

// Load on import
loadFlags();

export function isFeatureEnabled(flag: string): boolean {
  return FLAGS[flag] === true;
}

export function getActiveFlags(): Record<string, boolean> {
  return { ...FLAGS };
}
