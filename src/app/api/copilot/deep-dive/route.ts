import { NextRequest, NextResponse } from 'next/server';
import { recommendationCopilotService } from '@/features/ai/services/RecommendationCopilotService';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger/logger';
import { z } from 'zod';
import { rateLimit } from '@/lib/redis/rate-limiter';

export const dynamic = 'force-dynamic';

const log = logger.forService('copilot-api-deep-dive');

const deepDiveSchema = z.object({
  recommendationId: z.string().min(1, 'Invalid recommendation ID format').optional(),
  rawInput: z.object({
    ruleName: z.string().min(1),
    category: z.string().min(1),
    priority: z.string().min(1),
    reason: z.string().min(1),
    currentState: z.string().min(1),
    recommendedAction: z.string().min(1),
    estimatedMonthlySavings: z.number(),
  }).optional(),
  bypassCache: z.boolean().optional(),
}).refine(data => data.recommendationId || data.rawInput, {
  message: 'Either recommendationId or rawInput must be provided',
  path: ['recommendationId'],
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      log.warn('copilot-session-missing', 'POST /api/copilot/deep-dive - Session missing');
      log.warn('copilot-401', 'POST /api/copilot/deep-dive - Returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    log.info('copilot-session-found', 'POST /api/copilot/deep-dive - Session found', { userId: session.user.id });

    if (!session.organization?.id) {
      log.warn('copilot-org-missing', 'POST /api/copilot/deep-dive - Org ID missing');
      log.warn('copilot-403', 'POST /api/copilot/deep-dive - Returning 403');
      return NextResponse.json({ error: 'Organization ID is missing in session' }, { status: 403 });
    }
    log.info('copilot-org-found', 'POST /api/copilot/deep-dive - Org ID found', { orgId: session.organization.id });

    // ── Rate Limiting ──
    const identifier = `copilot_deep_dive:${session.user.id}`;
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

    const parsed = deepDiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { recommendationId, rawInput, bypassCache } = parsed.data;
    const orgId = session.organization.id;

    try {
      const deepDive = await recommendationCopilotService.generateDeepDive({
        recommendationId,
        rawInput,
        organizationId: orgId,
        bypassCache: !!bypassCache,
      });

      log.info('copilot-conversation-found', 'POST /api/copilot/deep-dive - Context verified & deep dive processed', { recommendationId });
      const successRes = NextResponse.json({ data: deepDive });
      successRes.headers.set('X-RateLimit-Limit', String(limitResult.limit));
      successRes.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
      successRes.headers.set('X-RateLimit-Reset', String(limitResult.reset));
      return successRes;
    } catch (err) {
      log.warn('copilot-conversation-missing', 'POST /api/copilot/deep-dive - Recommendation not found or access denied', { recommendationId });
      if (err instanceof Error && err.message === 'Forbidden') {
        log.warn('copilot-403', 'POST /api/copilot/deep-dive - Returning 403');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (err instanceof Error && err.message === 'Recommendation not found') {
        return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    log.error('copilot-500', 'POST /api/copilot/deep-dive - Uncaught exception', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

