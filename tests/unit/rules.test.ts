/**
 * Rule Engine Tests (Plan Downgrade, Overlap, Billing)
 */
import { describe, it, expect } from 'vitest';
import { RuleEvaluator } from '@/features/audit/engine/rules/evaluator';
import { RuleRegistry } from '@/features/audit/engine/rules/registry';
import { planDowngradeRules } from '@/features/audit/engine/rules/plan-downgrade-rules';
import { overlapRules } from '@/features/audit/engine/rules/overlap-rules';
import { billingRules } from '@/features/audit/engine/rules/billing-rules';
import { AuditItemInput } from '@/features/audit/engine/types/audit-input';

function makeItem(overrides: Partial<AuditItemInput> & { toolId: string; planName: string }): AuditItemInput {
  return {
    monthlySpend: 20,
    seatCount: 1,
    teamSize: 1,
    useCase: 'coding',
    ...overrides,
  };
}

describe('Rule Registry', () => {
  it('should have 55 rules registered', () => {
    const registry = new RuleRegistry();
    expect(registry.count()).toBe(55);
  });

  it('should have all rule categories', () => {
    const registry = new RuleRegistry();
    const categories = new Set(registry.getAll().map((r) => r.category));
    expect(categories.has('plan_downgrade')).toBe(true);
    expect(categories.has('overlap_elimination')).toBe(true);
    expect(categories.has('billing_optimization')).toBe(true);
    expect(categories.has('seat_optimization')).toBe(true);
  });
});

describe('Plan Downgrade Rules', () => {
  const evaluator = new RuleEvaluator();

  it('PD-001: ChatGPT Team → Plus for solo user', () => {
    const items = [makeItem({ toolId: 'chatgpt', planName: 'Team', monthlySpend: 25, seatCount: 1, teamSize: 1, useCase: 'writing' })];
    const results = evaluator.evaluate(items);
    const pd001 = results.find((r) => r.ruleId === 'PD-001');
    expect(pd001).toBeDefined();
    expect(pd001!.expectedMonthlySavings).toBe(5);
  });

  it('PD-003: ChatGPT Pro → Plus for non-research', () => {
    const items = [makeItem({ toolId: 'chatgpt', planName: 'Pro', monthlySpend: 200, seatCount: 1, teamSize: 1, useCase: 'writing' })];
    const results = evaluator.evaluate(items);
    const pd003 = results.find((r) => r.ruleId === 'PD-003');
    expect(pd003).toBeDefined();
    expect(pd003!.expectedMonthlySavings).toBe(180);
  });

  it('PD-003: Should NOT trigger for research use case', () => {
    const items = [makeItem({ toolId: 'chatgpt', planName: 'Pro', monthlySpend: 200, seatCount: 1, teamSize: 1, useCase: 'research' })];
    const results = evaluator.evaluate(items);
    const pd003 = results.find((r) => r.ruleId === 'PD-003');
    expect(pd003).toBeUndefined();
  });

  it('PD-006: Cursor Business → Pro for small team', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Business', monthlySpend: 80, seatCount: 2, teamSize: 2 })];
    const results = evaluator.evaluate(items);
    const pd006 = results.find((r) => r.ruleId === 'PD-006');
    expect(pd006).toBeDefined();
    expect(pd006!.expectedMonthlySavings).toBe(40);
  });

  it('PD-013: Claude Team excess seats', () => {
    const items = [makeItem({ toolId: 'claude', planName: 'Team', monthlySpend: 250, seatCount: 10, teamSize: 5, useCase: 'mixed' })];
    const results = evaluator.evaluate(items);
    const pd013 = results.find((r) => r.ruleId === 'PD-013');
    expect(pd013).toBeDefined();
    expect(pd013!.expectedMonthlySavings).toBe(125);
  });

  it('PD-015: ChatGPT Team excess seats', () => {
    const items = [makeItem({ toolId: 'chatgpt', planName: 'Team', monthlySpend: 150, seatCount: 6, teamSize: 3, useCase: 'mixed' })];
    const results = evaluator.evaluate(items);
    const pd015 = results.find((r) => r.ruleId === 'PD-015');
    expect(pd015).toBeDefined();
    expect(pd015!.expectedMonthlySavings).toBe(75);
  });
});

