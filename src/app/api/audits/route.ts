/**
 * POST /api/audits — Create and execute an AI spend audit.
 * GET  /api/audits — List audits with pagination and filtering.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiCreated, apiValidationError, apiServerError, parsePagination } from '@/lib/api/contracts';
import { auditOrchestrator, CreateAuditRequest } from '@/features/audit/services/AuditOrchestrator';
import { auditRepository } from '@/features/audit/repositories/AuditRepository';
import { logger } from '@/lib/logger/logger';

const log = logger.forService('audit-api');

const createAuditSchema = z.object({
  companyId: z.string().uuid('Valid company ID required'),
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

    const result = await auditOrchestrator.processAudit(parsed.data as CreateAuditRequest);

    log.info('api_audit_created', `Audit created: ${result.auditId}`);
    return apiCreated(result);
  } catch (error) {
    log.error('api_audit_error', 'Failed to create audit', {
      error: error instanceof Error ? error.message : 'Unknown error',
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

    const filters = {
      companyId: searchParams.get('companyId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      healthScoreMin: searchParams.get('healthScoreMin') ? Number(searchParams.get('healthScoreMin')) : undefined,
      healthScoreMax: searchParams.get('healthScoreMax') ? Number(searchParams.get('healthScoreMax')) : undefined,
    };

    const { data, total } = await auditRepository.findMany(filters, {
      skip: pagination.skip,
      take: pagination.take,
    });

    return apiSuccess(data, {
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
