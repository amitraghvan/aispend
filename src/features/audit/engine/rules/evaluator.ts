/**
 * Rule Evaluator — Runs all registered rules against audit input.
 *
 * Deterministic, stateless evaluation. Returns all triggered recommendations.
 */

import { RuleResult, Rule } from '../types';
import { AuditItemInput } from '../types/audit-input';
import { RuleRegistry, ruleRegistry } from './registry';

export class RuleEvaluator {
  private registry: RuleRegistry;

  constructor(registry: RuleRegistry = ruleRegistry) {
    this.registry = registry;
  }

  /**
   * Evaluate all rules against the given audit items.
   * Returns only triggered rules, sorted by expected savings (desc).
   */
  evaluate(items: AuditItemInput[]): RuleResult[] {
    const results: RuleResult[] = [];
    const rules = this.registry.getAll();

    for (const rule of rules) {
      try {
        const result = rule.evaluate(items);
        if (result && result.triggered) {
          results.push(result);
        }
      } catch {
        // Rule evaluation should never throw — swallow and continue.
        // In production, log the error via the logging framework.
      }
    }

    // Sort by expected monthly savings descending (highest savings first)
    results.sort((a, b) => b.expectedMonthlySavings - a.expectedMonthlySavings);

    return results;
  }

  /**
   * Get the total number of rules in the registry.
   */
  ruleCount(): number {
    return this.registry.count();
  }
}

export const ruleEvaluator = new RuleEvaluator();
