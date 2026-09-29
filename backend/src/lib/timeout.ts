import { logger } from './logger';

/**
 * Enterprise timeout wrapper.
 * Prevents hanging requests when downstream services (Redis, DB) are slow or unresponsive.
 * Usage: const data = await withTimeout(someAsyncCall(), 3000);
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms = 3000,
  label = 'Operation'
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      logger.warn({ label, timeoutMs: ms }, 'Operation timed out');
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * Safe wrapper for non-critical operations (caching, analytics).
 * Catches errors and logs them instead of propagating.
 * Usage: await safeAsync(trackEvent(...), 'analytics');
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  label = 'background-task'
): Promise<T | null> {
  try {
    return await withTimeout(promise, 2000, label);
  } catch (err) {
    logger.warn({ err, label }, 'Non-critical operation failed (swallowed)');
    return null;
  }
}
