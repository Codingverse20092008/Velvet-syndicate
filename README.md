# Velvet Backend - Production E-Commerce API

## Overview

A production-grade backend system for a premium e-commerce platform built with:
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **ORM**: Drizzle ORM
- **Database**: Turso (libSQL)
- **Cache**: Redis (Upstash)
- **Auth**: JWT with access/refresh token system

## Architecture

```
lib/
├── auth.ts              # JWT token generation & validation
├── cache.ts             # Redis caching utilities
├── db.ts                # Database connection
├── env.ts               # Environment validation (Zod)
├── errors.ts            # Error classes (AppError hierarchy)
├── logger.ts            # Structured logging (Pino)
├── rbac.ts              # Role-based access control
├── rate-limit.ts        # Redis-based rate limiting
├── redis.ts             # Redis client
├── schema.ts            # Drizzle ORM schema
├── schemas.ts           # Zod validation schemas
├── security.ts          # Helmet & CORS middleware
└── services/            # Business logic (NOT in controllers)
    ├── auth.service.ts  # Authentication & sessions
    ├── cart.service.ts  # Cart operations (transactional)
    ├── order.service.ts # Order processing
    └── product.service.ts # Product catalog with caching

app/api/                  # Thin controllers (HTTP handling only)
├── auth/
│   ├── login/          # POST - Login with tokens
│   ├── logout/         # POST - Logout & revoke session
│   ├── me/             # GET - Current user
│   └── signup/         # POST - User registration
├── cart/
│   └── route.ts        # GET, POST, PATCH, DELETE
├── orders/
│   └── route.ts        # GET, POST - Order management
├── products/
│   ├── route.ts        # GET - List with filters
│   ├── [slug]/         # GET - Single product
│   └── seed/           # POST - Seed data
└── users/
    └── me/             # GET, PATCH - Profile
```

## Environment Setup

Copy `.env.example` to `.env.local`:

```bash
# Turso Database
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Redis (Upstash)
REDIS_URL=https://your-redis.upstash.io
REDIS_TOKEN=your-redis-token

# JWT
JWT_SECRET=your-super-secret-key-min-32-characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# App
NODE_ENV=development
APP_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60
```

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with role (user/admin) |
| `sessions` | Refresh token storage for session management |
| `products` | Product catalog |
| `product_sizes` | Size variants with stock |
| `cart` | User shopping carts |
| `cart_items` | Items in cart |
| `orders` | Order records |
| `order_items` | Items in orders |

### Indexes

- `users.email` (unique)
- `products.slug` (unique)
- `products.category`
- `products.featured`
- `product_sizes.product_id`
- `cart.user_id`
- `sessions.user_id`

## API Response Format

All endpoints return:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "code": null
}
```

On error:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "data": null
}
```

## Authentication

### Flow

1. **Login** (`POST /api/auth/login`):
   - Returns access token (15 min) + refresh token (7 days)
   - Tokens stored in httpOnly cookies

2. **Token Refresh** (`PUT /api/auth/login`):
   - Accepts old refresh token
   - Returns new token pair (rotation)

3. **Protected Routes**:
   - Extract token from `access_token` cookie
   - Validate JWT signature & expiry
   - Attach user to request context

## Rate Limiting

Redis-based rate limiting with configurable limits:

- Default: 100 requests per 60 seconds
- Configurable via environment variables

## Caching Strategy

| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `products:list:*` | 60s | Product list (filtered) |
| `products:featured` | 60s | Featured products |
| `product:{slug}` | 60s | Individual product |
| `cart:{userId}` | 30s | User cart |

## Error Handling

Custom error classes with status codes:

| Class | Status | Code |
|-------|--------|------|
| `AppError` | 500 | `INTERNAL_ERROR` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `ConflictError` | 409 | `CONFLICT` |
| `RateLimitError` | 429 | `RATE_LIMIT_EXCEEDED` |

## Commands

```bash
# Setup
npm run setup

# Development
npm run dev

# Database
npm run db:push      # Push schema to Turso
npm run db:generate  # Generate migrations
npm run db:studio    # Open Drizzle Studio

# Production
npm run build
npm start
```

## Security Features

- Helmet.js for security headers
- CORS with configurable origins
- Input validation with Zod
- Bcrypt password hashing (12 rounds)
- JWT token rotation
- Rate limiting
- XSS protection via input sanitization

## Transaction Support

Cart and order operations use database transactions:

```typescript
await db.transaction(async (tx) => {
  // Atomic operations
  await tx.insert(cartItems).values(...);
  await tx.update(productSizes).set({ stock: newStock }).where(...);
});
```

## Logging

Structured JSON logging with Pino:

```typescript
logger.info({ userId, orderId }, 'Order created');
logger.error({ err, userId }, 'Payment failed');
```

## TODO

- [ ] Add admin routes for product management
- [ ] Implement payment gateway integration
- [ ] Add email notifications
- [ ] Implement order status webhooks