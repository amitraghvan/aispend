import { NextRequest, NextResponse } from 'next/server';
import { recommendationExplainerService } from '@/features/ai/services/RecommendationExplainerService';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { cacheService } from '@/lib/cache/cache-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const explainRecSchema = z.object({
  recommendationId: z.string().min(1, 'Invalid recommendation ID format').optional(),
  data: z.any().optional(),
  bypassCache: z.boolean().optional(),
}).refine(d => d.recommendationId || d.data, {
  message: 'Either recommendationId or data must be provided',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = explainRecSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { recommendationId, data, bypassCache } = parsed.data;


    let inputData = data;

    if (recommendationId) {
      if (!bypassCache) {
        const cached = await cacheService.get('ai_explain_rec', recommendationId);
        if (cached) return NextResponse.json({ data: cached });
      }

      const rec = await prisma.recommendation.findUnique({
        where: { id: recommendationId },
        include: { audit: true },
      });

      if (!rec) return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });

      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (rec.audit.organizationId !== session.organization.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      inputData = {
        ruleName: rec.ruleName,
        category: rec.category,
        priority: rec.priority,
        reason: rec.reason,
        currentState: rec.currentState || '',
        recommendedAction: rec.recommendedAction || '',
        estimatedMonthlySavings: Number(rec.estimatedMonthlySavings),
      };
    }

    if (!inputData) {
      return NextResponse.json({ error: 'Missing recommendation data or recommendationId' }, { status: 400 });
    }

    const explanation = await recommendationExplainerService.generateExplanation(inputData);

    if (recommendationId) {
      await cacheService.set('ai_explain_rec', recommendationId, explanation, 86400);
    }

    return NextResponse.json({ data: explanation });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
