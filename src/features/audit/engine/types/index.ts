/**
 * Rule Engine Core Types
 *
 * Every recommendation must be: deterministic, explainable, defensible, testable.
 */

import { AuditItemInput } from './audit-input';

// ──────────────────────────────────────────────
// RULE TYPES
// ──────────────────────────────────────────────

export type RulePriority = 'critical' | 'high' | 'medium' | 'low';
export type RuleCategory =
  | 'plan_downgrade'
  | 'plan_upgrade'
  | 'seat_optimization'
  | 'tool_consolidation'
  | 'overlap_elimination'
  | 'api_optimization'
  | 'unused_resource'
  | 'billing_optimization'
  | 'feature_alignment';

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  priority: RulePriority;
  triggered: boolean;
  reason: string;
  expectedMonthlySavings: number;
  expectedAnnualSavings: number;
  confidenceScore: number; // 0.0 to 1.0
  currentState: string;
  recommendedAction: string;
  affectedToolIds: string[];
}

export interface Rule {
  id: string;
  name: string;
  category: RuleCategory;
  priority: RulePriority;
  description: string;
  evaluate(items: AuditItemInput[]): RuleResult | null;
}

// ──────────────────────────────────────────────
// OVERLAP TYPES
// ──────────────────────────────────────────────

export interface OverlapGroup {
  useCase: string;
  toolIds: string[];
  toolNames: string[];
  combinedMonthlySpend: number;
  overlapScore: number;   // 0–100
  redundancyScore: number; // 0–100
  consolidationSuggestion: string;
  estimatedSavings: number;
}

export interface OverlapAnalysis {
  overlapGroups: OverlapGroup[];
  totalOverlapScore: number;
  totalRedundancyScore: number;
  totalEstimatedSavings: number;
}

// ──────────────────────────────────────────────
// HEALTH SCORE TYPES
// ──────────────────────────────────────────────

export interface HealthSubScore {
  name: string;
  score: number;   // 0–100
  weight: number;  // 0.0–1.0
  explanation: string;
}

export interface HealthScoreResult {
  overallScore: number; // 0–100
  grade: string;        // A, B, C, D, F
  subscores: HealthSubScore[];
  summary: string;
}

// ──────────────────────────────────────────────
// BENCHMARK TYPES
// ──────────────────────────────────────────────

export interface BenchmarkResult {
  spendPerEmployee: number;
  spendPerDeveloper: number | null;
  percentile: number;          // 0–100
  optimizationRating: string;  // 'excellent' | 'good' | 'average' | 'below_average' | 'poor'
  industryAverage: number;
  explanation: string;
}

// ──────────────────────────────────────────────
// SAVINGS TYPES
// ──────────────────────────────────────────────

export interface SavingsResult {
  currentMonthlySpend: number;
  optimizedMonthlySpend: number;
  monthlySavings: number;
  annualSavings: number;
  savingsPercentage: number;
  confidenceScore: number;
}

// ──────────────────────────────────────────────
// CANONICAL AUDIT RESULT
// ──────────────────────────────────────────────

export interface AuditResult {
  auditId: string;
  companyId: string;
  generatedAt: string;
  healthScore: HealthScoreResult;
  currentSpend: number;
  optimizedSpend: number;
  monthlySavings: number;
  annualSavings: number;
  savingsPercentage: number;
  recommendations: RuleResult[];
  overlapAnalysis: OverlapAnalysis;
  benchmarkAnalysis: BenchmarkResult;
  itemCount: number;
  toolCount: number;
}
