/**
 * POST /api/reports/:id/share — Generate public shareable link for a report.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { apiCreated, apiNotFound, apiServerError } from '@/lib/api/contracts';
import { getSession } from '@/lib/auth/session';
import { reportRepository } from '@/features/reports/repositories/ReportRepository';
import { shareService } from '@/features/reports/services/ShareService';
import { logger } from '@/lib/logger/logger';

const log = logger.forService('share-api');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const report = await reportRepository.findById(id);

    if (!report) {
      return apiNotFound('Report not found');
    }

    // Verify tenant scoping for security
    if (report.organizationId !== session.organization.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse options from body (e.g. expiresInDays)
    let expiresInDays: number | undefined;
    try {
      const body = await request.json();
      expiresInDays = typeof body.expiresInDays === 'number' ? body.expiresInDays : undefined;
    } catch {
      // Body is optional
    }

    const shareDetails = await shareService.createShare(id, expiresInDays);

    return apiCreated(shareDetails);
  } catch (error) {
    log.error('api_report_share_create_error', 'Failed to create share link', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to generate share link');
  }
}
