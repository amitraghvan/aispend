/**
 * Savings Engine, Overlap Detection, Health Score, and Benchmark Tests
 */
import { describe, it, expect } from 'vitest';
import { SavingsService } from '@/features/audit/engine/services/SavingsService';
import { OverlapDetectionService } from '@/features/audit/engine/services/OverlapDetectionService';
import { HealthScoreService } from '@/features/audit/engine/services/HealthScoreService';
import { BenchmarkService } from '@/features/audit/engine/services/BenchmarkService';
import { AuditItemInput } from '@/features/audit/engine/types/audit-input';
import { RuleResult, OverlapAnalysis } from '@/features/audit/engine/types';

function makeItem(overrides: Partial<AuditItemInput> & { toolId: string; planName: string }): AuditItemInput {
  return {
    monthlySpend: 20,
    seatCount: 1,
    teamSize: 1,
    useCase: 'coding',
    ...overrides,
  };
}

function makeRuleResult(overrides: Partial<RuleResult> = {}): RuleResult {
  return {
    ruleId: 'TEST-001',
    ruleName: 'Test Rule',
    category: 'plan_downgrade',
    priority: 'medium',
    triggered: true,
    reason: 'Test reason',
    expectedMonthlySavings: 10,
    expectedAnnualSavings: 120,
    confidenceScore: 0.80,
    currentState: 'Test state',
    recommendedAction: 'Test action',
    affectedToolIds: ['cursor'],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// SAVINGS SERVICE
// ═══════════════════════════════════════════════
describe('SavingsService', () => {
  const service = new SavingsService();

  it('should return zero savings with no recommendations', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 })];
    const result = service.calculateSavings(items, []);
    expect(result.monthlySavings).toBe(0);
    expect(result.currentMonthlySpend).toBe(20);
    expect(result.optimizedMonthlySpend).toBe(20);
  });

  it('should calculate savings from a single recommendation', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Business', monthlySpend: 40 })];
    const recs = [makeRuleResult({ expectedMonthlySavings: 20, affectedToolIds: ['cursor'] })];
    const result = service.calculateSavings(items, recs);
    expect(result.monthlySavings).toBe(20);
    expect(result.annualSavings).toBe(240);
    expect(result.savingsPercentage).toBe(50);
  });

  it('should deduplicate overlapping recommendations for same tools', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Business', monthlySpend: 40 })];
    const recs = [
      makeRuleResult({ ruleId: 'R1', expectedMonthlySavings: 20, affectedToolIds: ['cursor'] }),
      makeRuleResult({ ruleId: 'R2', expectedMonthlySavings: 15, affectedToolIds: ['cursor'] }),
    ];
    const result = service.calculateSavings(items, recs);
    expect(result.monthlySavings).toBe(20); // Max of 20 and 15, not sum
  });

  it('should cap savings at current spend', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 })];
    const recs = [makeRuleResult({ expectedMonthlySavings: 100, affectedToolIds: ['cursor'] })];
    const result = service.calculateSavings(items, recs);
    expect(result.monthlySavings).toBe(20);
    expect(result.optimizedMonthlySpend).toBe(0);
  });

  it('should calculate weighted confidence score', () => {
    const items = [
      makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 }),
      makeItem({ toolId: 'chatgpt', planName: 'Plus', monthlySpend: 20, useCase: 'writing' }),
    ];
    const recs = [
      makeRuleResult({ ruleId: 'R1', expectedMonthlySavings: 10, confidenceScore: 0.90, affectedToolIds: ['cursor'] }),
      makeRuleResult({ ruleId: 'R2', expectedMonthlySavings: 10, confidenceScore: 0.70, affectedToolIds: ['chatgpt'] }),
    ];
    const result = service.calculateSavings(items, recs);
    expect(result.confidenceScore).toBe(0.80); // Weighted average
  });
});

// ═══════════════════════════════════════════════
// OVERLAP DETECTION SERVICE
// ═══════════════════════════════════════════════
describe('OverlapDetectionService', () => {
  const service = new OverlapDetectionService();

  it('should detect coding tool overlap', () => {
    const items = [
      makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 }),
      makeItem({ toolId: 'github-copilot', planName: 'Pro', monthlySpend: 10 }),
    ];
    const result = service.analyze(items);
    expect(result.overlapGroups.length).toBeGreaterThanOrEqual(1);
    expect(result.totalEstimatedSavings).toBeGreaterThan(0);
  });

  it('should detect general AI overlap', () => {
    const items = [
      makeItem({ toolId: 'chatgpt', planName: 'Plus', monthlySpend: 20, useCase: 'mixed' }),
      makeItem({ toolId: 'claude', planName: 'Pro', monthlySpend: 20, useCase: 'mixed' }),
    ];
    const result = service.analyze(items);
    expect(result.overlapGroups.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect API + subscription overlap', () => {
    const items = [
      makeItem({ toolId: 'chatgpt', planName: 'Plus', monthlySpend: 20, useCase: 'writing' }),
      makeItem({ toolId: 'openai-api', planName: 'Pay-as-you-go', monthlySpend: 30, useCase: 'coding' }),
    ];
    const result = service.analyze(items);
    const apiOverlap = result.overlapGroups.find((g) => g.useCase === 'openai_ecosystem');
    expect(apiOverlap).toBeDefined();
  });

  it('should return empty analysis for single tool', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 })];
    const result = service.analyze(items);
    expect(result.overlapGroups.length).toBe(0);
    expect(result.totalOverlapScore).toBe(0);
  });

  it('should deduplicate overlap groups', () => {
    const items = [
      makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 }),
      makeItem({ toolId: 'github-copilot', planName: 'Pro', monthlySpend: 10 }),
    ];
    const result = service.analyze(items);
    const keys = result.overlapGroups.map((g) => g.toolIds.sort().join('|') + ':' + g.useCase);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ═══════════════════════════════════════════════
