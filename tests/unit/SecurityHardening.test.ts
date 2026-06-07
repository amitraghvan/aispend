import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { rateLimit } from '@/lib/redis/rate-limiter';
import { prismaMock } from '../setup';

// Mock Email Service BEFORE imports
vi.mock('@/features/email/services/EmailService', () => ({
  emailService: {
    send: vi.fn().mockResolvedValue({ success: true, emailLogId: 'log-123' }),
  },
}));

// Route handlers
import { POST as chatPOST } from '@/app/api/copilot/chat/route';
import { POST as deepDivePOST } from '@/app/api/copilot/deep-dive/route';
import { POST as actionPlanPOST } from '@/app/api/copilot/action-plan/route';
import { POST as executivePOST } from '@/app/api/copilot/executive/route';
import { GET as conversationsGET, POST as conversationsPOST } from '@/app/api/copilot/conversations/route';
import { GET as conversationIdGET, PATCH as conversationIdPATCH, DELETE as conversationIdDELETE } from '@/app/api/copilot/conversations/[id]/route';
import { POST as reportSharePOST } from '@/app/api/reports/[id]/share/route';
import { GET as shareTokenGET } from '@/app/api/share/[token]/route';
import { GET as reportGet } from '@/app/api/reports/[id]/route';
import { GET as reportsList } from '@/app/api/reports/route';
import { POST as teamInvitePOST } from '@/app/api/team/invitations/route';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/redis/rate-limiter', () => ({
  rateLimit: vi.fn(),
}));

