/**
 * Session Helper — Extracts authenticated user context from Supabase.
 *
 * In mock mode (no Supabase), returns null.
 * In production, fetches user + organization + membership from database.
 */

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { AuthSession, AuthUser, AuthOrganization, AuthMembership } from './types';

/**
 * Get the current authenticated session.
 * Returns null if not authenticated or Supabase is not configured.
 */
export async function getSession(): Promise<AuthSession | null> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    // Mock mode — no Supabase configured
    return null;
  }

  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (!supabaseUser) {
    return null;
  }

  // In a full implementation, we'd query the database for the user's
  // organization and membership. For now, construct from Supabase metadata.
  const user: AuthUser = {
    id: supabaseUser.id,
    supabaseId: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name: (supabaseUser.user_metadata?.name as string) ?? null,
    avatarUrl: (supabaseUser.user_metadata?.avatar_url as string) ?? null,
  };

  // Check for organization in user metadata (set during signup)
  const orgId = (supabaseUser.user_metadata?.organization_id as string) ?? supabaseUser.id;
  const orgName = (supabaseUser.user_metadata?.organization_name as string) ?? 'My Organization';
  const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const organization: AuthOrganization = {
    id: orgId,
    name: orgName,
    slug: orgSlug,
    domain: supabaseUser.email?.split('@')[1] ?? null,
    employeeCount: null,
    developerCount: null,
  };

  const membership: AuthMembership = {
    id: `${user.id}-${organization.id}`,
    role: (supabaseUser.user_metadata?.role as 'OWNER' | 'ADMIN' | 'MEMBER') ?? 'OWNER',
    organizationId: organization.id,
    userId: user.id,
    joinedAt: new Date(supabaseUser.created_at),
  };

  return { user, organization, membership };
}

/**
 * Get session or throw an error (for use in protected API routes).
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new AuthError('Authentication required', 401);
  }
  return session;
}

export class AuthError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}
