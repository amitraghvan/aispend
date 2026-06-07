import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiCreated, apiValidationError, apiServerError, apiError } from '@/lib/api/contracts';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/features/email/services/EmailService';
import { randomBytes } from 'crypto';
import { logger } from '@/lib/logger/logger';
import { rateLimit } from '@/lib/redis/rate-limiter';

export const dynamic = 'force-dynamic';

const log = logger.forService('team-api');

const inviteSchema = z.object({
  email: z.string().email('Invalid email address format'),
  role: z.enum(['ADMIN', 'MEMBER']),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rate Limiting ──
    const identifier = `team_invitations:${session.user.id}`;
    const limitResult = await rateLimit(identifier, 20, 60);

    if (!limitResult.success) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.` },
        { status: 429 }
      );
    }

    // Authorization check
    if (session.membership.role !== 'OWNER' && session.membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }


    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError('Invalid invitation request', parsed.error.flatten());
    }

    const { email, role } = parsed.data;

    // 1. Check if user is already a member of this workspace
    const existingMember = await prisma.membership.findFirst({
      where: {
        organizationId: session.organization.id,
        user: { email: { equals: email, mode: 'insensitive' } },
        deletedAt: null,
      },
    });

    if (existingMember) {
      return apiError('CONFLICT', 'User is already a member of this workspace', 409);
    }

    // 2. Check if a pending invitation already exists for this email and organization
    // If so, we revoke the old ones first
    await prisma.invitation.updateMany({
      where: {
        organizationId: session.organization.id,
        email: { equals: email, mode: 'insensitive' },
        status: 'PENDING',
      },
      data: { status: 'REVOKED' },
    });

    // 3. Create secure token & expiresAt (7 days from now)
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.invitation.create({
      data: {
        organizationId: session.organization.id,
        email: email.toLowerCase(),
        role: role,
        token,
        invitedBy: session.user.id,
        expiresAt,
      },
    });

    // 4. Send email invitation via Resend
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite?token=${token}`;
    
    await emailService.send({
      to: email.toLowerCase(),
      template: 'team_invitation',
      data: {
        orgName: session.organization.name,
        inviterName: session.user.name || session.user.email.split('@')[0],
        role: role.toLowerCase(),
        inviteUrl,
        expiresAt: expiresAt.toLocaleDateString(),
      },
    });

    log.info('api_invitation_created', `Invitation created for ${email} in org ${session.organization.id}`, { invitationId: invitation.id });

    return apiCreated({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      expiresAt: invitation.expiresAt.toISOString(),
      status: invitation.status,
    });
  } catch (error) {
    log.error('api_invitation_create_error', 'Failed to create invitation', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to process invitation');
  }
}