// HEALTH SCORE SERVICE
// ═══════════════════════════════════════════════
describe('HealthScoreService', () => {
  const service = new HealthScoreService();
  const emptyOverlap: OverlapAnalysis = {
    overlapGroups: [],
    totalOverlapScore: 0,
    totalRedundancyScore: 0,
    totalEstimatedSavings: 0,
  };

  it('should give high score for optimized portfolio', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 })];
    const result = service.calculate(items, [], emptyOverlap, 0);
    expect(result.overallScore).toBeGreaterThanOrEqual(85);
    expect(result.grade).toMatch(/[AB]/);
  });

  it('should give low score for wasteful portfolio', () => {
    const items = [
      makeItem({ toolId: 'cursor', planName: 'Business', monthlySpend: 200, seatCount: 5, teamSize: 2 }),
    ];
    const criticalRecs = [
      makeRuleResult({ priority: 'critical', category: 'overlap_elimination' }),
      makeRuleResult({ ruleId: 'R2', priority: 'critical', category: 'plan_downgrade' }),
      makeRuleResult({ ruleId: 'R3', priority: 'high', category: 'seat_optimization' }),
    ];
    const highOverlap: OverlapAnalysis = {
      overlapGroups: [{ useCase: 'coding', toolIds: ['cursor', 'copilot'], toolNames: ['Cursor', 'Copilot'], combinedMonthlySpend: 100, overlapScore: 80, redundancyScore: 60, consolidationSuggestion: '', estimatedSavings: 50 }],
      totalOverlapScore: 80,
      totalRedundancyScore: 60,
      totalEstimatedSavings: 50,
    };
    const result = service.calculate(items, criticalRecs, highOverlap, 40);
    expect(result.overallScore).toBeLessThan(50);
    expect(result.grade).toMatch(/[DF]/);
  });

  it('should have 5 subscores with correct weights summing to 1.0', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 })];
    const result = service.calculate(items, [], emptyOverlap, 0);
    expect(result.subscores.length).toBe(5);
    const totalWeight = result.subscores.reduce((sum, s) => sum + s.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);
  });

  it('should produce valid letter grades', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 })];
    const result = service.calculate(items, [], emptyOverlap, 0);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
  });

  it('should generate a non-empty summary', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 })];
    const result = service.calculate(items, [], emptyOverlap, 0);
    expect(result.summary.length).toBeGreaterThan(10);
  });
});

// ═══════════════════════════════════════════════
// BENCHMARK SERVICE
// ═══════════════════════════════════════════════
describe('BenchmarkService', () => {
  const service = new BenchmarkService();

  it('should calculate spend per employee', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 200 })];
    const result = service.calculate(items, 10);
    expect(result.spendPerEmployee).toBe(20);
  });

  it('should calculate spend per developer when provided', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 200 })];
    const result = service.calculate(items, 10, 5);
    expect(result.spendPerDeveloper).toBe(40);
  });

  it('should classify startup stage correctly', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 250 })];
    const result = service.calculate(items, 10);
    // $25/employee for a 10-person startup = median
    expect(result.industryAverage).toBe(25);
    expect(result.percentile).toBeGreaterThanOrEqual(40);
    expect(result.percentile).toBeLessThanOrEqual(60);
  });

  it('should rate excellent for low spend', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 })];
    const result = service.calculate(items, 10);
    // $2/employee = very efficient
    expect(result.optimizationRating).toBe('excellent');
  });

  it('should rate poor for excessive spend', () => {
    const items = [makeItem({ toolId: 'chatgpt', planName: 'Enterprise', monthlySpend: 5000, useCase: 'mixed' })];
    const result = service.calculate(items, 10);
    // $500/employee = extremely high
    expect(result.optimizationRating).toBe('poor');
  });

  it('should handle zero employees gracefully', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 })];
    const result = service.calculate(items, 0);
    expect(result.percentile).toBe(50);
    expect(result.optimizationRating).toBe('average');
  });

  it('should generate explanation', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 250 })];
    const result = service.calculate(items, 10);
    expect(result.explanation).toContain('$25');
    expect(result.explanation.length).toBeGreaterThan(20);
  });
});
