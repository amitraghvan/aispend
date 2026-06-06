/**
 * GET /api/team/members — List active memberships and pending invitations.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiServerError } from '@/lib/api/contracts';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger/logger';

const log = logger.forService('team-api');

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.organization.id;

    // Fetch active memberships
    const memberships = await prisma.membership.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });

    // Fetch pending invitations
    const invitations = await prisma.invitation.findMany({
      where: { organizationId: orgId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    const activeMembers = memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt.toISOString().split('T')[0],
      status: 'ACTIVE' as const,
    }));

    const pendingInvites = invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      joinedAt: i.createdAt.toISOString().split('T')[0],
      status: 'PENDING' as const,
      token: i.token,
    }));

    return apiSuccess([...activeMembers, ...pendingInvites]);
  } catch (error) {
    log.error('api_team_members_list_error', 'Failed to list team members', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to retrieve team members');
  }
}
