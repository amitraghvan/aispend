import { NextRequest, NextResponse } from 'next/server';
import { healthScoreExplainerService } from '@/features/ai/services/HealthScoreExplainerService';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { cacheService } from '@/lib/cache/cache-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const explainHealthScoreSchema = z.object({
  auditId: z.string().min(1, 'Invalid audit ID format').optional(),
  data: z.any().optional(),
  bypassCache: z.boolean().optional(),
}).refine(d => d.auditId || d.data, {
  message: 'Either auditId or data must be provided',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = explainHealthScoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { auditId, data, bypassCache } = parsed.data;


    let inputData = data;

    if (auditId) {
      if (!bypassCache) {
        const cached = await cacheService.get('ai_explain_health', auditId);
        if (cached) return NextResponse.json({ data: cached });
      }

      const audit = await prisma.audit.findUnique({ where: { id: auditId } });
      if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });

      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (audit.organizationId !== session.organization.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const hsDetails = audit.healthScoreDetails as {
        subscores?: Array<{ name: string; score: number; weight: number; explanation?: string }>;
      } | null;

      inputData = {
        overallScore: audit.healthScore ?? 100,
        grade: audit.healthGrade || 'A',
        subscores: hsDetails?.subscores || [],
      };
    }

    if (!inputData) {
      return NextResponse.json({ error: 'Missing health score data or auditId' }, { status: 400 });
    }

    const explanation = await healthScoreExplainerService.generateExplanation(inputData);

    if (auditId) {
      await cacheService.set('ai_explain_health', auditId, explanation, 86400);
    }

    return NextResponse.json({ data: explanation });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
