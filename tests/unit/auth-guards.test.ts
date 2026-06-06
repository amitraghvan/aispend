import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireRole, requirePermission, requireOrg, validateOwnership, isSession } from '@/lib/auth/guards';
import { getSession } from '@/lib/auth/session';
import { AuthSession } from '@/lib/auth/types';
import { NextResponse } from 'next/server';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
  AuthError: class AuthError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 401) {
      super(message);
      this.statusCode = statusCode;
    }
  }
}));

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

describe('Auth Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return session if authenticated', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(mockSession);
      const result = await requireAuth();
      expect(isSession(result)).toBe(true);
      expect(result).toEqual(mockSession);
    });

    it('should return 401 NextResponse if not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValueOnce(null);
      const result = await requireAuth();
      expect(isSession(result)).toBe(false);
      expect((result as NextResponse).status).toBe(401);
    });
  });

  describe('requireRole', () => {
    it('should allow equal role level', () => {
      const session = { ...mockSession, membership: { ...mockSession.membership, role: 'ADMIN' as const } };
      const result = requireRole(session, 'ADMIN');
      expect(result).toBeNull();
    });

    it('should allow higher role level', () => {
      const session = { ...mockSession, membership: { ...mockSession.membership, role: 'OWNER' as const } };
      const result = requireRole(session, 'ADMIN');
      expect(result).toBeNull();
    });

    it('should deny lower role level', () => {
      const session = { ...mockSession, membership: { ...mockSession.membership, role: 'MEMBER' as const } };
      const result = requireRole(session, 'ADMIN');
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(403);
    });
  });

  describe('requirePermission', () => {
    it('should allow standard audit actions for member', () => {
      const result = requirePermission(mockSession, 'audit:create');
      expect(result).toBeNull();
    });

    it('should deny org deletion for member', () => {
      const result = requirePermission(mockSession, 'org:delete');
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(403);
    });

    it('should allow org deletion for owner', () => {
      const session = { ...mockSession, membership: { ...mockSession.membership, role: 'OWNER' as const } };
      const result = requirePermission(session, 'org:delete');
      expect(result).toBeNull();
    });
  });

  describe('requireOrg', () => {
    it('should allow access if organization matches', () => {
      const result = requireOrg(mockSession, 'org-456');
      expect(result).toBeNull();
    });

    it('should deny access if organization mismatch', () => {
      const result = requireOrg(mockSession, 'org-999');
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(403);
    });
  });

  describe('validateOwnership', () => {
    it('should allow access if resource organization matches', () => {
      const result = validateOwnership(mockSession, 'org-456');
      expect(result).toBeNull();
    });

    it('should return 404 if resource organization mismatched', () => {
      const result = validateOwnership(mockSession, 'org-999');
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(404);
    });

    it('should return 404 if resource organization is missing', () => {
      const result = validateOwnership(mockSession, null);
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(404);
    });
  });
});
