import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/api/contracts';
import { getSession } from '@/lib/auth/session';
import { reportRepository } from '@/features/reports/repositories/ReportRepository';
import { logger } from '@/lib/logger/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const log = logger.forService('reports-api');

const idParamSchema = z.string().min(1, 'Invalid report ID format');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const parsedId = idParamSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedId.error.flatten() },
        { status: 400 }
      );
    }

    const report = await reportRepository.findById(id);


    if (!report) {
      return apiNotFound('Report not found');
    }

    // Verify tenant scoping for security (prevent cross-tenant data leakage)
    if (report.organizationId !== session.organization.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return apiSuccess({
      id: report.id,
      organizationId: report.organizationId,
      auditId: report.auditId,
      title: report.title,
      status: report.status,
      shareToken: report.shareToken,
      executiveSummary: report.executiveSummary,
      savingsSummary: report.savingsSummary,
      reportData: report.reportData,
      pdfUrl: report.pdfUrl,
      createdAt: report.createdAt.toISOString(),
      audit: report.audit,
    });
  } catch (error) {
    log.error('api_report_get_error', 'Failed to retrieve report', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to retrieve report');
  }
}
