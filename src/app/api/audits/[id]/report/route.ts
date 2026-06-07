/**
 * POST /api/audits/:id/report — Generate report for an audit.
 */

export const dynamic = 'force-dynamic';


import { NextRequest, NextResponse } from 'next/server';
import { apiCreated, apiNotFound, apiServerError } from '@/lib/api/contracts';
import { auditRepository } from '@/features/audit/repositories/AuditRepository';
import { reportService } from '@/features/reports/services/ReportService';
import { logger } from '@/lib/logger/logger';
import { getSession } from '@/lib/auth/session';

const log = logger.forService('report-api');

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const audit = await auditRepository.findById(id);
    if (!audit) return apiNotFound('Audit not found');

    if (
      audit.organizationId &&
      audit.organizationId !== session.organization.id
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    if (audit.status !== 'COMPLETED') {
      return apiServerError('Audit must be completed before generating a report');
    }

    const result = await reportService.generateReport(id, audit.organizationId);

    log.info('api_report_created', `Report generated for audit ${id}`, { reportId: result.reportId });

    return apiCreated(result);
  } catch (error) {
    log.error('api_report_error', 'Failed to generate report', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to generate report');
  }
}