describe('Overlap Rules', () => {
  const evaluator = new RuleEvaluator();

  it('OV-001: Multiple coding assistants', () => {
    const items = [
      makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 }),
      makeItem({ toolId: 'github-copilot', planName: 'Pro', monthlySpend: 10 }),
    ];
    const results = evaluator.evaluate(items);
    const ov001 = results.find((r) => r.ruleId === 'OV-001');
    expect(ov001).toBeDefined();
    expect(ov001!.expectedMonthlySavings).toBe(20); // Keep cheapest (Copilot $10)
  });

  it('OV-006: Cursor + Copilot overlap', () => {
    const items = [
      makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 }),
      makeItem({ toolId: 'github-copilot', planName: 'Pro', monthlySpend: 10 }),
    ];
    const results = evaluator.evaluate(items);
    const ov006 = results.find((r) => r.ruleId === 'OV-006');
    expect(ov006).toBeDefined();
    expect(ov006!.expectedMonthlySavings).toBe(10);
  });

  it('OV-007: Cursor + Windsurf overlap', () => {
    const items = [
      makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 }),
      makeItem({ toolId: 'windsurf', planName: 'Pro', monthlySpend: 15 }),
    ];
    const results = evaluator.evaluate(items);
    const ov007 = results.find((r) => r.ruleId === 'OV-007');
    expect(ov007).toBeDefined();
    expect(ov007!.expectedMonthlySavings).toBe(20); // Cancel most expensive
  });

  it('OV-011: Triple AI assistant overlap', () => {
    const items = [
      makeItem({ toolId: 'chatgpt', planName: 'Plus', monthlySpend: 20, useCase: 'mixed' }),
      makeItem({ toolId: 'claude', planName: 'Pro', monthlySpend: 20, useCase: 'mixed' }),
      makeItem({ toolId: 'gemini', planName: 'Advanced', monthlySpend: 20, useCase: 'mixed' }),
    ];
    const results = evaluator.evaluate(items);
    const ov011 = results.find((r) => r.ruleId === 'OV-011');
    expect(ov011).toBeDefined();
    expect(ov011!.expectedMonthlySavings).toBe(40);
  });

  it('OV-009: Claude API + subscription overlap', () => {
    const items = [
      makeItem({ toolId: 'claude', planName: 'Pro', monthlySpend: 20, useCase: 'writing' }),
      makeItem({ toolId: 'anthropic-api', planName: 'Pay-as-you-go', monthlySpend: 50, useCase: 'coding' }),
    ];
    const results = evaluator.evaluate(items);
    const ov009 = results.find((r) => r.ruleId === 'OV-009');
    expect(ov009).toBeDefined();
  });

  it('should NOT trigger overlap for single tool', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 })];
    const results = evaluator.evaluate(items);
    const overlapRules = results.filter((r) => r.ruleId.startsWith('OV-'));
    // No overlap should be detected for a single tool
    const codingOverlap = overlapRules.filter((r) => r.category === 'overlap_elimination');
    expect(codingOverlap.length).toBe(0);
  });
});

describe('Billing Optimization Rules', () => {
  const evaluator = new RuleEvaluator();

  it('BO-001: Cursor annual billing', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20, seatCount: 1 })];
    const results = evaluator.evaluate(items);
    const bo001 = results.find((r) => r.ruleId === 'BO-001');
    expect(bo001).toBeDefined();
    expect(bo001!.expectedMonthlySavings).toBe(4);
  });

  it('BO-005: High spend alert >$500', () => {
    const items = [
      makeItem({ toolId: 'cursor', planName: 'Business', monthlySpend: 200, seatCount: 5, teamSize: 5 }),
      makeItem({ toolId: 'chatgpt', planName: 'Team', monthlySpend: 250, seatCount: 10, teamSize: 10, useCase: 'mixed' }),
      makeItem({ toolId: 'claude', planName: 'Team', monthlySpend: 125, seatCount: 5, teamSize: 5, useCase: 'writing' }),
    ];
    const results = evaluator.evaluate(items);
    const bo005 = results.find((r) => r.ruleId === 'BO-005');
    expect(bo005).toBeDefined();
  });

  it('BO-006: Very high spend alert >$1000', () => {
    const items = [
      makeItem({ toolId: 'chatgpt', planName: 'Enterprise', monthlySpend: 600, seatCount: 10, teamSize: 10, useCase: 'mixed' }),
      makeItem({ toolId: 'cursor', planName: 'Business', monthlySpend: 400, seatCount: 10, teamSize: 10 }),
      makeItem({ toolId: 'claude', planName: 'Enterprise', monthlySpend: 300, seatCount: 5, teamSize: 5, useCase: 'research' }),
    ];
    const results = evaluator.evaluate(items);
    const bo006 = results.find((r) => r.ruleId === 'BO-006');
    expect(bo006).toBeDefined();
  });

  it('BO-011: Cursor excess seats', () => {
    const items = [makeItem({ toolId: 'cursor', planName: 'Business', monthlySpend: 200, seatCount: 5, teamSize: 3 })];
    const results = evaluator.evaluate(items);
    const bo011 = results.find((r) => r.ruleId === 'BO-011');
    expect(bo011).toBeDefined();
    expect(bo011!.expectedMonthlySavings).toBe(80); // 2 excess seats * $40/seat
  });

  it('BO-019: Excessive tool count', () => {
    const items = [
      makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20 }),
      makeItem({ toolId: 'github-copilot', planName: 'Pro', monthlySpend: 10 }),
      makeItem({ toolId: 'windsurf', planName: 'Pro', monthlySpend: 15 }),
      makeItem({ toolId: 'chatgpt', planName: 'Plus', monthlySpend: 20, useCase: 'mixed' }),
      makeItem({ toolId: 'claude', planName: 'Pro', monthlySpend: 20, useCase: 'writing' }),
      makeItem({ toolId: 'gemini', planName: 'Advanced', monthlySpend: 20, useCase: 'research' }),
    ];
    const results = evaluator.evaluate(items);
    const bo019 = results.find((r) => r.ruleId === 'BO-019');
    expect(bo019).toBeDefined();
  });

  it('should sort results by savings descending', () => {
    const items = [
      makeItem({ toolId: 'chatgpt', planName: 'Pro', monthlySpend: 200, seatCount: 1, teamSize: 1, useCase: 'writing' }),
      makeItem({ toolId: 'cursor', planName: 'Pro', monthlySpend: 20, seatCount: 1, teamSize: 1 }),
    ];
    const results = evaluator.evaluate(items);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].expectedMonthlySavings).toBeGreaterThanOrEqual(results[i].expectedMonthlySavings);
    }
  });
});
