import { NextRequest, NextResponse } from 'next/server';
import { actionPlanService } from '@/features/ai/services/ActionPlanService';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger/logger';
import { z } from 'zod';
import { rateLimit } from '@/lib/redis/rate-limiter';

export const dynamic = 'force-dynamic';

const log = logger.forService('copilot-api-action-plan');

const actionPlanSchema = z.object({
  auditId: z.string().min(1, 'Invalid audit ID format'),
  bypassCache: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rate Limiting ──
    const identifier = `copilot_action_plan:${session.user.id}`;
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

    const parsed = actionPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { auditId, bypassCache } = parsed.data;
    const orgId = session.organization.id;

    try {
      const plan = await actionPlanService.generatePlan({
        auditId,
        organizationId: orgId,
        bypassCache: !!bypassCache,
      });

      const successRes = NextResponse.json({ data: plan });
      successRes.headers.set('X-RateLimit-Limit', String(limitResult.limit));
      successRes.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
      successRes.headers.set('X-RateLimit-Reset', String(limitResult.reset));
      return successRes;
    } catch (err) {
      if (err instanceof Error && err.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (err instanceof Error && err.message === 'Audit not found') {
        return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    log.error('action_plan_api_error', 'Failed to generate copilot action plan', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

