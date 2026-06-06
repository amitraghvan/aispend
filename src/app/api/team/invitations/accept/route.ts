/**
 * POST /api/team/invitations/accept — Accept a team invitation.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiValidationError, apiServerError, apiError } from '@/lib/api/contracts';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger/logger';

const log = logger.forService('team-api');

const acceptSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = acceptSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError('Invalid token', parsed.error.flatten());
    }

    const { token } = parsed.data;

    // 1. Fetch invitation from DB
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      return apiError('NOT_FOUND', 'Invitation not found', 404);
    }

    if (invitation.status !== 'PENDING') {
      return apiError('VALIDATION_ERROR', `Invitation has already been ${invitation.status.toLowerCase()}`, 400);
    }

    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return apiError('VALIDATION_ERROR', 'Invitation has expired', 400);
    }

    // 2. Fetch current session (logged in user)
    const session = await getSession();

    if (!session) {
      return apiError('AUTHENTICATION_ERROR', 'Authentication required to accept invitation', 401, {
        email: invitation.email,
      });
    }

    // 3. Security Check: verify emails match (prevent hijacking)
    if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return apiError('FORBIDDEN', `This invitation was sent to ${invitation.email}, but you are logged in as ${session.user.email}`, 403);
    }

    // 4. Create membership and mark invitation as ACCEPTED in a transaction
    await prisma.$transaction(async (tx) => {
      // Check if membership already exists (active or deleted)
      const existing = await tx.membership.findFirst({
        where: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
        },
      });

      if (existing) {
        if (existing.deletedAt) {
          // Restore soft-deleted membership
          await tx.membership.update({
            where: { id: existing.id },
            data: { role: invitation.role, deletedAt: null, joinedAt: new Date() },
          });
        } else {
          // Update role if already active
          await tx.membership.update({
            where: { id: existing.id },
            data: { role: invitation.role },
          });
        }
      } else {
        // Create new membership
        await tx.membership.create({
          data: {
            userId: session.user.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        });
      }

      // Mark invitation accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });
    });

    log.info('api_invitation_accepted', `User ${session.user.id} joined org ${invitation.organizationId}`);

    return apiSuccess({
      success: true,
      organizationId: invitation.organizationId,
      organizationName: invitation.organization.name,
    });
  } catch (error) {
    log.error('api_invitation_accept_error', 'Failed to accept invitation', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to accept invitation');
  }
}
