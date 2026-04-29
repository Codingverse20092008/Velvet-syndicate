# SYSTEM AUDIT REPORT - Velvet Syndicate

Generated: April 28, 2026

=== SYSTEM OVERVIEW ===

**Tech Stack:**
- Backend: Node.js + Express + TypeScript
- Database: SQLite (Turso Cloud) with Drizzle ORM
- Frontend: Next.js 14 + TypeScript + TailwindCSS
- State Management: Zustand with persistence
- Auth: JWT tokens + HTTP-only cookies
- Deployment: Vercel (frontend) + Render (backend)
- Cache: Upstash Redis (session management)

**Architecture:**
- Monorepo structure with separate frontend/backend
- RESTful API design with Express middleware
- Cookie-based authentication for cross-domain support
- Local-first cart with server sync when authenticated
- Optimistic UI updates with error handling

**Deployment:**
- Frontend: Vercel (https://velvet-syndicate.vercel.app)
- Backend: Render (https://velvet-syndicate.onrender.com)
- Database: Turso Cloud SQLite
- Redis: Upstash (session caching)

=== AUTH FLOW ===

**Login flow:**
1. User submits email/password to `/api/auth/login`
2. Backend validates credentials against users table
3. Creates JWT access token (15min) + refresh token (7days)
4. Stores refresh token hash in sessions table
5. Sets HTTP-only cookies with tokens
6. Frontend receives user data via `/api/auth/me`

**Token/Cookie handling:**
- Access token: 15 minutes, stored in `access_token` cookie
- Refresh token: 7 days, stored in `refresh_token` cookie
- Production: `SameSite=None`, `Secure=true` for cross-domain
- Development: `SameSite=Lax`, local testing
- Both tokens are HTTP-only for security

**Middleware:**
- Express middleware validates JWT from cookies
- Request ID tracking for debugging
- CORS configured for specific frontend URL
- Request timeout (10s) prevents hanging

**Issues detected:**
- **CRITICAL**: Refresh session logic has bug - checks for expired sessions instead of valid ones
- **HIGH**: Frontend API calls use relative paths causing production failures
- **MEDIUM**: No rate limiting on auth endpoints
- **LOW**: Missing CSRF protection

=== API MAP ===

| Method | Route | Purpose | Auth Required |
|--------|-------|---------|---------------|
| POST | `/api/auth/signup` | User registration | No |
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/logout` | User logout | Yes |
| GET | `/api/auth/me` | Get current user | Yes |
| PUT | `/api/auth/refresh` | Refresh tokens | No |
| GET | `/api/products` | List products | No |
| GET | `/api/products/:slug` | Get product details | No |
| POST | `/api/cart` | Add to cart | Yes |
| GET | `/api/cart` | Get user cart | Yes |
| PATCH | `/api/cart` | Update cart quantity | Yes |
| DELETE | `/api/cart` | Remove from cart | Yes |
| POST | `/api/orders` | Create order | Yes |
| GET | `/api/orders` | Get user orders | Yes |
| GET | `/api/user/addresses` | Get addresses | Yes |
| POST | `/api/user/addresses` | Add address | Yes |
| PUT | `/api/user/addresses/:id` | Update address | Yes |
| DELETE | `/api/user/addresses/:id` | Delete address | Yes |
| GET/POST | `/api/events` | Analytics tracking | No |
| POST | `/api/feedback` | User feedback | No |
| GET/POST | `/api/admin/*` | Admin operations | Yes (admin) |

=== FRONTEND FLOW ===

**Pages:**
- `/` - Home page with product showcase
- `/auth/login` - Login page
- `/auth/signup` - Registration page
- `/product/:slug` - Product details
- `/collection` - Product listing
- `/checkout` - Checkout process
- `/orders` - Order history
- `/profile` - User profile
- `/addresses` - Address management
- `/admin/*` - Admin dashboard

**API usage:**
- Uses `apiFetch()` wrapper for all backend calls
- Credentials: 'include' for cookie transmission
- Automatic 401 handling clears user session
- Production uses absolute URLs, development uses relative

**State handling:**
- `authStore`: User authentication state
- `cartStore`: Shopping cart with local persistence
- `orderStore`: Order management
- `addressStore`: Address CRUD operations
- `adminStore`: Admin dashboard state

=== CRITICAL DEPENDENCIES ===

**External services:**
- Turso Database (SQLite cloud hosting)
- Upstash Redis (session caching)
- Vercel (frontend hosting)
- Render (backend hosting)

**Environment variables required:**

Backend:
```
TURSO_DATABASE_URL=libsql://[database-url]
TURSO_AUTH_TOKEN=[auth-token]
JWT_SECRET=[secret-key]
PORT=3001
FRONTEND_URL=[frontend-url]
NODE_ENV=development|production
```

Frontend:
```
NEXT_PUBLIC_API_URL=[backend-url]
NEXT_PUBLIC_APP_URL=[frontend-url]
```

=== ERROR PRONE AREAS ===

**Auth issues:**
1. **Refresh token bug**: Line 104 in `auth.ts` checks `lt(sessions.expiresAt, new Date())` (expired sessions) instead of `gt()` (valid sessions)
2. **Cookie domain mismatch**: Production cookies set for wrong domain
3. **CORS preflight failures**: Missing OPTIONS handling

**CORS risks:**
1. **Hardcoded frontend URL**: CORS breaks if frontend URL changes
2. **Credential mismatch**: `credentials: include` vs CORS configuration
3. **SameSite settings**: Production requires `None` for cross-domain

**State mismatch:**
1. **Cart sync timing**: Local cart updates before server sync
2. **Auth race conditions**: Multiple simultaneous auth calls
3. **Hydration issues**: Zustand persistence vs server state

**Deployment mismatch:**
1. **API URL inconsistency**: `.env.vercel.prod` has wrong backend URL
2. **Environment confusion**: Multiple env files causing conflicts
3. **Build path issues**: Vercel config points to nested frontend dir

=== EXACT BUG ROOT CAUSE ANALYSIS ===

**Why login fails:**
- **Root cause**: Refresh session validation logic inverted
- **Location**: `backend/src/lib/auth.ts:104`
- **Bug**: `lt(sessions.expiresAt, new Date())` finds expired sessions instead of valid ones
- **Impact**: Refresh tokens always rejected, forcing logout after 15min

**Why checkout fails:**
- **Root cause**: API URL configuration mismatch in production
- **Location**: Frontend uses relative paths, but backend expects absolute
- **Bug**: `apiFetch()` constructs wrong URLs in production
- **Impact**: All API calls fail with network errors

**Why data is not loading:**
- **Root cause**: CORS and credential mismatch
- **Location**: Frontend `credentials: include` vs backend CORS config
- **Bug**: SameSite cookie settings incompatible with cross-domain
- **Impact**: Cookies not sent, auth always fails

=== FIX STRATEGY (STEP BY STEP) ===

**Backend fixes:**
1. **Fix refresh token validation** (CRITICAL):
   ```typescript
   // In auth.ts line 104, change:
   lt(sessions.expiresAt, new Date().toISOString())
   // To:
   gt(sessions.expiresAt, new Date().toISOString())
   ```

2. **Fix CORS configuration**:
   ```typescript
   // In server.ts line 44-48:
   cors({
     origin: [env.FRONTEND_URL, 'https://velvet-syndicate.vercel.app'],
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
   })
   ```

3. **Add rate limiting to auth endpoints**:
   ```typescript
   import rateLimit from 'express-rate-limit';
   const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 5 });
   app.use('/api/auth/login', authLimiter);
   app.use('/api/auth/signup', authLimiter);
   ```

**Frontend fixes:**
1. **Fix API URL construction**:
   ```typescript
   // In lib/api.ts line 7:
   const url = API_URL ? `${API_URL}/api${path}` : `/api${path}`;
   ```

2. **Update environment configuration**:
   ```bash
   # Set correct production backend URL
   NEXT_PUBLIC_API_URL=https://velvet-syndicate.onrender.com
   ```

3. **Fix cookie domain settings**:
   ```typescript
   // In auth.ts line 210, 223:
   sameSite: isProduction ? 'none' : 'lax'
   ```

**Deployment fixes:**
1. **Update Vercel configuration**:
   ```json
   {
     "version": 2,
     "buildCommand": "cd frontend && npm run build",
     "outputDirectory": "frontend/.next",
     "env": {
       "NEXT_PUBLIC_API_URL": "https://velvet-syndicate.onrender.com"
     }
   }
   ```

2. **Consolidate environment variables**:
   - Remove conflicting `.env.vercel.prod`
   - Use single source of truth for production URLs

3. **Add health checks**:
   - Backend `/health` endpoint for monitoring
   - Frontend error boundaries for graceful failures

**Priority order:**
1. Fix refresh token validation (blocks all auth)
2. Fix API URL construction (blocks all production calls)
3. Update CORS configuration (enables cross-domain)
4. Consolidate environment configs (prevents future conflicts)
5. Add rate limiting (security improvement)
6. Add monitoring/logging (operational improvement)

**Testing verification:**
1. Test login flow end-to-end
2. Test cart operations with authentication
3. Test checkout process
4. Verify cross-domain cookie handling
5. Load test with multiple users
6. Test admin panel functionality

This analysis reveals that the core issues are configuration and logic bugs rather than architectural problems. The system design is solid but requires precise fixes for production deployment.
