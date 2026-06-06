/**
 * GET    /api/audits/:id — Get audit by ID.
 * DELETE /api/audits/:id — Soft delete audit.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/api/contracts';
import { auditRepository } from '@/features/audit/repositories/AuditRepository';
import { reportService } from '@/features/reports/services/ReportService';
import { cacheService } from '@/lib/cache/cache-service';
import { logger } from '@/lib/logger/logger';

const log = logger.forService('audit-api');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try cache first
    const cached = await cacheService.getAudit(id);
    if (cached) {
      const audit = await auditRepository.findById(id);
      if (audit) return apiSuccess({ ...audit, cachedResult: cached });
    }

    const audit = await auditRepository.findById(id);
    if (!audit) return apiNotFound('Audit not found');

    return apiSuccess(audit);
  } catch (error) {
    log.error('api_audit_get_error', 'Failed to get audit', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to retrieve audit');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const audit = await auditRepository.findById(id);
    if (!audit) return apiNotFound('Audit not found');

    await auditRepository.softDelete(id);
    await cacheService.invalidate('audit', id);

    log.info('api_audit_deleted', `Audit soft deleted: ${id}`);

    return apiSuccess({ id, deleted: true });
  } catch (error) {
    log.error('api_audit_delete_error', 'Failed to delete audit', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to delete audit');
  }
}
