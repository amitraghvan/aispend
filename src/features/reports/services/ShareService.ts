/**
 * Share Service — Create and manage public shareable report links.
 *
 * Requirements:
 * - No email exposure
 * - No company exposure
 * - Public-safe data only
 */

import { auditShareRepository } from '../repositories/AuditShareRepository';
import { reportRepository } from '../repositories/ReportRepository';
import { eventBus } from '@/lib/events/event-bus';
import { logger } from '@/lib/logger/logger';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';

const log = logger.forService('share-service');

export interface PublicReportData {
  healthScore: number;
  healthGrade: string;
  currentSpend: number;
  optimizedSpend: number;
  monthlySavings: number;
  annualSavings: number;
  savingsPercentage: number;
  toolCount: number;
  recommendationCount: number;
  topRecommendations: Array<{
    category: string;
    priority: string;
    reason: string;
    expectedMonthlySavings: number;
  }>;
  overlapGroupCount: number;
  benchmarkPercentile: number;
  benchmarkRating: string;
}

export class ShareService {
  async createShare(reportId: string, expiresInDays?: number): Promise<{ publicToken: string; shareUrl: string }> {
    const report = await reportRepository.findById(reportId);
    if (!report) throw new Error(`Report ${reportId} not found`);

    const publicToken = randomBytes(24).toString('hex');
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null;

    // Build public-safe data (strip PII)
    const safeData = this.buildPublicSafeData(report);

    await auditShareRepository.create({
      report: { connect: { id: reportId } },
      publicToken,
      expiresAt,
      safeData: safeData as unknown as Prisma.InputJsonValue,
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://aispend.io'}/share/${publicToken}`;

    await eventBus.publish('share.created', { reportId, publicToken });
    log.info('share_created', `Share link created for report ${reportId}`);

    return { publicToken, shareUrl };
  }

  async viewShare(publicToken: string): Promise<PublicReportData | null> {
    const share = await auditShareRepository.findByPublicToken(publicToken);
    if (!share) return null;

    // Check expiry
    if (share.expiresAt && new Date() > share.expiresAt) return null;

    // Increment view count
    await auditShareRepository.incrementViewCount(share.id);

    await eventBus.publish('share.viewed', { shareId: share.id, publicToken });

    return share.safeData as unknown as PublicReportData;
  }

  private buildPublicSafeData(report: {
    audit: {
      totalSpend: Prisma.Decimal;
      optimizedSpend: Prisma.Decimal | null;
      potentialSavings: Prisma.Decimal;
      savingsPercentage: Prisma.Decimal | null;
      healthScore: number | null;
      healthGrade: string | null;
      toolCount: number;
      overlapAnalysis: Prisma.JsonValue;
      benchmarkAnalysis: Prisma.JsonValue;
    };
  }): PublicReportData {
    const audit = report.audit;
    const benchmark = audit.benchmarkAnalysis as Record<string, unknown> | null;
    const overlap = audit.overlapAnalysis as Record<string, unknown> | null;
    const overlapGroups = Array.isArray((overlap as Record<string, unknown>)?.overlapGroups)
      ? ((overlap as Record<string, unknown>).overlapGroups as unknown[]).length
      : 0;

    return {
      healthScore: audit.healthScore ?? 0,
      healthGrade: audit.healthGrade ?? 'N/A',
      currentSpend: Number(audit.totalSpend),
      optimizedSpend: Number(audit.optimizedSpend ?? audit.totalSpend),
      monthlySavings: Number(audit.potentialSavings),
      annualSavings: Number(audit.potentialSavings) * 12,
      savingsPercentage: Number(audit.savingsPercentage ?? 0),
      toolCount: audit.toolCount,
      recommendationCount: 0, // Populated from DB if needed
      topRecommendations: [],
      overlapGroupCount: overlapGroups,
      benchmarkPercentile: Number(benchmark?.percentile ?? 50),
      benchmarkRating: String(benchmark?.optimizationRating ?? 'average'),
    };
  }
}

export const shareService = new ShareService();
