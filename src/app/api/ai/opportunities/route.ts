import { NextRequest, NextResponse } from 'next/server';
import { opportunityInsightService } from '@/features/ai/services/OpportunityInsightService';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { cacheService } from '@/lib/cache/cache-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auditId, recommendations, bypassCache } = body;

    let inputData = recommendations;

    if (auditId) {
      if (!bypassCache) {
        const cached = await cacheService.get('ai_opportunities', auditId);
        if (cached) return NextResponse.json({ data: cached });
      }

      const audit = await prisma.audit.findUnique({ where: { id: auditId } });
      if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });

      if (audit.organizationId) {
        const session = await getSession();
        if (!session) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (session.organization.id !== audit.organizationId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const recs = await prisma.recommendation.findMany({
        where: { auditId },
      });

      inputData = recs.map((r) => ({
        ruleName: r.ruleName,
        category: r.category,
        priority: r.priority,
        reason: r.reason,
        currentState: r.currentState || '',
        recommendedAction: r.recommendedAction || '',
        estimatedMonthlySavings: Number(r.estimatedMonthlySavings),
      }));
    }

    if (!inputData) {
      return NextResponse.json({ error: 'Missing recommendations or auditId' }, { status: 400 });
    }

    const list = await opportunityInsightService.generateOpportunities(inputData);

    if (auditId) {
      await cacheService.set('ai_opportunities', auditId, list, 86400);
    }

    return NextResponse.json({ data: list });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
