/**
 * Auth Types — Shared type definitions for the auth system.
 */

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface AuthUser {
  id: string;
  supabaseId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  employeeCount: number | null;
  developerCount: number | null;
}

export interface AuthMembership {
  id: string;
  role: OrgRole;
  organizationId: string;
  userId: string;
  joinedAt: Date;
}

export interface AuthSession {
  user: AuthUser;
  organization: AuthOrganization;
  membership: AuthMembership;
}

/**
 * Permission matrix for RBAC enforcement.
 */
export const PERMISSIONS: Record<string, OrgRole[]> = {
  // Organization management
  'org:delete': ['OWNER'],
  'org:update': ['OWNER', 'ADMIN'],
  'org:billing': ['OWNER'],

  // Member management
  'member:invite': ['OWNER', 'ADMIN'],
  'member:remove': ['OWNER', 'ADMIN'],
  'member:update_role': ['OWNER'],
  'member:list': ['OWNER', 'ADMIN', 'MEMBER'],

  // Audit management
  'audit:create': ['OWNER', 'ADMIN', 'MEMBER'],
  'audit:read': ['OWNER', 'ADMIN', 'MEMBER'],
  'audit:delete': ['OWNER', 'ADMIN'],

  // Report management
  'report:create': ['OWNER', 'ADMIN', 'MEMBER'],
  'report:read': ['OWNER', 'ADMIN', 'MEMBER'],
  'report:share': ['OWNER', 'ADMIN', 'MEMBER'],

  // Settings
  'settings:read': ['OWNER', 'ADMIN', 'MEMBER'],
  'settings:update': ['OWNER', 'ADMIN'],
};

/**
 * Check if a role has permission for a given action.
 */
export function hasPermission(role: OrgRole, action: string): boolean {
  const allowed = PERMISSIONS[action];
  if (!allowed) return false;
  return allowed.includes(role);
}
