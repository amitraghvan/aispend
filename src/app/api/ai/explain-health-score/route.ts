import { NextRequest, NextResponse } from 'next/server';
import { healthScoreExplainerService } from '@/features/ai/services/HealthScoreExplainerService';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { cacheService } from '@/lib/cache/cache-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auditId, data, bypassCache } = body;

    let inputData = data;

    if (auditId) {
      if (!bypassCache) {
        const cached = await cacheService.get('ai_explain_health', auditId);
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
