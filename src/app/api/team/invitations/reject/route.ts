import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api/contracts';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger/logger';
import { rateLimit } from '@/lib/redis/rate-limiter';

export const dynamic = 'force-dynamic';

const log = logger.forService('team-api');

const rejectSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/i, 'Invalid invitation token format'),
});

export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting ──
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const limitResult = await rateLimit(`invite_reject:${ip}`, 20, 60);

    if (!limitResult.success) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.` },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const parsed = rejectSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError('Invalid token', parsed.error.flatten());
    }

    const { token } = parsed.data;


    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return apiNotFound('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      return apiError('VALIDATION_ERROR', `Invitation has already been ${invitation.status.toLowerCase()}`, 400);
    }

    // Mark invitation as REVOKED
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'REVOKED' },
    });

    log.info('api_invitation_rejected', `Invitation ${invitation.id} rejected by user`);

    return apiSuccess({ success: true, status: 'REVOKED' });
  } catch (error) {
    log.error('api_invitation_reject_error', 'Failed to reject invitation', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to reject invitation');
  }
}
