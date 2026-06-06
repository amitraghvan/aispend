/**
 * DELETE /api/team/members/:id — Remove a membership or delete/revoke a pending invitation.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiNotFound, apiServerError, apiError } from '@/lib/api/contracts';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger/logger';

const log = logger.forService('team-api');

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization check: only OWNER or ADMIN can remove members
    if (session.membership.role !== 'OWNER' && session.membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // 1. Check if it's a membership first
    const membership = await prisma.membership.findUnique({
      where: { id },
    });

    if (membership) {
      // Security: verify same organization scope
      if (membership.organizationId !== session.organization.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Rule: Cannot remove the workspace owner
      if (membership.role === 'OWNER') {
        return apiError('VALIDATION_ERROR', 'The workspace owner cannot be removed', 400);
      }

      // Soft delete membership
      await prisma.membership.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      log.info('api_membership_deleted', `Membership ${id} removed from org ${session.organization.id}`);
      return apiSuccess({ id, status: 'REMOVED' });
    }

    // 2. Check if it's a pending invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id },
    });

    if (invitation) {
      if (invitation.organizationId !== session.organization.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Revoke/Delete invitation
      await prisma.invitation.update({
        where: { id },
        data: { status: 'REVOKED' },
      });

      log.info('api_invitation_revoked', `Invitation ${id} revoked for org ${session.organization.id}`);
      return apiSuccess({ id, status: 'REVOKED' });
    }

    return apiNotFound('Member or Invitation not found');
  } catch (error) {
    log.error('api_team_member_delete_error', 'Failed to delete member', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to delete member');
  }
}
