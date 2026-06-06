/**
 * Report Service — Generate and manage audit reports.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { reportRepository } from '../repositories/ReportRepository';
import { eventBus } from '@/lib/events/event-bus';
import { cacheService } from '@/lib/cache/cache-service';
import { logger } from '@/lib/logger/logger';
import { randomBytes } from 'crypto';

const log = logger.forService('report-service');

export interface ReportData {
  executiveSummary: string;
  savingsSummary: {
    currentMonthlySpend: number;
    optimizedMonthlySpend: number;
    monthlySavings: number;
    annualSavings: number;
    savingsPercentage: number;
  };
  recommendations: Array<{
    ruleId: string;
    ruleName: string;
    category: string;
    priority: string;
    reason: string;
    expectedMonthlySavings: number;
    recommendedAction: string;
  }>;
  healthScore: {
    overallScore: number;
    grade: string;
    summary: string;
  };
  benchmark: {
    spendPerEmployee: number;
    percentile: number;
    optimizationRating: string;
  };
}

export class ReportService {
  async generateReport(auditId: string, companyId: string): Promise<{ reportId: string; shareToken: string }> {
    log.info('report_generate', `Generating report for audit ${auditId}`);

    // Fetch audit with all related data
    const audit = await prisma.audit.findFirst({
      where: { id: auditId, deletedAt: null },
      include: { items: true, recommendations: { where: { deletedAt: null } } },
    });

    if (!audit) throw new Error(`Audit ${auditId} not found`);

    // Build report data
    const reportData = this.buildReportData(audit);
    const shareToken = randomBytes(16).toString('hex');

    const report = await reportRepository.create({
      company: { connect: { id: companyId } },
      audit: { connect: { id: auditId } },
      title: `AI Spend Audit Report — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      status: 'COMPLETED',
      shareToken,
      executiveSummary: reportData.executiveSummary,
      savingsSummary: reportData.savingsSummary as unknown as Prisma.InputJsonValue,
      reportData: reportData as unknown as Prisma.InputJsonValue,
    });

    await cacheService.setReport(report.id, reportData);

    await eventBus.publish('report.generated', {
      reportId: report.id, auditId, companyId, shareToken,
    });

    log.info('report_complete', `Report generated: ${report.id}`, { reportId: report.id, auditId });

    return { reportId: report.id, shareToken };
  }

  private buildReportData(audit: {
    totalSpend: Prisma.Decimal;
    optimizedSpend: Prisma.Decimal | null;
    potentialSavings: Prisma.Decimal;
    savingsPercentage: Prisma.Decimal | null;
    healthScore: number | null;
    healthGrade: string | null;
    healthScoreDetails: Prisma.JsonValue;
    benchmarkAnalysis: Prisma.JsonValue;
    recommendations: Array<{
      ruleId: string;
      ruleName: string;
      category: string;
      priority: string;
      reason: string;
      recommendedAction: string;
      estimatedMonthlySavings: Prisma.Decimal;
    }>;
    items: Array<{ toolName: string; spendAmount: Prisma.Decimal }>;
  }): ReportData {
    const totalSpend = Number(audit.totalSpend);
    const savings = Number(audit.potentialSavings);
    const savingsPct = Number(audit.savingsPercentage ?? 0);
    const healthScore = audit.healthScore ?? 0;
    const healthGrade = audit.healthGrade ?? 'N/A';
    const benchmark = audit.benchmarkAnalysis as Record<string, unknown> | null;

    const toolNames = [...new Set(audit.items.map((i) => i.toolName))];
    const topRecs = audit.recommendations.slice(0, 5);

    const executiveSummary = [
      `Your organization spends $${totalSpend.toFixed(0)}/month across ${toolNames.length} AI tool(s): ${toolNames.join(', ')}.`,
      savings > 0
        ? `We identified $${savings.toFixed(0)}/month ($${(savings * 12).toFixed(0)}/year) in potential savings — a ${savingsPct.toFixed(1)}% reduction.`
        : 'Your AI spend appears well-optimized with minimal savings opportunities.',
      `Health Score: ${healthScore}/100 (${healthGrade}).`,
      audit.recommendations.length > 0
        ? `${audit.recommendations.length} optimization recommendation(s) generated.`
        : 'No immediate optimization actions required.',
    ].join(' ');

    return {
      executiveSummary,
      savingsSummary: {
        currentMonthlySpend: totalSpend,
        optimizedMonthlySpend: Number(audit.optimizedSpend ?? totalSpend),
        monthlySavings: savings,
        annualSavings: savings * 12,
        savingsPercentage: savingsPct,
      },
      recommendations: topRecs.map((r) => ({
        ruleId: r.ruleId,
        ruleName: r.ruleName,
        category: r.category,
        priority: r.priority,
        reason: r.reason,
        expectedMonthlySavings: Number(r.estimatedMonthlySavings),
        recommendedAction: r.recommendedAction,
      })),
      healthScore: {
        overallScore: healthScore,
        grade: healthGrade,
        summary: (audit.healthScoreDetails as Record<string, unknown>)?.summary as string ?? '',
      },
      benchmark: {
        spendPerEmployee: Number((benchmark as Record<string, unknown>)?.spendPerEmployee ?? 0),
        percentile: Number((benchmark as Record<string, unknown>)?.percentile ?? 50),
        optimizationRating: String((benchmark as Record<string, unknown>)?.optimizationRating ?? 'average'),
      },
    };
  }
}

export const reportService = new ReportService();
