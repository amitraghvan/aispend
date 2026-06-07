import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/api/contracts';
import { shareService } from '@/features/reports/services/ShareService';
import { logger } from '@/lib/logger/logger';
import { z } from 'zod';
import { rateLimit } from '@/lib/redis/rate-limiter';

export const dynamic = 'force-dynamic';

const log = logger.forService('share-api');

const tokenSchema = z.string().regex(/^[0-9a-f]{64}$/i, 'Invalid token format');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // ── Rate Limiting ──
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const limitResult = await rateLimit(`share_view:${ip}`, 60, 60);

    if (!limitResult.success) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.` },
        { status: 429 }
      );
    }

    const { token } = await params;
    const parsedToken = tokenSchema.safeParse(token);
    if (!parsedToken.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedToken.error.flatten() },
        { status: 400 }
      );
    }

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

