import { executiveSummaryService } from './ExecutiveSummaryService';
import { healthScoreExplainerService, HealthSubscoreInput } from './HealthScoreExplainerService';
import { benchmarkNarrativeService } from './BenchmarkNarrativeService';
import { opportunityInsightService, OpportunityRecommendationInput } from './OpportunityInsightService';
import { cacheService } from '@/lib/cache/cache-service';
import { auditRepository } from '@/features/audit/repositories/AuditRepository';
import { trackServerEvent } from '@/lib/observability/posthog';
import { logger } from '@/lib/logger/logger';
import * as Sentry from '@sentry/nextjs';
import { 
  ExecutiveSummary, 
  HealthScoreExplanation, 
  BenchmarkNarrative, 
  OpportunityInsight 
} from '../prompts/templates';

const log = logger.forService('ai-orchestrator');

export interface AIInsightsResponse {
  executiveSummary: ExecutiveSummary;
  opportunities: OpportunityInsight[];
  healthScoreExplanation: HealthScoreExplanation;
  benchmarkNarrative: BenchmarkNarrative;
}

export interface InMemoryAuditResult {
  totalSpend: number;
  optimizedSpend: number;
  potentialSavings: number;
  savingsPercentage: number;
  healthScore: number;
  healthGrade: string;
  toolCount: number;
  itemCount: number;
  recommendations: Array<{
    ruleName: string;
    category: string;
    priority: string;
    reason: string;
    currentState: string;
    recommendedAction: string;
    estimatedMonthlySavings: number;
  }>;
  healthScoreDetails?: {
    overallScore: number;
    grade: string;
    subscores: HealthSubscoreInput[];
  };
  benchmarkAnalysis?: {
    spendPerEmployee: number;
    percentile: number;
    optimizationRating: string;
    industryAverage: number;
  };
}

export class AIOrchestrator {
  private cacheNamespace = 'ai_insights';
  private ttlSeconds = 86400; // 24 hours

