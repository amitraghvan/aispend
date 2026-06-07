import { NextRequest, NextResponse } from 'next/server';
import { executiveAdvisorService } from '@/features/ai/services/ExecutiveAdvisorService';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

const log = logger.forService('copilot-api-executive');

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
      const executiveAnalysis = await executiveAdvisorService.generateExecutiveAnalysis({
        auditId,
        organizationId: orgId,
        bypassCache: !!bypassCache,
      });

      return NextResponse.json({ data: executiveAnalysis });
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
    log.error('executive_analysis_api_error', 'Failed to generate copilot executive advisor analysis', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
