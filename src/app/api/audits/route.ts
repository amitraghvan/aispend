/**
 * POST /api/audits — Create, execute, and persist an AI spend audit.
 * GET  /api/audits — List audits scoped to the authenticated organization.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiCreated, apiValidationError, apiServerError, parsePagination } from '@/lib/api/contracts';
import { auditOrchestrator } from '@/features/audit/services/AuditOrchestrator';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger/logger';

const log = logger.forService('audit-api');

const createAuditSchema = z.object({
  items: z.array(z.object({
    toolId: z.string().min(1),
    toolName: z.string().min(1),
    planName: z.string().min(1),
    monthlySpend: z.number().min(0),
    seatCount: z.number().int().min(1),
    teamSize: z.number().int().min(1),
    useCase: z.enum(['coding', 'writing', 'research', 'data', 'mixed']),
  })).min(1, 'At least one tool subscription is required'),
  totalEmployees: z.number().int().min(1).optional(),
  totalDevelopers: z.number().int().min(0).optional(),
});

import { rateLimit } from '@/lib/redis/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ── Rate Limiting ──
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const identifier = `audit:${session.user.id}`;
    
    // Allow 10 audits per hour
    const limitResult = await rateLimit(identifier, 10, 3600);
    
    if (!limitResult.success) {
      const errorRes = NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_ERROR',
            message: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      );
      errorRes.headers.set('X-RateLimit-Limit', String(limitResult.limit));
      errorRes.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
      errorRes.headers.set('X-RateLimit-Reset', String(limitResult.reset));
      return errorRes;
    }

    const body = await request.json();
    const parsed = createAuditSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError('Invalid audit request', parsed.error.flatten());
    }

    const { items, totalEmployees, totalDevelopers } = parsed.data;

    // Execute audit via orchestrator (persists to DB if configured)
    const result = await auditOrchestrator.processAudit({
      organizationId: session?.organization.id,
      items: items.map((item) => ({
        toolId: item.toolId,
        toolName: item.toolName,
        planName: item.planName,
        monthlySpend: item.monthlySpend,
        seatCount: item.seatCount,
        teamSize: item.teamSize,
        useCase: item.useCase,
      })),
      totalEmployees,
      totalDevelopers,
    });

    const response = apiCreated(result);
    response.headers.set('X-RateLimit-Limit', String(limitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(limitResult.reset));
    return response;
  } catch (error) {
    log.error('api_audit_create_error', 'Failed to create audit', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to process audit');
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);

    const [audits, total] = await prisma.$transaction([
      prisma.audit.findMany({
        where: {
          organizationId: session.organization.id,
          deletedAt: null,
        },
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.audit.count({
        where: {
          organizationId: session.organization.id,
          deletedAt: null,
        },
      }),
    ]);

    const formattedAudits = audits.map((audit) => ({
      id: audit.id,
      status: audit.status,
      totalSpend: Number(audit.totalSpend),
      potentialSavings: Number(audit.potentialSavings),
      healthScore: audit.healthScore,
      healthGrade: audit.healthGrade,
      createdAt: audit.createdAt.toISOString(),
      itemCount: audit.itemCount,
      toolCount: audit.toolCount,
    }));

    return apiSuccess(formattedAudits, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    });
  } catch (error) {
    log.error('api_audit_list_error', 'Failed to list audits', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to retrieve audits');
  }
}
