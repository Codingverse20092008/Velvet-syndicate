import pino from 'pino';
import { env } from './env';

const isProduction = env.NODE_ENV === 'production';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isProduction ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
  base: {
    service: 'velvet-syndicate',
    version: env.API_VERSION,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['password', 'passwordHash', 'token', 'authorization', 'cookie', 'req.headers.authorization', 'req.headers.cookie'],
    remove: true,
  },
});

// Async local storage for request context
import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  requestId: string;
  userId?: string;
  path?: string;
  method?: string;
  ip?: string;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return requestContext.run(context, fn);
}

export function getLoggerWithContext(): pino.Logger {
  const ctx = getRequestContext();
  if (!ctx) return logger;

  return logger.child({
    requestId: ctx.requestId,
    userId: ctx.userId,
    path: ctx.path,
    method: ctx.method,
    ip: ctx.ip,
  });
}

// Request logging middleware for Next.js
export function logRequest(req: Request, requestId: string) {
  const ctx: RequestContext = {
    requestId,
    path: new URL(req.url).pathname,
    method: req.method,
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
  };

  const childLogger = logger.child(ctx);
  childLogger.info({ type: 'request_start' }, `${req.method} ${ctx.path}`);

  return { ctx, childLogger };
}

export function logResponse(
  childLogger: pino.Logger,
  status: number,
  duration: number,
  error?: Error
) {
  if (error) {
    childLogger.error({
      type: 'request_error',
      status,
      durationMs: duration,
      error: error.message,
      stack: error.stack,
    }, `Request failed: ${error.message}`);
  } else {
    const level = status >= 400 ? 'warn' : 'info';
    childLogger[level]({
      type: 'request_complete',
      status,
      durationMs: duration,
    }, `Request completed in ${duration}ms`);
  }
}

export type Logger = typeof logger;
export { requestContext };