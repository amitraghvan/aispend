/**
 * Audit Engine Integration Tests
 *
 * End-to-end tests of the full audit pipeline from input to AuditResult.
 */
import { describe, it, expect } from 'vitest';
import { AuditEngineService } from '@/features/audit/engine/services/AuditEngineService';

describe('AuditEngineService', () => {
  const engine = new AuditEngineService();

  it('should have 55+ rules registered', () => {
    expect(engine.getRuleCount()).toBeGreaterThanOrEqual(55);
  });

  it('should produce a complete AuditResult for a simple input', () => {
    const request = {
      companyId: 'test-company',
      items: [
        { toolId: 'cursor', planName: 'Pro', monthlySpend: 20, seatCount: 1, teamSize: 1, useCase: 'coding' },
      ],
    };
    const result = engine.execute(request);
    expect(result.auditId).toBeDefined();
    expect(result.companyId).toBe('test-company');
    expect(result.currentSpend).toBe(20);
    expect(result.healthScore).toBeDefined();
    expect(result.healthScore.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore.overallScore).toBeLessThanOrEqual(100);
    expect(result.overlapAnalysis).toBeDefined();
    expect(result.benchmarkAnalysis).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(result.itemCount).toBe(1);
    expect(result.toolCount).toBe(1);
    expect(result.generatedAt).toBeDefined();
  });

  it('should detect significant savings for wasteful startup', () => {
    const request = {
      companyId: 'wasteful-startup',
      items: [
        { toolId: 'cursor', planName: 'Business', monthlySpend: 400, seatCount: 10, teamSize: 5, useCase: 'coding' },
        { toolId: 'github-copilot', planName: 'Enterprise', monthlySpend: 390, seatCount: 10, teamSize: 5, useCase: 'coding' },
        { toolId: 'chatgpt', planName: 'Pro', monthlySpend: 200, seatCount: 1, teamSize: 1, useCase: 'writing' },
        { toolId: 'claude', planName: 'Team', monthlySpend: 250, seatCount: 10, teamSize: 5, useCase: 'research' },
        { toolId: 'gemini', planName: 'Enterprise', monthlySpend: 360, seatCount: 10, teamSize: 5, useCase: 'mixed' },
      ],
    };
    const result = engine.execute(request, { totalEmployees: 10 });

    expect(result.currentSpend).toBe(1600);
    expect(result.monthlySavings).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(5);
    expect(result.healthScore.overallScore).toBeLessThan(60);
    expect(result.overlapAnalysis.overlapGroups.length).toBeGreaterThan(0);
  });

  it('should produce high health score for optimized startup', () => {
    const request = {
      companyId: 'efficient-startup',
      items: [
        { toolId: 'cursor', planName: 'Pro', monthlySpend: 20, seatCount: 1, teamSize: 1, useCase: 'coding' },
      ],
    };
    const result = engine.execute(request, { totalEmployees: 5 });
    expect(result.healthScore.overallScore).toBeGreaterThanOrEqual(70);
    expect(result.savingsPercentage).toBeLessThan(50);
  });

  it('should throw on invalid input', () => {
    expect(() => engine.execute({ items: [] })).toThrow();
    expect(() => engine.execute({})).toThrow();
    expect(() => engine.execute(null)).toThrow();
  });

  it('should generate benchmark analysis', () => {
    const request = {
      companyId: 'bench-test',
      items: [
        { toolId: 'cursor', planName: 'Pro', monthlySpend: 100, seatCount: 5, teamSize: 5, useCase: 'coding' },
      ],
    };
    const result = engine.execute(request, { totalEmployees: 20, totalDevelopers: 5 });
    expect(result.benchmarkAnalysis.spendPerEmployee).toBe(5);
    expect(result.benchmarkAnalysis.spendPerDeveloper).toBe(20);
    expect(result.benchmarkAnalysis.percentile).toBeGreaterThanOrEqual(0);
    expect(result.benchmarkAnalysis.percentile).toBeLessThanOrEqual(100);
  });

  it('should detect overlap between Cursor and Copilot', () => {
    const request = {
      companyId: 'overlap-test',
      items: [
        { toolId: 'cursor', planName: 'Pro', monthlySpend: 20, seatCount: 1, teamSize: 1, useCase: 'coding' },
        { toolId: 'github-copilot', planName: 'Pro', monthlySpend: 10, seatCount: 1, teamSize: 1, useCase: 'coding' },
      ],
    };
    const result = engine.execute(request);
    expect(result.overlapAnalysis.overlapGroups.length).toBeGreaterThan(0);
    const codingOverlap = result.overlapAnalysis.overlapGroups.find(
      (g) => g.toolIds.includes('cursor') && g.toolIds.includes('github-copilot')
    );
    expect(codingOverlap).toBeDefined();
  });

  it('should recommend ChatGPT Pro → Plus downgrade', () => {
    const request = {
      companyId: 'downgrade-test',
      items: [
        { toolId: 'chatgpt', planName: 'Pro', monthlySpend: 200, seatCount: 1, teamSize: 1, useCase: 'writing' },
      ],
    };
    const result = engine.execute(request);
    const downgrade = result.recommendations.find((r) => r.ruleId === 'PD-003');
    expect(downgrade).toBeDefined();
    expect(downgrade!.expectedMonthlySavings).toBe(180);
  });

  it('should detect triple AI assistant overlap', () => {
    const request = {
      companyId: 'triple-test',
      items: [
        { toolId: 'chatgpt', planName: 'Plus', monthlySpend: 20, seatCount: 1, teamSize: 1, useCase: 'mixed' },
        { toolId: 'claude', planName: 'Pro', monthlySpend: 20, seatCount: 1, teamSize: 1, useCase: 'mixed' },
        { toolId: 'gemini', planName: 'Advanced', monthlySpend: 20, seatCount: 1, teamSize: 1, useCase: 'mixed' },
      ],
    };
    const result = engine.execute(request);
    const tripleOverlap = result.recommendations.find((r) => r.ruleId === 'OV-011');
    expect(tripleOverlap).toBeDefined();
    expect(tripleOverlap!.expectedMonthlySavings).toBe(40);
  });
});
