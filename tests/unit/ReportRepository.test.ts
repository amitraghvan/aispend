import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportRepository } from '@/features/reports/repositories/ReportRepository';
import { prismaMock } from '../setup';
import { Prisma } from '@prisma/client';

describe('ReportRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a report in the database', async () => {
    const reportData = {
      id: 'report-123',
      organizationId: 'org-123',
      auditId: 'audit-123',
      title: 'Monthly Spend Report',
      shareToken: 'token-abc',
      status: 'COMPLETED' as const,
      executiveSummary: 'Spending is optimized.',
      savingsSummary: {} as Prisma.InputJsonValue,
      reportData: {} as Prisma.InputJsonValue,
    };

    prismaMock.report.create.mockResolvedValue(reportData);

    const result = await reportRepository.create({
      organization: { connect: { id: 'org-123' } },
      audit: { connect: { id: 'audit-123' } },
      title: 'Monthly Spend Report',
      shareToken: 'token-abc',
      status: 'COMPLETED',
      executiveSummary: 'Spending is optimized.',
      savingsSummary: {},
      reportData: {},
    });

    expect(prismaMock.report.create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('report-123');
  });

  it('should find report by id', async () => {
    prismaMock.report.findFirst.mockResolvedValue({ id: 'report-123', deletedAt: null });

    const result = await reportRepository.findById('report-123');

    expect(prismaMock.report.findFirst).toHaveBeenCalledTimes(1);
    expect(result?.id).toBe('report-123');
  });

  it('should find report by shareToken', async () => {
    prismaMock.report.findFirst.mockResolvedValue({ id: 'report-123', shareToken: 'token-abc' });

    const result = await reportRepository.findByShareToken('token-abc');

    expect(prismaMock.report.findFirst).toHaveBeenCalledTimes(1);
    expect(result?.shareToken).toBe('token-abc');
  });

  it('should soft delete a report', async () => {
    prismaMock.report.update.mockResolvedValue({ id: 'report-123', deletedAt: new Date() });

    const result = await reportRepository.softDelete('report-123');

    expect(prismaMock.report.update).toHaveBeenCalledTimes(1);
    expect(result.deletedAt).toBeDefined();
  });

  it('should find reports by audit id', async () => {
    prismaMock.report.findMany.mockResolvedValue([{ id: 'report-123', auditId: 'audit-123' }]);

    const result = await reportRepository.findByAuditId('audit-123');

    expect(prismaMock.report.findMany).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].auditId).toBe('audit-123');
  });

  it('should return empty list when organization has no reports', async () => {
    prismaMock.$transaction.mockResolvedValue([[], 0]);

    const result = await reportRepository.findByOrganizationId('org-123', 0, 10);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should return reports list and count when they exist', async () => {
    prismaMock.$transaction.mockResolvedValue([
      [{ id: 'report-1' }, { id: 'report-2' }],
      2
    ]);

    const result = await reportRepository.findByOrganizationId('org-123', 0, 10);

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('should update report fields', async () => {
    prismaMock.report.update.mockResolvedValue({ id: 'report-123', title: 'New Title' });

    const result = await reportRepository.update('report-123', { title: 'New Title' });

    expect(prismaMock.report.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'report-123' },
      data: { title: 'New Title' },
    }));
    expect(result.title).toBe('New Title');
  });

  it('should include audit relation when finding report by ID', async () => {
    prismaMock.report.findFirst.mockResolvedValue({
      id: 'report-123',
      audit: { id: 'audit-123' },
    });

    await reportRepository.findById('report-123');

    expect(prismaMock.report.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      include: { audit: true, shares: true },
    }));
  });
});
