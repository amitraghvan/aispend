import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as chatPOST } from '@/app/api/copilot/chat/route';
import { POST as actionPlanPOST } from '@/app/api/copilot/action-plan/route';
import { POST as deepDivePOST } from '@/app/api/copilot/deep-dive/route';
import { POST as executivePOST } from '@/app/api/copilot/executive/route';
import { GET as conversationsGET, POST as conversationsPOST } from '@/app/api/copilot/conversations/route';
import { GET as detailGET, PATCH as detailPATCH, DELETE as detailDELETE } from '@/app/api/copilot/conversations/[id]/route';

import { getSession } from '@/lib/auth/session';
import { prismaMock } from '../setup';
import { conversationService } from '@/features/ai/services/ConversationService';
import { auditCopilotService } from '@/features/ai/services/AuditCopilotService';
import { actionPlanService } from '@/features/ai/services/ActionPlanService';
import { recommendationCopilotService } from '@/features/ai/services/RecommendationCopilotService';
import { executiveAdvisorService } from '@/features/ai/services/ExecutiveAdvisorService';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

describe('Copilot API Route Handlers', () => {
  const mockSession = {
    user: { id: 'u1', email: 'u1@company.com', name: 'User 1' },
    organization: { id: 'org-123', name: 'My Org', slug: 'my-org' },
    membership: { role: 'MEMBER' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue(mockSession as any);
  });

  describe('GET /api/copilot/conversations', () => {
    it('should list conversations for valid authorized audit owner', async () => {
      prismaMock.audit.findUnique.mockResolvedValue({
        id: 'audit-123',
        organizationId: 'org-123',
      } as any);

      vi.spyOn(conversationService, 'listConversations').mockResolvedValue([
        { id: 'c1', title: 'Convo 1' } as any,
      ]);

      const req = new NextRequest('http://localhost/api/copilot/conversations?auditId=audit-123', {
        method: 'GET',
      });

      const res = await conversationsGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe('c1');
    });

    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/copilot/conversations?auditId=audit-123', {
        method: 'GET',
      });

      const res = await conversationsGET(req);
      expect(res.status).toBe(401);
    });

    it('should return 403 if audit belongs to a different organization', async () => {
      prismaMock.audit.findUnique.mockResolvedValue({
        id: 'audit-123',
        organizationId: 'org-other',
      } as any);

      const req = new NextRequest('http://localhost/api/copilot/conversations?auditId=audit-123', {
        method: 'GET',
      });

      const res = await conversationsGET(req);
      expect(res.status).toBe(403);
    });

    it('should return 400 if auditId is missing', async () => {
      const req = new NextRequest('http://localhost/api/copilot/conversations', {
        method: 'GET',
      });

      const res = await conversationsGET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing auditId query parameter');
    });

    it('should return 404 if audit is not found', async () => {
      prismaMock.audit.findUnique.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/copilot/conversations?auditId=audit-none', {
        method: 'GET',
      });

      const res = await conversationsGET(req);
      expect(res.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      prismaMock.audit.findUnique.mockImplementation(() => {
        throw new Error('DB Connection lost');
      });

      const req = new NextRequest('http://localhost/api/copilot/conversations?auditId=audit-123', {
        method: 'GET',
      });

      const res = await conversationsGET(req);
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/copilot/conversations', () => {
    it('should start a new conversation thread', async () => {
      prismaMock.audit.findUnique.mockResolvedValue({
        id: 'audit-123',
        organizationId: 'org-123',
      } as any);

      vi.spyOn(conversationService, 'startConversation').mockResolvedValue({
        id: 'c1',
        title: 'Session X',
      } as any);

      const req = new NextRequest('http://localhost/api/copilot/conversations', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'audit-123', title: 'Session X' }),
      });

      const res = await conversationsPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe('c1');
    });

    it('should return 400 if auditId or title is missing', async () => {
      const req = new NextRequest('http://localhost/api/copilot/conversations', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'audit-123' }),
      });

      const res = await conversationsPOST(req);
      expect(res.status).toBe(400);
    });

    it('should return 404 if audit does not exist', async () => {
      prismaMock.audit.findUnique.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/copilot/conversations', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'audit-none', title: 'Session X' }),
      });

      const res = await conversationsPOST(req);
      expect(res.status).toBe(404);
    });

    it('should return 403 if audit belongs to a different tenant', async () => {
      prismaMock.audit.findUnique.mockResolvedValue({
        id: 'audit-123',
        organizationId: 'org-other',
      } as any);

      const req = new NextRequest('http://localhost/api/copilot/conversations', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'audit-123', title: 'Session X' }),
      });

      const res = await conversationsPOST(req);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/copilot/conversations/[id]', () => {
    it('should return 404 if conversation is not found', async () => {
      vi.spyOn(conversationService, 'getConversation').mockRejectedValue(new Error('Conversation not found'));

      const req = new NextRequest('http://localhost/api/copilot/conversations/c1');
      const res = await detailGET(req, { params: Promise.resolve({ id: 'c1' }) });
      expect(res.status).toBe(404);
    });

    it('should return 403 if conversation access is forbidden', async () => {
      vi.spyOn(conversationService, 'getConversation').mockRejectedValue(new Error('Forbidden'));

      const req = new NextRequest('http://localhost/api/copilot/conversations/c1');
      const res = await detailGET(req, { params: Promise.resolve({ id: 'c1' }) });
      expect(res.status).toBe(403);
    });

    it('should return conversation details with messages for authorized tenant', async () => {
      vi.spyOn(conversationService, 'getConversation').mockResolvedValue({
        id: 'c1',
        title: 'Title',
        messages: [],
      } as any);

      const req = new NextRequest('http://localhost/api/copilot/conversations/c1');
      const res = await detailGET(req, { params: Promise.resolve({ id: 'c1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe('c1');
    });
  });

  describe('PATCH /api/copilot/conversations/[id]', () => {
    it('should pin or unpin conversation thread', async () => {
      vi.spyOn(conversationService, 'pinConversation').mockResolvedValue({
        id: 'c1',
        isPinned: true,
      } as any);

      const req = new NextRequest('http://localhost/api/copilot/conversations/c1', {
        method: 'PATCH',
        body: JSON.stringify({ isPinned: true }),
      });

      const res = await detailPATCH(req, { params: Promise.resolve({ id: 'c1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.isPinned).toBe(true);
    });

    it('should return 400 if isPinned is missing from body', async () => {
      const req = new NextRequest('http://localhost/api/copilot/conversations/c1', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const res = await detailPATCH(req, { params: Promise.resolve({ id: 'c1' }) });
      expect(res.status).toBe(400);
    });

    it('should return 404 if conversation is not found', async () => {
      vi.spyOn(conversationService, 'pinConversation').mockRejectedValue(new Error('Conversation not found'));

      const req = new NextRequest('http://localhost/api/copilot/conversations/c1', {
        method: 'PATCH',
        body: JSON.stringify({ isPinned: true }),
      });

      const res = await detailPATCH(req, { params: Promise.resolve({ id: 'c1' }) });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/copilot/conversations/[id]', () => {
    it('should soft delete conversation thread', async () => {
      vi.spyOn(conversationService, 'deleteConversation').mockResolvedValue({
        id: 'c1',
      } as any);

      const req = new NextRequest('http://localhost/api/copilot/conversations/c1', {
        method: 'DELETE',
      });

      const res = await detailDELETE(req, { params: Promise.resolve({ id: 'c1' }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('should return 404 if conversation is not found', async () => {
      vi.spyOn(conversationService, 'deleteConversation').mockRejectedValue(new Error('Conversation not found'));

      const req = new NextRequest('http://localhost/api/copilot/conversations/c1', {
        method: 'DELETE',
      });

      const res = await detailDELETE(req, { params: Promise.resolve({ id: 'c1' }) });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/copilot/chat', () => {
    it('should post message and get reply response', async () => {
      vi.spyOn(auditCopilotService, 'askQuestion').mockResolvedValue({
        reply: 'Optimization steps...',
        suggestedFollowUps: [],
      });

      const req = new NextRequest('http://localhost/api/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'c1', question: 'How to save money?' }),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.reply).toContain('Optimization');
    });

    it('should return 400 if conversationId or question is missing', async () => {
      const req = new NextRequest('http://localhost/api/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({ question: 'How to save money?' }),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(400);
    });

    it('should return 404 if audit context is not found in DB', async () => {
      vi.spyOn(auditCopilotService, 'askQuestion').mockRejectedValue(new Error('Audit context not found'));

      const req = new NextRequest('http://localhost/api/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'c1', question: 'Why?' }),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(404);
    });

    it('should return 404 if conversation is not found', async () => {
      vi.spyOn(auditCopilotService, 'askQuestion').mockRejectedValue(new Error('Conversation not found or access denied'));

      const req = new NextRequest('http://localhost/api/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({ conversationId: 'c1', question: 'Why?' }),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/copilot/action-plan', () => {
    it('should generate action plan for auditId', async () => {
      vi.spyOn(actionPlanService, 'generatePlan').mockResolvedValue({
        weeks: [],
      } as any);

      const req = new NextRequest('http://localhost/api/copilot/action-plan', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'audit-123' }),
      });

      const res = await actionPlanPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.weeks).toBeDefined();
    });

    it('should return 400 if auditId is missing', async () => {
      const req = new NextRequest('http://localhost/api/copilot/action-plan', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await actionPlanPOST(req);
      expect(res.status).toBe(400);
    });

    it('should return 404 if audit is not found', async () => {
      vi.spyOn(actionPlanService, 'generatePlan').mockRejectedValue(new Error('Audit not found'));

      const req = new NextRequest('http://localhost/api/copilot/action-plan', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'audit-123' }),
      });

      const res = await actionPlanPOST(req);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/copilot/deep-dive', () => {
    it('should generate deep dive recommendations analysis', async () => {
      vi.spyOn(recommendationCopilotService, 'generateDeepDive').mockResolvedValue({
        whyItExists: 'Issue found',
        implementationGuidance: [],
      } as any);

      const req = new NextRequest('http://localhost/api/copilot/deep-dive', {
        method: 'POST',
        body: JSON.stringify({ recommendationId: 'rec-1' }),
      });

      const res = await deepDivePOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.whyItExists).toBe('Issue found');
    });

    it('should return 400 if both recommendationId and rawInput are missing', async () => {
      const req = new NextRequest('http://localhost/api/copilot/deep-dive', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await deepDivePOST(req);
      expect(res.status).toBe(400);
    });

    it('should return 404 if recommendation is not found', async () => {
      vi.spyOn(recommendationCopilotService, 'generateDeepDive').mockRejectedValue(new Error('Recommendation not found'));

      const req = new NextRequest('http://localhost/api/copilot/deep-dive', {
        method: 'POST',
        body: JSON.stringify({ recommendationId: 'rec-1' }),
      });

      const res = await deepDivePOST(req);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/copilot/executive', () => {
    it('should generate executive board brief', async () => {
      vi.spyOn(executiveAdvisorService, 'generateExecutiveAnalysis').mockResolvedValue({
        peerComparison: 'Good stance',
        executiveSummary: 'Headroom info',
      } as any);

      const req = new NextRequest('http://localhost/api/copilot/executive', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'audit-123' }),
      });

      const res = await executivePOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.peerComparison).toBe('Good stance');
    });

    it('should return 400 if auditId is missing', async () => {
      const req = new NextRequest('http://localhost/api/copilot/executive', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await executivePOST(req);
      expect(res.status).toBe(400);
    });

    it('should return 404 if audit is not found', async () => {
      vi.spyOn(executiveAdvisorService, 'generateExecutiveAnalysis').mockRejectedValue(new Error('Audit not found'));

      const req = new NextRequest('http://localhost/api/copilot/executive', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'audit-123' }),
      });

      const res = await executivePOST(req);
      expect(res.status).toBe(404);
    });
  });
});
