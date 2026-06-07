import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as auditGET, DELETE as auditDELETE } from '@/app/api/audits/[id]/route';
import { POST as reportPOST } from '@/app/api/audits/[id]/report/route';
import { getSession } from '@/lib/auth/session';
import { prismaMock } from '../setup';
import { reportService } from '@/features/reports/services/ReportService';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

describe('Audit API Security and IDOR Enforcement', () => {
  const mockUserSession = {
    user: { id: 'u-123', email: 'user@company.com', name: 'Jane Doe' },
    organization: { id: 'org-123', name: 'Acme Corp', slug: 'acme' },
    membership: { role: 'MEMBER' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/audits/[id]', () => {
    it('should return 401 Unauthorized if no active session exists', async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/audits/audit-abc');
      const res = await auditGET(req, { params: Promise.resolve({ id: 'audit-abc' }) });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('should allow a user to access their own organization\'s audit', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      prismaMock.audit.findFirst.mockResolvedValue({
        id: 'audit-abc',
        organizationId: 'org-123',
        status: 'COMPLETED',
        totalSpend: 1500,
        potentialSavings: 500,
      } as any);

      const req = new NextRequest('http://localhost/api/audits/audit-abc');
      const res = await auditGET(req, { params: Promise.resolve({ id: 'audit-abc' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe('audit-abc');
    });

    it('should return 403 Forbidden if a user accesses an audit from another organization', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      prismaMock.audit.findFirst.mockResolvedValue({
        id: 'audit-abc',
        organizationId: 'org-other',
        status: 'COMPLETED',
      } as any);

      const req = new NextRequest('http://localhost/api/audits/audit-abc');
      const res = await auditGET(req, { params: Promise.resolve({ id: 'audit-abc' }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });
  });

  describe('DELETE /api/audits/[id]', () => {
    it('should return 401 Unauthorized if no active session exists', async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/audits/audit-abc', { method: 'DELETE' });
      const res = await auditDELETE(req, { params: Promise.resolve({ id: 'audit-abc' }) });

      expect(res.status).toBe(401);
    });

    it('should return 403 Forbidden if a user attempts to delete an audit from another organization', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      prismaMock.audit.findFirst.mockResolvedValue({
        id: 'audit-abc',
        organizationId: 'org-other',
        status: 'COMPLETED',
      } as any);

      const req = new NextRequest('http://localhost/api/audits/audit-abc', { method: 'DELETE' });
      const res = await auditDELETE(req, { params: Promise.resolve({ id: 'audit-abc' }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });
  });

  describe('POST /api/audits/[id]/report', () => {
    it('should return 401 Unauthorized if no active session exists', async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/audits/audit-abc/report', { method: 'POST' });
      const res = await reportPOST(req, { params: Promise.resolve({ id: 'audit-abc' }) });

      expect(res.status).toBe(401);
    });

    it('should return 403 Forbidden if a user attempts to generate a report for another organization\'s audit', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      prismaMock.audit.findFirst.mockResolvedValue({
        id: 'audit-abc',
        organizationId: 'org-other',
        status: 'COMPLETED',
      } as any);

      const req = new NextRequest('http://localhost/api/audits/audit-abc/report', { method: 'POST' });
      const res = await reportPOST(req, { params: Promise.resolve({ id: 'audit-abc' }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('should allow generating a report for their own organization\'s completed audit', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUserSession as any);
      prismaMock.audit.findFirst.mockResolvedValue({
        id: 'audit-abc',
        organizationId: 'org-123',
        status: 'COMPLETED',
      } as any);

      vi.spyOn(reportService, 'generateReport').mockResolvedValue({
        reportId: 'rep-999',
        title: 'Acme Report',
        savingsSummary: {},
      } as any);

      const req = new NextRequest('http://localhost/api/audits/audit-abc/report', { method: 'POST' });
      const res = await reportPOST(req, { params: Promise.resolve({ id: 'audit-abc' }) });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.reportId).toBe('rep-999');
    });
  });
});
