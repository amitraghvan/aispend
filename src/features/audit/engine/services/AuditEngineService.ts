/**
 * Audit Engine Service — Top-Level Orchestrator
 *
 * Orchestrates the full audit pipeline:
 * 1. Validate input
 * 2. Run rule evaluator (55 rules)
 * 3. Compute savings
 * 4. Detect overlaps
 * 5. Calculate health score
 * 6. Generate benchmarks
 * 7. Assemble canonical AuditResult
 */

import { AuditResult } from '../types';
import { AuditRequest, validateAuditRequest } from '../types/audit-input';
import { RuleEvaluator, ruleEvaluator } from '../rules/evaluator';
import { SavingsService, savingsService } from './SavingsService';
import { OverlapDetectionService, overlapDetectionService } from './OverlapDetectionService';
import { HealthScoreService, healthScoreService } from './HealthScoreService';
import { BenchmarkService, benchmarkService } from './BenchmarkService';
import { randomUUID } from 'crypto';

export interface AuditEngineOptions {
  totalEmployees?: number;
  totalDevelopers?: number;
}

export class AuditEngineService {
  private evaluator: RuleEvaluator;
  private savings: SavingsService;
  private overlap: OverlapDetectionService;
  private health: HealthScoreService;
  private benchmark: BenchmarkService;

  constructor(
    evaluator: RuleEvaluator = ruleEvaluator,
    savings: SavingsService = savingsService,
    overlap: OverlapDetectionService = overlapDetectionService,
    health: HealthScoreService = healthScoreService,
    benchmark: BenchmarkService = benchmarkService
  ) {
    this.evaluator = evaluator;
    this.savings = savings;
    this.overlap = overlap;
    this.health = health;
    this.benchmark = benchmark;
  }

  /**
   * Execute a full audit on the given request.
   *
   * @param request - Raw audit request (will be validated)
   * @param options - Optional company context for benchmarks
   * @returns Canonical AuditResult
   */
  execute(request: unknown, options: AuditEngineOptions = {}): AuditResult {
    // 1. Validate input
    const validated = validateAuditRequest(request);
    const items = validated.items;

    // 2. Run rule evaluator
    const recommendations = this.evaluator.evaluate(items);

    // 3. Compute savings
    const savingsResult = this.savings.calculateSavings(items, recommendations);

    // 4. Detect overlaps
    const overlapAnalysis = this.overlap.analyze(items);

    // 5. Calculate health score
    const healthScore = this.health.calculate(
      items,
      recommendations,
      overlapAnalysis,
      savingsResult.savingsPercentage
    );

    // 6. Generate benchmarks
    const totalEmployees = options.totalEmployees ?? this.estimateTeamSize(items);
    const benchmarkAnalysis = this.benchmark.calculate(
      items,
      totalEmployees,
      options.totalDevelopers
    );

    // 7. Assemble canonical result
    const uniqueTools = new Set(items.map((i) => i.toolId));

    const result: AuditResult = {
      auditId: randomUUID(),
      companyId: validated.companyId,
      generatedAt: new Date().toISOString(),
      healthScore,
      currentSpend: savingsResult.currentMonthlySpend,
      optimizedSpend: savingsResult.optimizedMonthlySpend,
      monthlySavings: savingsResult.monthlySavings,
      annualSavings: savingsResult.annualSavings,
      savingsPercentage: savingsResult.savingsPercentage,
      recommendations,
      overlapAnalysis,
      benchmarkAnalysis,
      itemCount: items.length,
      toolCount: uniqueTools.size,
    };

    return result;
  }

  /**
   * Estimate total team size from audit items.
   * Uses the maximum team size across all items as a proxy.
   */
  private estimateTeamSize(items: AuditRequest['items']): number {
    if (items.length === 0) return 1;
    return Math.max(...items.map((i) => i.teamSize));
  }

  /**
   * Get the number of rules in the engine.
   */
  getRuleCount(): number {
    return this.evaluator.ruleCount();
  }
}

export const auditEngineService = new AuditEngineService();
