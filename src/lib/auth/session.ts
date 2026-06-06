/**
 * Session Helper — Extracts authenticated user context from Supabase.
 *
 * In mock mode (no Supabase), returns null.
 * In production, fetches user + organization + membership from database.
 */

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { AuthSession, AuthUser, AuthOrganization, AuthMembership } from './types';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/features/email/services/EmailService';

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

  // 1. Fetch user from DB by supabaseId or email
  let dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { supabaseId: supabaseUser.id },
        { email: supabaseUser.email ?? '' }
      ]
    },
    include: {
      memberships: {
        where: { deletedAt: null },
        include: { organization: true }
      }
    }
  });

  // 2. If user doesn't exist in the database, provision them dynamically!
  if (!dbUser) {
    const orgName = (supabaseUser.user_metadata?.organization_name as string) ?? 'My Organization';
    const orgSlug = (supabaseUser.user_metadata?.organization_slug as string) ?? orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const userRole = (supabaseUser.user_metadata?.role as 'OWNER' | 'ADMIN' | 'MEMBER') ?? 'OWNER';

    dbUser = await prisma.$transaction(async (tx) => {
      // Create user
      const createdUser = await tx.user.create({
        data: {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email ?? '',
          name: (supabaseUser.user_metadata?.name as string) ?? null,
          avatarUrl: (supabaseUser.user_metadata?.avatar_url as string) ?? null,
        }
      });

      // Find or create organization
      let org = await tx.organization.findUnique({
        where: { slug: orgSlug }
      });
      if (!org) {
        org = await tx.organization.create({
          data: {
            name: orgName,
            slug: orgSlug,
            domain: supabaseUser.email?.split('@')[1] ?? null,
          }
        });
      }

      // Create membership
      const membership = await tx.membership.create({
        data: {
          userId: createdUser.id,
          organizationId: org.id,
          role: userRole,
        },
        include: { organization: true }
      });

      return {
        ...createdUser,
        memberships: [membership]
      };
    });

    // Trigger Welcome Email
    emailService.send({
      to: dbUser.email,
      template: 'welcome_email',
      data: {
        name: dbUser.name ?? dbUser.email.split('@')[0],
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/audit`
      }
    }).catch((err) => {
      console.error('Failed to send welcome email on auto-provisioning:', err);
    });
  } else if (dbUser.supabaseId !== supabaseUser.id) {
    // Sync supabaseId if different
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { supabaseId: supabaseUser.id },
      include: {
        memberships: {
          where: { deletedAt: null },
          include: { organization: true }
        }
      }
    });
  }

  // Get active membership
  const activeMembership = dbUser.memberships[0];
  if (!activeMembership) {
    return null;
  }

  const user: AuthUser = {
    id: dbUser.id,
    supabaseId: dbUser.supabaseId,
    email: dbUser.email,
    name: dbUser.name,
    avatarUrl: dbUser.avatarUrl,
  };

  const organization: AuthOrganization = {
    id: activeMembership.organization.id,
    name: activeMembership.organization.name,
    slug: activeMembership.organization.slug,
    domain: activeMembership.organization.domain,
    employeeCount: activeMembership.organization.employeeCount,
    developerCount: activeMembership.organization.developerCount,
  };

  const membership: AuthMembership = {
    id: activeMembership.id,
    role: activeMembership.role,
    organizationId: activeMembership.organizationId,
    userId: activeMembership.userId,
    joinedAt: activeMembership.joinedAt,
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
