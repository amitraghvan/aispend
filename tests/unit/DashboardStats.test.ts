import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../setup';
import { getSession } from '@/lib/auth/session';
import { GET } from '@/app/api/dashboard/stats/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
}));

describe('DashboardStats API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return unauthorized if user session is missing', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should aggregate metrics and return dashboard data successfully', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'user@company.com' },
      organization: { id: 'org-123', name: 'Test Org' },
      membership: { role: 'OWNER' },
    };

    vi.mocked(getSession).mockResolvedValue(mockSession as any);
    
    prismaMock.audit.count.mockResolvedValue(3);
    prismaMock.audit.findFirst.mockResolvedValue({
      id: 'audit-123',
      totalSpend: 1500.0,
      potentialSavings: 300.0,
      healthScore: 82,
      healthGrade: 'B',
      toolCount: 3,
      itemCount: 4,
    });
    prismaMock.audit.findMany.mockResolvedValue([
      { id: 'audit-1', healthScore: 78, totalSpend: 1400.0, potentialSavings: 200.0, createdAt: new Date() },
      { id: 'audit-2', healthScore: 82, totalSpend: 1500.0, potentialSavings: 300.0, createdAt: new Date() },
    ]);
    prismaMock.report.findMany.mockResolvedValue([
      { id: 'report-1', title: 'June Report', shareToken: 'tok-june', createdAt: new Date() },
    ]);
    prismaMock.event.findMany.mockResolvedValue([
      { id: 'ev-1', name: 'audit.completed', createdAt: new Date(), user: { name: 'Alice' } },
    ]);

    const request = new NextRequest('http://localhost:3000/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.metrics.totalAudits).toBe(3);
    expect(body.data.metrics.totalMonthlySpend).toBe(1500);
    expect(body.data.metrics.potentialSavings).toBe(300);
    expect(body.data.metrics.healthScore).toBe(82);
    expect(body.data.trends).toHaveLength(2);
    expect(body.data.recentReports).toHaveLength(1);
    expect(body.data.teamActivity).toHaveLength(1);
  });

  it('should return default metrics when no completed audits exist', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'user@company.com' },
      organization: { id: 'org-123', name: 'Test Org' },
      membership: { role: 'OWNER' },
    };

    vi.mocked(getSession).mockResolvedValue(mockSession as any);
    prismaMock.audit.count.mockResolvedValue(0);
    prismaMock.audit.findFirst.mockResolvedValue(null);
    prismaMock.audit.findMany.mockResolvedValue([]);
    prismaMock.report.findMany.mockResolvedValue([]);
    prismaMock.event.findMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.metrics.totalAudits).toBe(0);
    expect(body.data.metrics.totalMonthlySpend).toBe(0);
    expect(body.data.metrics.healthScore).toBe(100);
    expect(body.data.metrics.healthGrade).toBe('A');
  });

  it('should cap trends query to 6 latest items', async () => {
    const mockSession = {
      user: { id: 'user-123' },
      organization: { id: 'org-123' },
    };
    vi.mocked(getSession).mockResolvedValue(mockSession as any);
    prismaMock.audit.count.mockResolvedValue(10);
    prismaMock.audit.findMany.mockResolvedValue([
      { id: '1', healthScore: 90, totalSpend: 100, potentialSavings: 10, createdAt: new Date() },
    ]);

    const request = new NextRequest('http://localhost:3000/api/dashboard/stats');
    await GET(request);

    expect(prismaMock.audit.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 6,
    }));
  });

  it('should aggregate monthly savings into annual savings correctly', async () => {
    const mockSession = {
      user: { id: 'user-123' },
      organization: { id: 'org-123' },
    };
    vi.mocked(getSession).mockResolvedValue(mockSession as any);
    prismaMock.audit.findFirst.mockResolvedValue({
      id: 'audit-123',
      totalSpend: 1000,
      potentialSavings: 150,
      healthScore: 90,
      healthGrade: 'A',
      toolCount: 1,
      itemCount: 1,
    });

    const request = new NextRequest('http://localhost:3000/api/dashboard/stats');
    const response = await GET(request);
    const body = await response.json();

    expect(body.data.metrics.potentialSavings).toBe(150);
    expect(body.data.metrics.annualPotentialSavings).toBe(1800); // 150 * 12
  });

  it('should query active reports from organization scope', async () => {
    const mockSession = {
      user: { id: 'user-123' },
      organization: { id: 'org-123' },
    };
    vi.mocked(getSession).mockResolvedValue(mockSession as any);
    await GET(new NextRequest('http://localhost:3000/api/dashboard/stats'));

    expect(prismaMock.report.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-123', deletedAt: null },
      take: 5,
    }));
  });

  it('should query events from organization scope', async () => {
    const mockSession = {
      user: { id: 'user-123' },
      organization: { id: 'org-123' },
    };
    vi.mocked(getSession).mockResolvedValue(mockSession as any);
    await GET(new NextRequest('http://localhost:3000/api/dashboard/stats'));

    expect(prismaMock.event.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-123' },
      take: 10,
    }));
  });
});
