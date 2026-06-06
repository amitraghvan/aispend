import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/redis/rate-limiter';
import { logger } from '@/lib/logger/logger';

// 1. Secure Headers Configuration
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://app.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.supabase.co https://app.posthog.com; connect-src 'self' https://*.supabase.co https://app.posthog.com https://*.sentry.io; frame-ancestors 'none'; object-src 'none';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const url = request.nextUrl;
  const method = request.method;

  // Apply Secure Headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Identify client identifier (IP fallback)
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  // 2. Rate Limiting on API Endpoints
  if (url.pathname.startsWith('/api')) {
    // Exclude healthchecks or webhook routes if necessary
    const isExcluded = url.pathname.includes('/api/health');
    
    if (!isExcluded) {
      const limitResult = await rateLimit(`ip:${ip}`, 60, 60); // 60 requests per minute
      
      response.headers.set('X-RateLimit-Limit', limitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', limitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', limitResult.reset.toString());

      if (!limitResult.success) {
        logger.security('rate_limit_blocked', 'IP rate limit exceeded', { ip, path: url.pathname });
        return new NextResponse(
          JSON.stringify({
            error: {
              message: 'Too many requests. Please try again later.',
              code: 'RATE_LIMIT_EXCEEDED',
            },
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Reset': limitResult.reset.toString(),
            },
          }
        );
      }
    }
  }

  // 3. CSRF Verification for Mutating API Requests
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  if (isMutation && url.pathname.startsWith('/api')) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    // Check if origin matches host or configured app URL
    if (origin) {
      const originUrl = new URL(origin);
      const hostUrl = host ? new URL(`${originUrl.protocol}//${host}`) : null;
      const configUrl = appUrl ? new URL(appUrl) : null;

      const matchesHost = hostUrl && originUrl.host === hostUrl.host;
      const matchesConfig = configUrl && originUrl.host === configUrl.host;

      if (!matchesHost && !matchesConfig) {
        logger.security('csrf_violation', 'Origin mismatch on API mutation request', {
          origin,
          host,
          appUrl,
          path: url.pathname,
        });
        return new NextResponse(
          JSON.stringify({
            error: {
              message: 'Forbidden. CSRF validation failed.',
              code: 'CSRF_VALIDATION_FAILED',
            },
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  return response;
}

// Apply middleware only to API and document page routes (exclude static resources/assets)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to exclude public folders like public/
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
