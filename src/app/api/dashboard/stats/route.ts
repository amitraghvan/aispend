/**
 * GET /api/dashboard/stats — Dynamic dashboard aggregation.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiServerError } from '@/lib/api/contracts';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger/logger';

const log = logger.forService('dashboard-api');

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.organization.id;

    // 1. Total Audits count
    const totalAudits = await prisma.audit.count({
      where: { organizationId: orgId, deletedAt: null },
    });

    // 2. Latest Completed Audit
    const latestAudit = await prisma.audit.findFirst({
      where: { organizationId: orgId, status: 'COMPLETED', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    // 3. Health Score Trends (past 6 completed audits)
    const trends = await prisma.audit.findMany({
      where: { organizationId: orgId, status: 'COMPLETED', deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 6,
    });

    // 4. Recent Reports
    const reports = await prisma.report.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 5. Team Activity (Event log)
    const events = await prisma.event.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: true },
    });

    // Structure metrics fallback
    const totalMonthlySpend = latestAudit ? Number(latestAudit.totalSpend) : 0;
    const potentialSavings = latestAudit ? Number(latestAudit.potentialSavings) : 0;
    const healthScore = latestAudit ? latestAudit.healthScore : 100;
    const healthGrade = latestAudit ? latestAudit.healthGrade : 'A';
    const toolCount = latestAudit ? latestAudit.toolCount : 0;
    const itemCount = latestAudit ? latestAudit.itemCount : 0;

    return apiSuccess({
      metrics: {
        totalAudits,
        totalMonthlySpend,
        potentialSavings,
        annualPotentialSavings: potentialSavings * 12,
        healthScore,
        healthGrade,
        toolCount,
        itemCount,
      },
      trends: trends.map(t => ({
        id: t.id,
        healthScore: t.healthScore,
        createdAt: t.createdAt.toISOString().split('T')[0],
        totalSpend: Number(t.totalSpend),
        potentialSavings: Number(t.potentialSavings),
      })),
      recentReports: reports.map(r => ({
        id: r.id,
        title: r.title,
        shareToken: r.shareToken,
        createdAt: r.createdAt.toISOString().split('T')[0],
      })),
      teamActivity: events.map(e => ({
        id: e.id,
        userName: e.user?.name || e.user?.email.split('@')[0] || 'System',
        name: e.name,
        payload: e.payload,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    log.error('api_dashboard_stats_error', 'Failed to retrieve stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to retrieve dashboard statistics');
  }
}
