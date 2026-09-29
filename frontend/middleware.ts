import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_ROUTES = [
  '/admin',
  '/profile',
  '/orders',
  '/wishlist',
  '/vault',
  '/rewards',
  '/leaderboards',
  '/quiz'
]

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next()
  }

  // Check existing authenticated user session
  const accessCookie = request.cookies.get('access_token')

  if (accessCookie?.value) {
    // If authenticated: Allow access.
    return NextResponse.next()
  }

  console.log(`[Middleware] auth FAIL for ${pathname} - redirecting to login`)
  
  // If unauthenticated: Redirect to /login and pass redirect intent.
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('redirect', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/admin',
    '/profile/:path*',
    '/profile',
    '/orders/:path*',
    '/orders',
    '/wishlist/:path*',
    '/wishlist',
    '/vault/:path*',
    '/vault',
    '/rewards/:path*',
    '/rewards',
    '/leaderboards/:path*',
    '/leaderboards',
    '/quiz/:path*',
    '/quiz',
  ],
}
