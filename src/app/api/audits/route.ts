/**
 * POST /api/audits — Create and execute an AI spend audit.
 * GET  /api/audits — List audits with pagination and filtering.
 *
 * In "standalone" mode (no DB), the engine executes in-memory and returns
 * results without persistence. When a database is connected, the full
 * AuditOrchestrator pipeline (persist → engine → persist) runs.
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiCreated, apiValidationError, apiServerError, parsePagination } from '@/lib/api/contracts';
import { AuditEngineService } from '@/features/audit/engine/services/AuditEngineService';
import { logger } from '@/lib/logger/logger';
import { randomUUID } from 'crypto';

const log = logger.forService('audit-api');

const createAuditSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
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

    const { companyId, items, totalEmployees, totalDevelopers } = parsed.data;

    // Execute audit engine (pure computation, no DB required)
    const engine = new AuditEngineService();
    const engineInput = {
      companyId,
      items: items.map((item) => ({
        toolId: item.toolId,
        planName: item.planName,
        monthlySpend: item.monthlySpend,
        seatCount: item.seatCount,
        teamSize: item.teamSize,
        useCase: item.useCase as 'coding' | 'writing' | 'research' | 'data' | 'mixed',
      })),
    };

    const result = engine.execute(engineInput, {
      totalEmployees: totalEmployees ?? undefined,
      totalDevelopers: totalDevelopers ?? undefined,
    });

    const auditId = randomUUID();
    const now = new Date();

    log.info('api_audit_created', `Audit created: ${auditId}`, {
      healthScore: result.healthScore.overallScore,
      monthlySavings: result.monthlySavings,
      recommendations: result.recommendations.length,
    });

    return apiCreated({
      auditId,
      companyId,
      status: 'COMPLETED',
      currentSpend: result.currentSpend,
      optimizedSpend: result.optimizedSpend,
      monthlySavings: result.monthlySavings,
      annualSavings: result.annualSavings,
      savingsPercentage: result.savingsPercentage,
      healthScore: result.healthScore.overallScore,
      healthGrade: result.healthScore.grade,
      recommendationCount: result.recommendations.length,
      overlapGroupCount: result.overlapAnalysis.overlapGroups.length,
      itemCount: result.itemCount,
      toolCount: result.toolCount,
      createdAt: now.toISOString(),
    });
  } catch (error) {
    log.error('api_audit_error', 'Failed to create audit', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof z.ZodError) {
      return apiValidationError('Validation failed', error.flatten());
    }

    return apiServerError('Failed to process audit');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);

    // Without a database, return an empty list
    return apiSuccess([], {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: 0,
      totalPages: 0,
    });
  } catch (error) {
    log.error('api_audit_list_error', 'Failed to list audits', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to retrieve audits');
  }
}
