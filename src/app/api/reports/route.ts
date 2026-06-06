/**
 * GET /api/reports — Retrieve report history scoped to organization.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiServerError, parsePagination } from '@/lib/api/contracts';
import { getSession } from '@/lib/auth/session';
import { reportRepository } from '@/features/reports/repositories/ReportRepository';
import { logger } from '@/lib/logger/logger';

const log = logger.forService('reports-api');

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);

    const { data, total } = await reportRepository.findByOrganizationId(
      session.organization.id,
      pagination.skip,
      pagination.take
    );

    const formattedReports = data.map((report) => ({
      id: report.id,
      organizationId: report.organizationId,
      auditId: report.auditId,
      title: report.title,
      status: report.status,
      shareToken: report.shareToken,
      executiveSummary: report.executiveSummary,
      savingsSummary: report.savingsSummary,
      createdAt: report.createdAt.toISOString(),
    }));

    return apiSuccess(formattedReports, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    });
  } catch (error) {
    log.error('api_reports_list_error', 'Failed to list reports', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to retrieve reports');
  }
}
