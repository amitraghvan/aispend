import { NextRequest, NextResponse } from 'next/server';
import { opportunityInsightService } from '@/features/ai/services/OpportunityInsightService';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { cacheService } from '@/lib/cache/cache-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const opportunitiesSchema = z.object({
  auditId: z.string().min(1, 'Invalid audit ID format').optional(),
  recommendations: z.any().optional(),
  bypassCache: z.boolean().optional(),
}).refine(d => d.auditId || d.recommendations, {
  message: 'Either auditId or recommendations must be provided',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = opportunitiesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { auditId, recommendations, bypassCache } = parsed.data;


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
