import { NextRequest, NextResponse } from 'next/server';
import { benchmarkNarrativeService } from '@/features/ai/services/BenchmarkNarrativeService';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { cacheService } from '@/lib/cache/cache-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const benchmarkNarrativeSchema = z.object({
  auditId: z.string().min(1, 'Invalid audit ID format').optional(),
  data: z.any().optional(),
  bypassCache: z.boolean().optional(),
}).refine(d => d.auditId || d.data, {
  message: 'Either auditId or data must be provided',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = benchmarkNarrativeSchema.safeParse(body);
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
        const cached = await cacheService.get('ai_narrative_benchmark', auditId);
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

      const bmDetails = audit.benchmarkAnalysis as {
        spendPerEmployee?: number;
        percentile?: number;
        optimizationRating?: string;
        industryAverage?: number;
      } | null;

      inputData = {
        spendPerEmployee: bmDetails?.spendPerEmployee ?? 0,
        percentile: bmDetails?.percentile ?? 50,
        optimizationRating: bmDetails?.optimizationRating || 'average',
        industryAverage: bmDetails?.industryAverage ?? 0,
      };
    }

    if (!inputData) {
      return NextResponse.json({ error: 'Missing benchmark data or auditId' }, { status: 400 });
    }

    const narrative = await benchmarkNarrativeService.generateNarrative(inputData);

    if (auditId) {
      await cacheService.set('ai_narrative_benchmark', auditId, narrative, 86400);
    }

    return NextResponse.json({ data: narrative });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