  async getInsights(
    input: string | InMemoryAuditResult,
    organizationId?: string,
    bypassCache: boolean = false
  ): Promise<AIInsightsResponse> {
    const startTime = Date.now();
    const isDbAudit = typeof input === 'string';
    const auditId = isDbAudit ? input : 'in-memory';
    const orgId = organizationId || 'anonymous';

    log.info('insights_requested', `Insights requested for audit: ${auditId}, org: ${orgId}`);

    // ── 1. Cache Check ──
    if (isDbAudit && !bypassCache) {
      try {
        const cached = await cacheService.get<AIInsightsResponse>(this.cacheNamespace, auditId);
        if (cached) {
          log.info('insights_cache_hit', `Insights cache hit for audit: ${auditId}`);
          trackServerEvent(orgId, 'ai_insights_cache_hit', { auditId, organizationId: orgId });
          return cached;
        }
        log.info('insights_cache_miss', `Insights cache miss for audit: ${auditId}`);
        trackServerEvent(orgId, 'ai_insights_cache_miss', { auditId, organizationId: orgId });
      } catch (cacheErr) {
        log.warn('insights_cache_error', `Failed to read cache for audit: ${auditId}`, { error: cacheErr });
      }
    }

    // ── 2. Data Preparation ──
    let auditData: InMemoryAuditResult;

    if (isDbAudit) {
      const dbAudit = await auditRepository.findById(auditId);
      if (!dbAudit) {
        throw new Error(`Audit with ID ${auditId} not found`);
      }

      // Format DB audit into standard In-Memory audit layout
      const dbRecommendations = dbAudit.recommendations.map(r => ({
        ruleName: r.ruleName,
        category: r.category,
        priority: r.priority,
        reason: r.reason,
        currentState: r.currentState || '',
        recommendedAction: r.recommendedAction || '',
        estimatedMonthlySavings: Number(r.estimatedMonthlySavings),
      }));

      const hsDetails = dbAudit.healthScoreDetails as {
        overallScore?: number;
        grade?: string;
        subscores?: HealthSubscoreInput[];
      } | null;
      const bmDetails = dbAudit.benchmarkAnalysis as {
        spendPerEmployee?: number;
        percentile?: number;
        optimizationRating?: string;
        industryAverage?: number;
      } | null;

      auditData = {
        totalSpend: Number(dbAudit.totalSpend),
        optimizedSpend: dbAudit.optimizedSpend ? Number(dbAudit.optimizedSpend) : Number(dbAudit.totalSpend),
        potentialSavings: Number(dbAudit.potentialSavings),
        savingsPercentage: dbAudit.savingsPercentage ? Number(dbAudit.savingsPercentage) : 0,
        healthScore: dbAudit.healthScore ?? 100,
        healthGrade: dbAudit.healthGrade || 'A',
        toolCount: dbAudit.toolCount,
        itemCount: dbAudit.itemCount,
        recommendations: dbRecommendations,
        healthScoreDetails: hsDetails ? {
          overallScore: hsDetails.overallScore ?? (dbAudit.healthScore ?? 100),
          grade: hsDetails.grade ?? (dbAudit.healthGrade || 'A'),
          subscores: hsDetails.subscores || [],
        } : undefined,
        benchmarkAnalysis: bmDetails ? {
          spendPerEmployee: bmDetails.spendPerEmployee ?? 0,
          percentile: bmDetails.percentile ?? 50,
          optimizationRating: bmDetails.optimizationRating || 'average',
          industryAverage: bmDetails.industryAverage ?? 0,
        } : undefined,
      };
    } else {
      auditData = input;
    }

    // Fallbacks for subscores and benchmark data if missing (e.g. from legacy structure or simple inputs)
    const subscores = auditData.healthScoreDetails?.subscores || [
      { name: 'Spend Efficiency', score: auditData.healthScore, weight: 0.4, explanation: 'Calculated from savings potential' },
      { name: 'Software Overlap', score: auditData.healthScore, weight: 0.3, explanation: 'Tool consolidation opportunities' },
      { name: 'Seat Capacity', score: auditData.healthScore, weight: 0.3, explanation: 'License utilization' },
    ];

    const benchmark = auditData.benchmarkAnalysis || {
      spendPerEmployee: Math.round(auditData.totalSpend / (auditData.itemCount || 1)),
      percentile: auditData.savingsPercentage > 30 ? 30 : auditData.savingsPercentage > 15 ? 50 : 70,
      optimizationRating: auditData.healthScore >= 80 ? 'good' : auditData.healthScore >= 60 ? 'average' : 'below_average',
      industryAverage: Math.round(auditData.totalSpend * 0.8),
    };

    // ── 3. Concurrent AI Generation ──
    try {
      const [
        execSummary,
        healthExplanation,
        benchNarrative,
        optInsights
      ] = await Promise.all([
        executiveSummaryService.generateSummary({
          currentSpend: auditData.totalSpend,
          optimizedSpend: auditData.optimizedSpend,
          monthlySavings: auditData.potentialSavings,
          annualSavings: auditData.potentialSavings * 12,
          healthScore: auditData.healthScore,
          healthGrade: auditData.healthGrade,
          toolCount: auditData.toolCount,
          recommendationCount: auditData.recommendations.length,
          overlapGroupCount: auditData.recommendations.filter(r => r.category === 'OVERLAP_ELIMINATION').length,
        }),
        
        healthScoreExplainerService.generateExplanation({
          overallScore: auditData.healthScore,
          grade: auditData.healthGrade,
          subscores,
        }),
        
        benchmarkNarrativeService.generateNarrative({
          spendPerEmployee: benchmark.spendPerEmployee,
          percentile: benchmark.percentile,
          optimizationRating: benchmark.optimizationRating,
          industryAverage: benchmark.industryAverage,
        }),

        opportunityInsightService.generateOpportunities(
          auditData.recommendations as OpportunityRecommendationInput[]
        ),
      ]);

      const insightsResponse: AIInsightsResponse = {
        executiveSummary: execSummary,
        opportunities: optInsights.opportunities,
        healthScoreExplanation: healthExplanation,
        benchmarkNarrative: benchNarrative,
      };

      const latency = Date.now() - startTime;
      log.info('insights_generated_successfully', `Insights generated in ${latency}ms for audit ${auditId}`);

      // Track server event in PostHog
      trackServerEvent(orgId, 'ai_insights_generation_success', {
        auditId,
        organizationId: orgId,
        latencyMs: latency,
        toolCount: auditData.toolCount,
        recommendationCount: auditData.recommendations.length,
      });

      // ── 4. Cache Store ──
      if (isDbAudit) {
        try {
          await cacheService.set(this.cacheNamespace, auditId, insightsResponse, this.ttlSeconds);
        } catch (cacheStoreErr) {
          log.warn('insights_cache_store_error', `Failed to write cache for audit: ${auditId}`, { error: cacheStoreErr });
        }
      }

      return insightsResponse;

    } catch (generationError) {
      log.error('insights_generation_failed', `Failed to generate AI insights for audit ${auditId}`, { error: generationError });
      Sentry.captureException(generationError);

      trackServerEvent(orgId, 'ai_insights_generation_failed', {
        auditId,
        organizationId: orgId,
        error: generationError instanceof Error ? generationError.message : String(generationError),
      });

      throw generationError;
    }
  }
}

export const aiOrchestrator = new AIOrchestrator();
