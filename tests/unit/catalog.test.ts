/**
 * Tool Catalog Tests
 */
import { describe, it, expect } from 'vitest';
import { ToolCatalogRepository } from '@/features/audit/catalog/repositories/ToolCatalogRepository';
import { TOOL_CATALOG, TOOL_LIST, SUPPORTED_TOOL_IDS } from '@/features/audit/catalog/data/tool-catalog';
import { toolCatalogEntrySchema } from '@/features/audit/catalog/validators';

describe('Tool Catalog Data', () => {
  it('should have all 9 required tools', () => {
    const required = ['cursor', 'github-copilot', 'chatgpt', 'claude', 'gemini', 'anthropic-api', 'openai-api', 'windsurf', 'v0'];
    for (const toolId of required) {
      expect(TOOL_CATALOG[toolId]).toBeDefined();
    }
    expect(TOOL_LIST.length).toBe(9);
  });

  it('should have valid pricing for every plan', () => {
    for (const tool of TOOL_LIST) {
      for (const plan of tool.plans) {
        expect(plan.monthlyPricePerSeat).toBeGreaterThanOrEqual(0);
        expect(plan.seatMinimum).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('should pass Zod validation for every catalog entry', () => {
    for (const tool of TOOL_LIST) {
      const result = toolCatalogEntrySchema.safeParse(tool);
      expect(result.success).toBe(true);
    }
  });

  it('should have unique tool IDs', () => {
    const ids = TOOL_LIST.map((t) => t.toolId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have unique plan IDs within each tool', () => {
    for (const tool of TOOL_LIST) {
      const planIds = tool.plans.map((p) => p.planId);
      expect(new Set(planIds).size).toBe(planIds.length);
    }
  });
});

describe('ToolCatalogRepository', () => {
  const repo = new ToolCatalogRepository();

  it('should get tool by ID', () => {
    const cursor = repo.getById('cursor');
    expect(cursor.toolName).toBe('Cursor');
  });

  it('should throw NotFoundError for missing tool', () => {
    expect(() => repo.getById('nonexistent')).toThrow('not found');
  });

  it('should return null for findById with missing tool', () => {
    expect(repo.findById('nonexistent')).toBeNull();
  });

  it('should check existence', () => {
    expect(repo.exists('cursor')).toBe(true);
    expect(repo.exists('nonexistent')).toBe(false);
  });

  it('should get plan by ID', () => {
    const plan = repo.getPlan('cursor', 'cursor-pro');
    expect(plan.planName).toBe('Pro');
    expect(plan.monthlyPricePerSeat).toBe(20);
  });

  it('should throw for missing plan', () => {
    expect(() => repo.getPlan('cursor', 'nonexistent')).toThrow('not found');
  });

  it('should find plan by name (case-insensitive)', () => {
    const plan = repo.findPlanByName('cursor', 'BUSINESS');
    expect(plan).not.toBeNull();
    expect(plan!.planName).toBe('Business');
  });

  it('should get tools by use case', () => {
    const codingTools = repo.getByUseCase('coding');
    expect(codingTools.length).toBeGreaterThanOrEqual(4);
    expect(codingTools.some((t) => t.toolId === 'cursor')).toBe(true);
  });

  it('should get alternatives', () => {
    const alts = repo.getAlternatives('cursor');
    expect(alts.length).toBeGreaterThanOrEqual(2);
  });

  it('should get cheapest paid plan', () => {
    const plan = repo.getCheapestPaidPlan('cursor');
    expect(plan).not.toBeNull();
    expect(plan!.planName).toBe('Pro');
  });

  it('should return all supported tool IDs', () => {
    expect(SUPPORTED_TOOL_IDS.length).toBe(9);
  });
});
