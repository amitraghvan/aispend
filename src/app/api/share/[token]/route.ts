/**
 * GET /api/share/:token — View a public shared report.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/api/contracts';
import { shareService } from '@/features/reports/services/ShareService';
import { logger } from '@/lib/logger/logger';

const log = logger.forService('share-api');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const data = await shareService.viewShare(token);
    if (!data) return apiNotFound('Report not found or has expired');

    return apiSuccess(data);
  } catch (error) {
    log.error('api_share_error', 'Failed to view shared report', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to retrieve shared report');
  }
}
