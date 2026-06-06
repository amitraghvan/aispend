/**
 * Audit Orchestrator — Full audit pipeline from input to persisted result.
 *
 * Workflow:
 * 1. Validate request
 * 2. Create audit record (PROCESSING)
 * 3. Execute audit engine (Phase 2)
 * 4. Persist items, recommendations, results
 * 5. Generate report
 * 6. Update audit (COMPLETED)
 * 7. Emit events
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { AuditEngineService } from '../engine/services/AuditEngineService';
import { AuditResult, RuleResult } from '../engine/types';
import { eventBus } from '@/lib/events/event-bus';
import { cacheService } from '@/lib/cache/cache-service';
import { logger } from '@/lib/logger/logger';
import { randomUUID } from 'crypto';

export interface CreateAuditRequest {
  organizationId?: string;
  items: Array<{
    toolId: string;
    toolName: string;
    planName: string;
    monthlySpend: number;
    seatCount: number;
    teamSize: number;
    useCase: string;
  }>;
  totalEmployees?: number;
  totalDevelopers?: number;
}

export interface AuditResponse {
  auditId: string;
  organizationId?: string;
  status: string;
  currentSpend: number;
  optimizedSpend: number;
  monthlySavings: number;
  annualSavings: number;
  savingsPercentage: number;
  healthScore: number;
  healthGrade: string;
  recommendationCount: number;
  overlapGroupCount: number;
  itemCount: number;
  toolCount: number;
  createdAt: string;
}

const log = logger.forService('audit-orchestrator');

export class AuditOrchestrator {
  private engine: AuditEngineService;

  constructor(engine: AuditEngineService = new AuditEngineService()) {
    this.engine = engine;
  }

  async processAudit(request: CreateAuditRequest): Promise<AuditResponse> {
    const correlationId = randomUUID();
    log.info('audit_start', `Starting audit for organization ${request.organizationId}`, { correlationId, itemCount: request.items.length });

    // 1. Create audit record in PROCESSING state
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const audit = await prisma.audit.create({
      data: {
        organizationId: request.organizationId,
        status: 'PROCESSING',
        totalSpend: new Prisma.Decimal(0),
        potentialSavings: new Prisma.Decimal(0),
        periodStart,
        periodEnd,
        itemCount: request.items.length,
        toolCount: new Set(request.items.map((i) => i.toolId)).size,
      },
    });

    await eventBus.publish('audit.processing', { auditId: audit.id, organizationId: request.organizationId }, correlationId);

    try {
      // 2. Execute audit engine
      const engineInput = {
        companyId: request.organizationId ?? 'unknown',
        items: request.items.map((item) => ({
          toolId: item.toolId,
          planName: item.planName,
          monthlySpend: item.monthlySpend,
          seatCount: item.seatCount,
          teamSize: item.teamSize,
          useCase: item.useCase as 'coding' | 'writing' | 'research' | 'data' | 'mixed',
        })),
      };

      const result: AuditResult = this.engine.execute(engineInput, {
        totalEmployees: request.totalEmployees,
        totalDevelopers: request.totalDevelopers,
      });

      // 3. Persist items
      await prisma.auditItem.createMany({
        data: request.items.map((item) => ({
          auditId: audit.id,
          toolId: item.toolId,
          toolName: item.toolName,
          planName: item.planName,
          seatCount: item.seatCount,
          teamSize: item.teamSize,
          useCase: item.useCase,
          spendAmount: new Prisma.Decimal(item.monthlySpend),
        })),
      });

      // 4. Persist recommendations
      if (result.recommendations.length > 0) {
        await prisma.recommendation.createMany({
          data: result.recommendations.map((rec: RuleResult) => ({
            auditId: audit.id,
            ruleId: rec.ruleId,
            ruleName: rec.ruleName,
            category: this.mapCategory(rec.category),
            priority: rec.priority.toUpperCase() as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
            reason: rec.reason,
            currentState: rec.currentState,
            recommendedAction: rec.recommendedAction,
            estimatedMonthlySavings: new Prisma.Decimal(rec.expectedMonthlySavings),
            estimatedAnnualSavings: new Prisma.Decimal(rec.expectedAnnualSavings),
            confidenceScore: new Prisma.Decimal(rec.confidenceScore),
            affectedToolIds: rec.affectedToolIds,
          })),
        });
      }

      // 5. Update audit record with results
      const updatedAudit = await prisma.audit.update({
        where: { id: audit.id },
        data: {
          status: 'COMPLETED',
          totalSpend: new Prisma.Decimal(result.currentSpend),
          optimizedSpend: new Prisma.Decimal(result.optimizedSpend),
          potentialSavings: new Prisma.Decimal(result.monthlySavings),
          savingsPercentage: new Prisma.Decimal(result.savingsPercentage),
          healthScore: result.healthScore.overallScore,
          healthGrade: result.healthScore.grade,
          healthScoreDetails: result.healthScore as unknown as Prisma.InputJsonValue,
          overlapAnalysis: result.overlapAnalysis as unknown as Prisma.InputJsonValue,
          benchmarkAnalysis: result.benchmarkAnalysis as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      // 6. Cache result
      await cacheService.setAudit(audit.id, result);

      // 7. Emit completion event
      await eventBus.publish('audit.completed', {
        auditId: audit.id,
        organizationId: request.organizationId,
        healthScore: result.healthScore.overallScore,
        monthlySavings: result.monthlySavings,
        recommendationCount: result.recommendations.length,
      }, correlationId);

      log.info('audit_complete', `Audit completed for ${request.organizationId}`, {
        correlationId, auditId: audit.id, healthScore: result.healthScore.overallScore,
        monthlySavings: result.monthlySavings, recommendations: result.recommendations.length,
      });

      return {
        auditId: audit.id,
        organizationId: request.organizationId,
        status: 'COMPLETED',
        currentSpend: result.currentSpend,
        optimizedSpend: result.optimizedSpend,
        monthlySavings: result.monthlySavings,
        annualSavings: result.annualSavings,
        savingsPercentage: result.savingsPercentage,
        healthScore: result.healthScore.overallScore,
        healthGrade: result.healthScore.grade,
        recommendationCount: result.recommendations.length,
        overlapGroupCount: result.overlapAnalysis.overlapGroups.length,
        itemCount: result.itemCount,
        toolCount: result.toolCount,
        createdAt: updatedAudit.createdAt.toISOString(),
      };
    } catch (error) {
      // Mark audit as FAILED
      await prisma.audit.update({
        where: { id: audit.id },
        data: { status: 'FAILED' },
      });

      await eventBus.publish('audit.failed', {
        auditId: audit.id,
        organizationId: request.organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, correlationId);

      log.error('audit_failed', `Audit failed for ${request.organizationId}`, {
        correlationId, auditId: audit.id, error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  private mapCategory(category: string): 'PLAN_DOWNGRADE' | 'PLAN_UPGRADE' | 'SEAT_OPTIMIZATION' | 'TOOL_CONSOLIDATION' | 'OVERLAP_ELIMINATION' | 'API_OPTIMIZATION' | 'UNUSED_RESOURCE' | 'BILLING_OPTIMIZATION' | 'FEATURE_ALIGNMENT' {
    const map: Record<string, string> = {
      plan_downgrade: 'PLAN_DOWNGRADE',
      plan_upgrade: 'PLAN_UPGRADE',
      seat_optimization: 'SEAT_OPTIMIZATION',
      tool_consolidation: 'TOOL_CONSOLIDATION',
      overlap_elimination: 'OVERLAP_ELIMINATION',
      api_optimization: 'API_OPTIMIZATION',
      unused_resource: 'UNUSED_RESOURCE',
      billing_optimization: 'BILLING_OPTIMIZATION',
      feature_alignment: 'FEATURE_ALIGNMENT',
    };
    return (map[category] ?? 'BILLING_OPTIMIZATION') as ReturnType<typeof this.mapCategory>;
  }
}

export const auditOrchestrator = new AuditOrchestrator();
