import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiOrchestrator, InMemoryAuditResult } from '@/features/ai/services/AIOrchestrator';
import { cacheService } from '@/lib/cache/cache-service';
import { auditRepository } from '@/features/audit/repositories/AuditRepository';
import { trackServerEvent } from '@/lib/observability/posthog';
import * as Sentry from '@sentry/nextjs';

vi.mock('@/lib/observability/posthog', () => ({
  trackServerEvent: vi.fn(),
}));

describe('AIOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const dummyInMemory: InMemoryAuditResult = {
    totalSpend: 1500,
    optimizedSpend: 1100,
    potentialSavings: 400,
    savingsPercentage: 26.6,
    healthScore: 78,
    healthGrade: 'B',
    toolCount: 4,
    itemCount: 5,
    recommendations: [
      {
        ruleName: 'Downgrade Developer Seats',
        category: 'SEAT_OPTIMIZATION',
        priority: 'HIGH',
        reason: 'Unused seats on Copilot',
        currentState: '15 seats',
        recommendedAction: 'Reduce seats',
        estimatedMonthlySavings: 100,
      },
    ],
  };

  it('should process orchestrated insights from in-memory audit results successfully', async () => {
    const res = await aiOrchestrator.getInsights(dummyInMemory, 'org-123');
    
    expect(res.executiveSummary).toBeDefined();
    expect(res.opportunities.length).toBeGreaterThan(0);
    expect(res.healthScoreExplanation).toBeDefined();
    expect(res.benchmarkNarrative).toBeDefined();
    
    expect(trackServerEvent).toHaveBeenCalledWith(
      'org-123',
      'ai_insights_generation_success',
      expect.any(Object)
    );
  });

  it('should fetch orchestrated insights from cache on hits', async () => {
    const cachedResponse = {
      executiveSummary: { summary: 'Cached Summary', keyFindings: [], topOpportunity: '', riskLevel: 'LOW' },
      opportunities: [],
      healthScoreExplanation: { narrative: 'Cached Health', strengths: [], weaknesses: [], biggestFactors: [], improvementActions: [] },
      benchmarkNarrative: { positionNarrative: 'Cached Bench', percentileAnalysis: '', industryComparison: '', optimizationPotential: '' },
    };

    const spyGet = vi.spyOn(cacheService, 'get').mockResolvedValue(cachedResponse);

    const res = await aiOrchestrator.getInsights('db-audit-123', 'org-123');

    expect(spyGet).toHaveBeenCalledWith('ai_insights', 'db-audit-123');
    expect(res.executiveSummary.summary).toBe('Cached Summary');
    expect(trackServerEvent).toHaveBeenCalledWith(
      'org-123',
      'ai_insights_cache_hit',
      expect.any(Object)
    );
  });

  it('should generate, cache, and return insights on cache miss for DB audits', async () => {
    vi.spyOn(cacheService, 'get').mockResolvedValue(null);
    const spySet = vi.spyOn(cacheService, 'set').mockResolvedValue();

    const mockDbAudit = {
      id: 'db-audit-123',
      organizationId: 'org-123',
      status: 'COMPLETED',
      totalSpend: 2000,
      optimizedSpend: 1500,
      potentialSavings: 500,
      savingsPercentage: 25.0,
      healthScore: 82,
      healthGrade: 'B',
      toolCount: 3,
      itemCount: 4,
      createdAt: new Date(),
      recommendations: [],
      healthScoreDetails: {},
      benchmarkAnalysis: {},
    };

    vi.spyOn(auditRepository, 'findById').mockResolvedValue(mockDbAudit as any);

    const res = await aiOrchestrator.getInsights('db-audit-123', 'org-123');

    expect(res.executiveSummary).toBeDefined();
    expect(spySet).toHaveBeenCalledWith('ai_insights', 'db-audit-123', expect.any(Object), 86400);
    expect(trackServerEvent).toHaveBeenCalledWith(
      'org-123',
      'ai_insights_cache_miss',
      expect.any(Object)
    );
    expect(trackServerEvent).toHaveBeenCalledWith(
      'org-123',
      'ai_insights_generation_success',
      expect.any(Object)
    );
  });

  it('should capture exception and throw when generation fails', async () => {
    // Force fail by passing empty object that causes mapping errors
    const badInput: any = { recommendations: null };

    await expect(aiOrchestrator.getInsights(badInput, 'org-123')).rejects.toThrow();

    expect(Sentry.captureException).toHaveBeenCalled();
    expect(trackServerEvent).toHaveBeenCalledWith(
      'org-123',
      'ai_insights_generation_failed',
      expect.any(Object)
    );
  });

  it('should bypass cache when bypassCache option is set to true', async () => {
    const cachedResponse = {
      executiveSummary: { summary: 'Cached Summary', keyFindings: [], topOpportunity: '', riskLevel: 'LOW' },
      opportunities: [],
      healthScoreExplanation: { narrative: 'Cached Health', strengths: [], weaknesses: [], biggestFactors: [], improvementActions: [] },
      benchmarkNarrative: { positionNarrative: 'Cached Bench', percentileAnalysis: '', industryComparison: '', optimizationPotential: '' },
    };

    const spyGet = vi.spyOn(cacheService, 'get').mockResolvedValue(cachedResponse);
    const spySet = vi.spyOn(cacheService, 'set').mockResolvedValue();

    const mockDbAudit = {
      id: 'db-audit-123',
      organizationId: 'org-123',
      status: 'COMPLETED',
      totalSpend: 2000,
      optimizedSpend: 1500,
      potentialSavings: 500,
      savingsPercentage: 25.0,
      healthScore: 82,
      healthGrade: 'B',
      toolCount: 3,
      itemCount: 4,
      createdAt: new Date(),
      recommendations: [],
    };
    vi.spyOn(auditRepository, 'findById').mockResolvedValue(mockDbAudit as any);

    const res = await aiOrchestrator.getInsights('db-audit-123', 'org-123', true);

    expect(spyGet).not.toHaveBeenCalled();
    expect(res.executiveSummary.summary).not.toBe('Cached Summary');
    expect(spySet).toHaveBeenCalled();
  });

  it('should handle cache read error gracefully and proceed to generate insights', async () => {
    vi.spyOn(cacheService, 'get').mockRejectedValue(new Error('Redis Connection Error'));
    const spySet = vi.spyOn(cacheService, 'set').mockResolvedValue();

    const mockDbAudit = {
      id: 'db-audit-123',
      organizationId: 'org-123',
      status: 'COMPLETED',
      totalSpend: 2000,
      optimizedSpend: 1500,
      potentialSavings: 500,
      savingsPercentage: 25.0,
      healthScore: 82,
      healthGrade: 'B',
      toolCount: 3,
      itemCount: 4,
      createdAt: new Date(),
      recommendations: [],
    };
    vi.spyOn(auditRepository, 'findById').mockResolvedValue(mockDbAudit as any);

    const res = await aiOrchestrator.getInsights('db-audit-123', 'org-123');
    expect(res.executiveSummary).toBeDefined();
    expect(spySet).toHaveBeenCalled();
  });

  it('should handle cache write error gracefully and still return the generated insights', async () => {
    vi.spyOn(cacheService, 'get').mockResolvedValue(null);
    vi.spyOn(cacheService, 'set').mockRejectedValue(new Error('Redis Write Error'));

    const mockDbAudit = {
      id: 'db-audit-123',
      organizationId: 'org-123',
      status: 'COMPLETED',
      totalSpend: 2000,
      optimizedSpend: 1500,
      potentialSavings: 500,
      savingsPercentage: 25.0,
      healthScore: 82,
      healthGrade: 'B',
      toolCount: 3,
      itemCount: 4,
      createdAt: new Date(),
      recommendations: [],
    };
    vi.spyOn(auditRepository, 'findById').mockResolvedValue(mockDbAudit as any);

    const res = await aiOrchestrator.getInsights('db-audit-123', 'org-123');
    expect(res.executiveSummary).toBeDefined();
  });

  it('should format DB audit properly when healthScoreDetails and benchmarkAnalysis are null', async () => {
    vi.spyOn(cacheService, 'get').mockResolvedValue(null);
    vi.spyOn(cacheService, 'set').mockResolvedValue();

    const mockDbAudit = {
      id: 'db-audit-nulls',
      organizationId: 'org-123',
      status: 'COMPLETED',
      totalSpend: 1000,
      optimizedSpend: null,
      potentialSavings: 0,
      savingsPercentage: null,
      healthScore: null,
      healthGrade: null,
      toolCount: 2,
      itemCount: 2,
      createdAt: new Date(),
      recommendations: [],
      healthScoreDetails: null,
      benchmarkAnalysis: null,
    };
    vi.spyOn(auditRepository, 'findById').mockResolvedValue(mockDbAudit as any);

    const res = await aiOrchestrator.getInsights('db-audit-nulls', 'org-123');
    expect(res.executiveSummary).toBeDefined();
  });

  it('should format DB audit with custom recommendation values mapping when fields are null', async () => {
    vi.spyOn(cacheService, 'get').mockResolvedValue(null);

    const mockDbAudit = {
      id: 'db-audit-custom',
      organizationId: 'org-123',
      status: 'COMPLETED',
      totalSpend: 1000,
      potentialSavings: 100,
      toolCount: 2,
      itemCount: 2,
      createdAt: new Date(),
      recommendations: [
        {
          ruleName: 'Overlap',
          category: 'OVERLAP_ELIMINATION',
          priority: 'HIGH',
          reason: 'Reason',
          currentState: null,
          recommendedAction: null,
          estimatedMonthlySavings: '100',
        }
      ],
    };
    vi.spyOn(auditRepository, 'findById').mockResolvedValue(mockDbAudit as any);

    const res = await aiOrchestrator.getInsights('db-audit-custom', 'org-123');
    expect(res.executiveSummary).toBeDefined();
  });

  it('should throw an error if the requested DB audit is not found', async () => {
    vi.spyOn(auditRepository, 'findById').mockResolvedValue(null);
    await expect(aiOrchestrator.getInsights('missing-id', 'org-123')).rejects.toThrow('Audit with ID missing-id not found');
  });
});
