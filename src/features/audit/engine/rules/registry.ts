/**
 * Rule Registry — Central registration point for all optimization rules.
 */

import { Rule } from '../types';
import { planDowngradeRules } from './plan-downgrade-rules';
import { overlapRules } from './overlap-rules';
import { billingRules } from './billing-rules';

export class RuleRegistry {
  private rules: Rule[] = [];

  constructor() {
    this.registerAll(planDowngradeRules);
    this.registerAll(overlapRules);
    this.registerAll(billingRules);
  }

  register(rule: Rule): void {
    this.rules.push(rule);
  }

  registerAll(rules: Rule[]): void {
    this.rules.push(...rules);
  }

  getAll(): readonly Rule[] {
    return this.rules;
  }

  getById(ruleId: string): Rule | undefined {
    return this.rules.find((r) => r.id === ruleId);
  }

  getByCategory(category: string): Rule[] {
    return this.rules.filter((r) => r.category === category);
  }

  count(): number {
    return this.rules.length;
  }
}

export const ruleRegistry = new RuleRegistry();
