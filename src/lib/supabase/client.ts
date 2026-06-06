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
    // Return null — caller must handle mock mode
    return null;
  }

  _client = createBrowserClient(url, key);
  return _client;
}

/**
 * Check if Supabase is configured.
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
