import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as jose from 'jose'

const PROTECTED_ROUTES = ['/vault', '/game', '/rewards', '/leaderboards', '/quiz', '/reward-shop']

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
}

function getTokenFromRequest(request: NextRequest): string | undefined {
  const accessCookie = request.cookies.get('access_token')
  return accessCookie?.value
}

async function verifyToken(token: string): Promise<{ userId: string; role: string } | null> {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'velvet-syndicate-super-secret-jwt-key-change-in-production-please'
    )
    const { payload } = await jose.jwtVerify(token, secret)
    return { userId: payload.sub as string, role: payload.role as string }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next()
  }

  const launchDateStr =
    process.env.VELVET_VAULT_LAUNCH_DATE ||
    process.env.NEXT_PUBLIC_VELVET_VAULT_LAUNCH_DATE ||
    '2026-06-20T12:00:00+05:30'
  const launchDate = new Date(launchDateStr)
  const now = new Date()

  if (now < launchDate) {
    // Before launch: client-side VaultLaunchGuard handles access control
    return NextResponse.next()
  }

  // After launch: require authentication
  const accessCookie = request.cookies.get('access_token')
  console.log(`[Middleware] path=${pathname} cookie=${accessCookie?.value ? 'present (len=' + accessCookie.value.length + ')' : 'MISSING'}`)

  const token = getTokenFromRequest(request)
  const payload = token ? await verifyToken(token) : null

  if (payload) {
    console.log(`[Middleware] auth PASS for ${pathname} user=${payload.userId}`)
    return NextResponse.next()
  }

  console.log(`[Middleware] auth FAIL for ${pathname} - redirecting to login`)
  // Guest — redirect to login
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('redirect', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/vault/:path*',
    '/vault',
    '/game/:path*',
    '/game',
    '/rewards/:path*',
    '/rewards',
    '/leaderboards/:path*',
    '/leaderboards',
    '/quiz/:path*',
    '/quiz',
    '/reward-shop/:path*',
    '/reward-shop',
  ],
}
