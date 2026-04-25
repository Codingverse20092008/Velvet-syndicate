# Velvet Syndicate - Production Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│  │   Browser    │  │   Mobile App   │  │   API Clients │                     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                     │
└─────────┼─────────────────┼─────────────────┼───────────────────────────────┘
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
                    ┌───────▼────────┐
                    │   CloudFlare   │
                    │   (CDN/WAF)    │
                    └───────┬────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────────────┐
│                         EDGE LAYER (Next.js/Vercel)                         │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                     Middleware Pipeline                                │  │
│  │  ┌──────────┐ → ┌──────────┐ → ┌──────────┐ → ┌──────────┐           │  │
│  │  │  CORS    │   │ Security │   │Rate Limit│   │   Auth   │           │  │
│  │  └──────────┘   └──────────┘   └──────────┘   └──────────┘           │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        API Routes (v1)                                   │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │  │
│  │  │ Products│ │  Cart   │ │ Orders  │ │  Auth   │ │  Admin  │            │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘            │  │
│  └───────┼───────────┼───────────┼───────────┼───────────┼────────────────┘  │
└──────────┼───────────┼───────────┼───────────┼───────────┼───────────────────┘
           │           │           │           │           │
┌──────────▼───────────▼───────────▼───────────▼───────────▼───────────────────┐
│                        SERVICE LAYER                                         │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                     Business Services                                   │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │  │
│  │  │   Product   │ │    Cart     │ │   Order     │ │    Auth     │      │  │
│  │  │   Service   │ │   Service   │ │   Service   │ │   Service   │      │  │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘      │  │
│  └─────────┼───────────────┼───────────────┼───────────────┼─────────────┘  │
│            │               │               │               │              │
│  ┌─────────▼───────────────▼───────────────▼───────────────▼─────────────┐  │
│  │                     Infrastructure Services                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│  │  │  Cache   │ │Rate Limit│ │   Queue  │ │  Email   │ │   Logs   │     │  │
│  │  │ (Redis)  │ │ (Redis)  │ │ (Redis)  │ │(Resend)  │ │  (Pino)  │     │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
           │               │               │               │
┌──────────▼───────────────▼───────────────▼───────────────▼───────────────────┐
│                        DATA LAYER                                            │
│                                                                              │
│  ┌─────────────────────────┐    ┌─────────────────────────┐               │
│  │      Turso (libSQL)     │    │    Upstash Redis        │               │
│  │   ┌─────────────────┐   │    │   ┌─────────────────┐   │               │
│  │   │  • Users        │   │    │   │  • Sessions     │   │               │
│  │   │  • Products     │   │    │   │  • Cache        │   │               │
│  │   │  • Orders       │   │    │   │  • Rate Limits  │   │               │
│  │   │  • Cart         │   │    │   │  • Queue        │   │               │
│  │   │  • Analytics    │   │    │   │  • Analytics    │   │               │
│  │   └─────────────────┘   │    │   └─────────────────┘   │               │
│  └─────────────────────────┘    └─────────────────────────┘               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    External Services                                    ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   ││
│  │  │   Sentry    │  │   Resend    │  │    k6       │  │  Drizzle    │   ││
│  │  │(Monitoring) │  │   (Email)   │  │(Load Test)  │  │   (ORM)     │   ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Enhanced Logging System (`lib/logger.ts`)

**Features:**
- Structured JSON logging with Pino
- Request ID tracing via AsyncLocalStorage
- Automatic sensitive data redaction (passwords, tokens)
- Request/response timing
- Child loggers with request context

**Usage:**
```typescript
import { logRequest, logResponse, generateRequestId } from '@/lib/logger';

const requestId = generateRequestId();
const { childLogger } = logRequest(req, requestId);
// ... process request
logResponse(childLogger, 200, duration);
```

### 2. Error Monitoring (`lib/monitoring.ts`)

**Features:**
- Sentry integration for error tracking
- Automatic PII sanitization before sending to Sentry
- Performance transaction tracking
- User context setting for error attribution

**Configuration:**
```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
```

### 3. Advanced Rate Limiting (`lib/rate-limiter.ts`)

**Features:**
- Sliding window algorithm via Redis
- Per-endpoint rate limits (auth, products, cart, orders)
- Dual-layer: IP-based + user-based limits
- Graceful degradation when Redis is unavailable

**Rate Limit Tiers:**
| Endpoint | Max Requests | Window |
|----------|-------------|--------|
| Auth | 10 | 60s |
| Products | 200 | 60s |
| Cart | 30 | 60s |
| Orders | 20 | 60s |
| Default | 100 | 60s |

