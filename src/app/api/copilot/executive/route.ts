import { NextRequest, NextResponse } from 'next/server';
import { executiveAdvisorService } from '@/features/ai/services/ExecutiveAdvisorService';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger/logger';
import { z } from 'zod';
import { rateLimit } from '@/lib/redis/rate-limiter';

export const dynamic = 'force-dynamic';

const log = logger.forService('copilot-api-executive');

const executiveSchema = z.object({
  auditId: z.string().min(1, 'Invalid audit ID format'),
  bypassCache: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      log.warn('copilot-session-missing', 'POST /api/copilot/executive - Session missing');
      log.warn('copilot-401', 'POST /api/copilot/executive - Returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    log.info('copilot-session-found', 'POST /api/copilot/executive - Session found', { userId: session.user.id });

    if (!session.organization?.id) {
      log.warn('copilot-org-missing', 'POST /api/copilot/executive - Org ID missing');
      log.warn('copilot-403', 'POST /api/copilot/executive - Returning 403');
      return NextResponse.json({ error: 'Organization ID is missing in session' }, { status: 403 });
    }
    log.info('copilot-org-found', 'POST /api/copilot/executive - Org ID found', { orgId: session.organization.id });

    // ── Rate Limiting ──
    const identifier = `copilot_executive:${session.user.id}`;
    const limitResult = await rateLimit(identifier, 30, 60);

    if (!limitResult.success) {
      const errorRes = NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.` },
        { status: 429 }
      );
      errorRes.headers.set('X-RateLimit-Limit', String(limitResult.limit));
      errorRes.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
      errorRes.headers.set('X-RateLimit-Reset', String(limitResult.reset));
      return errorRes;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const parsed = executiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { auditId, bypassCache } = parsed.data;
    const orgId = session.organization.id;

    try {
      const executiveAnalysis = await executiveAdvisorService.generateExecutiveAnalysis({
        auditId,
        organizationId: orgId,
        bypassCache: !!bypassCache,
      });

      log.info('copilot-conversation-found', 'POST /api/copilot/executive - Audit verified & executive analysis processed', { auditId });
      const successRes = NextResponse.json({ data: executiveAnalysis });
      successRes.headers.set('X-RateLimit-Limit', String(limitResult.limit));
      successRes.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
      successRes.headers.set('X-RateLimit-Reset', String(limitResult.reset));
      return successRes;
    } catch (err) {
      log.warn('copilot-conversation-missing', 'POST /api/copilot/executive - Audit not found or access denied', { auditId });
      if (err instanceof Error && err.message === 'Forbidden') {
        log.warn('copilot-403', 'POST /api/copilot/executive - Returning 403');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (err instanceof Error && err.message === 'Audit not found') {
        return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    log.error('copilot-500', 'POST /api/copilot/executive - Uncaught exception', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

