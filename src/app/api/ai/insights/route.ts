import { NextRequest, NextResponse } from 'next/server';
import { aiOrchestrator, InMemoryAuditResult } from '@/features/ai/services/AIOrchestrator';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const log = logger.forService('ai-api-insights');

const insightsSchema = z.object({
  auditId: z.string().min(1, 'Invalid audit ID format').optional(),
  auditData: z.any().optional(),
  bypassCache: z.boolean().optional(),
}).refine(d => d.auditId || d.auditData, {
  message: 'Either auditId or auditData must be provided',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.auditId && !body.auditData) {
      return NextResponse.json({ error: 'Missing auditId or auditData' }, { status: 400 });
    }

    const parsed = insightsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { auditId, auditData, bypassCache } = parsed.data;


    let orgId: string | undefined;

    // ── 1. Tenant Security Scoping & DB Fetch ──
    if (auditId) {
      const audit = await prisma.audit.findUnique({
        where: { id: auditId },
      });

      if (!audit) {
        return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
      }

      if (audit.organizationId) {
        // Enforce session authorization
        const session = await getSession();
        if (!session) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        if (session.organization.id !== audit.organizationId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        orgId = session.organization.id;
      }
    }

    const inputData = auditId ? auditId : (auditData as InMemoryAuditResult);
    if (!inputData) {
      return NextResponse.json({ error: 'Missing auditId or auditData' }, { status: 400 });
    }

    const insights = await aiOrchestrator.getInsights(
      inputData,
      orgId,
      !!bypassCache
    );

    return NextResponse.json({ data: insights });
  } catch (error) {
    log.error('insights_api_error', 'Failed to retrieve orchestrated insights', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
