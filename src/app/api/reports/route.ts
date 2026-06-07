import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiServerError, parsePagination } from '@/lib/api/contracts';
import { getSession } from '@/lib/auth/session';
import { reportRepository } from '@/features/reports/repositories/ReportRepository';
import { logger } from '@/lib/logger/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const log = logger.forService('reports-api');

const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  pageSize: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageVal = searchParams.get('page') || undefined;
    const pageSizeVal = searchParams.get('pageSize') || undefined;

    const parsedQuery = querySchema.safeParse({ page: pageVal, pageSize: pageSizeVal });
    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedQuery.error.flatten() },
        { status: 400 }
      );
    }

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
