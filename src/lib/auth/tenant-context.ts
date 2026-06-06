/**
 * Tenant Context — Ensures all queries are scoped to the authenticated organization.
 *
 * Provides helpers to inject `organizationId` into Prisma queries.
 */

import { AuthSession } from './types';

/**
 * Tenant context extracted from a session.
 */
export interface TenantContext {
  organizationId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

/**
 * Extract tenant context from an authenticated session.
 */
export function getTenantContext(session: AuthSession): TenantContext {
  return {
    organizationId: session.organization.id,
    userId: session.user.id,
    role: session.membership.role,
  };
}

/**
 * Add tenant filter to a Prisma `where` clause.
 * Ensures queries are scoped to the authenticated organization.
 *
 * Usage:
 *   prisma.audit.findMany({
 *     where: withTenantFilter(tenant, { status: 'COMPLETED' }),
 *   });
 */
export function withTenantFilter<T extends Record<string, unknown>>(
  tenant: TenantContext,
  where: T = {} as T
): T & { organizationId: string } {
  return {
    ...where,
    organizationId: tenant.organizationId,
  };
}

/**
 * Add tenant context to a Prisma `create` data object.
 *
 * Usage:
 *   prisma.audit.create({
 *     data: withTenantCreate(tenant, { title: 'My Audit' }),
 *   });
 */
export function withTenantCreate<T extends Record<string, unknown>>(
  tenant: TenantContext,
  data: T
): T & { organizationId: string } {
  return {
    ...data,
    organizationId: tenant.organizationId,
  };
}

/**
 * Validate that a record belongs to the current tenant.
 * Returns true if the record's organizationId matches.
 */
export function isTenantResource(
  tenant: TenantContext,
  record: { organizationId?: string | null; [key: string]: any }
): boolean {
  return record.organizationId === tenant.organizationId;
}
