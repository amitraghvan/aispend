/**
 * Next.js Middleware — Security headers, rate limiting, auth session refresh.
 *
 * Runs on the Edge Runtime for every request matching the config.
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateSupabaseSession } from '@/lib/supabase/middleware';
import { rateLimit } from '@/lib/redis/rate-limiter';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

// API routes that allow unauthenticated access
const PUBLIC_API_ROUTES = [
  '/api/leads',        // POST: lead capture (no auth needed)
  '/api/auth',         // Auth callbacks
];

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/audit',
];

function isPublicRoute(pathname: string): boolean {
  // Exact match public routes
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  // Auth callback routes
  if (pathname.startsWith('/auth/')) return true;
  // Static files
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon')) return true;
  return false;
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Rate Limiting for Auth Pages ──
  const sensitiveAuthPages = ['/login', '/signup', '/forgot-password', '/reset-password'];
  if (sensitiveAuthPages.includes(pathname)) {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const limitResult = await rateLimit(`auth_page:${pathname}:${ip}`, 10, 60);

    if (!limitResult.success) {
      const errorRes = new NextResponse(
        'Rate limit exceeded. Please try again later.',
        { status: 429 }
      );
      errorRes.headers.set('X-RateLimit-Limit', String(limitResult.limit));
      errorRes.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
      errorRes.headers.set('X-RateLimit-Reset', String(limitResult.reset));
      return errorRes;
    }
  }

  // ── 2. Supabase Session Refresh ──
  const { response, user } = await updateSupabaseSession(request);


  // ── 2. Security Headers ──
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // ── 3. Route Protection ──
  // For protected APIs, return 401 Unauthorized instead of redirecting
  if (pathname.startsWith('/api/')) {
    const isProtectedApi = [
      '/api/audit',
      '/api/audits',
      '/api/save-report',
      '/api/share/create',
      '/api/ai',
      '/api/copilot'
    ].some(prefix => pathname.startsWith(prefix));

    if (isProtectedApi && !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  // If the route is protected and no user is authenticated, redirect to login
  if (isProtectedRoute(pathname) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and hits login/signup, redirect to dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and images.
     * Using Next.js recommended pattern.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
