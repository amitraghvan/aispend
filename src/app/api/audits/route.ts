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
import { isSupabaseConfigured } from '@/lib/supabase/client';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createAuditSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError('Invalid audit request', parsed.error.flatten());
    }

    const { items, totalEmployees, totalDevelopers } = parsed.data;

    // Check for auth session
    const session = await getSession();
    const organizationId = session?.organization.id;

    // Execute audit via orchestrator (persists to DB if configured)
    const result = await auditOrchestrator.processAudit({
      organizationId,
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

    return apiCreated(result);
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
    
    // In mock mode without a real session, check if we're simulating mock dashboard data
    if (!isSupabaseConfigured() && !session) {
      // Return a simulated list of mock audits for the demo UI
      return apiSuccess([
        {
          id: 'mock-audit-1',
          status: 'COMPLETED',
          totalSpend: 1250,
          potentialSavings: 320,
          healthScore: 78,
          healthGrade: 'B',
          createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
          itemCount: 4,
          toolCount: 3,
        },
        {
          id: 'mock-audit-2',
          status: 'COMPLETED',
          totalSpend: 1540,
          potentialSavings: 540,
          healthScore: 64,
          healthGrade: 'C',
          createdAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
          itemCount: 5,
          toolCount: 4,
        }
      ], {
        page: 1,
        pageSize: 10,
        total: 2,
        totalPages: 1,
      });
    }

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
