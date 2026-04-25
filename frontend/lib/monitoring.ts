import { env } from './env';
import { logger } from './logger';

// Sentry Event type definition
type SentryEvent = {
  request?: {
    cookies?: unknown;
    headers?: Record<string, string>;
  };
  [key: string]: unknown;
};

type SentryScope = {
  setExtra: (key: string, value: unknown) => void;
};

// Lazy-loaded Sentry to avoid initialization overhead
let Sentry: { init: (config: Record<string, unknown>) => void; captureException: (error: Error) => void; withScope: (fn: (scope: SentryScope) => void) => void; captureMessage: (message: string, level: string) => void; setUser: (user: Record<string, string | null | undefined> | null) => void; startTransaction: (config: Record<string, string>) => unknown; } | null = null;

async function getSentry() {
  if (!Sentry && env.SENTRY_DSN) {
    try {
      const sentryModule = await import('@sentry/nextjs');
      Sentry = sentryModule as unknown as typeof Sentry;
    } catch {
      logger.warn('Sentry not installed, error tracking disabled');
    }
  }
  return Sentry;
}

export async function initSentry() {
  if (!env.SENTRY_DSN) {
    logger.info('Sentry DSN not configured, skipping initialization');
    return;
  }

  const sentry = await getSentry();
  if (!sentry) return;

  sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.01 : 1.0,
    beforeSend: (event: SentryEvent) => {
      // Sanitize sensitive data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }
      }
      return event;
    },
  });

  logger.info('Sentry initialized');
}

export async function captureException(error: Error, context?: Record<string, unknown>) {
  logger.error({ err: error, ...context }, error.message);

  const sentry = await getSentry();
  if (sentry) {
    if (context) {
      sentry.withScope((scope: SentryScope) => {
        Object.entries(context as Record<string, unknown>).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        sentry.captureException(error);
      });
    } else {
      sentry.captureException(error);
    }
  }
}

export async function captureMessage(message: string, level: 'error' | 'warning' | 'info' = 'info') {
  logger[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info'](message);

  const sentry = await getSentry();
  if (sentry) {
    sentry.captureMessage(message, level);
  }
}

export async function setUserContext(user: { id: string; email?: string; role?: string }) {
  const sentry = await getSentry();
  if (sentry) {
    sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
}

export async function clearUserContext() {
  const sentry = await getSentry();
  if (sentry) {
    sentry.setUser(null);
  }
}

// Performance monitoring
export async function startTransaction(name: string, op: string) {
  const sentry = await getSentry();
  if (!sentry) return null;

  return sentry.startTransaction({ name, op });
}

// Frontend error boundary wrapper
export function withErrorBoundary<T extends (...args: unknown[]) => unknown>(
  fn: T,
  componentName: string
): T {
  return ((...args: unknown[]) => {
    try {
      return fn(...args);
    } catch (error) {
      captureException(error as Error, { component: componentName });
      throw error;
    }
  }) as T;
}
