/**
 * GET    /api/audits/:id — Get audit by ID.
 * DELETE /api/audits/:id — Soft delete audit.
 */

export const dynamic = 'force-dynamic';


import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/api/contracts';
import { auditRepository } from '@/features/audit/repositories/AuditRepository';
import { cacheService } from '@/lib/cache/cache-service';
import { logger } from '@/lib/logger/logger';
import { getSession } from '@/lib/auth/session';

const log = logger.forService('audit-api');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Try cache first
    const cached = await cacheService.getAudit(id);
    if (cached) {
      const audit = await auditRepository.findById(id);
      if (audit) {
        if (
          audit.organizationId &&
          audit.organizationId !== session.organization.id
        ) {
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
          );
        }
        return apiSuccess({ ...audit, cachedResult: cached });
      }
    }

    const audit = await auditRepository.findById(id);
    if (!audit) return apiNotFound('Audit not found');

    if (
      audit.organizationId &&
      audit.organizationId !== session.organization.id
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

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
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const audit = await auditRepository.findById(id);
    if (!audit) return apiNotFound('Audit not found');

    if (
      audit.organizationId &&
      audit.organizationId !== session.organization.id
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

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
