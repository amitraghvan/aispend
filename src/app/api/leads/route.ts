/**
 * POST /api/leads — Capture a new lead.
 */

import { NextRequest } from 'next/server';
import { apiCreated, apiValidationError, apiServerError, apiRateLimited } from '@/lib/api/contracts';
import { leadService } from '@/features/leads/services/LeadService';
import { logger } from '@/lib/logger/logger';

const log = logger.forService('lead-api');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';
    const userAgent = request.headers.get('user-agent') ?? 'unknown';

    const result = await leadService.captureLead(body, { ipAddress, userAgent });

    log.info('api_lead_captured', `Lead captured: ${result.leadId}`, { score: result.score });

    return apiCreated(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Disposable email')) {
      return apiValidationError(error.message);
    }

    log.error('api_lead_error', 'Failed to capture lead', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return apiServerError('Failed to capture lead');
  }
}
