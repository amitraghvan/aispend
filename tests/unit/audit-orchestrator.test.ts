/**
 * Audit Orchestrator Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditOrchestrator } from '@/features/audit/services/AuditOrchestrator';
import { prismaMock } from '../setup';
import { eventBus } from '@/lib/events/event-bus';

describe('AuditOrchestrator', () => {
  const orchestrator = new AuditOrchestrator();

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.clear();
  });

  const validRequest = {
    companyId: '00000000-0000-0000-0000-000000000001',
    items: [{
      toolId: 'cursor',
      toolName: 'Cursor',
      planName: 'Pro',
      monthlySpend: 20,
      seatCount: 1,
      teamSize: 1,
      useCase: 'coding',
    }],
  };

  it('should create an audit record', async () => {
    prismaMock.audit.create.mockResolvedValue({ id: 'audit-1', companyId: validRequest.companyId, createdAt: new Date() });
    prismaMock.auditItem.createMany.mockResolvedValue({ count: 1 });
    prismaMock.recommendation.createMany.mockResolvedValue({ count: 0 });
    prismaMock.audit.update.mockResolvedValue({ id: 'audit-1', status: 'COMPLETED', createdAt: new Date() });

    const result = await orchestrator.processAudit(validRequest);

    expect(result.auditId).toBe('audit-1');
    expect(result.status).toBe('COMPLETED');
    expect(result.currentSpend).toBe(20);
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
  });

  it('should persist audit items', async () => {
    prismaMock.audit.create.mockResolvedValue({ id: 'audit-2', createdAt: new Date() });
    prismaMock.auditItem.createMany.mockResolvedValue({ count: 2 });
    prismaMock.recommendation.createMany.mockResolvedValue({ count: 0 });
    prismaMock.audit.update.mockResolvedValue({ id: 'audit-2', status: 'COMPLETED', createdAt: new Date() });

    const multiItemRequest = {
      ...validRequest,
      items: [
        ...validRequest.items,
        { toolId: 'chatgpt', toolName: 'ChatGPT', planName: 'Pro', monthlySpend: 200, seatCount: 1, teamSize: 1, useCase: 'writing' },
      ],
    };

    await orchestrator.processAudit(multiItemRequest);
    expect(prismaMock.auditItem.createMany).toHaveBeenCalledTimes(1);
  });

  it('should persist recommendations', async () => {
    prismaMock.audit.create.mockResolvedValue({ id: 'audit-3', createdAt: new Date() });
    prismaMock.auditItem.createMany.mockResolvedValue({ count: 1 });
    prismaMock.recommendation.createMany.mockResolvedValue({ count: 3 });
    prismaMock.audit.update.mockResolvedValue({ id: 'audit-3', status: 'COMPLETED', createdAt: new Date() });

    const wastefulRequest = {
      companyId: '00000000-0000-0000-0000-000000000001',
      items: [
        { toolId: 'chatgpt', toolName: 'ChatGPT', planName: 'Pro', monthlySpend: 200, seatCount: 1, teamSize: 1, useCase: 'writing' },
      ],
    };

    const result = await orchestrator.processAudit(wastefulRequest);
    expect(result.recommendationCount).toBeGreaterThan(0);
    expect(prismaMock.recommendation.createMany).toHaveBeenCalledTimes(1);
  });

  it('should emit audit.completed event', async () => {
    const handler = vi.fn();
    eventBus.on('audit.completed', handler);

    prismaMock.audit.create.mockResolvedValue({ id: 'audit-4', createdAt: new Date() });
    prismaMock.auditItem.createMany.mockResolvedValue({ count: 1 });
    prismaMock.recommendation.createMany.mockResolvedValue({ count: 0 });
    prismaMock.audit.update.mockResolvedValue({ id: 'audit-4', status: 'COMPLETED', createdAt: new Date() });

    await orchestrator.processAudit(validRequest);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should mark audit as FAILED on engine error', async () => {
    prismaMock.audit.create.mockResolvedValue({ id: 'audit-fail', createdAt: new Date() });

    const badRequest = {
      companyId: '00000000-0000-0000-0000-000000000001',
      items: [{ toolId: 'cursor', toolName: 'Cursor', planName: 'Pro', monthlySpend: -1, seatCount: 1, teamSize: 1, useCase: 'coding' }],
    };

    await expect(orchestrator.processAudit(badRequest)).rejects.toThrow();
    expect(prismaMock.audit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      })
    );
  });

  it('should calculate correct savings for wasteful startup', async () => {
    prismaMock.audit.create.mockResolvedValue({ id: 'audit-waste', createdAt: new Date() });
    prismaMock.auditItem.createMany.mockResolvedValue({ count: 2 });
    prismaMock.recommendation.createMany.mockResolvedValue({ count: 5 });
    prismaMock.audit.update.mockResolvedValue({ id: 'audit-waste', status: 'COMPLETED', createdAt: new Date() });

    const wastefulRequest = {
      companyId: '00000000-0000-0000-0000-000000000001',
      items: [
        { toolId: 'cursor', toolName: 'Cursor', planName: 'Pro', monthlySpend: 20, seatCount: 1, teamSize: 1, useCase: 'coding' },
        { toolId: 'github-copilot', toolName: 'GitHub Copilot', planName: 'Pro', monthlySpend: 10, seatCount: 1, teamSize: 1, useCase: 'coding' },
      ],
    };

    const result = await orchestrator.processAudit(wastefulRequest);
    expect(result.currentSpend).toBe(30);
    expect(result.monthlySavings).toBeGreaterThan(0);
  });

  it('should handle totalEmployees and totalDevelopers', async () => {
    prismaMock.audit.create.mockResolvedValue({ id: 'audit-bench', createdAt: new Date() });
    prismaMock.auditItem.createMany.mockResolvedValue({ count: 1 });
    prismaMock.recommendation.createMany.mockResolvedValue({ count: 0 });
    prismaMock.audit.update.mockResolvedValue({ id: 'audit-bench', status: 'COMPLETED', createdAt: new Date() });

    const result = await orchestrator.processAudit({
      ...validRequest,
      totalEmployees: 50,
      totalDevelopers: 20,
    });

    expect(result.auditId).toBe('audit-bench');
  });

  it('should set correct tool count', async () => {
    prismaMock.audit.create.mockResolvedValue({ id: 'audit-tc', createdAt: new Date() });
    prismaMock.auditItem.createMany.mockResolvedValue({ count: 3 });
    prismaMock.recommendation.createMany.mockResolvedValue({ count: 0 });
    prismaMock.audit.update.mockResolvedValue({ id: 'audit-tc', status: 'COMPLETED', createdAt: new Date() });

    const request = {
      companyId: '00000000-0000-0000-0000-000000000001',
      items: [
        { toolId: 'cursor', toolName: 'Cursor', planName: 'Pro', monthlySpend: 20, seatCount: 1, teamSize: 1, useCase: 'coding' },
        { toolId: 'chatgpt', toolName: 'ChatGPT', planName: 'Plus', monthlySpend: 20, seatCount: 1, teamSize: 1, useCase: 'mixed' },
        { toolId: 'claude', toolName: 'Claude', planName: 'Pro', monthlySpend: 20, seatCount: 1, teamSize: 1, useCase: 'writing' },
      ],
    };

    const result = await orchestrator.processAudit(request);
    expect(result.toolCount).toBe(3);
    expect(result.itemCount).toBe(3);
  });
});