### 4. Redis Caching (`lib/cache.ts`)

**Features:**
- Cache-first strategy for reads
- Automatic fallback to database on cache miss
- Cache invalidation on writes
- TTL-based expiration (60-120s for products)

**Cache Keys:**
- `products:list` - Product listings
- `products:featured` - Featured products
- `product:${slug}` - Individual product
- `cart:${userId}` - User carts

### 5. Database Optimization (`lib/db-monitor.ts`)

**Features:**
- Query timing with slow query detection (>100ms)
- N+1 query detection
- Batch loading utilities
- Connection health checks
- Query metrics aggregation

### 6. Job Queue (`lib/queue.ts`)

**Features:**
- Priority-based job processing
- Exponential backoff retry logic
- Dead letter queue for failed jobs
- Async job types:
  - `email.signup`
  - `email.order_confirmation`
  - `email.password_reset`
  - `analytics.track`
  - `order.process`
  - `cart.abandoned`

### 7. Email Service (`lib/email.ts`)

**Features:**
- Resend API integration
- HTML and text email templates
- Bulk email with rate limiting
- Input sanitization

**Templates:**
- Welcome email (signup)
- Order confirmation
- Password reset

### 8. Security Hardening (`lib/security.ts`)

**Features:**
- Helmet-inspired security headers
- Strict CSP policy
- CORS configuration
- CSRF token generation/validation
- Suspicious request detection
- Security audit logging

**Security Headers:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Cross-Origin-Opener-Policy: same-origin
```

### 9. API Versioning

**Structure:**
```
/api/health          → Health check
/api/v1/products     → Product API (public)
/api/v1/cart         → Cart API (authenticated)
/api/v1/orders       → Orders API (authenticated)
/api/admin/products  → Admin product management
/api/analytics       → Analytics tracking & reporting
```

### 10. Load Testing (`scripts/load-test.js`)

**Test Scenarios:**
- Load Test: Ramp to 100-200 users over 16 minutes
- Stress Test: Up to 1000 concurrent users
- Spike Test: Sudden traffic spikes
- Soak Test: 4-hour sustained load

**Run Tests:**
```bash
k6 run scripts/load-test.js
k6 run -e BASE_URL=https://api.velvetsyndicate.com scripts/load-test.js
```

## Environment Configuration

```env
# Database
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...

# Redis
REDIS_URL=https://...
REDIS_TOKEN=...
QUEUE_REDIS_URL=...
QUEUE_REDIS_TOKEN=...

# Security
JWT_SECRET=...
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_AUTH_WINDOW=60
RATE_LIMIT_PRODUCTS_MAX=200

# Monitoring
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
LOG_LEVEL=info
ENABLE_QUERY_LOGGING=true

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@velvetsyndicate.com

# App
NODE_ENV=production
APP_URL=https://velvetsyndicate.com
API_VERSION=v1
```

## Performance Optimizations

1. **Caching Strategy:**
   - 60s TTL for product listings
   - 60s TTL for individual products
   - 30s TTL for cart data
   - Stale-while-revalidate for graceful degradation

2. **Database:**
   - Indexed fields: email, slug, category, user_id
   - Query result limiting (max 100 items)
   - N+1 detection and batch loading

3. **CDN:**
   - Static assets cached at edge
   - API responses with appropriate Cache-Control headers

## Security Checklist

- [x] Helmet security headers
- [x] Strict CORS policy
- [x] CSRF protection
- [x] Rate limiting per endpoint
- [x] Input validation with Zod
- [x] SQL injection prevention (Drizzle ORM)
- [x] XSS protection (CSP headers)
- [x] Secure session cookies (HttpOnly, Secure, SameSite)
- [x] PII redaction in logs
- [x] Suspicious request detection

## Monitoring & Observability

**Health Check Endpoint:**
```
GET /api/health
Response: { status: 'healthy', services: { database, redis } }
```

**Key Metrics:**
- Request latency (p95, p99)
- Error rate
- Cache hit/miss ratio
- Database query time
- Rate limit hits
- Queue depth

**Alerting:**
- Error rate > 1%
- P95 latency > 500ms
- Database health check fails
- Redis connection lost

## Deployment

**Build:**
```bash
npm run build
```

**Environment Setup:**
```bash
cp .env.example .env.local
# Edit .env.local with production values
```

**Database Migration:**
```bash
npm run db:push
```

**Start Production:**
```bash
npm start
```
