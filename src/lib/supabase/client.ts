/**
 * Supabase Browser Client — used in Client Components.
 *
 * Uses `createBrowserClient` from @supabase/ssr for cookie-based session.
 * Falls back to a no-op mock when Supabase credentials are not configured.
 */

import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }

  _client = createBrowserClient(url, key);
  return _client;
}

/**
 * Check if Supabase is configured.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }
  return true;
}
