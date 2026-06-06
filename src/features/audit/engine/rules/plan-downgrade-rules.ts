/**
 * Plan Downgrade Rules (Rules 1–15)
 *
 * Detect when a team is paying for a higher-tier plan than they need,
 * and recommend downgrading to save money.
 */

import { Rule, RuleResult } from '../types';
import { AuditItemInput } from '../types/audit-input';
import { toolCatalogRepository } from '@/features/audit/catalog/repositories/ToolCatalogRepository';

function makeRule(
  id: string,
  name: string,
  description: string,
  priority: 'critical' | 'high' | 'medium' | 'low',
  evaluateFn: (items: AuditItemInput[]) => RuleResult | null
): Rule {
  return {
    id,
    name,
    category: 'plan_downgrade',
    priority,
    description,
    evaluate: evaluateFn,
  };
}

// Helper: find item by toolId and plan name
function findItem(items: AuditItemInput[], toolId: string, planName: string): AuditItemInput | undefined {
  return items.find(
    (i) => i.toolId === toolId && i.planName.toLowerCase() === planName.toLowerCase()
  );
}

function findItemByTool(items: AuditItemInput[], toolId: string): AuditItemInput | undefined {
  return items.find((i) => i.toolId === toolId);
}

export const planDowngradeRules: Rule[] = [
  // ── Rule 1: ChatGPT Team → Plus (small teams)
  makeRule(
    'PD-001',
    'ChatGPT Team to Plus downgrade',
    'ChatGPT Team plan is overkill for teams of 1-2 users. ChatGPT Plus provides the same model access.',
    'high',
    (items) => {
      const item = findItem(items, 'chatgpt', 'Team');
      if (!item || item.seatCount > 2) return null;
      const currentCost = item.monthlySpend;
      const optimizedCost = 20 * item.seatCount;
      const savings = currentCost - optimizedCost;
      if (savings <= 0) return null;
      return {
        ruleId: 'PD-001',
        ruleName: 'ChatGPT Team to Plus downgrade',
        category: 'plan_downgrade',
        priority: 'high',
        triggered: true,
        reason: `ChatGPT Team plan with only ${item.seatCount} seat(s) can be replaced with individual ChatGPT Plus subscriptions. Team features (shared workspace, admin console) are unnecessary for teams this small.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.95,
        currentState: `ChatGPT Team: ${item.seatCount} seats at $${currentCost}/mo`,
        recommendedAction: `Switch to ${item.seatCount}x ChatGPT Plus at $20/seat/mo ($${optimizedCost}/mo)`,
        affectedToolIds: ['chatgpt'],
      };
    }
  ),

  // ── Rule 2: Claude Team → Pro (solo user)
  makeRule(
    'PD-002',
    'Claude Team to Pro downgrade',
    'Claude Team plan requires minimum 5 seats. A solo user should use Claude Pro.',
    'high',
    (items) => {
      const item = findItem(items, 'claude', 'Team');
      if (!item || item.teamSize > 1) return null;
      const currentCost = item.monthlySpend;
      const optimizedCost = 20;
      const savings = currentCost - optimizedCost;
      if (savings <= 0) return null;
      return {
        ruleId: 'PD-002',
        ruleName: 'Claude Team to Pro downgrade',
        category: 'plan_downgrade',
        priority: 'high',
        triggered: true,
        reason: `Claude Team plan is designed for teams of 5+ users. With a team size of 1, Claude Pro at $20/mo provides the same model access without paying for unused team features.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.95,
        currentState: `Claude Team: ${item.seatCount} seats at $${currentCost}/mo, team size ${item.teamSize}`,
        recommendedAction: `Switch to Claude Pro at $20/mo`,
        affectedToolIds: ['claude'],
      };
    }
  ),

  // ── Rule 3: ChatGPT Pro → Plus (overkill for most users)
  makeRule(
    'PD-003',
    'ChatGPT Pro to Plus downgrade',
    'ChatGPT Pro at $200/mo is overkill for non-power-users. Plus provides GPT-4o access.',
    'critical',
    (items) => {
      const item = findItem(items, 'chatgpt', 'Pro');
      if (!item) return null;
      if (item.useCase === 'research' || item.useCase === 'data') return null;
      const currentCost = item.monthlySpend;
      const optimizedCost = 20 * item.seatCount;
      const savings = currentCost - optimizedCost;
      if (savings <= 0) return null;
      return {
        ruleId: 'PD-003',
        ruleName: 'ChatGPT Pro to Plus downgrade',
        category: 'plan_downgrade',
        priority: 'critical',
        triggered: true,
        reason: `ChatGPT Pro ($200/mo) provides unlimited o1 pro mode which is rarely needed for "${item.useCase}" use cases. ChatGPT Plus at $20/mo provides GPT-4o, DALL-E, and web browsing — sufficient for most workflows.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.85,
        currentState: `ChatGPT Pro: ${item.seatCount} seat(s) at $${currentCost}/mo`,
        recommendedAction: `Switch to ChatGPT Plus at $20/seat/mo ($${optimizedCost}/mo)`,
        affectedToolIds: ['chatgpt'],
      };
    }
  ),

  // ── Rule 4: Copilot Enterprise → Business (if no knowledge bases needed)
  makeRule(
    'PD-004',
    'GitHub Copilot Enterprise to Business downgrade',
    'Copilot Enterprise at $39/seat is unnecessary if knowledge base features are not used.',
    'high',
    (items) => {
      const item = findItem(items, 'github-copilot', 'Enterprise');
      if (!item) return null;
      const currentCost = item.monthlySpend;
      const optimizedCost = 19 * item.seatCount;
      const savings = currentCost - optimizedCost;
      if (savings <= 0) return null;
      return {
        ruleId: 'PD-004',
        ruleName: 'GitHub Copilot Enterprise to Business downgrade',
        category: 'plan_downgrade',
        priority: 'high',
        triggered: true,
        reason: `GitHub Copilot Enterprise ($39/seat) adds knowledge bases and fine-tuned models over Business ($19/seat). Most teams do not use these features.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.80,
        currentState: `Copilot Enterprise: ${item.seatCount} seats at $${currentCost}/mo`,
        recommendedAction: `Switch to Copilot Business at $19/seat/mo ($${optimizedCost}/mo)`,
        affectedToolIds: ['github-copilot'],
      };
    }
  ),

  // ── Rule 5: Copilot Pro+ → Pro (unnecessary premium features)
  makeRule(
    'PD-005',
    'GitHub Copilot Pro+ to Pro downgrade',
    'Copilot Pro+ at $39/mo mainly adds unlimited agent mode. Pro at $10/mo is sufficient for most developers.',
    'high',
    (items) => {
      const item = findItem(items, 'github-copilot', 'Pro+');
      if (!item) return null;
      const currentCost = item.monthlySpend;
      const optimizedCost = 10 * item.seatCount;
      const savings = currentCost - optimizedCost;
      if (savings <= 0) return null;
      return {
        ruleId: 'PD-005',
        ruleName: 'GitHub Copilot Pro+ to Pro downgrade',
        category: 'plan_downgrade',
        priority: 'high',
        triggered: true,
        reason: `GitHub Copilot Pro+ ($39/mo) mainly provides unlimited agent mode over Pro ($10/mo). Unless agentic workflows are core to your development, Pro is sufficient.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.80,
        currentState: `Copilot Pro+: ${item.seatCount} seat(s) at $${currentCost}/mo`,
        recommendedAction: `Switch to Copilot Pro at $10/seat/mo ($${optimizedCost}/mo)`,
        affectedToolIds: ['github-copilot'],
      };
    }
  ),

  // ── Rule 6: Cursor Business → Pro (small team)
  makeRule(
    'PD-006',
    'Cursor Business to Pro downgrade',
    'Cursor Business ($40/seat) adds admin features. Teams of 1-3 rarely need admin dashboards.',
    'medium',
    (items) => {
      const item = findItem(items, 'cursor', 'Business');
      if (!item || item.seatCount > 3) return null;
      const currentCost = item.monthlySpend;
      const optimizedCost = 20 * item.seatCount;
      const savings = currentCost - optimizedCost;
      if (savings <= 0) return null;
      return {
        ruleId: 'PD-006',
        ruleName: 'Cursor Business to Pro downgrade',
        category: 'plan_downgrade',
        priority: 'medium',
        triggered: true,
        reason: `Cursor Business ($40/seat) provides admin dashboard, SSO, and usage analytics. For a team of ${item.seatCount}, Cursor Pro ($20/seat) delivers the same AI capabilities.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.85,
        currentState: `Cursor Business: ${item.seatCount} seats at $${currentCost}/mo`,
        recommendedAction: `Switch to Cursor Pro at $20/seat/mo ($${optimizedCost}/mo)`,
        affectedToolIds: ['cursor'],
      };
    }
  ),

  // ── Rule 7: Gemini Enterprise → Business
  makeRule(
    'PD-007',
    'Gemini Enterprise to Business downgrade',
    'Gemini Enterprise ($36/seat) is overkill unless custom models and advanced security are needed.',
    'medium',
    (items) => {
      const item = findItem(items, 'gemini', 'Enterprise');
      if (!item) return null;
      const currentCost = item.monthlySpend;
      const optimizedCost = 24 * item.seatCount;
      const savings = currentCost - optimizedCost;
      if (savings <= 0) return null;
      return {
        ruleId: 'PD-007',
        ruleName: 'Gemini Enterprise to Business downgrade',
        category: 'plan_downgrade',
        priority: 'medium',
        triggered: true,
        reason: `Gemini Enterprise ($36/seat) adds custom models and grounding with search over Business ($24/seat). Most teams use standard Gemini capabilities.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.75,
        currentState: `Gemini Enterprise: ${item.seatCount} seats at $${currentCost}/mo`,
        recommendedAction: `Switch to Gemini Business at $24/seat/mo ($${optimizedCost}/mo)`,
        affectedToolIds: ['gemini'],
      };
    }
  ),

  // ── Rule 8: Gemini Business → Advanced (individual user)
  makeRule(
    'PD-008',
    'Gemini Business to Advanced downgrade',
    'Gemini Business ($24/seat) is for teams. Individual users should use Gemini Advanced ($20/mo).',
    'medium',
    (items) => {
      const item = findItem(items, 'gemini', 'Business');
      if (!item || item.seatCount > 1) return null;
      const currentCost = item.monthlySpend;
      const optimizedCost = 20;
      const savings = currentCost - optimizedCost;
      if (savings <= 0) return null;
      return {
        ruleId: 'PD-008',
        ruleName: 'Gemini Business to Advanced downgrade',
        category: 'plan_downgrade',
        priority: 'medium',
        triggered: true,
        reason: `Gemini Business ($24/mo) is designed for organization-wide deployment. A single user gets better value with Gemini Advanced ($20/mo) which includes 2TB storage.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.90,
        currentState: `Gemini Business: 1 seat at $${currentCost}/mo`,
        recommendedAction: `Switch to Gemini Advanced at $20/mo`,
        affectedToolIds: ['gemini'],
      };
    }
  ),

  // ── Rule 9: Windsurf Team → Pro (small team)
  makeRule(
    'PD-009',
    'Windsurf Team to Pro downgrade',
    'Windsurf Team ($35/seat) adds admin controls. Solo developers or pairs should use Pro ($15/seat).',
    'medium',
    (items) => {
      const item = findItem(items, 'windsurf', 'Team');
      if (!item || item.seatCount > 2) return null;
      const currentCost = item.monthlySpend;
      const optimizedCost = 15 * item.seatCount;
      const savings = currentCost - optimizedCost;
      if (savings <= 0) return null;
      return {
        ruleId: 'PD-009',
        ruleName: 'Windsurf Team to Pro downgrade',
        category: 'plan_downgrade',
        priority: 'medium',
        triggered: true,
        reason: `Windsurf Team ($35/seat) adds admin controls and usage analytics over Pro ($15/seat). For a team of ${item.seatCount}, Pro provides the same AI capabilities.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.85,
        currentState: `Windsurf Team: ${item.seatCount} seats at $${currentCost}/mo`,
        recommendedAction: `Switch to Windsurf Pro at $15/seat/mo ($${optimizedCost}/mo)`,
        affectedToolIds: ['windsurf'],
      };
    }
  ),

  // ── Rule 10: v0 Team → Premium (small team)
  makeRule(
    'PD-010',
    'v0 Team to Premium downgrade',
    'v0 Team ($30/seat) adds team workspace. Individual developers should use v0 Premium ($20/mo).',
    'low',
    (items) => {
      const item = findItem(items, 'v0', 'Team');
      if (!item || item.seatCount > 1) return null;
      const currentCost = item.monthlySpend;
      const optimizedCost = 20;
      const savings = currentCost - optimizedCost;
      if (savings <= 0) return null;
      return {
        ruleId: 'PD-010',
        ruleName: 'v0 Team to Premium downgrade',
        category: 'plan_downgrade',
        priority: 'low',
        triggered: true,
        reason: `v0 Team ($30/mo) adds team workspace over Premium ($20/mo). A single user does not benefit from shared workspaces.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.90,
        currentState: `v0 Team: 1 seat at $${currentCost}/mo`,
        recommendedAction: `Switch to v0 Premium at $20/mo`,
        affectedToolIds: ['v0'],
      };
    }
  ),

  // ── Rule 11: ChatGPT Enterprise → Team (small org)
  makeRule(
    'PD-011',
    'ChatGPT Enterprise to Team downgrade',
    'ChatGPT Enterprise ($60/seat) is for large orgs. Teams under 20 users rarely need SSO/SCIM.',
    'high',
    (items) => {
      const item = findItem(items, 'chatgpt', 'Enterprise');
      if (!item || item.seatCount >= 20) return null;
      const currentCost = item.monthlySpend;
      const optimizedCost = 25 * item.seatCount;
      const savings = currentCost - optimizedCost;
      if (savings <= 0) return null;
      return {
        ruleId: 'PD-011',
        ruleName: 'ChatGPT Enterprise to Team downgrade',
        category: 'plan_downgrade',
        priority: 'high',
        triggered: true,
        reason: `ChatGPT Enterprise ($60/seat) adds SSO, custom data retention, and admin analytics over Team ($25/seat). With only ${item.seatCount} seats, Team plan is sufficient.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.80,
        currentState: `ChatGPT Enterprise: ${item.seatCount} seats at $${currentCost}/mo`,
        recommendedAction: `Switch to ChatGPT Team at $25/seat/mo ($${optimizedCost}/mo)`,
        affectedToolIds: ['chatgpt'],
      };
    }
  ),

  // ── Rule 12: Claude Enterprise → Team (small org)
  makeRule(
    'PD-012',
    'Claude Enterprise to Team downgrade',
    'Claude Enterprise ($60/seat) adds SSO and audit logs. Teams under 20 can use Claude Team.',
    'high',
    (items) => {
      const item = findItem(items, 'claude', 'Enterprise');
      if (!item || item.seatCount >= 20) return null;
      const currentCost = item.monthlySpend;
      const optimizedCost = 25 * item.seatCount;
      const savings = currentCost - optimizedCost;
      if (savings <= 0) return null;
      return {
        ruleId: 'PD-012',
        ruleName: 'Claude Enterprise to Team downgrade',
        category: 'plan_downgrade',
        priority: 'high',
        triggered: true,
        reason: `Claude Enterprise ($60/seat) is designed for orgs needing SSO/SCIM, audit logs, and custom retention. With ${item.seatCount} seats, Claude Team ($25/seat) provides sufficient collaboration features.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.80,
        currentState: `Claude Enterprise: ${item.seatCount} seats at $${currentCost}/mo`,
        recommendedAction: `Switch to Claude Team at $25/seat/mo ($${optimizedCost}/mo)`,
        affectedToolIds: ['claude'],
      };
    }
  ),

  // ── Rule 13: Claude Team with unused seats
  makeRule(
    'PD-013',
    'Claude Team excess seats',
    'Detect Claude Team subscriptions where seat count exceeds actual team size.',
    'high',
    (items) => {
      const item = findItem(items, 'claude', 'Team');
      if (!item || item.seatCount <= item.teamSize) return null;
      const excessSeats = item.seatCount - item.teamSize;
      const savings = excessSeats * 25;
      return {
        ruleId: 'PD-013',
        ruleName: 'Claude Team excess seats',
        category: 'seat_optimization',
        priority: 'high',
        triggered: true,
        reason: `Claude Team has ${item.seatCount} seats but team size is only ${item.teamSize}. You are paying for ${excessSeats} unused seat(s) at $25/seat/mo.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.95,
        currentState: `Claude Team: ${item.seatCount} seats, ${item.teamSize} active users`,
        recommendedAction: `Reduce seat count to ${Math.max(item.teamSize, 5)} (Team minimum is 5)`,
        affectedToolIds: ['claude'],
      };
    }
  ),

  // ── Rule 14: Copilot Business with unused seats
  makeRule(
    'PD-014',
    'GitHub Copilot Business excess seats',
    'Detect Copilot Business subscriptions where seat count exceeds team size.',
    'high',
    (items) => {
      const item = findItem(items, 'github-copilot', 'Business');
      if (!item || item.seatCount <= item.teamSize) return null;
      const excessSeats = item.seatCount - item.teamSize;
      const savings = excessSeats * 19;
      return {
        ruleId: 'PD-014',
        ruleName: 'GitHub Copilot Business excess seats',
        category: 'seat_optimization',
        priority: 'high',
        triggered: true,
        reason: `GitHub Copilot Business has ${item.seatCount} seats but only ${item.teamSize} team members. You are paying for ${excessSeats} unused seat(s) at $19/seat/mo.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.95,
        currentState: `Copilot Business: ${item.seatCount} seats, ${item.teamSize} active users`,
        recommendedAction: `Reduce seat count to ${item.teamSize}`,
        affectedToolIds: ['github-copilot'],
      };
    }
  ),

  // ── Rule 15: ChatGPT Team with unused seats
  makeRule(
    'PD-015',
    'ChatGPT Team excess seats',
    'Detect ChatGPT Team subscriptions where seat count exceeds team size.',
    'high',
    (items) => {
      const item = findItem(items, 'chatgpt', 'Team');
      if (!item || item.seatCount <= item.teamSize) return null;
      const excessSeats = item.seatCount - item.teamSize;
      const savings = excessSeats * 25;
      return {
        ruleId: 'PD-015',
        ruleName: 'ChatGPT Team excess seats',
        category: 'seat_optimization',
        priority: 'high',
        triggered: true,
        reason: `ChatGPT Team has ${item.seatCount} seats but only ${item.teamSize} team members. You are paying for ${excessSeats} unused seat(s) at $25/seat/mo.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.95,
        currentState: `ChatGPT Team: ${item.seatCount} seats, ${item.teamSize} active users`,
        recommendedAction: `Reduce seat count to ${Math.max(item.teamSize, 2)} (Team minimum is 2)`,
        affectedToolIds: ['chatgpt'],
      };
    }
  ),
];
