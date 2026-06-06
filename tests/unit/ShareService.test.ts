import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shareService } from '@/features/reports/services/ShareService';
import { prismaMock } from '../setup';
import { Prisma } from '@prisma/client';

describe('ShareService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a share token and strip sensitive data', async () => {
    const reportMock = {
      id: 'report-123',
      audit: {
        totalSpend: new Prisma.Decimal(1250),
        optimizedSpend: new Prisma.Decimal(930),
        potentialSavings: new Prisma.Decimal(320),
        savingsPercentage: new Prisma.Decimal(25.6),
        healthScore: 78,
        healthGrade: 'B',
        toolCount: 4,
        overlapAnalysis: { overlapGroups: [] } as Prisma.InputJsonValue,
        benchmarkAnalysis: { percentile: 72, optimizationRating: 'good' } as Prisma.InputJsonValue,
      },
    };

    prismaMock.report.findFirst.mockResolvedValue(reportMock);
    prismaMock.auditShare.create.mockResolvedValue({ id: 'share-123', publicToken: 'token-abc' });

    const result = await shareService.createShare('report-123', 7);

    expect(prismaMock.report.findFirst).toHaveBeenCalledTimes(1);
    expect(prismaMock.auditShare.create).toHaveBeenCalledTimes(1);
    expect(result.publicToken).toBeDefined();
    expect(result.shareUrl).toContain(result.publicToken);
  });

  it('should allow viewing active and non-expired shares', async () => {
    const safeData = {
      healthScore: 78,
      healthGrade: 'B',
      currentSpend: 1250,
      optimizedSpend: 930,
      monthlySavings: 320,
      annualSavings: 3840,
      savingsPercentage: 25.6,
      toolCount: 4,
    };

    const shareMock = {
      id: 'share-123',
      publicToken: 'token-abc',
      expiresAt: new Date(Date.now() + 86400000), // tomorrow
      isActive: true,
      safeData,
    };

    prismaMock.auditShare.findFirst.mockResolvedValue(shareMock);
    prismaMock.auditShare.update.mockResolvedValue({ ...shareMock, viewCount: 1 });

    const result = await shareService.viewShare('token-abc');

    expect(prismaMock.auditShare.findFirst).toHaveBeenCalledTimes(1);
    expect(prismaMock.auditShare.update).toHaveBeenCalledTimes(1); // increments view count
    expect(result).toEqual(safeData);
  });

  it('should return null for expired shares', async () => {
    const shareMock = {
      id: 'share-123',
      publicToken: 'token-abc',
      expiresAt: new Date(Date.now() - 86400000), // yesterday
      isActive: true,
      safeData: {},
    };

    prismaMock.auditShare.findFirst.mockResolvedValue(shareMock);

    const result = await shareService.viewShare('token-abc');

    expect(result).toBeNull();
    expect(prismaMock.auditShare.update).not.toHaveBeenCalled();
  });
});
