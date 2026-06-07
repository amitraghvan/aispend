import { NextRequest, NextResponse } from 'next/server';
import { recommendationCopilotService } from '@/features/ai/services/RecommendationCopilotService';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

const log = logger.forService('copilot-api-deep-dive');

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recommendationId, rawInput, bypassCache } = body;

    if (!recommendationId && !rawInput) {
      return NextResponse.json({ error: 'Missing recommendationId or rawInput' }, { status: 400 });
    }

    const orgId = session?.organization.id || null;

    try {
      const deepDive = await recommendationCopilotService.generateDeepDive({
        recommendationId,
        rawInput,
        organizationId: orgId,
        bypassCache: !!bypassCache,
      });

      return NextResponse.json({ data: deepDive });
    } catch (err) {
      if (err instanceof Error && err.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (err instanceof Error && err.message === 'Recommendation not found') {
        return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    log.error('deep_dive_api_error', 'Failed to generate recommendation deep-dive', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
