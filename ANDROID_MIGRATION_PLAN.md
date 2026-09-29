# Velvet Syndicate — Android (React Native / Expo) Migration Plan

> **Status:** Planning Complete | **Target:** Production-ready Android App  
> **Stack:** React Native · Expo · TypeScript · React Query · Zustand  
> **Backend:** Express · Drizzle ORM · Turso (libSQL/SQLite) · BullMQ · Upstash Redis  
> **Web Frontend:** Next.js 14 App Router · Zustand · Framer Motion · Three.js  
> **Auth:** JWT (access + refresh tokens) · dual storage (SecureStore + response body)  
> **Deployment:** Backend on Render · Web frontend on Vercel · DB on Turso

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Android Readiness Assessment](#2-android-readiness-assessment)
3. [Platform Comparison & Decision](#3-platform-comparison--decision)
4. [React Native Migration Plan](#4-react-native-migration-plan)
5. [Folder Structure](#5-folder-structure)
6. [Screen Map & Priority](#6-screen-map--priority)
7. [API Integration Layer](#7-api-integration-layer)
8. [Authentication Architecture](#8-authentication-architecture)
9. [Vault & Gamification State](#9-vault--gamification-state)
10. [Push Notification System](#10-push-notification-system)
11. [Phased Development Roadmap](#11-phased-development-roadmap)
12. [Critical Context & Gotchas](#12-critical-context--gotchas)
13. [Backend Endpoints Reference](#13-backend-endpoints-reference)
14. [Database Schema Quick Reference](#14-database-schema-quick-reference)
15. [Admin Panel Migration](#15-admin-panel-migration)

---

## 1. Architecture Overview

```
┌──────────────────────┐     ┌─────────────────────────────┐
│   Android App        │────▶│   Express REST API          │
│   (React Native)     │     │   (Render)                  │
│                      │     │                             │
│  React Query ◀───────┤     │  Drizzle ORM ◀──────────────┤
│  Zustand Stores      │     │  Auth (JWT)                 │
│  SecureStore (tokens)│     │  Sessions Table             │
│  MMKV (vault cache)  │     │  CORS: multiple origins     │
└──────────────────────┘     └──────────┬──────────────────┘
                                        │
                               ┌────────▼────────┐
                               │   Turso (libSQL) │
                               │   ~40 tables     │
                               └─────────────────┘
                                        │
                               ┌────────▼────────┐
                               │  Upstash Redis   │
                               │  BullMQ Queues   │
                               └─────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Navigation | Expo Router (file-based) | Convention over config, deep linking built-in, matches Next.js mental model |
| Server State | React Query | Caching, dedup, background refetch, pagination, optimistic updates |
| Client State | Zustand | Lightweight, no boilerplate, persist middleware for vault state |
| Token Storage | expo-secure-store | Encrypted at OS level, no AsyncStorage for secrets |
| Vault Cache | MMKV | Fast synchronous reads, perfect for game state that needs instant UI |
| HTTP Client | Axios with interceptors | Interceptor queue pattern ported from `frontend/lib/api.ts` |
| Notifications | expo-notifications | Managed push, works with Expo, no native module needed |
| Animations | Lottie (react-native-lottie) | Crate opening, badge unlocks, streak effects — matches web's GSAP |

---

## 2. Android Readiness Assessment

### Backend APIs — Ready (No Changes Needed)

~30 endpoints work as-is with zero backend modifications:

| Category | Endpoints |
|---|---|
| **Auth** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/verify-otp`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| **Products** | `GET /api/products` (with filters/pagination), `GET /api/products/:slug`, `GET /api/products/featured` |
| **Cart** | `GET /api/cart`, `POST /api/cart/add`, `PUT /api/cart/update`, `DELETE /api/cart/remove`, `DELETE /api/cart` |
| **Orders** | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id` |
| **Addresses** | `GET /api/addresses`, `POST /api/addresses`, `PUT /api/addresses/:id`, `DELETE /api/addresses/:id` |
| **Wishlist** | `GET /api/wishlist`, `POST /api/wishlist`, `DELETE /api/wishlist/:id` |
| **Profile** | `GET /api/user/profile`, `PUT /api/user/profile` |
| **Vault** | `GET /api/vault/status`, `POST /api/vault/open-crate`, `POST /api/vault/claim-daily`, `GET /api/vault/leaderboard` |
| **Badges** | `GET /api/vault/badges`, `POST /api/vault/badges/:id/equip` |
| **Rewards** | `GET /api/vault/rewards`, `POST /api/vault/rewards/:id/redeem` |
| **Admin** | All CRUD endpoints for products, orders, users, vault config, crates, badges, etc. |

### Backend APIs — Changes Needed

| Endpoint | Issue | Fix Required |
|---|---|---|
| `POST /api/notifications/register-device` | **Missing** — no endpoint exists for device token registration | Create new route + `device_tokens` table |
| `GET /api/events/active` | **Missing** — events are client-side only (`eventConfig.ts`) | Create new public route returning active event config |
| `POST /api/checkout/initiate-payment` | **Missing** — online payment not implemented | Integrate Razorpay/Stripe on backend |
| `POST /api/checkout/verify-payment` | **Missing** | Payment verification webhook/handler |

### Frontend Features — Mapping to Android

| Feature | Web Location | Android Strategy | Effort | Phase |
|---|---|---|---|---|
| **Auth** (login/signup/OTP/forgot) | `frontend/app/(auth)/*` | Rebuild screens, port auth store | Medium | **P0** — Phase 1 Sprint 1-2 |
| **Product Catalog** (grid/list/search/filter) | `frontend/app/(main)/` | Rebuild with FlatList, port filters | Medium | **P0** — Phase 1 Sprint 3-4 |
| **Product Detail** (variants/sizes/images) | `frontend/app/products/[slug]` | Image gallery, variant selector | Medium | **P0** — Phase 1 Sprint 3-4 |
| **Cart** (add/update/remove/optimistic) | `frontend/store/cartStore.ts` | Port to React Query + Zustand | Medium | **P0** — Phase 1 Sprint 5-6 |
| **Checkout** (COD only) | `frontend/app/checkout/*` | Address selector, order summary | High | **P0** — Phase 1 Sprint 5-6 |
| **Order History** | `frontend/app/orders/*` | Timeline component, status badges | Medium | **P0** — Phase 1 Sprint 5-6 |
| **Wishlist** | `frontend/store/wishlistStore.ts` | React Query + optimistic toggle | Low | **P0** — Phase 1 Sprint 7-8 |
| **Profile** | `frontend/app/profile/*` | Edit profile, settings | Low | **P0** — Phase 1 Sprint 7-8 |
| **Address CRUD** | `frontend/app/addresses/*` | Form with validation | Low | **P0** — Phase 1 Sprint 7-8 |
| **Vault Dashboard** | `frontend/app/vault/*` | XP bar, level, coins, streak, stats | High | **P1** — Phase 2 Sprint 9-10 |
| **Daily Login** | `frontend/components/DailyLoginModal.tsx` | Modal with streak calendar | Medium | **P1** — Phase 2 Sprint 11 |
| **Quiz** | `frontend/app/vault/quiz/*` | Questions, timer, rewards | High | **P1** — Phase 2 Sprint 12 |
| **Crate Opening** | `frontend/app/vault/crate/*` | Lottie animation + reward reveal | High | **P1** — Phase 2 Sprint 13-14 |
| **Reward Shop** | `frontend/app/vault/shop/*` | Coin shop with coupon redemption | Medium | **P1** — Phase 2 Sprint 15 |
| **Badges** | `frontend/app/vault/badges/*` | Grid display, equip/unlock logic | Medium | **P1** — Phase 2 Sprint 16 |
| **Joto Gorom Event** | `frontend/app/events/*` | Temperature-based challenges | High | **P1** — Phase 2 Sprint 17 |
| **Push Notifications** | N/A (web doesn't have) | New feature — Expo Notifications + new backend | Medium | **P3** — Phase 3 Sprint 18-19 |
| **Online Payment** | N/A (web COD only) | New feature — Razorpay/Stripe | High | **P3** — Phase 3 Sprint 20 |
| **Admin Panel** | `frontend/app/admin/*` | Mobile-optimized admin screens | High | **P3** — Phase 3 Sprint 21-22 |
| **AR Try-On** | N/A | Native module with camera/AR | Very High | Post-MVP |

---

## 3. Platform Comparison & Decision

| Factor | WebView (PWA) | Hybrid RN/Flutter | Native Kotlin |
|---|---|---|---|
| **Dev Time** | 1–2 weeks | 8–10 weeks | 12–16 weeks |
| **UX Quality** | Poor (janky, no native feel) | Good (native components) | Best (fully native) |
| **Store Approval** | Risk (Apple rejects thin wrappers) | No issues | No issues |
| **Push Notifications** | Limited | Full (Expo) | Full (FCM) |
| **Offline Support** | Limited (Service Worker) | Good (MMKV + SQLite) | Best (Room) |
| **Performance** | Browser engine limited | Native bridge (JS) | Fully native |
| **Code Reuse (web)** | 80%+ (same codebase) | ~40% (shared logic only) | ~10% (API contracts only) |
| **Maintenance** | One codebase | Two codebases | Two+ codebases |
| **AR/ML Features** | Not possible | Possible (native modules) | Native support |
| **Team Skillset** | Next.js devs can build | RN: JS/TS devs can learn | Need Kotlin specialists |

### Decision: Hybrid React Native (Recommended)

**Rationale:**
- Fastest path to a quality Android app (8–10 weeks)
- Reuses ~40% of web business logic (Zustand stores, API patterns, vault engine)
- TypeScript shared between web and mobile
- Expo ecosystem handles push, OTA updates, builds
- Native modules available for future AR/ML features
- Can transition to Kotlin for specific screens (AR try-on) in V2/V3

---

## 4. React Native Migration Plan

### Philosophy

- **Port logic, not pixels** — Mobile has its own navigation, gesture patterns, and screen sizes
- **Shared contracts, separate implementations** — API endpoints, TypeScript types, and business logic (vault engine) are shared; UI components are rebuilt for mobile
- **React Query for server state, Zustand for client state** — Clean separation; only client-only/game state goes in Zustand
- **Server-authoritative vault with optimistic local updates** — Unlike web's client-primary vault, mobile handles multi-device users gracefully

### What to Port Directly

| Item | Source | Mobile Destination |
|---|---|---|
| TypeScript types/interfaces | `frontend/lib/types.ts`, backend schema | `src/types/*.ts` |
| API client with refresh queue | `frontend/lib/api.ts` (subscriber pattern) | `src/api/client.ts` |
| Auth store (tokens, user, login/logout) | `frontend/store/authStore.ts` | `src/store/authStore.ts` |
| Cart store (optimistic add/remove) | `frontend/store/cartStore.ts` | `src/store/cartStore.ts` |
| Vault store (XP, coins, level, streak) | `frontend/lib/vault-store.ts` | `src/lib/level-system.ts` + `src/store/vaultStore.ts` |
| Game store (seasonal events) | `frontend/store/gameStore.ts` | `src/store/gameStore.ts` |
| Event configs | `frontend/lib/eventConfig.ts` | `src/lib/event-config.ts` |
| Crate reward pools | `backend/src/services/vault.service.ts` | `src/lib/crate-engine.ts` |
| Badge definitions & detection | `frontend/lib/vault-store.ts`, `backend/...` | `src/lib/badge-definitions.ts` |
| Filter/sort logic | `frontend/lib/products.ts` | `src/lib/product-utils.ts` |
| Validation schemas | `frontend/lib/validation.ts` | `src/lib/validation.ts` |

---

## 5. Folder Structure

```
velvet-mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Root layout (providers, fonts, splash)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── verify-otp.tsx
│   │   ├── forgot-password.tsx
│   │   └── reset-password.tsx
│   ├── (main)/
│   │   ├── _layout.tsx           # Tab navigator (Home, Shop, Vault, Profile)
│   │   ├── index.tsx             # Home / Feed
│   │   ├── shop/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # Product grid / list
│   │   │   └── [slug].tsx        # Product detail
│   │   ├── search.tsx
│   │   ├── cart.tsx
│   │   ├── checkout/
│   │   │   ├── index.tsx
│   │   │   └── success.tsx
│   │   ├── orders/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── wishlist.tsx
│   │   ├── addresses/
│   │   │   ├── index.tsx
│   │   │   ├── new.tsx
│   │   │   └── [id]/edit.tsx
│   │   └── profile.tsx
│   ├── vault/
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Dashboard (XP, coins, level, streak)
│   │   ├── daily-login.tsx
│   │   ├── quiz/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── crate/
│   │   │   ├── index.tsx         # Crate selection
│   │   │   └── open.tsx          # Lottie animation + result
│   │   ├── shop.tsx              # Reward shop (coin redemption)
│   │   └── badges.tsx
│   ├── events/
│   │   └── [eventId].tsx
│   └── admin/                    # Phase 3
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── products/
│       ├── orders/
│       ├── users/
│       ├── vault/
│       └── analytics/
│
├── src/
│   ├── api/
│   │   ├── client.ts             # Axios instance + JWT interceptor + refresh queue
│   │   ├── auth.ts               # login, signup, verifyOTP, forgotPassword, resetPassword
│   │   ├── products.ts           # getProducts, getProductBySlug, getFeatured
│   │   ├── cart.ts               # getCart, addToCart, updateCart, removeFromCart
│   │   ├── orders.ts             # createOrder, getOrders, getOrderById
│   │   ├── addresses.ts          # CRUD addresses
│   │   ├── wishlist.ts           # getWishlist, toggleWishlist
│   │   ├── profile.ts            # getProfile, updateProfile
│   │   ├── vault.ts              # getVaultStatus, openCrate, claimDaily, getLeaderboard
│   │   ├── badges.ts             # getBadges, equipBadge
│   │   ├── rewards.ts            # getRewards, redeemReward
│   │   └── admin/
│   │       ├── products.ts
│   │       ├── orders.ts
│   │       ├── users.ts
│   │       ├── vault.ts
│   │       └── analytics.ts
│   │
│   ├── store/
│   │   ├── authStore.ts          # Tokens, user, login/logout actions (Zustand + persist)
│   │   ├── cartStore.ts          # Optimistic cart (Zustand + persist)
│   │   ├── vaultStore.ts         # XP, coins, level, streak, crate selections
│   │   ├── gameStore.ts          # Seasonal event state, active challenges
│   │   └── uiStore.ts            # Theme, bottom sheet state, toasts
│   │
│   ├── lib/
│   │   ├── level-system.ts       # LEVELS array, getXpForLevel, getLevelForXp
│   │   ├── crate-engine.ts       # Reward pools, weighted rarity rolls, unboxing
│   │   ├── badge-definitions.ts  # Badge catalog + detection logic
│   │   ├── event-config.ts       # Seasonal event configurations
│   │   ├── product-utils.ts      # Filter, sort, search helpers
│   │   ├── validation.ts         # Zod schemas for forms
│   │   ├── constants.ts          # API_URL, COOLDOWNS, LIMITS
│   │   └── format.ts             # Currency, date, XP formatting
│   │
│   ├── hooks/
│   │   ├── useProducts.ts        # React Query wrappers for product endpoints
│   │   ├── useCart.ts
│   │   ├── useOrders.ts
│   │   ├── useAddresses.ts
│   │   ├── useWishlist.ts
│   │   ├── useVault.ts
│   │   ├── useBadges.ts
│   │   ├── useRewards.ts
│   │   └── useNotifications.ts
│   │
│   ├── components/
│   │   ├── ui/                   # Primitive components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Chip.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── product/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductFilters.tsx
│   │   │   ├── ImageGallery.tsx
│   │   │   └── VariantSelector.tsx
│   │   ├── cart/
│   │   │   ├── CartItem.tsx
│   │   │   └── CartSummary.tsx
│   │   ├── order/
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderStatusTimeline.tsx
│   │   │   └── OrderItem.tsx
│   │   ├── vault/
│   │   │   ├── XpBar.tsx
│   │   │   ├── StreakCalendar.tsx
│   │   │   ├── LevelBadge.tsx
│   │   │   ├── CoinDisplay.tsx
│   │   │   ├── CrateCard.tsx
│   │   │   ├── CrateOpenAnimation.tsx   # Lottie
│   │   │   ├── RewardReveal.tsx
│   │   │   └── BadgeGrid.tsx
│   │   ├── quiz/
│   │   │   ├── QuizQuestion.tsx
│   │   │   ├── QuizTimer.tsx
│   │   │   └── QuizResult.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── BottomNav.tsx
│   │       └── TabBar.tsx
│   │
│   ├── providers/
│   │   ├── AuthProvider.tsx      # Auth state initializer, token restore
│   │   ├── QueryProvider.tsx     # React Query client + devtools
│   │   └── NotificationProvider.tsx
│   │
│   └── utils/
│       ├── storage.ts            # SecureStore wrapper (get/set/delete tokens)
│       ├── cache.ts              # MMKV instance for vault cache
│       └── notification.ts       # Expo Notifications helpers
│
├── assets/
│   ├── fonts/
│   ├── images/
│   ├── lottie/                   # Crate open animations, badge unlock effects
│   └── sounds/
│
├── app.json                      # Expo config (name, scheme, plugins)
├── tsconfig.json
├── package.json
├── babel.config.js
└── eas.json                      # EAS Build config (dev, preview, production)
```

---

## 6. Screen Map & Priority

### Priority Legend
- **P0** — Core e-commerce (auth, products, cart, checkout, orders) — Phase 1
- **P1** — Gamification (vault, daily login, quiz, crates, rewards, badges, events) — Phase 2
- **P3** — Enhancement (notifications, admin, payment) — Phase 3

### Screens (27 total)

| # | Screen | Route | Priority | Phase | Sprint |
|---|---|---|---|---|---|
| 1 | Login | `/(auth)/login` | P0 | 1 | 1 |
| 2 | Signup | `/(auth)/signup` | P0 | 1 | 1 |
| 3 | OTP Verification | `/(auth)/verify-otp` | P0 | 1 | 1 |
| 4 | Forgot Password | `/(auth)/forgot-password` | P0 | 1 | 1 |
| 5 | Reset Password | `/(auth)/reset-password` | P0 | 1 | 1 |
| 6 | Home / Feed | `/(main)/` | P0 | 1 | 3 |
| 7 | Shop / Product Grid | `/(main)/shop` | P0 | 1 | 3 |
| 8 | Product Detail | `/(main)/shop/[slug]` | P0 | 1 | 3 |
| 9 | Search | `/(main)/search` | P0 | 1 | 3 |
| 10 | Cart | `/(main)/cart` | P0 | 1 | 5 |
| 11 | Checkout | `/(main)/checkout` | P0 | 1 | 5 |
| 12 | Order Success | `/(main)/checkout/success` | P0 | 1 | 5 |
| 13 | Order History | `/(main)/orders` | P0 | 1 | 5 |
| 14 | Order Detail | `/(main)/orders/[id]` | P0 | 1 | 5 |
| 15 | Wishlist | `/(main)/wishlist` | P0 | 1 | 7 |
| 16 | Profile | `/(main)/profile` | P0 | 1 | 7 |
| 17 | Address List | `/(main)/addresses` | P0 | 1 | 7 |
| 18 | Add Address | `/(main)/addresses/new` | P0 | 1 | 7 |
| 19 | Edit Address | `/(main)/addresses/[id]/edit` | P0 | 1 | 7 |
| 20 | Vault Dashboard | `/vault` | P1 | 2 | 9 |
| 21 | Daily Login | `/vault/daily-login` | P1 | 2 | 11 |
| 22 | Quiz | `/vault/quiz` | P1 | 2 | 12 |
| 23 | Crate Opening | `/vault/crate` | P1 | 2 | 13 |
| 24 | Reward Shop | `/vault/shop` | P1 | 2 | 15 |
| 25 | Badges | `/vault/badges` | P1 | 2 | 16 |
| 26 | Seasonal Event | `/events/[eventId]` | P1 | 2 | 17 |
| 27 | Admin Panel | `/admin/*` (multi-screen) | P3 | 3 | 21 |

---

## 7. API Integration Layer

### Client Architecture

```
┌─────────────────────────────────────┐
│           Axios Instance             │
│  baseURL: process.env.EXPO_API_URL  │
│  timeout: 15000                      │
│  headers: { Content-Type: 'json' }   │
└────────────────┬────────────────────┘
                 │
    ┌────────────┴────────────┐
    │   Request Interceptor    │
    │  Attach Bearer token     │
    │  from SecureStore        │
    └────────────┬────────────┘
                 │
    ┌────────────┴────────────┐
    │   Response Interceptor   │
    │  On 401:                 │
    │   1. Queue failed reqs   │
    │   2. Call refresh token  │
    │   3. Retry all queued    │
    │   4. On fail: logout     │
    └────────────┬────────────┘
                 │
    ┌────────────┴────────────┐
    │   API Functions          │
    │  auth.ts, products.ts,   │
    │  cart.ts, orders.ts ...  │
    └─────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │   React Query Hooks      │
    │  useProducts, useCart,   │
    │  useVault, etc.          │
    └─────────────────────────┘
```

### Token Refresh Queue Pattern (Ported from `frontend/lib/api.ts`)

```
- isRefreshing: boolean flag
- failedQueue: Array<{ resolve, reject }>

On 401 response:
  if (!isRefreshing):
    isRefreshing = true
    try:
      newToken = await authApi.refreshToken(refreshToken)
      update SecureStore
      retry failedQueue with new token
    catch:
      clear tokens, redirect to login
    finally:
      isRefreshing = false
  else:
    add to failedQueue (wait for refresh to complete)
    retry original request with new token once resolved
```

### API Response Handling

Backend uses two response patterns — the client must handle both:

```typescript
// Pattern 1: Envelope
{ success: true, data: { ... } }

// Pattern 2: Direct data (some list endpoints)
[ { id: 1, ... }, { id: 2, ... } ]
```

Implementation approach:

```typescript
async function apiGet<T>(url: string): Promise<T> {
  const response = await client.get(url);
  // Handle both envelope and direct responses
  if (response.data && typeof response.data === 'object' && 'success' in response.data) {
    return response.data.data as T;
  }
  return response.data as T;
}
```

---

## 8. Authentication Architecture

### Token Flow

```
┌─────────────┐         ┌───────────────┐        ┌───────────┐
│  Login Form │────────▶│  POST /auth/  │───────▶│  Backend  │
│  (email/pw) │         │  login        │        │           │
└─────────────┘         └───────┬───────┘        └─────┬─────┘
                                │                      │
                                │              ┌───────▼──────┐
                                │              │ Validate     │
                                │              │ + Generate   │
                                │              │ accessToken  │
                                │              │ refreshToken  │
                                │              └───────┬──────┘
                                │                      │
                     ┌──────────▼──────────────────────▼──────┐
                     │         Response Body                   │
                     │  { accessToken, refreshToken, user }    │
                     └──────────┬─────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   SecureStore         │
                    │   set('accessToken')  │
                    │   set('refreshToken') │
                    └───────────────────────┘
```

### Store Structure (Zustand + persist)

```typescript
interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;          // true during token restore
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupPayload) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreTokens: () => Promise<void>;  // Called on app launch
  refreshAccessToken: () => Promise<string>;
}
```

### SecureStore Wrapper

```typescript
// src/utils/storage.ts
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
} as const;

export async function getToken(key: keyof typeof KEYS): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS[key]);
}

export async function setToken(key: keyof typeof KEYS, value: string): Promise<void> {
  return SecureStore.setItemAsync(KEYS[key], value);
}

export async function deleteToken(key: keyof typeof KEYS): Promise<void> {
  return SecureStore.deleteItemAsync(KEYS[key]);
}

export async function clearAllTokens(): Promise<void> {
  await Promise.all(Object.values(KEYS).map(k => SecureStore.deleteItemAsync(k)));
}
```

### App Launch Initialization

```
App Launch
  ├── Splash Screen
  ├── Restore tokens from SecureStore
  ├── If tokens exist:
  │     ├── Validate access token expiry
  │     ├── If expired: attempt refresh
  │     └── If valid: set user, navigate to main
  ├── If no tokens:
  │     └── Navigate to auth
  └── Hide splash
```

---

## 9. Vault & Gamification State

### Dual-State Architecture

```
┌──────────────────────────────────────────────────┐
│                 Vault State                       │
│                                                   │
│  ┌──────────────────┐    ┌────────────────────┐   │
│  │  Server State     │    │  Local (Optimistic) │   │
│  │  (React Query)    │    │  (Zustand + MMKV)  │   │
│  │                   │    │                     │   │
│  │  • XP total       │    │  • XP cached        │   │
│  │  • Coins balance  │    │  • Coins cached     │   │
│  │  • Level          │    │  • Level (computed) │   │
│  │  • Streak count   │    │  • Streak (cached)  │   │
│  │  • Daily claimed  │    │  • Daily claimed    │   │
│  │  • Badges owned   │    │  • Badges (cached)  │   │
│  │  • Crate inventory│    │  • Crates (cached)  │   │
│  │  • Leaderboard    │    │  • Optimistic adds  │   │
│  └──────────────────┘    └────────────────────┘   │
│                                                   │
│  Sync: On app foreground, on action, on timer     │
│  Priority: Server wins on conflict                │
└──────────────────────────────────────────────────┘
```

### Why Not Pure Client State (Like Web)?

The web vault stores everything in Zustand with localStorage persistence. For mobile:
- Users may switch devices — server must be authoritative
- Crate rewards, daily claims, quiz results are server-validated (cannot trust client)
- Local cache provides instant UI feedback while server syncs in background
- MMKV enables synchronous reads for vault display (no async flash)

### Level System (Ported from `frontend/lib/vault-store.ts`)

```typescript
// src/lib/level-system.ts
export const LEVELS = [
  { level: 1,  xpRequired: 0,    title: "Newcomer" },
  { level: 2,  xpRequired: 100,  title: "Bronze I" },
  { level: 3,  xpRequired: 250,  title: "Bronze II" },
  { level: 4,  xpRequired: 500,  title: "Silver I" },
  { level: 5,  xpRequired: 1000, title: "Silver II" },
  // ... up to level 50+
];

export function getLevelForXp(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getXpForLevel(level: number) {
  const found = LEVELS.find(l => l.level === level);
  return found?.xpRequired ?? LEVELS[LEVELS.length - 1].xpRequired;
}

export function getProgressToNextLevel(xp: number) {
  const current = getLevelForXp(xp);
  const next = LEVELS.find(l => l.level === current.level + 1);
  if (!next) return 1; // max level
  const xpInLevel = xp - current.xpRequired;
  const xpNeeded = next.xpRequired - current.xpRequired;
  return xpInLevel / xpNeeded;
}
```

### Crate Engine (Ported from `backend/src/services/vault.service.ts`)

```typescript
// src/lib/crate-engine.ts
interface CrateConfig {
  id: string;
  name: string;
  price: number;         // coins
  priceInr: number;      // INR (for paid crates)
  rarityWeights: {
    common: number;      // e.g., 50
    rare: number;        // e.g., 30
    epic: number;        // e.g., 15
    legendary: number;   // e.g., 5
  };
  rewardPool: Reward[];
}

interface Reward {
  id: string;
  type: 'xp' | 'coins' | 'coupon' | 'badge' | 'item';
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  value: number | string;  // XP amount, coin amount, coupon code, badge ID
  image?: string;
}

function rollRarity(weights: CrateConfig['rarityWeights']): Reward['rarity'] {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const roll = Math.random() * total;
  let cumulative = 0;
  for (const [rarity, weight] of Object.entries(weights)) {
    cumulative += weight as number;
    if (roll < cumulative) return rarity as Reward['rarity'];
  }
  return 'common';
}

function selectRewardFromPool(pool: Reward[], rarity: Reward['rarity']): Reward {
  const filtered = pool.filter(r => r.rarity === rarity);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export function openCrate(config: CrateConfig): Reward {
  const rarity = rollRarity(config.rarityWeights);
  return selectRewardFromPool(config.rewardPool, rarity);
}
```

### Badge Definitions (Ported from Web + Backend)

```typescript
// src/lib/badge-definitions.ts
interface Badge {
  id: string;
  name: string;
  description: string;
  category: 'vault' | 'seasonal' | 'achievement';
  icon: string;             // Lottie animation or image key
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  detectionFn: (vaultState: VaultState) => boolean;
}

const BADGES: Badge[] = [
  // Vault Badges
  {
    id: 'first_purchase',
    name: 'First Step',
    description: 'Complete your first purchase',
    category: 'vault',
    icon: 'badge_first_purchase',
    rarity: 'common',
    detectionFn: (v) => v.totalPurchases >= 1,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day login streak',
    category: 'vault',
    icon: 'badge_streak_7',
    rarity: 'rare',
    detectionFn: (v) => v.longestStreak >= 7,
  },
  {
    id: 'level_10',
    name: 'Double Digits',
    description: 'Reach level 10',
    category: 'vault',
    icon: 'badge_level_10',
    rarity: 'rare',
    detectionFn: (v) => getLevelForXp(v.xp).level >= 10,
  },
  // ... 7 vault badges + 11 seasonal badges (Joto Gorom, Monsoon, Pujo, Winter)
  // Seasonal badges follow the same pattern with date range checks
];

export function detectNewBadges(vaultState: VaultState, ownedBadgeIds: string[]): Badge[] {
  return BADGES.filter(
    badge => !ownedBadgeIds.includes(badge.id) && badge.detectionFn(vaultState)
  );
}
```

---

## 10. Push Notification System

### New Backend Endpoints Required

| Endpoint | Method | Description |
|---|---|---|
| `POST /api/notifications/register-device` | POST | Register/update device push token |
| `DELETE /api/notifications/unregister-device` | DELETE | Remove device token on logout |
| `POST /api/notifications/test` | POST | Admin: send test push to device(s) |

### New Database Table

```sql
CREATE TABLE device_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android',  -- 'android' | 'ios'
  device_info TEXT,                           -- JSON: model, OS version, app version
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE UNIQUE INDEX idx_device_tokens_token ON device_tokens(token);
```

### Notification Hooks

New hooks in backend for existing events:

| Event | When to Send | Notification Content |
|---|---|---|
| Order status change | Status updated to processing/shipped/delivered | "Your order #ORD-123 has been shipped!" |
| Daily login reminder | User hasn't claimed daily by 8pm local | "Your daily streak is waiting! 🔥" |
| Crate reward available | Free crate cooldown expired | "Your free crate is ready to open!" |
| New badge unlocked | Badge detection triggered | "You unlocked the 'Week Warrior' badge!" |
| Quiz available | Weekly quiz resets | "New quiz available — test your knowledge!" |
| Price drop (wishlist) | Product price reduced | "Price drop on Nike Air Max!" |
| Order confirmation | Order placed successfully | "Order confirmed #ORD-456" |

### Mobile Integration

```typescript
// src/utils/notification.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return token;
}
```

---

## 11. Phased Development Roadmap

### Phase 1: Core E-Commerce (Sprints 1-8)

**Sprint 1-2: Auth & Navigation**
- Expo project setup with TypeScript, Expo Router, React Query, Zustand
- SecureStore wrapper (`src/utils/storage.ts`)
- API client with JWT interceptor + refresh queue (`src/api/client.ts`)
- Auth store (`src/store/authStore.ts`)
- Auth screens: Login, Signup, OTP Verification, Forgot Password, Reset Password
- Root layout with auth check + navigation guards
- AuthProvider + QueryProvider setup

**Sprint 3-4: Product Catalog & Detail**
- Product API layer (`src/api/products.ts`)
- React Query hooks (`src/hooks/useProducts.ts`)
- ProductGrid component with FlatList + infinite scroll
- ProductCard component
- Product detail screen: ImageGallery, VariantSelector, size picker
- Search screen with debounced input
- Filter modal (category, price range, size, color)
- Constants (`src/lib/constants.ts`) — API_URL, etc.

**Sprint 5-6: Cart, Checkout & Orders**
- Cart API layer (`src/api/cart.ts`) + React Query hooks
- Optimistic cart store for instant UI (`src/store/cartStore.ts`)
- Cart screen with quantity controls, swipe-to-delete
- Checkout screen: address selector, order summary, COD confirmation
- Order success screen
- Order API layer (`src/api/orders.ts`) + hooks
- Order history + order detail with status timeline
- Format utilities (`src/lib/format.ts`)

**Sprint 7-8: Profile, Wishlist, Addresses & Polish**
- Profile screen with edit
- Address CRUD (list, add, edit, delete)
- Wishlist with optimistic toggle
- Wishlist API + hooks
- Error handling: network errors, retry, timeout
- Pull-to-refresh on all list screens
- Empty states, loading skeletons, error boundaries
- Performance profiling (FlatList optimization, image caching)

### Phase 2: Gamification (Sprints 9-17)

**Sprint 9-10: Vault Dashboard**
- Level system port (`src/lib/level-system.ts`)
- Vault API layer (`src/api/vault.ts`) + React Query hooks
- Vault store (`src/store/vaultStore.ts`) + MMKV cache
- Vault dashboard: XP progress bar, level card, coin display, streak counter, stats
- Dual-state sync (server → local on foreground, local→server on actions)
- Lottie animations for XP gain, level up

**Sprint 11: Daily Login Streaks**
- Daily login modal / screen with streak calendar
- Streak visualization (7-day calendar, fire icons, XP multipliers)
- `claimDaily` API call + cooldown enforcement
- Daily login animation (Lottie)

**Sprint 12: Quiz System**
- Quiz API (assuming existing or new `POST /api/vault/quiz/start`, `POST /api/vault/quiz/submit`)
- Quiz screen: question card, timer, progress bar
- Quiz result screen: score, XP/coin reward, share
- QuizTimer component with auto-submit on expiry

**Sprint 13-14: Crate Opening**
- Crate engine port (`src/lib/crate-engine.ts`)
- Crate selection screen (Basic vs Premium crates, prices, odds display)
- Crate opening animation (Lottie integration)
- Reward reveal card (glow effects, rarity colors)
- Crate inventory display
- Open history log

**Sprint 15: Reward Shop**
- Reward API (`src/api/rewards.ts`) + hooks
- Shop screen with coin balance, reward cards (coupons, items)
- Redemption flow with confirmation dialog
- Redemption history

**Sprint 16: Badges**
- Badge definitions + detection logic (`src/lib/badge-definitions.ts`)
- Badge API (`src/api/badges.ts`) + hooks
- Badge grid screen: all badges, owned/unowned, rarity colors
- Badge detail modal
- Equip badge functionality
- New badge unlock animation + notification

**Sprint 17: Seasonal Events**
- Event config port (`src/lib/event-config.ts`)
- Event API (new: `GET /api/events/active`)
- Event detail screen: challenges, progress, rewards, countdown
- Joto Gorom event: temperature-based multiplier, heat score, special badges
- Monsoon / Pujo / Winter event templates

### Phase 3: Enhancement (Sprints 18-22)

**Sprint 18-19: Push Notifications**
- New backend: `device_tokens` table, register/unregister/test endpoints
- Expo Notifications setup + permission handling
- Notification provider
- Notification hooks for order status, daily reminder, crate ready, badge unlock
- Deep linking from notification to relevant screen
- In-app notification preferences

**Sprint 20: Online Payment**
- Backend: Razorpay/Stripe integration
- Android: Razorpay Checkout / Stripe SDK native module
- Payment flow: initiate → redirect → verify → confirm order
- Error handling: payment failure, timeout, retry
- Payment method selector (COD vs Online) in checkout

**Sprint 21-22: Admin Mobile Panel**
- Admin navigation (limited to admin role)
- Product management: list, add, edit, delete (reuse existing API)
- Order management: list, status update, detail view
- User management: list, search, detail, ban/unban
- Vault admin: crate config, badge management, give XP/coins
- Analytics dashboard: sales chart, user growth, vault metrics
- Audit log viewer (reuses existing `admin_audit_log` table)

---

## 12. Critical Context & Gotchas

### API Response Envelope
Backend returns two patterns. The API client must handle both:
```typescript
// Pattern A (most endpoints):
{ success: true, data: { ... } }

// Pattern B (some list endpoints):
[ { id: 1, ... }, { id: 2, ... } ]
```

### JWT Tokens in Response Body
Backend returns tokens in JSON body (not just HttpOnly cookies). Android authenticates via SecureStore without needing cookie infrastructure.

### CORS is Already Configured
Backend has CORS middleware with allowed origins — mobile API requests will work with no backend changes for existing endpoints.

### Vault State: Mobile is Server-Authoritative
On web, vault state is primarily client-side (Zustand persist to localStorage). Mobile must be more server-authoritative since users may switch devices. Use local optimistic updates only for instant UI feedback; always sync with server.

### Reward Pools Are Hardcoded
Crate reward pools and probabilities are defined in both `backend/src/services/vault.service.ts` and `frontend/lib/vault-store.ts` with slight logic duplication. Mobile should consolidate into a single source of truth: `src/lib/crate-engine.ts` + `src/lib/badge-definitions.ts`.

### Event Config is Client-Only
`frontend/lib/eventConfig.ts` hardcodes all seasonal events on the client. There is **no** `GET /api/events/active` endpoint. For Phase 2, either:
- Bundle event config in the app with OTA updates (simpler, works for non-time-sensitive events)
- Or add a new backend endpoint to serve event config from DB (more flexible, required for dynamic events)

### Admin Audit Logging
Backend already tracks all admin actions in `admin_audit_log` table with action + detailed diff (JSON). Mobile admin screens in Phase 3 can reuse this with zero backend changes.

### Push Notifications Require Backend Work
Three new backend components needed:
1. `device_tokens` table + register/unregister endpoints
2. Expo Push Notification service integration (send push via Expo API)
3. Hook calls in order status change, daily reminder, etc.

### Online Payment is Not Yet Implemented
Web uses COD only. For online payment:
- Backend needs Razorpay/Stripe integration (order creation, verification webhook)
- Android needs payment SDK (Razorpay Checkout or Stripe native module)
- Plan for Phase 3, but design API contract early to avoid breaking changes

---

## 13. Backend Endpoints Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/verify-otp` | No | Verify email with OTP |
| POST | `/api/auth/forgot-password` | No | Request password reset |
| POST | `/api/auth/reset-password` | No | Reset password with token |
| POST | `/api/auth/refresh` | Refresh | Refresh access token |

### Products
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | No | List products (paginated, filtered) |
| GET | `/api/products/featured` | No | Get featured products |
| GET | `/api/products/:slug` | No | Get product by slug |
| GET | `/api/products/:slug/reviews` | No | Get product reviews |

### Cart
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/cart` | Yes | Get user's cart |
| POST | `/api/cart/add` | Yes | Add item to cart |
| PUT | `/api/cart/update` | Yes | Update cart item quantity |
| DELETE | `/api/cart/remove/:id` | Yes | Remove item from cart |
| DELETE | `/api/cart` | Yes | Clear cart |

### Orders
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/orders` | Yes | Create order |
| GET | `/api/orders` | Yes | List user's orders |
| GET | `/api/orders/:id` | Yes | Get order detail |

### Addresses
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/addresses` | Yes | List user's addresses |
| POST | `/api/addresses` | Yes | Create address |
| PUT | `/api/addresses/:id` | Yes | Update address |
| DELETE | `/api/addresses/:id` | Yes | Delete address |

### Wishlist
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/wishlist` | Yes | Get user's wishlist |
| POST | `/api/wishlist` | Yes | Add item to wishlist |
| DELETE | `/api/wishlist/:id` | Yes | Remove item from wishlist |

### Profile
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/user/profile` | Yes | Get user profile |
| PUT | `/api/user/profile` | Yes | Update user profile |
| PUT | `/api/user/change-password` | Yes | Change password |

### Vault
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/vault/status` | Yes | Get vault state (XP, coins, level, streak) |
| POST | `/api/vault/claim-daily` | Yes | Claim daily login reward |
| POST | `/api/vault/open-crate` | Yes | Open a crate (body: crateType) |
| GET | `/api/vault/leaderboard` | Yes | Get leaderboard (top users by XP) |
| GET | `/api/vault/badges` | Yes | Get user's badges |
| POST | `/api/vault/badges/:id/equip` | Yes | Equip/unequip badge |
| GET | `/api/vault/rewards` | Yes | Get available rewards in shop |
| POST | `/api/vault/rewards/:id/redeem` | Yes | Redeem a reward |

### Admin
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/products` | Admin | List all products |
| POST | `/api/admin/products` | Admin | Create product |
| PUT | `/api/admin/products/:id` | Admin | Update product |
| DELETE | `/api/admin/products/:id` | Admin | Delete product |
| GET | `/api/admin/orders` | Admin | List all orders |
| PUT | `/api/admin/orders/:id/status` | Admin | Update order status |
| GET | `/api/admin/users` | Admin | List all users |
| PUT | `/api/admin/users/:id/ban` | Admin | Ban/unban user |
| GET | `/api/admin/vault/config` | Admin | Get vault configuration |
| PUT | `/api/admin/vault/config` | Admin | Update vault configuration |
| GET | `/api/admin/vault/crates` | Admin | List crate configs |
| PUT | `/api/admin/vault/crates/:id` | Admin | Update crate config |
| GET | `/api/admin/vault/badges` | Admin | List all badges |
| POST | `/api/admin/vault/badges` | Admin | Create badge |
| POST | `/api/admin/vault/give-xp` | Admin | Give XP to user |
| POST | `/api/admin/vault/give-coins` | Admin | Give coins to user |
| GET | `/api/admin/analytics/sales` | Admin | Sales analytics |
| GET | `/api/admin/analytics/users` | Admin | User analytics |
| GET | `/api/admin/audit-log` | Admin | Get audit log entries |

---

## 14. Database Schema Quick Reference

Key tables and their relationships (full schema in `backend/src/lib/schema.ts`):

```
users
├── id, email, password_hash, name, phone
├── is_verified, is_admin, is_banned
├── xp, coins, level, total_purchases
├── streak_count, longest_streak, last_daily_claim
├── created_at, updated_at
├── sessions (has many)
├── addresses (has many)
├── orders (has many)
├── cart_items (has many)
├── wishlist_items (has many)
├── user_badges (has many)
├── device_tokens (has many)  -- NEW
└── vault_transactions (has many)

products
├── id, name, slug, description, price, compare_price
├── category_id, images (JSON array), sizes (JSON array), colors (JSON array)
├── stock, is_featured, is_active
├── created_at, updated_at
└── product_variants (has many)

orders
├── id, order_number, user_id, status
├── total, subtotal, shipping, discount
├── shipping_address_id, payment_method
├── created_at, updated_at
├── order_items (has many)
└── status_history (has many)

cart_items
├── id, user_id, product_id, variant_id
├── quantity, price
└── created_at

wishlist_items
├── id, user_id, product_id
└── created_at

addresses
├── id, user_id, label, name, phone
├── line1, line2, city, state, pincode
├── is_default, created_at, updated_at

user_badges
├── id, user_id, badge_id, is_equipped
├── unlocked_at

vault_transactions
├── id, user_id, type (xp/coins/crate/badge)
├── amount, description, reference_id
├── created_at

device_tokens  -- NEW
├── id, user_id, token, platform
├── device_info, is_active
├── created_at, updated_at

admin_audit_log
├── id, admin_id, action, entity_type
├── entity_id, details (JSON: before/after diff)
├── ip_address, created_at
```

---

## 15. Admin Panel Migration

### Admin Features by Sprint (Phase 3 - Sprint 21-22)

| Feature | Web Source | Mobile Approach | Effort |
|---|---|---|---|
| Dashboard | `frontend/app/admin/page.tsx` | KPI cards + charts (react-native-chart-kit) | Medium |
| Product CRUD | `frontend/app/admin/products/*` | FlatList + modal forms, image upload | High |
| Order Management | `frontend/app/admin/orders/*` | List + status update via dropdown/picker | Medium |
| User Management | `frontend/app/admin/users/*` | List + search + ban toggle | Medium |
| Vault Config | `frontend/app/admin/vault/*` | Form screens for crate/badge/level config | Medium |
| Analytics | `frontend/app/admin/analytics/*` | Sales chart + user growth + vault metrics | High |
| Audit Log | `frontend/app/admin/audit/*` | Scrollable log with filter by action/entity | Low |

### Backend Status
All admin endpoints already exist with proper auth guards (`requireAdmin` middleware). Audit logging already tracks all mutations. Mobile admin screens can reuse all endpoints without backend changes.

---

## Appendix: Key File References

| File | Purpose | Mobile Action |
|---|---|---|
| `backend/src/services/vault.service.ts` | Pure vault reward economy engine | Port all functions to `src/lib/vault-engine.ts` |
| `backend/src/lib/schema.ts` | Full Drizzle schema | Reference for type generation |
| `backend/src/services/wishlist.service.ts` | Raw SQL wishlist operations | API layer mirrors these endpoints |
| `frontend/lib/vault-store.ts` | Client vault logic (LEVELS, XP functions) | Port to `src/lib/level-system.ts` |
| `frontend/lib/eventConfig.ts` | Seasonal event configs | Port to `src/lib/event-config.ts` |
| `frontend/store/gameStore.ts` | 1700+ line Zustand store | Split into `vaultStore.ts` + `gameStore.ts` |
| `frontend/lib/api.ts` | API client with refresh queue | Replicate pattern in `src/api/client.ts` |
| `backend/src/routes/admin/velvet-vault.ts` | Full admin vault API (56KB) | Mobile admin reuse (no changes needed) |
| `backend/src/lib/auth.ts` | JWT gen/verify, session management | Reference for mobile token flow |
| `frontend/middleware.ts` | Next.js route protection | Guards for mobile use same route list |

---

> **Document Version:** 1.0  
> **Last Updated:** 2026-06-22  
> **Next Review:** After Phase 1 Sprint 2 completion (verify API client, auth flow, initial screens)
