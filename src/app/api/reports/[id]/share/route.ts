import { NextRequest, NextResponse } from 'next/server';
import { apiCreated, apiNotFound, apiServerError } from '@/lib/api/contracts';
import { getSession } from '@/lib/auth/session';
import { reportRepository } from '@/features/reports/repositories/ReportRepository';
import { shareService } from '@/features/reports/services/ShareService';
import { logger } from '@/lib/logger/logger';
import { z } from 'zod';
import { rateLimit } from '@/lib/redis/rate-limiter';

export const dynamic = 'force-dynamic';

const log = logger.forService('share-api');

const idParamSchema = z.string().min(1, 'Invalid report ID format');

const shareBodySchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rate Limiting ──
    const identifier = `report_share:${session.user.id}`;
    const limitResult = await rateLimit(identifier, 20, 60);

    if (!limitResult.success) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.` },
        { status: 429 }
      );
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

    // Verify tenant scoping for security
    if (report.organizationId !== session.organization.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse options from body (e.g. expiresInDays)
    let expiresInDays: number | undefined;
    try {
      const text = await request.text();
      if (text) {
        const body = JSON.parse(text);
        const parsedBody = shareBodySchema.safeParse(body);
        if (!parsedBody.success) {
          return NextResponse.json(
            { error: 'Validation failed', details: parsedBody.error.flatten() },
            { status: 400 }
          );
        }
        expiresInDays = parsedBody.data.expiresInDays;
      }
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
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

