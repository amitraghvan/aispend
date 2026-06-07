import { NextRequest, NextResponse } from 'next/server';
import { actionPlanService } from '@/features/ai/services/ActionPlanService';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

const log = logger.forService('copilot-api-action-plan');

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { auditId, bypassCache } = body;

    if (!auditId) {
      return NextResponse.json({ error: 'Missing auditId' }, { status: 400 });
    }

    const orgId = session?.organization.id || null;

    try {
      const plan = await actionPlanService.generatePlan({
        auditId,
        organizationId: orgId,
        bypassCache: !!bypassCache,
      });

      return NextResponse.json({ data: plan });
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
