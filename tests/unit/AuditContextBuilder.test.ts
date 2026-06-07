import { describe, it, expect } from 'vitest';
import { AuditContextBuilder, AuditWithRelations } from '@/features/ai/services/AuditContextBuilder';

describe('AuditContextBuilder', () => {
  const mockAudit: AuditWithRelations = {
    id: 'audit-12345678-abcd-ef01-2345-6789abcdef01',
    organizationId: 'org-123',
    status: 'COMPLETED',
    totalSpend: 1500 as any,
    optimizedSpend: 1200 as any,
    potentialSavings: 300 as any,
    savingsPercentage: 20 as any,
    healthScore: 85,
    healthGrade: 'B',
    toolCount: 4,
    itemCount: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    overlapAnalysis: {} as any,
    periodStart: new Date(),
    periodEnd: new Date(),
    completedAt: new Date(),
    healthScoreDetails: {
      subscores: [
        { name: 'Plan Fit', score: 90, weight: 0.4, explanation: 'Excellent plan alignment' },
        { name: 'Overlaps', score: 80, weight: 0.6, explanation: 'Minor tool redundancies' },
      ],
    } as any,
    benchmarkAnalysis: {
      spendPerEmployee: 45,
      percentile: 65,
      optimizationRating: 'above average',
      industryAverage: 50,
    } as any,
    items: [
      {
        id: 'item-1',
        auditId: 'audit-123',
        toolId: 'tool-gpt',
        toolName: 'ChatGPT Plus',
        planName: 'Team',
        spendAmount: 250 as any,
        seatCount: 10,
        teamSize: 10,
        useCase: 'writing',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ],
    recommendations: [
      {
        id: 'rec-12345678-abcd-ef01-2345-6789abcdef01',
        auditId: 'audit-123',
        ruleId: 'rule-overlap',
        ruleName: 'Consolidate redundant subscriptions',
        category: 'OVERLAP_ELIMINATION',
        priority: 'HIGH',
        reason: 'Multiple writing tools active',
        currentState: '10 seats active on two tools',
        recommendedAction: 'Consolidate to ChatGPT Team only',
        estimatedMonthlySavings: 200 as any,
        estimatedAnnualSavings: 2400 as any,
        confidenceScore: 0.9 as any,
        affectedToolIds: ['tool-gpt'],
        isApplied: false,
        appliedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ],
  };

  it('should build context with audit metrics correctly', () => {
    const context = AuditContextBuilder.build(mockAudit);

    expect(context).toContain('=== AUDIT METRICS ===');
    expect(context).toContain('Audit ID Reference: audit-12');
    expect(context).toContain('Health Score: 85/100 (B)');
    expect(context).toContain('Total Spend Amount: $1500/mo');
    expect(context).toContain('Optimized Spend Amount: $1200/mo');
    expect(context).toContain('Potential Monthly Savings: $300/mo');
    expect(context).toContain('Savings Percentage: 20.0%');
    expect(context).toContain('Unique Software Tools: 4');
    expect(context).toContain('Monitored Accounts/Items: 8');
  });

  it('should format score breakdown subscores', () => {
    const context = AuditContextBuilder.build(mockAudit);

    expect(context).toContain('=== SCORE BREAKDOWN ===');
    expect(context).toContain('- Plan Fit: 90/100 (Weight: 40%). Excellent plan alignment');
    expect(context).toContain('- Overlaps: 80/100 (Weight: 60%). Minor tool redundancies');
  });

  it('should format industry benchmarks', () => {
    const context = AuditContextBuilder.build(mockAudit);

    expect(context).toContain('=== INDUSTRY BENCHMARKS ===');
    expect(context).toContain('- Spend per Employee: $45');
    expect(context).toContain('- Percentile Standing: 65th percentile');
    expect(context).toContain('- Optimization Level: above average');
    expect(context).toContain('- Average Sector Cost: $50');
  });

  it('should include active recommendations', () => {
    const context = AuditContextBuilder.build(mockAudit);

    expect(context).toContain('=== ACTIVE OPTIMIZATION RECOMMENDATIONS ===');
    expect(context).toContain('[Rec ID: rec-1234] Name: Consolidate redundant subscriptions');
    expect(context).toContain('* Category: OVERLAP_ELIMINATION');
    expect(context).toContain('* Priority: HIGH');
    expect(context).toContain('* Potential Savings: $200/mo');
    expect(context).toContain('* Action: Consolidate to ChatGPT Team only');
    expect(context).toContain('* Current State: 10 seats active on two tools');
    expect(context).toContain('* Context: Multiple writing tools active');
    expect(context).toContain('* Confidence: 90%');
  });

  it('should skip soft deleted recommendations', () => {
    const auditWithDeletedRec: AuditWithRelations = {
      ...mockAudit,
      recommendations: [
        {
          ...mockAudit.recommendations[0],
          deletedAt: new Date(),
        },
      ],
    };
    const context = AuditContextBuilder.build(auditWithDeletedRec);
    expect(context).not.toContain('[Rec ID: rec-1234]');
  });

  it('should list software tool inventory', () => {
    const context = AuditContextBuilder.build(mockAudit);

    expect(context).toContain('=== SOFTWARE TOOL INVENTORY ===');
    expect(context).toContain('- Tool: ChatGPT Plus | Plan: Team | Seats: 10 | Team Size: 10 | Monthly Cost: $250');
  });

  it('should skip soft deleted inventory items', () => {
    const auditWithDeletedItem: AuditWithRelations = {
      ...mockAudit,
      items: [
        {
          ...mockAudit.items[0],
          deletedAt: new Date(),
        },
      ],
    };
    const context = AuditContextBuilder.build(auditWithDeletedItem);
    expect(context).not.toContain('Tool: ChatGPT Plus');
  });
});
