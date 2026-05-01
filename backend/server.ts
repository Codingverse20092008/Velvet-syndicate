import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import path from 'path';
import { globalLimiter, authLimiter, checkoutLimiter } from './src/middleware/rate-limiter';
import './src/workers/orderWorker'; // Start the background worker

// Import env early to validate
import { env } from './src/lib/env';

// Import routes
import authRoutes from './src/routes/auth';
import cartRoutes from './src/routes/cart';
import ordersRoutes from './src/routes/orders';
import productsRoutes from './src/routes/products';
import userRoutes from './src/routes/user';
import addressRoutes from './src/routes/address';
import eventsRoutes from './src/routes/events';
import feedbackRoutes from './src/routes/feedback';
import metricsRoutes from './src/routes/metrics';
import { runReconciliation } from './src/services/reconciliation.service';
import { sendAlert } from './src/lib/alerts';
import { orderQueue } from './src/lib/queue';
import adminRoutes from './src/routes/admin';
import { dbClient } from './src/lib/db';
import { redis } from './src/lib/redis';
import { logger } from './src/lib/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (required for Render and secure cookies)
app.set('trust proxy', 1);

import { requestContext } from './src/lib/context';

// Request ID Tracking + Logging (Elite level traceability)
app.use((req: any, res, next) => {
  const requestId = crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Log request start
  const startTime = Date.now();
  logger.info({
    method: req.method,
    path: req.path,
    requestId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }, 'Request started');

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      method: req.method,
      path: req.path,
      requestId,
      status: res.statusCode,
      durationMs: duration,
    }, 'Request completed');
  });

  // Wrap entire request lifecycle in context
  requestContext.run({ requestId }, () => next());
});

// 🚀 PERFORMANCE: Request Logging
app.use(pinoHttp({
  logger,
  customLogLevel: (res: any, err: any) => ((res.statusCode || 500) >= 500 || err ? 'error' : 'info'),
}));

// 🚀 PERFORMANCE: Cache-Control for GET requests
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/products')) {
    res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute browser cache
  }
  next();
});

// Apply global rate limiting
app.use(globalLimiter);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 🛡️ BULLETPROOF CORS FOR CROSS-DOMAIN AUTH (Vercel → Render)
app.use(cors({
  origin: [
    'https://velvet-syndicate.vercel.app',
    'https://velvet-syndicate-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true, // 🔴 CRITICAL: Allow cookies cross-domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Request-Id', 'Set-Cookie'] // 🔴 EXPOSE Set-Cookie so browser accepts it
}));

// 🛡️ PRE-FLIGHT HANDLING FOR CORS
app.options('*', cors({
  origin: [
    'https://velvet-syndicate.vercel.app',
    'https://velvet-syndicate-frontend.vercel.app',
    'http://localhost:3000',
    env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Request-Id', 'Set-Cookie']
}));

// Body parsing with size limit (prevents payload abuse)
app.use(express.json({ limit: '1mb' }));

// Request timeout (10s) — prevents hanging requests
app.use((req: Request, res: Response, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ success: false, error: 'Request timed out' });
    }
  }, 10000);
  res.on('finish', () => clearTimeout(timeout));
  next();
});

import { pingRedis } from './src/lib/redis';

// Health check (Liveness) - Enhanced with system metrics
app.get('/health', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({ 
    success: true,
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Readiness check (Infra level) - Enhanced with detailed diagnostics
app.get('/ready', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const checks = {
    db: { status: false, latency: 0, error: null },
    redis: { status: false, latency: 0, error: null },
  };

  // Database connectivity check
  try {
    const dbStart = Date.now();
    await dbClient.execute('SELECT 1');
    checks.db.latency = Date.now() - dbStart;
    checks.db.status = true;
  } catch (err) {
    checks.db.error = (err as any).message;
    logger.error({ err: checks.db.error }, 'Database health check failed');
  }

  // Redis connectivity check (optional)
  try {
    const redisStart = Date.now();
    checks.redis.status = await pingRedis();
    checks.redis.latency = Date.now() - redisStart;
  } catch (err) {
    checks.redis.error = (err as any).message;
    logger.warn({ err: checks.redis.error }, 'Redis health check failed (non-critical)');
  }

  const totalLatency = Date.now() - startTime;
  const isReady = checks.db.status; // DB is mandatory, Redis is optional
  
  const response = {
    ready: isReady,
    timestamp: new Date().toISOString(),
    totalLatency: `${totalLatency}ms`,
    checks,
    environment: process.env.NODE_ENV || 'development',
  };

  if (isReady) {
    logger.info(response, 'Readiness check passed');
    res.status(200).json(response);
  } else {
    logger.warn(response, 'Readiness check failed');
    res.status(503).json(response);
  }
});

// Metrics endpoint for monitoring
app.get('/metrics', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.json({
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version,
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
    },
    environment: process.env.NODE_ENV || 'development',
  });
});

// Import error handler
import { errorHandler } from './src/lib/api-handler-express';

// Serve uploaded files statically with CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

// API Routes - Apply stricter rate limiting to auth endpoints
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', checkoutLimiter, ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user/addresses', addressRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/metrics', metricsRoutes);

// Error handling
app.use(errorHandler);

// ─── START SERVER ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: env.NODE_ENV }, `🚀 Velvet Syndicate API listening on port ${PORT}`);
});

// ─── BACKGROUND SERVICES + GRACEFUL SHUTDOWN (main process only) ───────────────
if (require.main === module) {
  // 1. Reconciliation Loop (Every 2 minutes)
  setInterval(async () => {
    try {
      await runReconciliation();
    } catch (err) {
      logger.error({ err }, 'Reconciliation failed');
    }
  }, 120000);

  // 2. Queue Health Monitor (Every 1 minute)
  setInterval(async () => {
    try {
      if (!orderQueue) return;
      const counts = await orderQueue.getJobCounts('failed');
      if (counts.failed > 50) {
        await sendAlert('CRITICAL: High order failure rate detected!', { failedCount: counts.failed });
      }
    } catch (err) { /* Redis/queue optional — non-fatal */ }
  }, 60000);

  logger.info('Background monitoring services started');

  // ─── Graceful Shutdown ────────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        dbClient.close();
        logger.info('Database connection closed');
        // @upstash/redis is HTTP-based and stateless — no explicit close needed
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });

    // Force shutdown after 10s if graceful close hangs
    setTimeout(() => {
      logger.error('Could not close connections in time — forceful shutdown');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;
