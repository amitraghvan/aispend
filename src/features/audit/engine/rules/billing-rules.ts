/**
 * Billing Optimization, Feature Alignment & Misc Rules (Rules 36–55)
 *
 * Annual billing, high-spend alerts, low-utilization flags, free tier opportunities.
 */

import { Rule, RuleResult } from '../types';
import { AuditItemInput } from '../types/audit-input';

function makeRule(
  id: string,
  name: string,
  description: string,
  priority: 'critical' | 'high' | 'medium' | 'low',
  category: 'billing_optimization' | 'feature_alignment' | 'unused_resource' | 'api_optimization' | 'seat_optimization',
  evaluateFn: (items: AuditItemInput[]) => RuleResult | null
): Rule {
  return { id, name, category, priority, description, evaluate: evaluateFn };
}

export const billingRules: Rule[] = [
  // ── Rule 36: Annual billing savings for Cursor
  makeRule('BO-001', 'Cursor annual billing discount', 'Cursor Pro annual saves vs monthly.', 'medium', 'billing_optimization',
    (items) => {
      const item = items.find((i) => i.toolId === 'cursor' && i.planName.toLowerCase() === 'pro');
      if (!item || item.monthlySpend <= 16) return null; // Already on annual or cheaper
      const annualMonthly = 16; // $192/yr = $16/mo
      const savings = (item.monthlySpend - annualMonthly) * item.seatCount;
      if (savings <= 0) return null;
      return {
        ruleId: 'BO-001', ruleName: 'Cursor annual billing discount', category: 'billing_optimization', priority: 'medium', triggered: true,
        reason: `Cursor Pro monthly billing ($20/mo) can be reduced to ~$16/mo with annual billing ($192/yr). Save 20%.`,
        expectedMonthlySavings: savings, expectedAnnualSavings: savings * 12, confidenceScore: 0.95,
        currentState: `Cursor Pro: ${item.seatCount} seats at $${item.monthlySpend}/mo (monthly billing)`,
        recommendedAction: `Switch to annual billing. Save $${savings}/mo ($${savings * 12}/yr).`,
        affectedToolIds: ['cursor'],
      };
    }
  ),

  // ── Rule 37: Annual billing savings for Copilot
  makeRule('BO-002', 'GitHub Copilot annual billing discount', 'Copilot Pro annual saves vs monthly.', 'medium', 'billing_optimization',
    (items) => {
      const item = items.find((i) => i.toolId === 'github-copilot' && i.planName.toLowerCase() === 'pro');
      if (!item || item.monthlySpend <= 8.33) return null;
      const annualMonthly = 8.33; // $100/yr
      const savings = Math.round((item.monthlySpend - annualMonthly) * item.seatCount * 100) / 100;
      if (savings <= 0) return null;
      return {
        ruleId: 'BO-002', ruleName: 'GitHub Copilot annual billing discount', category: 'billing_optimization', priority: 'medium', triggered: true,
        reason: `Copilot Pro monthly billing ($10/mo) can be reduced to ~$8.33/mo with annual billing ($100/yr).`,
        expectedMonthlySavings: savings, expectedAnnualSavings: Math.round(savings * 12 * 100) / 100, confidenceScore: 0.95,
        currentState: `Copilot Pro: ${item.seatCount} seats at $${item.monthlySpend}/mo`,
        recommendedAction: `Switch to annual billing.`,
        affectedToolIds: ['github-copilot'],
      };
    }
  ),

  // ── Rule 38: Annual billing savings for ChatGPT Team
  makeRule('BO-003', 'ChatGPT Team annual billing discount', 'ChatGPT Team annual saves.', 'medium', 'billing_optimization',
    (items) => {
      const item = items.find((i) => i.toolId === 'chatgpt' && i.planName.toLowerCase() === 'team');
      if (!item || item.monthlySpend / item.seatCount <= 25) return null;
      const annualMonthly = 25; // $300/yr = $25/mo
      const currentPerSeat = item.monthlySpend / item.seatCount;
      if (currentPerSeat <= annualMonthly) return null;
      const savings = Math.round((currentPerSeat - annualMonthly) * item.seatCount * 100) / 100;
      if (savings <= 0) return null;
      return {
        ruleId: 'BO-003', ruleName: 'ChatGPT Team annual billing', category: 'billing_optimization', priority: 'medium', triggered: true,
        reason: `ChatGPT Team annual billing ($25/seat/mo) saves over monthly billing.`,
        expectedMonthlySavings: savings, expectedAnnualSavings: savings * 12, confidenceScore: 0.90,
        currentState: `ChatGPT Team: ${item.seatCount} seats at ~$${currentPerSeat}/seat/mo`,
        recommendedAction: `Switch to annual billing.`,
        affectedToolIds: ['chatgpt'],
      };
    }
  ),

  // ── Rule 39: Annual billing for Windsurf Pro
  makeRule('BO-004', 'Windsurf Pro annual billing discount', 'Windsurf Pro annual saves.', 'medium', 'billing_optimization',
    (items) => {
      const item = items.find((i) => i.toolId === 'windsurf' && i.planName.toLowerCase() === 'pro');
      if (!item || item.monthlySpend <= 10) return null;
      const annualMonthly = 10; // $120/yr = $10/mo
      const savings = (item.monthlySpend - annualMonthly) * item.seatCount;
      if (savings <= 0) return null;
      return {
        ruleId: 'BO-004', ruleName: 'Windsurf Pro annual billing discount', category: 'billing_optimization', priority: 'medium', triggered: true,
        reason: `Windsurf Pro monthly ($15/mo) can be reduced to $10/mo with annual billing ($120/yr). Save 33%.`,
        expectedMonthlySavings: savings, expectedAnnualSavings: savings * 12, confidenceScore: 0.95,
        currentState: `Windsurf Pro: ${item.seatCount} seats at $${item.monthlySpend}/mo`,
        recommendedAction: `Switch to annual billing. Save $${savings}/mo.`,
        affectedToolIds: ['windsurf'],
      };
    }
  ),

  // ── Rule 40: High total AI spend alert
  makeRule('BO-005', 'High total AI spend alert', 'Total AI spend exceeds $500/mo — review needed.', 'high', 'billing_optimization',
    (items) => {
      const totalSpend = items.reduce((sum, i) => sum + i.monthlySpend, 0);
      if (totalSpend < 500) return null;
      return {
        ruleId: 'BO-005', ruleName: 'High total AI spend alert', category: 'billing_optimization', priority: 'high', triggered: true,
        reason: `Your total AI spend is $${totalSpend}/mo ($${totalSpend * 12}/yr). This exceeds the $500/mo threshold for startups. A comprehensive review of all subscriptions is recommended.`,
        expectedMonthlySavings: Math.round(totalSpend * 0.15), expectedAnnualSavings: Math.round(totalSpend * 0.15 * 12), confidenceScore: 0.60,
        currentState: `Total AI spend: $${totalSpend}/mo across ${items.length} subscriptions`,
        recommendedAction: `Review all subscriptions. Typical optimization saves 15-30% of total spend.`,
        affectedToolIds: items.map((i) => i.toolId),
      };
    }
  ),

  // ── Rule 41: Very high spend (>$1000/mo)
  makeRule('BO-006', 'Very high AI spend', 'Total AI spend exceeds $1000/mo.', 'critical', 'billing_optimization',
    (items) => {
      const totalSpend = items.reduce((sum, i) => sum + i.monthlySpend, 0);
      if (totalSpend < 1000) return null;
      return {
        ruleId: 'BO-006', ruleName: 'Very high AI spend', category: 'billing_optimization', priority: 'critical', triggered: true,
        reason: `Your total AI spend of $${totalSpend}/mo ($${totalSpend * 12}/yr) is extremely high for a startup. Immediate cost optimization is needed.`,
        expectedMonthlySavings: Math.round(totalSpend * 0.25), expectedAnnualSavings: Math.round(totalSpend * 0.25 * 12), confidenceScore: 0.55,
        currentState: `Total AI spend: $${totalSpend}/mo`,
        recommendedAction: `Conduct an emergency spend review. Target 25%+ reduction.`,
        affectedToolIds: items.map((i) => i.toolId),
      };
    }
  ),

  // ── Rule 42: Free tier opportunity (ChatGPT)
  makeRule('BO-007', 'ChatGPT free tier opportunity', 'Low-usage ChatGPT can use free tier.', 'medium', 'unused_resource',
    (items) => {
      const item = items.find((i) => i.toolId === 'chatgpt' && i.seatCount === 1 && i.monthlySpend > 0 && i.monthlySpend <= 20);
      if (!item || item.useCase === 'coding' || item.useCase === 'data') return null;
      return {
        ruleId: 'BO-007', ruleName: 'ChatGPT free tier opportunity', category: 'unused_resource', priority: 'medium', triggered: true,
        reason: `ChatGPT Free tier provides basic GPT-4o access. For light "${item.useCase}" usage, the free tier may be sufficient.`,
        expectedMonthlySavings: item.monthlySpend, expectedAnnualSavings: item.monthlySpend * 12, confidenceScore: 0.50,
        currentState: `ChatGPT ${item.planName}: $${item.monthlySpend}/mo`,
        recommendedAction: `Try the ChatGPT free tier for 2 weeks. If sufficient, cancel the paid plan.`,
        affectedToolIds: ['chatgpt'],
      };
    }
  ),

  // ── Rule 43: Free tier opportunity (Gemini)
  makeRule('BO-008', 'Gemini free tier opportunity', 'Low-usage Gemini can use free tier.', 'medium', 'unused_resource',
    (items) => {
      const item = items.find((i) => i.toolId === 'gemini' && i.seatCount === 1 && i.monthlySpend > 0 && i.monthlySpend <= 20);
      if (!item) return null;
      return {
        ruleId: 'BO-008', ruleName: 'Gemini free tier opportunity', category: 'unused_resource', priority: 'medium', triggered: true,
        reason: `Gemini Free provides Gemini 1.5 Flash access. For light usage, free may suffice.`,
        expectedMonthlySavings: item.monthlySpend, expectedAnnualSavings: item.monthlySpend * 12, confidenceScore: 0.50,
        currentState: `Gemini ${item.planName}: $${item.monthlySpend}/mo`,
        recommendedAction: `Try Gemini free tier. Cancel paid plan if sufficient.`,
        affectedToolIds: ['gemini'],
      };
    }
  ),

  // ── Rule 44: Free tier opportunity (Copilot)
  makeRule('BO-009', 'GitHub Copilot free tier opportunity', 'Low-usage Copilot can use free tier.', 'medium', 'unused_resource',
    (items) => {
      const item = items.find((i) => i.toolId === 'github-copilot' && i.seatCount === 1 && i.monthlySpend > 0 && i.monthlySpend <= 10);
      if (!item) return null;
      return {
        ruleId: 'BO-009', ruleName: 'Copilot free tier opportunity', category: 'unused_resource', priority: 'medium', triggered: true,
        reason: `GitHub Copilot Free provides 2000 completions and 50 chat messages per month. For light coding, this may be sufficient.`,
        expectedMonthlySavings: item.monthlySpend, expectedAnnualSavings: item.monthlySpend * 12, confidenceScore: 0.50,
        currentState: `Copilot ${item.planName}: $${item.monthlySpend}/mo`,
        recommendedAction: `Try Copilot free tier.`,
        affectedToolIds: ['github-copilot'],
      };
    }
  ),

  // ── Rule 45: Seat-to-team ratio alert
  makeRule('BO-010', 'Seat over-provisioning detected', 'Total seats exceed total team size.', 'high', 'seat_optimization',
    (items) => {
      const totalSeats = items.reduce((sum, i) => sum + i.seatCount, 0);
      const maxTeamSize = Math.max(...items.map((i) => i.teamSize));
      if (totalSeats <= maxTeamSize * 2) return null;
      const excessSeats = totalSeats - maxTeamSize;
      const avgCostPerSeat = items.reduce((sum, i) => sum + i.monthlySpend, 0) / totalSeats;
      const estimatedWaste = Math.round(excessSeats * avgCostPerSeat * 0.3);
      return {
        ruleId: 'BO-010', ruleName: 'Seat over-provisioning', category: 'seat_optimization', priority: 'high', triggered: true,
        reason: `Total seats across all tools (${totalSeats}) is more than 2x your largest team (${maxTeamSize}). Many seats are likely unused.`,
        expectedMonthlySavings: estimatedWaste, expectedAnnualSavings: estimatedWaste * 12, confidenceScore: 0.65,
        currentState: `${totalSeats} total seats, team size: ${maxTeamSize}`,
        recommendedAction: `Audit seat assignments across all tools. Remove unused seats.`,
        affectedToolIds: items.map((i) => i.toolId),
      };
    }
  ),

  // ── Rule 46: Cursor excess seats
  makeRule('BO-011', 'Cursor excess seats', 'Cursor seats exceed team size.', 'high', 'seat_optimization',
    (items) => {
      const item = items.find((i) => i.toolId === 'cursor' && i.seatCount > i.teamSize);
      if (!item) return null;
      const excess = item.seatCount - item.teamSize;
      const perSeat = item.monthlySpend / item.seatCount;
      const savings = Math.round(excess * perSeat * 100) / 100;
      return {
        ruleId: 'BO-011', ruleName: 'Cursor excess seats', category: 'seat_optimization', priority: 'high', triggered: true,
        reason: `Cursor has ${item.seatCount} seats but team size is ${item.teamSize}. ${excess} seat(s) are unused.`,
        expectedMonthlySavings: savings, expectedAnnualSavings: savings * 12, confidenceScore: 0.95,
        currentState: `Cursor: ${item.seatCount} seats, ${item.teamSize} users`,
        recommendedAction: `Reduce to ${item.teamSize} seats. Save $${savings}/mo.`,
        affectedToolIds: ['cursor'],
      };
    }
  ),

  // ── Rule 47: Windsurf excess seats
  makeRule('BO-012', 'Windsurf excess seats', 'Windsurf seats exceed team size.', 'high', 'seat_optimization',
    (items) => {
      const item = items.find((i) => i.toolId === 'windsurf' && i.seatCount > i.teamSize);
      if (!item) return null;
      const excess = item.seatCount - item.teamSize;
      const perSeat = item.monthlySpend / item.seatCount;
      const savings = Math.round(excess * perSeat * 100) / 100;
      return {
        ruleId: 'BO-012', ruleName: 'Windsurf excess seats', category: 'seat_optimization', priority: 'high', triggered: true,
        reason: `Windsurf has ${item.seatCount} seats but team size is ${item.teamSize}. ${excess} seat(s) are unused.`,
        expectedMonthlySavings: savings, expectedAnnualSavings: savings * 12, confidenceScore: 0.95,
        currentState: `Windsurf: ${item.seatCount} seats, ${item.teamSize} users`,
        recommendedAction: `Reduce to ${item.teamSize} seats.`,
        affectedToolIds: ['windsurf'],
      };
    }
  ),

  // ── Rule 48: Gemini excess seats
  makeRule('BO-013', 'Gemini excess seats', 'Gemini seats exceed team size.', 'high', 'seat_optimization',
    (items) => {
      const item = items.find((i) => i.toolId === 'gemini' && i.seatCount > i.teamSize);
      if (!item) return null;
      const excess = item.seatCount - item.teamSize;
      const perSeat = item.monthlySpend / item.seatCount;
      const savings = Math.round(excess * perSeat * 100) / 100;
      return {
        ruleId: 'BO-013', ruleName: 'Gemini excess seats', category: 'seat_optimization', priority: 'high', triggered: true,
        reason: `Gemini has ${item.seatCount} seats but team size is ${item.teamSize}. ${excess} seat(s) are unused.`,
        expectedMonthlySavings: savings, expectedAnnualSavings: savings * 12, confidenceScore: 0.95,
        currentState: `Gemini: ${item.seatCount} seats, ${item.teamSize} users`,
        recommendedAction: `Reduce to ${item.teamSize} seats.`,
        affectedToolIds: ['gemini'],
      };
    }
  ),

  // ── Rule 49: High per-seat spend
  makeRule('BO-014', 'High per-seat AI spend', 'Per-seat spend exceeds $100/mo.', 'high', 'billing_optimization',
    (items) => {
      const highSpendItems = items.filter((i) => i.seatCount > 0 && (i.monthlySpend / i.seatCount) > 100);
      if (highSpendItems.length === 0) return null;
      const worst = highSpendItems.reduce((max, i) => ((i.monthlySpend / i.seatCount) > (max.monthlySpend / max.seatCount) ? i : max));
      const perSeat = Math.round((worst.monthlySpend / worst.seatCount) * 100) / 100;
      return {
        ruleId: 'BO-014', ruleName: 'High per-seat spend', category: 'billing_optimization', priority: 'high', triggered: true,
        reason: `${worst.toolId} has a per-seat cost of $${perSeat}/mo which exceeds the $100/mo threshold. This is an unusually high per-seat cost for AI tools.`,
        expectedMonthlySavings: Math.round(worst.monthlySpend * 0.30), expectedAnnualSavings: Math.round(worst.monthlySpend * 0.30 * 12), confidenceScore: 0.60,
        currentState: `${worst.toolId} ${worst.planName}: $${perSeat}/seat/mo`,
        recommendedAction: `Review if this plan tier and seat count are appropriate.`,
        affectedToolIds: [worst.toolId],
      };
    }
  ),

  // ── Rule 50: API spend without subscription alternative
  makeRule('BO-015', 'Consider subscription over API', 'High API spend may be cheaper as subscription.', 'medium', 'api_optimization',
    (items) => {
      const apiItems = items.filter((i) => (i.toolId === 'openai-api' || i.toolId === 'anthropic-api') && i.monthlySpend > 50);
      if (apiItems.length === 0) return null;
      const item = apiItems[0];
      const subToolId = item.toolId === 'openai-api' ? 'chatgpt' : 'claude';
      const existingSub = items.find((i) => i.toolId === subToolId);
      if (existingSub) return null;
      return {
        ruleId: 'BO-015', ruleName: 'Consider subscription over API', category: 'api_optimization', priority: 'medium', triggered: true,
        reason: `${item.toolId} spend is $${item.monthlySpend}/mo. If this is primarily for interactive use, a ${subToolId} subscription ($20/mo) may be cheaper.`,
        expectedMonthlySavings: Math.max(0, item.monthlySpend - 20), expectedAnnualSavings: Math.max(0, item.monthlySpend - 20) * 12, confidenceScore: 0.55,
        currentState: `${item.toolId}: $${item.monthlySpend}/mo API usage`,
        recommendedAction: `Evaluate if a ${subToolId} subscription at $20/mo would cover your usage.`,
        affectedToolIds: [item.toolId],
      };
    }
  ),

  // ── Rule 51: Low API spend — keep pay-as-you-go
  makeRule('BO-016', 'API spend is efficient', 'Low API spend confirms pay-as-you-go is optimal.', 'low', 'api_optimization',
    (items) => {
      const apiItems = items.filter((i) => (i.toolId === 'openai-api' || i.toolId === 'anthropic-api') && i.monthlySpend > 0 && i.monthlySpend <= 20);
      if (apiItems.length === 0) return null;
      return {
        ruleId: 'BO-016', ruleName: 'API spend is efficient', category: 'api_optimization', priority: 'low', triggered: true,
        reason: `API spend ($${apiItems.map((i) => i.monthlySpend).join(', ')}/mo) is under $20/mo per provider. Pay-as-you-go is the optimal billing model at this volume.`,
        expectedMonthlySavings: 0, expectedAnnualSavings: 0, confidenceScore: 0.90,
        currentState: `Low API spend — efficient`,
        recommendedAction: `No action needed. Pay-as-you-go is optimal at this volume.`,
        affectedToolIds: apiItems.map((i) => i.toolId),
      };
    }
  ),

  // ── Rule 52: Single developer using team/business plans
  makeRule('BO-017', 'Solo developer on team plan', 'Team plans are unnecessary for solo developers.', 'high', 'feature_alignment',
    (items) => {
      const teamItems = items.filter((i) => i.teamSize === 1 && i.seatCount >= 2 && i.monthlySpend > 0);
      if (teamItems.length === 0) return null;
      const totalExcess = teamItems.reduce((sum, i) => sum + (i.seatCount - 1) * (i.monthlySpend / i.seatCount), 0);
      return {
        ruleId: 'BO-017', ruleName: 'Solo developer on team plan', category: 'feature_alignment', priority: 'high', triggered: true,
        reason: `${teamItems.length} tool(s) have team/business plans but only 1 team member. Team features (admin console, shared workspace) are wasted.`,
        expectedMonthlySavings: Math.round(totalExcess), expectedAnnualSavings: Math.round(totalExcess * 12), confidenceScore: 0.85,
        currentState: `${teamItems.length} team plans for solo developer`,
        recommendedAction: `Switch to individual plans for all tools.`,
        affectedToolIds: teamItems.map((i) => i.toolId),
      };
    }
  ),

  // ── Rule 53: Mixed use case with specialized tool
  makeRule('BO-018', 'General tool for specialized task', 'Using a general AI tool for a task with better specialized alternatives.', 'low', 'feature_alignment',
    (items) => {
      const generalForCoding = items.filter((i) => ['chatgpt', 'claude', 'gemini'].includes(i.toolId) && i.useCase === 'coding' && i.monthlySpend > 0);
      const hasCodingTool = items.some((i) => ['cursor', 'github-copilot', 'windsurf'].includes(i.toolId));
      if (generalForCoding.length === 0 || hasCodingTool) return null;
      return {
        ruleId: 'BO-018', ruleName: 'General tool for coding', category: 'feature_alignment', priority: 'low', triggered: true,
        reason: `Using ${generalForCoding.map((i) => i.toolId).join(', ')} for coding tasks. Specialized coding assistants (Cursor, Copilot, Windsurf) are more effective and often cheaper.`,
        expectedMonthlySavings: 0, expectedAnnualSavings: 0, confidenceScore: 0.50,
        currentState: `General AI tools used for coding`,
        recommendedAction: `Consider adding a specialized coding assistant like GitHub Copilot Free or Cursor Free.`,
        affectedToolIds: generalForCoding.map((i) => i.toolId),
      };
    }
  ),

  // ── Rule 54: Excessive total tool count
  makeRule('BO-019', 'Excessive AI tool count', 'More than 5 paid AI tools is excessive.', 'high', 'billing_optimization',
    (items) => {
      const paidItems = items.filter((i) => i.monthlySpend > 0);
      if (paidItems.length < 6) return null;
      const totalSpend = paidItems.reduce((sum, i) => sum + i.monthlySpend, 0);
      return {
        ruleId: 'BO-019', ruleName: 'Excessive AI tool count', category: 'billing_optimization', priority: 'high', triggered: true,
        reason: `You are paying for ${paidItems.length} AI tools. Most startups can operate efficiently with 2-3 tools. Tool proliferation leads to context-switching, training overhead, and wasted spend.`,
        expectedMonthlySavings: Math.round(totalSpend * 0.30), expectedAnnualSavings: Math.round(totalSpend * 0.30 * 12), confidenceScore: 0.65,
        currentState: `${paidItems.length} paid AI tools: $${totalSpend}/mo`,
        recommendedAction: `Consolidate to 2-3 core tools. Target 30% cost reduction.`,
        affectedToolIds: paidItems.map((i) => i.toolId),
      };
    }
  ),

  // ── Rule 55: Single high-cost tool dominates spend
  makeRule('BO-020', 'Single tool dominates spend', 'One tool accounts for >60% of total AI spend.', 'medium', 'billing_optimization',
    (items) => {
      const totalSpend = items.reduce((sum, i) => sum + i.monthlySpend, 0);
      if (totalSpend === 0) return null;
      const dominant = items.reduce((max, i) => (i.monthlySpend > max.monthlySpend ? i : max));
      const percentage = Math.round((dominant.monthlySpend / totalSpend) * 100);
      if (percentage < 60) return null;
      return {
        ruleId: 'BO-020', ruleName: 'Single tool dominates spend', category: 'billing_optimization', priority: 'medium', triggered: true,
        reason: `${dominant.toolId} (${dominant.planName}) accounts for ${percentage}% of your total AI spend ($${dominant.monthlySpend}/$${totalSpend}). Review if this concentration is justified.`,
        expectedMonthlySavings: 0, expectedAnnualSavings: 0, confidenceScore: 0.40,
        currentState: `${dominant.toolId}: $${dominant.monthlySpend}/mo (${percentage}% of total)`,
        recommendedAction: `Review the ${dominant.toolId} ${dominant.planName} plan. Ensure the tier and seat count are optimized.`,
        affectedToolIds: [dominant.toolId],
      };
    }
  ),
];