describe('Phase 6C Security Hardening & Penetration Testing', () => {
  const mockUserSession = {
    user: { id: 'u-123', email: 'user@company.com', name: 'Jane Doe' },
    organization: { id: 'org-123', name: 'Acme Corp', slug: 'acme' },
    membership: { role: 'MEMBER' },
  };

  const mockAdminSession = {
    user: { id: 'u-admin', email: 'admin@company.com', name: 'Admin User' },
    organization: { id: 'org-123', name: 'Acme Corp', slug: 'acme' },
    membership: { role: 'ADMIN' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 0 });
  });

  describe('Copilot Chat POST Validation & Rate Limiting', () => {
    it('should return 401 if unauthorized', async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'invalid-uuid', question: 'hi' }),
      });
      const res = await chatPOST(req);
      expect(res.status).toBe(401);
    });

    it('should return 400 if conversationId is empty', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({ conversationId: '', question: 'hello' }),
      });
      const res = await chatPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Validation failed');
    });

    it('should return 400 if question is empty', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'conversation-123', question: '' }),
      });
      const res = await chatPOST(req);
      expect(res.status).toBe(400);
    });

    it('should return 429 if rate limited', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      vi.mocked(rateLimit).mockResolvedValue({ success: false, limit: 30, remaining: 0, reset: 60 });
      const req = new NextRequest('http://localhost/api/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'conversation-123', question: 'hello' }),
      });
      const res = await chatPOST(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('X-RateLimit-Reset')).toBe('60');
    });
  });

  describe('Copilot Deep Dive POST Validation & Rate Limiting', () => {
    it('should return 400 if both recommendationId and rawInput are missing', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/copilot/deep-dive', {
        method: 'POST',
        body: JSON.stringify({ bypassCache: true }),
      });
      const res = await deepDivePOST(req);
      expect(res.status).toBe(400);
    });

    it('should return 400 if recommendationId is empty', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/copilot/deep-dive', {
        method: 'POST',
        body: JSON.stringify({ recommendationId: '' }),
      });
      const res = await deepDivePOST(req);
      expect(res.status).toBe(400);
    });

    it('should return 429 if rate limited', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      vi.mocked(rateLimit).mockResolvedValue({ success: false, limit: 30, remaining: 0, reset: 30 });
      const req = new NextRequest('http://localhost/api/copilot/deep-dive', {
        method: 'POST',
        body: JSON.stringify({ recommendationId: 'rec-123' }),
      });
      const res = await deepDivePOST(req);
      expect(res.status).toBe(429);
    });
  });

  describe('Copilot Action Plan POST Validation & Rate Limiting', () => {
    it('should return 400 if auditId is empty', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/copilot/action-plan', {
        method: 'POST',
        body: JSON.stringify({ auditId: '' }),
      });
      const res = await actionPlanPOST(req);
      expect(res.status).toBe(400);
    });

    it('should return 429 if rate limited', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      vi.mocked(rateLimit).mockResolvedValue({ success: false, limit: 30, remaining: 0, reset: 30 });
      const req = new NextRequest('http://localhost/api/copilot/action-plan', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'audit-123' }),
      });
      const res = await actionPlanPOST(req);
      expect(res.status).toBe(429);
    });
  });

  describe('Copilot Executive POST Validation & Rate Limiting', () => {
    it('should return 400 if auditId is empty', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/copilot/executive', {
        method: 'POST',
        body: JSON.stringify({ auditId: '' }),
      });
      const res = await executivePOST(req);
      expect(res.status).toBe(400);
    });

    it('should return 429 if rate limited', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      vi.mocked(rateLimit).mockResolvedValue({ success: false, limit: 30, remaining: 0, reset: 30 });
      const req = new NextRequest('http://localhost/api/copilot/executive', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'audit-123' }),
      });
      const res = await executivePOST(req);
      expect(res.status).toBe(429);
    });
  });

  describe('Copilot Conversations (GET & POST) Validation', () => {
    it('GET should return 400 if auditId is empty', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/copilot/conversations?auditId=');
      const res = await conversationsGET(req);
      expect(res.status).toBe(400);
    });

    it('POST should return 400 if auditId is empty', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/copilot/conversations', {
        method: 'POST',
        body: JSON.stringify({ auditId: '', title: 'Conversation' }),
      });
      const res = await conversationsPOST(req);
      expect(res.status).toBe(400);
    });

    it('POST should return 400 if title is too long', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const longTitle = 'a'.repeat(101);
      const req = new NextRequest('http://localhost/api/copilot/conversations', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'audit-123', title: longTitle }),
      });
      const res = await conversationsPOST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('Copilot Conversations [id] Route Param Validation', () => {
    it('GET should return 400 if id route param is empty', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/copilot/conversations/');
      const res = await conversationIdGET(req, { params: Promise.resolve({ id: '' }) });
      expect(res.status).toBe(400);
    });

    it('PATCH should return 400 if isPinned is missing', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/copilot/conversations/conversation-123', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      const res = await conversationIdPATCH(req, { params: Promise.resolve({ id: 'conversation-123' }) });
      expect(res.status).toBe(400);
    });

    it('DELETE should return 400 if id route param is empty', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/copilot/conversations/', {
        method: 'DELETE',
      });
      const res = await conversationIdDELETE(req, { params: Promise.resolve({ id: '' }) });
      expect(res.status).toBe(400);
    });
  });

  describe('Report Share URL POST Validation', () => {
    it('should return 400 if report ID is empty', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/reports//share', {
        method: 'POST',
      });
      const res = await reportSharePOST(req, { params: Promise.resolve({ id: '' }) });
      expect(res.status).toBe(400);
    });

    it('should return 400 if expiresInDays is invalid range', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      prismaMock.report.findFirst.mockResolvedValue({
        id: 'rep-123',
        organizationId: 'org-123',
      } as any);
      const req = new NextRequest('http://localhost/api/reports/rep-123/share', {
        method: 'POST',
        body: JSON.stringify({ expiresInDays: 500 }), // Max is 365
      });
      const res = await reportSharePOST(req, { params: Promise.resolve({ id: 'rep-123' }) });
      expect(res.status).toBe(400);
    });
  });

  describe('Public Share [token] Consumption Validation', () => {
    it('should return 400 if token format is not hex', async () => {
      const req = new NextRequest('http://localhost/api/share/not-hex-token');
      const res = await shareTokenGET(req, { params: Promise.resolve({ token: 'not-hex-token' }) });
      expect(res.status).toBe(400);
    });

    it('should return 400 if token is hex but less than 64 chars', async () => {
      const req = new NextRequest('http://localhost/api/share/1234abcd');
      const res = await shareTokenGET(req, { params: Promise.resolve({ token: '1234abcd' }) });
      expect(res.status).toBe(400);
    });
  });

  describe('Reports Pagination Query Parameter Validation', () => {
    it('GET should return 400 if page parameter is not numeric', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/reports?page=abc');
      const res = await reportsList(req);
      expect(res.status).toBe(400);
    });

    it('GET should return 400 if pageSize parameter is not numeric', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/reports?pageSize=xyz');
      const res = await reportsList(req);
      expect(res.status).toBe(400);
    });
  });

  describe('RBAC Privilege Checks on Team Invitations', () => {
    it('should return 403 Forbidden if a MEMBER role user dispatches invitations', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      const req = new NextRequest('http://localhost/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@company.com', role: 'MEMBER' }),
      });
      const res = await teamInvitePOST(req);
      expect(res.status).toBe(403);
    });

    it('should allow invitation dispatch if user is ADMIN role', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);
      prismaMock.membership.findFirst.mockResolvedValue(null);
      prismaMock.invitation.updateMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.invitation.create.mockResolvedValue({
        id: 'inv-123',
        email: 'new@company.com',
        role: 'MEMBER',
        token: '0000000000000000000000000000000000000000000000000000000000000000',
        expiresAt: new Date(),
        status: 'PENDING',
      } as any);

      // Stub global fetch to prevent email dispatch from failing the test
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'msg-123' }),
      }));

      const req = new NextRequest('http://localhost/api/team/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@company.com', role: 'MEMBER' }),
      });
      const res = await teamInvitePOST(req);
      expect(res.status).toBe(201);
    });
  });
});
