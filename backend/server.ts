// Velvet Syndicate Backend Server - Protected Digital Assets Active
import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import path from 'path';
import { globalLimiter, authLimiter } from './src/middleware/rate-limiter';
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
import reviewsRoutes from './src/routes/reviews';
import setupReviewsRoutes from './src/routes/setup-reviews';
import { runReconciliation } from './src/services/reconciliation.service';
import { sendAlert } from './src/lib/alerts';
import { orderQueue } from './src/lib/queue';
import adminRoutes from './src/routes/admin';
import { dbClient } from './src/lib/db';
import { redis } from './src/lib/redis';
import { logger } from './src/lib/logger';
import { fakeReviewScheduler } from './src/scripts/fake-review-scheduler';
import { quizScheduler } from './src/scripts/quiz-scheduler';
import quizRoutes from './src/routes/quiz';
import vaultRoutes from './src/routes/vault';
import vaultWaitlistRoutes from './src/routes/vault-waitlist';
import challengesRoutes from './src/routes/challenges';
import wishlistRoutes from './src/routes/wishlist';
import { vaultLaunchGuard } from './src/lib/vault-launch';
import quizPackRoutes from './src/routes/quiz-packs';
import aiRoutes from './src/routes/ai';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (required for Render and secure cookies)
app.set('trust proxy', 1);

import { requestContext } from './src/lib/context';

// ─── CORS MUST BE FIRST ─────────────────────────────────────────────────────
// Applied before helmet, rate-limiters, and all other middleware so that
// preflight OPTIONS requests always receive proper CORS headers.
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://velvet-syndicate.vercel.app',
  'https://velvet-syndicate-frontend.vercel.app',
  'https://www.velvetsyndicate.shop',
  'https://velvetsyndicate.shop',
  process.env.FRONTEND_URL || '',
  env.FRONTEND_URL || '',
].filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (requestOrigin, callback) => {
    if (!requestOrigin) return callback(null, true);
    if (
      allowedOrigins.includes(requestOrigin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Request-Id', 'Set-Cookie'],
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests explicitly
app.options('*', cors(corsOptions));

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
const BACKEND_URL = process.env.BACKEND_URL || 'https://velvet-syndicate.onrender.com'
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", BACKEND_URL, 'https://velvet-syndicate.onrender.com', 'http://localhost:3001'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://velvet-syndicate.onrender.com'],
      fontSrc: ["'self'", 'https:', 'data:'],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// CORS is already applied at the top of the middleware stack (before helmet/rate-limiters)
// so we do NOT re-apply it here. See the CORS_ORIGINS block above.

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

// Root & Health Check Endpoints
app.get(['/', '/health'], (req: Request, res: Response) => {
  if (req.accepts('html')) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Velvet Syndicate API</title>
  <style>
    body {
      background-color: #080808;
      color: #E2DFD8;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #111111;
      border: 1px solid #222222;
      border-radius: 12px;
      padding: 36px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 9999px;
      padding: 4px 14px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 20px;
    }
    .badge::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      display: inline-block;
    }
    h1 {
      font-size: 22px;
      letter-spacing: 0.15em;
      margin: 0 0 10px 0;
      color: #C9A961;
      font-weight: 600;
    }
    p {
      color: #8E8D8A;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .btn {
      display: inline-block;
      background: #C9A961;
      color: #080808;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      letter-spacing: 0.05em;
      transition: opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">API Status: Healthy</div>
    <h1>VELVET SYNDICATE API</h1>
    <p>The backend server is running smoothly on port 3001. To browse the luxury storefront, open the frontend application on port 3000.</p>
    <a href="http://localhost:3000" class="btn">Open Velvet Storefront &rarr;</a>
  </div>
</body>
</html>`);
  }

  return res.json({
    name: 'Velvet Syndicate API',
    status: 'online',
    port: PORT,
    environment: env.NODE_ENV,
    frontend: 'http://localhost:3000',
    timestamp: new Date().toISOString(),
  });
});

// API Routes - Apply stricter rate limiting to auth endpoints
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user/addresses', addressRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/setup-reviews', setupReviewsRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/vault', vaultLaunchGuard, vaultRoutes);
app.use('/api/vault/waitlist', vaultWaitlistRoutes);
// app.use('/api/quiz-packs', quizPackRoutes); // DEPRECATED: Old quiz packs unmounted for Syndicate VIP pivot
app.use('/api/challenges', challengesRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/ai', aiRoutes);

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

  // 3. Fake Review Scheduler (Start once)
  try {
    fakeReviewScheduler.start();
    logger.info('Fake review scheduler started');
  } catch (err) {
    logger.error({ err }, 'Failed to start fake review scheduler');
  }

  // 4. Quiz Scheduler (Decommissioned for Syndicate VIP pivot)
  /*
  try {
    quizScheduler.start();
    logger.info('Daily quiz scheduler started — 500 quizzes generated at 5:00 AM');
  } catch (err) {
    logger.error({ err }, 'Failed to start daily quiz scheduler');
  }
  */

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
