import { NextRequest, NextResponse } from 'next/server';
import { executiveSummaryService } from '@/features/ai/services/ExecutiveSummaryService';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { cacheService } from '@/lib/cache/cache-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const executiveSummarySchema = z.object({
  auditId: z.string().min(1, 'Invalid audit ID format').optional(),
  data: z.any().optional(),
  bypassCache: z.boolean().optional(),
}).refine(d => d.auditId || d.data, {
  message: 'Either auditId or data must be provided',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.auditId && !body.data) {
      return NextResponse.json({ error: 'Missing summary data or auditId' }, { status: 400 });
    }

    const parsed = executiveSummarySchema.safeParse(body);
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
        const cached = await cacheService.get('ai_summary', auditId);
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

      const recommendationCount = await prisma.recommendation.count({ where: { auditId } });
      const overlapGroupCount = await prisma.recommendation.count({ where: { auditId, category: 'OVERLAP_ELIMINATION' } });

      inputData = {
        currentSpend: Number(audit.totalSpend),
        optimizedSpend: audit.optimizedSpend ? Number(audit.optimizedSpend) : Number(audit.totalSpend),
        monthlySavings: Number(audit.potentialSavings),
        annualSavings: Number(audit.potentialSavings) * 12,
        healthScore: audit.healthScore ?? 100,
        healthGrade: audit.healthGrade || 'A',
        toolCount: audit.toolCount,
        recommendationCount,
        overlapGroupCount,
      };
    }

    if (!inputData) {
      return NextResponse.json({ error: 'Missing summary data or auditId' }, { status: 400 });
    }

    const summary = await executiveSummaryService.generateSummary(inputData);

    if (auditId) {
      await cacheService.set('ai_summary', auditId, summary, 86400);
    }

    return NextResponse.json({ data: summary });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
