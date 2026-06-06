import { describe, it, expect } from 'vitest';
import { getTenantContext, withTenantFilter, withTenantCreate, isTenantResource, TenantContext } from '@/lib/auth/tenant-context';
import { AuthSession } from '@/lib/auth/types';

const mockSession: AuthSession = {
  user: {
    id: 'user-123',
    supabaseId: 'sub-123',
    email: 'user@example.com',
    name: 'Jane Doe',
    avatarUrl: null
  },
  organization: {
    id: 'org-456',
    name: 'Acme Corp',
    slug: 'acme-corp',
    domain: 'example.com',
    employeeCount: null,
    developerCount: null
  },
  membership: {
    id: 'mem-789',
    role: 'MEMBER',
    organizationId: 'org-456',
    userId: 'user-123',
    joinedAt: new Date()
  }
};

const mockTenant: TenantContext = {
  organizationId: 'org-456',
  userId: 'user-123',
  role: 'MEMBER'
};

describe('Tenant Context Helpers', () => {
  describe('getTenantContext', () => {
    it('should correctly extract tenant properties from session', () => {
      const result = getTenantContext(mockSession);
      expect(result).toEqual({
        organizationId: 'org-456',
        userId: 'user-123',
        role: 'MEMBER'
      });
    });
  });

  describe('withTenantFilter', () => {
    it('should inject organizationId into empty where object', () => {
      const result = withTenantFilter(mockTenant);
      expect(result).toEqual({
        organizationId: 'org-456'
      });
    });

    it('should merge organizationId with existing where filters', () => {
      const result = withTenantFilter(mockTenant, { status: 'COMPLETED' });
      expect(result).toEqual({
        status: 'COMPLETED',
        organizationId: 'org-456'
      });
    });
  });

  describe('withTenantCreate', () => {
    it('should merge organizationId into create data payload', () => {
      const result = withTenantCreate(mockTenant, { title: 'First Quarter Audit', totalSpend: 100 });
      expect(result).toEqual({
        title: 'First Quarter Audit',
        totalSpend: 100,
        organizationId: 'org-456'
      });
    });
  });

  describe('isTenantResource', () => {
    it('should return true if organizationId matches', () => {
      const result = isTenantResource(mockTenant, { id: 'audit-1', organizationId: 'org-456' });
      expect(result).toBe(true);
    });

    it('should return false if organizationId does not match', () => {
      const result = isTenantResource(mockTenant, { id: 'audit-1', organizationId: 'org-999' });
      expect(result).toBe(false);
    });

    it('should return false if organizationId is missing or null', () => {
      const result = isTenantResource(mockTenant, { id: 'audit-1', organizationId: null });
      expect(result).toBe(false);
    });
  });
});
