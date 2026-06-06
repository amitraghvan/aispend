import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as insightsPOST } from '@/app/api/ai/insights/route';
import { POST as summaryPOST } from '@/app/api/ai/executive-summary/route';
import { POST as recPOST } from '@/app/api/ai/explain-recommendation/route';
import { POST as healthPOST } from '@/app/api/ai/explain-health-score/route';
import { POST as benchmarkPOST } from '@/app/api/ai/benchmark-narrative/route';
import { POST as opportunitiesPOST } from '@/app/api/ai/opportunities/route';
import { getSession } from '@/lib/auth/session';
import { prismaMock } from '../setup';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

describe('AI CFO API Route Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const dummyInMemory = {
    totalSpend: 1500,
    optimizedSpend: 1100,
    potentialSavings: 400,
    savingsPercentage: 26.6,
    healthScore: 78,
    healthGrade: 'B',
    toolCount: 4,
    itemCount: 5,
    recommendations: [],
  };

  describe('POST /api/ai/insights', () => {
    it('should return 401 Unauthorized for organization audit without active session', async () => {
      prismaMock.audit.findUnique.mockResolvedValue({
        id: 'db-audit-1',
        organizationId: 'org-123',
      } as any);

      vi.mocked(getSession).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/ai/insights', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'db-audit-1' }),
      });

      const res = await insightsPOST(req);
      expect(res.status).toBe(401);
    });

    it('should return 403 Forbidden if user org does not match audit org', async () => {
      prismaMock.audit.findUnique.mockResolvedValue({
        id: 'db-audit-1',
        organizationId: 'org-123',
      } as any);

      vi.mocked(getSession).mockResolvedValue({
        user: { id: 'u1', email: 'u1@company.com', name: 'User 1' },
        organization: { id: 'org-other', name: 'Other Org', slug: 'other' },
        membership: { role: 'MEMBER' },
      } as any);

      const req = new NextRequest('http://localhost/api/ai/insights', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'db-audit-1' }),
      });

      const res = await insightsPOST(req);
      expect(res.status).toBe(403);
    });

    it('should allow guest users with in-memory data', async () => {
      const req = new NextRequest('http://localhost/api/ai/insights', {
        method: 'POST',
        body: JSON.stringify({ auditData: dummyInMemory }),
      });

      const res = await insightsPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.executiveSummary).toBeDefined();
    });
  });

  describe('POST /api/ai/executive-summary', () => {
    it('should calculate and return executive summary', async () => {
      const req = new NextRequest('http://localhost/api/ai/executive-summary', {
        method: 'POST',
        body: JSON.stringify({ data: dummyInMemory }),
      });

      const res = await summaryPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.summary).toBeDefined();
    });
  });

  describe('POST /api/ai/explain-recommendation', () => {
    it('should return explanation for raw recommendation data', async () => {
      const req = new NextRequest('http://localhost/api/ai/explain-recommendation', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            ruleName: 'Tool Overlap',
            category: 'overlap_elimination',
            priority: 'HIGH',
            reason: 'ChatGPT and Claude Pro overlap',
            currentState: '2 active writing tools',
            recommendedAction: 'Consolidate to ChatGPT',
            estimatedMonthlySavings: 20,
          },
        }),
      });

      const res = await recPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.whyItExists).toBeDefined();
    });
  });

  describe('POST /api/ai/explain-health-score', () => {
    it('should return explanation for health score', async () => {
      const req = new NextRequest('http://localhost/api/ai/explain-health-score', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            overallScore: 80,
            grade: 'B',
            subscores: [],
          },
        }),
      });

      const res = await healthPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.narrative).toBeDefined();
    });
  });

  describe('POST /api/ai/benchmark-narrative', () => {
    it('should return benchmark narrative', async () => {
      const req = new NextRequest('http://localhost/api/ai/benchmark-narrative', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            spendPerEmployee: 25,
            percentile: 40,
            optimizationRating: 'good',
            industryAverage: 35,
          },
        }),
      });

      const res = await benchmarkPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.positionNarrative).toBeDefined();
    });
  });

  describe('POST /api/ai/opportunities', () => {
    it('should return opportunities list from recommendations', async () => {
      const req = new NextRequest('http://localhost/api/ai/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          recommendations: [],
        }),
      });

      const res = await opportunitiesPOST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.opportunities).toBeDefined();
    });
  });

  describe('POST /api/ai/insights - error handling and bypass', () => {
    it('should return 404 Audit Not Found when auditId is not in DB', async () => {
      prismaMock.audit.findUnique.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/ai/insights', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'non-existent-id' }),
      });

      const res = await insightsPOST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Audit not found');
    });

    it('should return 400 when both auditId and auditData are missing', async () => {
      const req = new NextRequest('http://localhost/api/ai/insights', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await insightsPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing auditId or auditData');
    });

    it('should return 500 when the orchestrator fails', async () => {
      // Force failure by mocking audit findUnique but orchestrator throws
      prismaMock.audit.findUnique.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const req = new NextRequest('http://localhost/api/ai/insights', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'db-audit-1' }),
      });

      const res = await insightsPOST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Internal Server Error');
    });
  });

  describe('POST /api/ai/executive-summary - error handling', () => {
    it('should return 404 when auditId is not found', async () => {
      prismaMock.audit.findUnique.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/ai/executive-summary', {
        method: 'POST',
        body: JSON.stringify({ auditId: 'non-existent-id' }),
      });

      const res = await summaryPOST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Audit not found');
    });

    it('should return 400 when both data and auditId are missing', async () => {
      const req = new NextRequest('http://localhost/api/ai/executive-summary', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await summaryPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing summary data or auditId');
    });

    it('should return 500 when JSON parsing of body fails', async () => {
      const req = new NextRequest('http://localhost/api/ai/executive-summary', {
        method: 'POST',
        body: 'invalid-json',
      });

      const res = await summaryPOST(req);
      expect(res.status).toBe(500);
    });
  });
});
