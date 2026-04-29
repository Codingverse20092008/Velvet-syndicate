# Deployment Guide - Velvet Syndicate

## Overview
This guide covers the complete deployment setup for the Velvet Syndicate e-commerce application with the new authentication fixes.

## Architecture
- **Frontend**: Next.js on Vercel (https://velvet-syndicate.vercel.app)
- **Backend**: Express.js on Render (https://velvet-syndicate.onrender.com)
- **Database**: Turso SQLite (cloud-hosted)
- **Cache**: Upstash Redis (optional, for session caching)

## 🔧 Fixes Implemented

### 1. Critical Authentication Fixes
- ✅ **Fixed refresh token validation**: Changed `lt()` to `gt()` in session validation
- ✅ **Implemented hybrid authentication**: Bearer token + refresh cookie approach
- ✅ **Enhanced CORS configuration**: Multiple frontend URLs supported
- ✅ **Fixed cookie settings**: Proper SameSite and Secure flags for cross-domain

### 2. Security Enhancements
- ✅ **Added rate limiting**: Global (100 req/min) + Auth endpoints (5 req/15min)
- ✅ **Enhanced request logging**: Full request/response tracking with IDs
- ✅ **Improved health checks**: Detailed system metrics and diagnostics
- ✅ **Added metrics endpoint**: Memory, CPU, and performance monitoring

### 3. Environment Configuration
- ✅ **Consolidated environment variables**: Single source of truth
- ✅ **Production CORS settings**: Proper cross-domain cookie handling
- ✅ **Enhanced error handling**: Better error responses and logging

## 🚀 Deployment Steps

### Backend (Render)

1. **Set Environment Variables on Render**:
```bash
TURSO_DATABASE_URL=libsql://velvet-syndicate-mehefuz-creates-56.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
FRONTEND_URL=https://velvet-syndicate.vercel.app
NODE_ENV=production
PORT=3001
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60
LOG_LEVEL=info
```

2. **Build Command**:
```bash
npm run build
```

3. **Start Command**:
```bash
npm start
```

### Frontend (Vercel)

1. **Set Environment Variables on Vercel**:
```bash
NEXT_PUBLIC_API_URL=https://velvet-syndicate.onrender.com
NEXT_PUBLIC_APP_URL=https://velvet-syndicate.vercel.app
```

2. **Build Settings** (already configured in `vercel.json`):
```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "cd frontend && npm install"
}
```

## 🔍 Testing Checklist

### Pre-Deployment Testing
- [ ] Authentication flow (login/signup/logout)
- [ ] Token refresh mechanism
- [ ] CORS cross-domain requests
- [ ] Rate limiting functionality
- [ ] Health check endpoints
- [ ] Error handling and logging

### Post-Deployment Testing
- [ ] Frontend loads correctly on Vercel
- [ ] Backend API responds on Render
- [ ] Database connectivity
- [ ] Authentication works across domains
- [ ] Cart functionality
- [ ] Checkout process

## 📊 Monitoring

### Health Endpoints
- **Liveness**: `GET /health` - Basic server status
- **Readiness**: `GET /ready` - Database and connectivity checks
- **Metrics**: `GET /metrics` - Performance and system metrics

### Log Monitoring
- Request ID tracking for all requests
- Structured logging with Pino
- Error tracking and alerting
- Performance metrics collection

## 🛡️ Security Features

### Authentication
- JWT access tokens (15min expiry)
- HTTP-only refresh cookies (7days)
- Hybrid auth (Bearer + cookie support)
- Session invalidation on logout

### Rate Limiting
- Global: 100 requests/minute
- Auth endpoints: 5 requests/15 minutes
- Automatic IP-based blocking
- Custom error messages

### CORS Security
- Whitelisted frontend domains
- Credential support for cookies
- Proper headers for cross-domain
- Development vs production settings

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check FRONTEND_URL environment variable
   - Verify domain whitelist in server.ts
   - Ensure credentials: true in frontend requests

2. **Authentication Failures**:
   - Verify JWT_SECRET is set and matches
   - Check cookie domain settings
   - Ensure SameSite=None in production

3. **Database Connection**:
   - Verify TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
   - Check database readiness endpoint: `/ready`
   - Monitor database latency in logs

4. **Rate Limiting**:
   - Check RATE_LIMIT_MAX and RATE_LIMIT_WINDOW settings
   - Monitor 429 responses in logs
   - Adjust limits based on traffic patterns

## 📈 Performance Optimization

### Database
- Indexed queries on frequently accessed fields
- Connection pooling with Drizzle ORM
- Redis caching for session data

### API
- Request timeout (10s) prevents hanging
- Response compression with Helmet
- Efficient error handling

### Frontend
- Next.js optimization
- Image optimization
- Code splitting and lazy loading

## 🔄 Continuous Deployment

### Automated Deployments
- Vercel auto-deploys on git push to main
- Render auto-deploys on git push to main
- Environment variables managed separately

### Rollback Strategy
- Keep previous deployment versions
- Monitor error rates post-deployment
- Quick rollback through dashboard

## 📞 Support

For deployment issues:
1. Check health endpoints first
2. Review application logs
3. Verify environment variables
4. Test authentication flow manually
5. Monitor rate limiting headers

## 🎯 Success Metrics

- Authentication success rate > 99%
- API response time < 500ms
- Error rate < 1%
- Uptime > 99.9%
- Zero security incidents
