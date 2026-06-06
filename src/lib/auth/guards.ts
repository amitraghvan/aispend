/**
 * Authorization Guards — Enforce RBAC and tenant isolation on API routes.
 *
 * Usage in route handlers:
 *   const session = await requireAuth();
 *   await requireRole(session, 'ADMIN');
 *   await requireOrg(session, params.orgId);
 */

import { NextResponse } from 'next/server';
import { AuthSession, OrgRole, hasPermission } from './types';
import { getSession, AuthError } from './session';

/**
 * Require authentication. Returns session or 401 response.
 */
export async function requireAuth(): Promise<AuthSession | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );
  }
  return session;
}

/**
 * Check if the result of requireAuth is a session (not an error response).
 */
export function isSession(result: AuthSession | NextResponse): result is AuthSession {
  return !('status' in result);
}

/**
 * Require a minimum role. Returns 403 if insufficient.
 */
export function requireRole(session: AuthSession, minimumRole: OrgRole): NextResponse | null {
  const roleHierarchy: Record<OrgRole, number> = {
    MEMBER: 0,
    ADMIN: 1,
    OWNER: 2,
  };

  const userLevel = roleHierarchy[session.membership.role];
  const requiredLevel = roleHierarchy[minimumRole];

  if (userLevel < requiredLevel) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Requires ${minimumRole} role or higher`,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 403 }
    );
  }

  return null; // Access granted
}

/**
 * Require a specific permission.
 */
export function requirePermission(session: AuthSession, action: string): NextResponse | null {
  if (!hasPermission(session.membership.role, action)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Missing permission: ${action}`,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Require that the session's organization matches the requested org ID.
 * Prevents cross-tenant access.
 */
export function requireOrg(session: AuthSession, organizationId: string): NextResponse | null {
  if (session.organization.id !== organizationId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this organization',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Validate that a resource belongs to the authenticated organization.
 * Used after fetching a resource to confirm tenant ownership.
 */
export function validateOwnership(
  session: AuthSession,
  resourceOrgId: string | null | undefined
): NextResponse | null {
  if (!resourceOrgId || resourceOrgId !== session.organization.id) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 404 }
    );
  }
  return null;
}
