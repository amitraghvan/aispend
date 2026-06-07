/**
 * Supabase Middleware Helper — Refreshes session on every request.
 *
 * Called from Next.js middleware to keep the JWT fresh.
 * When Supabase is not configured, returns the response unchanged.
 */

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session — IMPORTANT: always use getUser(), not getSession()
  // getSession() doesn't hit the auth server and could return stale data
  const { data: { user } } = await supabase.auth.getUser();

  return { response, user };
}
