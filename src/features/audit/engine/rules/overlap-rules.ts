/**
 * Overlap Detection & Consolidation Rules (Rules 16–35)
 *
 * Detect redundant tool subscriptions and recommend consolidation.
 */

import { Rule, RuleResult } from '../types';
import { AuditItemInput } from '../types/audit-input';

function makeRule(
  id: string,
  name: string,
  description: string,
  priority: 'critical' | 'high' | 'medium' | 'low',
  category: 'tool_consolidation' | 'overlap_elimination',
  evaluateFn: (items: AuditItemInput[]) => RuleResult | null
): Rule {
  return { id, name, category, priority, description, evaluate: evaluateFn };
}

function getItemsByUseCase(items: AuditItemInput[], useCase: string): AuditItemInput[] {
  return items.filter((i) => i.useCase === useCase);
}

function getItemsByToolId(items: AuditItemInput[], toolId: string): AuditItemInput | undefined {
  return items.find((i) => i.toolId === toolId);
}

const CODING_TOOLS = ['cursor', 'github-copilot', 'windsurf', 'v0'];
const GENERAL_AI_TOOLS = ['chatgpt', 'claude', 'gemini'];

export const overlapRules: Rule[] = [
  // ── Rule 16: Multiple coding assistants
  makeRule(
    'OV-001',
    'Multiple coding assistants detected',
    'Having more than one coding assistant creates redundancy.',
    'critical',
    'overlap_elimination',
    (items) => {
      const codingItems = items.filter((i) => CODING_TOOLS.includes(i.toolId) && i.monthlySpend > 0);
      if (codingItems.length < 2) return null;
      const totalSpend = codingItems.reduce((sum, i) => sum + i.monthlySpend, 0);
      const cheapest = codingItems.reduce((min, i) => (i.monthlySpend < min.monthlySpend ? i : min));
      const savings = totalSpend - cheapest.monthlySpend;
      return {
        ruleId: 'OV-001',
        ruleName: 'Multiple coding assistants detected',
        category: 'overlap_elimination',
        priority: 'critical',
        triggered: true,
        reason: `You are paying for ${codingItems.length} coding assistants (${codingItems.map((i) => i.toolId).join(', ')}). These tools have significant feature overlap. Consolidate to one.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.90,
        currentState: `${codingItems.length} coding tools: $${totalSpend}/mo combined`,
        recommendedAction: `Consolidate to ${cheapest.toolId} (${cheapest.planName}) and cancel the rest. Save $${savings}/mo.`,
        affectedToolIds: codingItems.map((i) => i.toolId),
      };
    }
  ),

  // ── Rule 17: Multiple general AI assistants
  makeRule(
    'OV-002',
    'Multiple general AI assistants detected',
    'Having ChatGPT + Claude + Gemini for the same use case is redundant.',
    'critical',
    'overlap_elimination',
    (items) => {
      const generalItems = items.filter((i) => GENERAL_AI_TOOLS.includes(i.toolId) && i.monthlySpend > 0);
      if (generalItems.length < 2) return null;
      const totalSpend = generalItems.reduce((sum, i) => sum + i.monthlySpend, 0);
      const cheapest = generalItems.reduce((min, i) => (i.monthlySpend < min.monthlySpend ? i : min));
      const savings = totalSpend - cheapest.monthlySpend;
      return {
        ruleId: 'OV-002',
        ruleName: 'Multiple general AI assistants detected',
        category: 'overlap_elimination',
        priority: 'critical',
        triggered: true,
        reason: `You are paying for ${generalItems.length} general AI assistants (${generalItems.map((i) => i.toolId).join(', ')}). Most startups can consolidate to one primary tool.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.85,
        currentState: `${generalItems.length} general AI tools: $${totalSpend}/mo combined`,
        recommendedAction: `Consolidate to ${cheapest.toolId} (${cheapest.planName}) as your primary AI assistant.`,
        affectedToolIds: generalItems.map((i) => i.toolId),
      };
    }
  ),

  // ── Rule 18: ChatGPT + Claude overlap (same use case)
  makeRule(
    'OV-003',
    'ChatGPT and Claude overlap',
    'Both ChatGPT and Claude are used for the same purpose.',
    'high',
    'tool_consolidation',
    (items) => {
      const chatgpt = getItemsByToolId(items, 'chatgpt');
      const claude = getItemsByToolId(items, 'claude');
      if (!chatgpt || !claude || chatgpt.monthlySpend === 0 || claude.monthlySpend === 0) return null;
      if (chatgpt.useCase !== claude.useCase) return null;
      const cheaper = chatgpt.monthlySpend <= claude.monthlySpend ? chatgpt : claude;
      const expensive = chatgpt.monthlySpend > claude.monthlySpend ? chatgpt : claude;
      const savings = expensive.monthlySpend;
      return {
        ruleId: 'OV-003',
        ruleName: 'ChatGPT and Claude overlap',
        category: 'tool_consolidation',
        priority: 'high',
        triggered: true,
        reason: `Both ChatGPT and Claude are used for "${chatgpt.useCase}". These tools have nearly identical capabilities for this use case. Pick one.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.85,
        currentState: `ChatGPT ($${chatgpt.monthlySpend}/mo) + Claude ($${claude.monthlySpend}/mo) for "${chatgpt.useCase}"`,
        recommendedAction: `Keep ${cheaper.toolId} (${cheaper.planName}) at $${cheaper.monthlySpend}/mo and cancel ${expensive.toolId}.`,
        affectedToolIds: ['chatgpt', 'claude'],
      };
    }
  ),

  // ── Rule 19: ChatGPT + Gemini overlap
  makeRule(
    'OV-004',
    'ChatGPT and Gemini overlap',
    'Both ChatGPT and Gemini are used for the same purpose.',
    'high',
    'tool_consolidation',
    (items) => {
      const chatgpt = getItemsByToolId(items, 'chatgpt');
      const gemini = getItemsByToolId(items, 'gemini');
      if (!chatgpt || !gemini || chatgpt.monthlySpend === 0 || gemini.monthlySpend === 0) return null;
      if (chatgpt.useCase !== gemini.useCase) return null;
      const cheaper = chatgpt.monthlySpend <= gemini.monthlySpend ? chatgpt : gemini;
      const expensive = chatgpt.monthlySpend > gemini.monthlySpend ? chatgpt : gemini;
      return {
        ruleId: 'OV-004',
        ruleName: 'ChatGPT and Gemini overlap',
        category: 'tool_consolidation',
        priority: 'high',
        triggered: true,
        reason: `Both ChatGPT and Gemini are used for "${chatgpt.useCase}". Consider consolidating to reduce redundancy.`,
        expectedMonthlySavings: expensive.monthlySpend,
        expectedAnnualSavings: expensive.monthlySpend * 12,
        confidenceScore: 0.80,
        currentState: `ChatGPT ($${chatgpt.monthlySpend}/mo) + Gemini ($${gemini.monthlySpend}/mo)`,
        recommendedAction: `Keep ${cheaper.toolId} and cancel ${expensive.toolId}. Save $${expensive.monthlySpend}/mo.`,
        affectedToolIds: ['chatgpt', 'gemini'],
      };
    }
  ),

  // ── Rule 20: Claude + Gemini overlap
  makeRule(
    'OV-005',
    'Claude and Gemini overlap',
    'Both Claude and Gemini are used for the same purpose.',
    'high',
    'tool_consolidation',
    (items) => {
      const claude = getItemsByToolId(items, 'claude');
      const gemini = getItemsByToolId(items, 'gemini');
      if (!claude || !gemini || claude.monthlySpend === 0 || gemini.monthlySpend === 0) return null;
      if (claude.useCase !== gemini.useCase) return null;
      const cheaper = claude.monthlySpend <= gemini.monthlySpend ? claude : gemini;
      const expensive = claude.monthlySpend > gemini.monthlySpend ? claude : gemini;
      return {
        ruleId: 'OV-005',
        ruleName: 'Claude and Gemini overlap',
        category: 'tool_consolidation',
        priority: 'high',
        triggered: true,
        reason: `Both Claude and Gemini are used for "${claude.useCase}". Consolidate to reduce costs.`,
        expectedMonthlySavings: expensive.monthlySpend,
        expectedAnnualSavings: expensive.monthlySpend * 12,
        confidenceScore: 0.80,
        currentState: `Claude ($${claude.monthlySpend}/mo) + Gemini ($${gemini.monthlySpend}/mo)`,
        recommendedAction: `Keep ${cheaper.toolId} and cancel ${expensive.toolId}. Save $${expensive.monthlySpend}/mo.`,
        affectedToolIds: ['claude', 'gemini'],
      };
    }
  ),

  // ── Rule 21: Cursor + GitHub Copilot overlap
  makeRule(
    'OV-006',
    'Cursor and GitHub Copilot overlap',
    'Cursor includes built-in AI — Copilot is redundant when Cursor is the primary editor.',
    'critical',
    'overlap_elimination',
    (items) => {
      const cursor = getItemsByToolId(items, 'cursor');
      const copilot = getItemsByToolId(items, 'github-copilot');
      if (!cursor || !copilot || cursor.monthlySpend === 0 || copilot.monthlySpend === 0) return null;
      return {
        ruleId: 'OV-006',
        ruleName: 'Cursor and GitHub Copilot overlap',
        category: 'overlap_elimination',
        priority: 'critical',
        triggered: true,
        reason: `Cursor already includes AI-powered completions, chat, and agent mode. GitHub Copilot is redundant if Cursor is the primary coding editor.`,
        expectedMonthlySavings: copilot.monthlySpend,
        expectedAnnualSavings: copilot.monthlySpend * 12,
        confidenceScore: 0.90,
        currentState: `Cursor ($${cursor.monthlySpend}/mo) + Copilot ($${copilot.monthlySpend}/mo)`,
        recommendedAction: `Cancel GitHub Copilot and use Cursor as your sole coding assistant. Save $${copilot.monthlySpend}/mo.`,
        affectedToolIds: ['cursor', 'github-copilot'],
      };
    }
  ),

  // ── Rule 22: Cursor + Windsurf overlap
  makeRule(
    'OV-007',
    'Cursor and Windsurf overlap',
    'Cursor and Windsurf are competing AI code editors. Choose one.',
    'critical',
    'overlap_elimination',
    (items) => {
      const cursor = getItemsByToolId(items, 'cursor');
      const windsurf = getItemsByToolId(items, 'windsurf');
      if (!cursor || !windsurf || cursor.monthlySpend === 0 || windsurf.monthlySpend === 0) return null;
      const cheaper = cursor.monthlySpend <= windsurf.monthlySpend ? cursor : windsurf;
      const expensive = cursor.monthlySpend > windsurf.monthlySpend ? cursor : windsurf;
      return {
        ruleId: 'OV-007',
        ruleName: 'Cursor and Windsurf overlap',
        category: 'overlap_elimination',
        priority: 'critical',
        triggered: true,
        reason: `Cursor and Windsurf are competing AI code editors with nearly identical feature sets. There is no reason to pay for both.`,
        expectedMonthlySavings: expensive.monthlySpend,
        expectedAnnualSavings: expensive.monthlySpend * 12,
        confidenceScore: 0.95,
        currentState: `Cursor ($${cursor.monthlySpend}/mo) + Windsurf ($${windsurf.monthlySpend}/mo)`,
        recommendedAction: `Keep ${cheaper.toolId} and cancel ${expensive.toolId}. Save $${expensive.monthlySpend}/mo.`,
        affectedToolIds: ['cursor', 'windsurf'],
      };
    }
  ),

  // ── Rule 23: Windsurf + GitHub Copilot overlap
  makeRule(
    'OV-008',
    'Windsurf and GitHub Copilot overlap',
    'Windsurf includes AI completions — Copilot is redundant.',
    'high',
    'overlap_elimination',
    (items) => {
      const windsurf = getItemsByToolId(items, 'windsurf');
      const copilot = getItemsByToolId(items, 'github-copilot');
      if (!windsurf || !copilot || windsurf.monthlySpend === 0 || copilot.monthlySpend === 0) return null;
      return {
        ruleId: 'OV-008',
        ruleName: 'Windsurf and GitHub Copilot overlap',
        category: 'overlap_elimination',
        priority: 'high',
        triggered: true,
        reason: `Windsurf includes AI completions and agentic flows. GitHub Copilot is redundant if Windsurf is the primary editor.`,
        expectedMonthlySavings: copilot.monthlySpend,
        expectedAnnualSavings: copilot.monthlySpend * 12,
        confidenceScore: 0.85,
        currentState: `Windsurf ($${windsurf.monthlySpend}/mo) + Copilot ($${copilot.monthlySpend}/mo)`,
        recommendedAction: `Cancel GitHub Copilot and use Windsurf exclusively. Save $${copilot.monthlySpend}/mo.`,
        affectedToolIds: ['windsurf', 'github-copilot'],
      };
    }
  ),

  // ── Rule 24: API + Subscription overlap (Claude)
  makeRule(
    'OV-009',
    'Claude API and Claude subscription overlap',
    'Paying for both Claude API and a Claude subscription may be redundant.',
    'high',
    'overlap_elimination',
    (items) => {
      const claudeSub = items.find((i) => i.toolId === 'claude' && i.monthlySpend > 0);
      const claudeApi = items.find((i) => i.toolId === 'anthropic-api' && i.monthlySpend > 0);
      if (!claudeSub || !claudeApi) return null;
      const cheaper = claudeSub.monthlySpend <= claudeApi.monthlySpend ? claudeSub : claudeApi;
      const expensive = claudeSub.monthlySpend > claudeApi.monthlySpend ? claudeSub : claudeApi;
      return {
        ruleId: 'OV-009',
        ruleName: 'Claude API and subscription overlap',
        category: 'overlap_elimination',
        priority: 'high',
        triggered: true,
        reason: `You are paying for both a Claude subscription ($${claudeSub.monthlySpend}/mo) and Anthropic API usage ($${claudeApi.monthlySpend}/mo). If API usage is for the same tasks as the subscription, consolidate to one.`,
        expectedMonthlySavings: expensive.monthlySpend,
        expectedAnnualSavings: expensive.monthlySpend * 12,
        confidenceScore: 0.70,
        currentState: `Claude sub ($${claudeSub.monthlySpend}/mo) + API ($${claudeApi.monthlySpend}/mo)`,
        recommendedAction: `Evaluate if both are needed. For interactive use, keep the subscription. For programmatic access, keep the API. Save up to $${expensive.monthlySpend}/mo.`,
        affectedToolIds: ['claude', 'anthropic-api'],
      };
    }
  ),

  // ── Rule 25: API + Subscription overlap (OpenAI)
  makeRule(
    'OV-010',
    'OpenAI API and ChatGPT subscription overlap',
    'Paying for both OpenAI API and ChatGPT subscription may be redundant.',
    'high',
    'overlap_elimination',
    (items) => {
      const chatgptSub = items.find((i) => i.toolId === 'chatgpt' && i.monthlySpend > 0);
      const openaiApi = items.find((i) => i.toolId === 'openai-api' && i.monthlySpend > 0);
      if (!chatgptSub || !openaiApi) return null;
      const cheaper = chatgptSub.monthlySpend <= openaiApi.monthlySpend ? chatgptSub : openaiApi;
      const expensive = chatgptSub.monthlySpend > openaiApi.monthlySpend ? chatgptSub : openaiApi;
      return {
        ruleId: 'OV-010',
        ruleName: 'OpenAI API and ChatGPT subscription overlap',
        category: 'overlap_elimination',
        priority: 'high',
        triggered: true,
        reason: `You are paying for both a ChatGPT subscription ($${chatgptSub.monthlySpend}/mo) and OpenAI API usage ($${openaiApi.monthlySpend}/mo). Consolidate if tasks overlap.`,
        expectedMonthlySavings: expensive.monthlySpend,
        expectedAnnualSavings: expensive.monthlySpend * 12,
        confidenceScore: 0.70,
        currentState: `ChatGPT sub ($${chatgptSub.monthlySpend}/mo) + API ($${openaiApi.monthlySpend}/mo)`,
        recommendedAction: `For interactive use, keep ChatGPT. For programmatic access, keep the API. Save up to $${expensive.monthlySpend}/mo.`,
        affectedToolIds: ['chatgpt', 'openai-api'],
      };
    }
  ),

  // ── Rule 26: Triple overlap — ChatGPT + Claude + Gemini
  makeRule(
    'OV-011',
    'Triple AI assistant overlap',
    'Using all three major AI assistants is highly redundant.',
    'critical',
    'tool_consolidation',
    (items) => {
      const chatgpt = getItemsByToolId(items, 'chatgpt');
      const claude = getItemsByToolId(items, 'claude');
      const gemini = getItemsByToolId(items, 'gemini');
      if (!chatgpt || !claude || !gemini) return null;
      if (chatgpt.monthlySpend === 0 || claude.monthlySpend === 0 || gemini.monthlySpend === 0) return null;
      const all = [chatgpt, claude, gemini];
      const totalSpend = all.reduce((s, i) => s + i.monthlySpend, 0);
      const cheapest = all.reduce((min, i) => (i.monthlySpend < min.monthlySpend ? i : min));
      const savings = totalSpend - cheapest.monthlySpend;
      return {
        ruleId: 'OV-011',
        ruleName: 'Triple AI assistant overlap',
        category: 'tool_consolidation',
        priority: 'critical',
        triggered: true,
        reason: `You are paying for ChatGPT ($${chatgpt.monthlySpend}/mo), Claude ($${claude.monthlySpend}/mo), and Gemini ($${gemini.monthlySpend}/mo). This is extreme redundancy. Most startups need only one primary AI assistant.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.90,
        currentState: `3 AI assistants: $${totalSpend}/mo total`,
        recommendedAction: `Consolidate to ${cheapest.toolId} (${cheapest.planName}). Cancel the other two. Save $${savings}/mo.`,
        affectedToolIds: ['chatgpt', 'claude', 'gemini'],
      };
    }
  ),

  // ── Rule 27: Multiple writing tools
  makeRule(
    'OV-012',
    'Multiple writing tools detected',
    'Multiple AI tools used for writing creates redundancy.',
    'high',
    'overlap_elimination',
    (items) => {
      const writingItems = items.filter((i) => i.useCase === 'writing' && i.monthlySpend > 0);
      if (writingItems.length < 2) return null;
      const totalSpend = writingItems.reduce((sum, i) => sum + i.monthlySpend, 0);
      const cheapest = writingItems.reduce((min, i) => (i.monthlySpend < min.monthlySpend ? i : min));
      const savings = totalSpend - cheapest.monthlySpend;
      return {
        ruleId: 'OV-012',
        ruleName: 'Multiple writing tools detected',
        category: 'overlap_elimination',
        priority: 'high',
        triggered: true,
        reason: `${writingItems.length} tools are used for writing (${writingItems.map((i) => i.toolId).join(', ')}). Consolidate to reduce costs.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.80,
        currentState: `${writingItems.length} writing tools: $${totalSpend}/mo`,
        recommendedAction: `Keep ${cheapest.toolId} for writing and cancel overlapping tools.`,
        affectedToolIds: writingItems.map((i) => i.toolId),
      };
    }
  ),

  // ── Rule 28: Multiple research tools
  makeRule(
    'OV-013',
    'Multiple research tools detected',
    'Multiple AI tools used for research creates redundancy.',
    'high',
    'overlap_elimination',
    (items) => {
      const researchItems = items.filter((i) => i.useCase === 'research' && i.monthlySpend > 0);
      if (researchItems.length < 2) return null;
      const totalSpend = researchItems.reduce((sum, i) => sum + i.monthlySpend, 0);
      const cheapest = researchItems.reduce((min, i) => (i.monthlySpend < min.monthlySpend ? i : min));
      const savings = totalSpend - cheapest.monthlySpend;
      return {
        ruleId: 'OV-013',
        ruleName: 'Multiple research tools detected',
        category: 'overlap_elimination',
        priority: 'high',
        triggered: true,
        reason: `${researchItems.length} tools are used for research (${researchItems.map((i) => i.toolId).join(', ')}). Consolidate.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.80,
        currentState: `${researchItems.length} research tools: $${totalSpend}/mo`,
        recommendedAction: `Keep ${cheapest.toolId} for research and cancel the rest.`,
        affectedToolIds: researchItems.map((i) => i.toolId),
      };
    }
  ),

  // ── Rule 29: Multiple data analysis tools
  makeRule(
    'OV-014',
    'Multiple data analysis tools detected',
    'Multiple AI tools used for data analysis creates redundancy.',
    'medium',
    'overlap_elimination',
    (items) => {
      const dataItems = items.filter((i) => i.useCase === 'data' && i.monthlySpend > 0);
      if (dataItems.length < 2) return null;
      const totalSpend = dataItems.reduce((sum, i) => sum + i.monthlySpend, 0);
      const cheapest = dataItems.reduce((min, i) => (i.monthlySpend < min.monthlySpend ? i : min));
      const savings = totalSpend - cheapest.monthlySpend;
      return {
        ruleId: 'OV-014',
        ruleName: 'Multiple data analysis tools detected',
        category: 'overlap_elimination',
        priority: 'medium',
        triggered: true,
        reason: `${dataItems.length} tools are used for data analysis. Consolidate to reduce costs.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.75,
        currentState: `${dataItems.length} data tools: $${totalSpend}/mo`,
        recommendedAction: `Keep ${cheapest.toolId} and cancel the rest.`,
        affectedToolIds: dataItems.map((i) => i.toolId),
      };
    }
  ),

  // ── Rule 30: Triple coding tool overlap
  makeRule(
    'OV-015',
    'Triple coding assistant overlap',
    'Three or more coding assistants is extreme redundancy.',
    'critical',
    'overlap_elimination',
    (items) => {
      const codingItems = items.filter((i) => CODING_TOOLS.includes(i.toolId) && i.monthlySpend > 0);
      if (codingItems.length < 3) return null;
      const totalSpend = codingItems.reduce((sum, i) => sum + i.monthlySpend, 0);
      const cheapest = codingItems.reduce((min, i) => (i.monthlySpend < min.monthlySpend ? i : min));
      const savings = totalSpend - cheapest.monthlySpend;
      return {
        ruleId: 'OV-015',
        ruleName: 'Triple coding assistant overlap',
        category: 'overlap_elimination',
        priority: 'critical',
        triggered: true,
        reason: `You have ${codingItems.length} paid coding assistants (${codingItems.map((i) => i.toolId).join(', ')}). This is extreme redundancy — all of these tools provide AI-powered code completions and chat.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.95,
        currentState: `${codingItems.length} coding tools: $${totalSpend}/mo combined`,
        recommendedAction: `Standardize on ${cheapest.toolId} and cancel all other coding assistants. Save $${savings}/mo.`,
        affectedToolIds: codingItems.map((i) => i.toolId),
      };
    }
  ),

  // ── Rules 31-35: Cross-category overlap detection
  makeRule(
    'OV-016',
    'General AI tool used for coding alongside coding assistant',
    'A general AI tool (ChatGPT/Claude/Gemini) used for coding is redundant if you have a dedicated coding assistant.',
    'medium',
    'tool_consolidation',
    (items) => {
      const codingAssistants = items.filter((i) => CODING_TOOLS.includes(i.toolId) && i.monthlySpend > 0);
      const generalForCoding = items.filter((i) => GENERAL_AI_TOOLS.includes(i.toolId) && i.useCase === 'coding' && i.monthlySpend > 0);
      if (codingAssistants.length === 0 || generalForCoding.length === 0) return null;
      const savings = generalForCoding.reduce((sum, i) => sum + i.monthlySpend, 0);
      return {
        ruleId: 'OV-016',
        ruleName: 'General AI used for coding alongside coding assistant',
        category: 'tool_consolidation',
        priority: 'medium',
        triggered: true,
        reason: `You have dedicated coding assistants (${codingAssistants.map((i) => i.toolId).join(', ')}) but also use general AI tools (${generalForCoding.map((i) => i.toolId).join(', ')}) for coding. The dedicated tools are better for coding tasks.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.70,
        currentState: `Coding assistants + general AI for coding: $${savings}/mo redundant spend`,
        recommendedAction: `Stop using ${generalForCoding.map((i) => i.toolId).join(', ')} for coding. Use your dedicated coding assistant instead.`,
        affectedToolIds: [...codingAssistants.map((i) => i.toolId), ...generalForCoding.map((i) => i.toolId)],
      };
    }
  ),

  makeRule(
    'OV-017',
    'Duplicate same-vendor subscription',
    'Multiple plans from the same vendor is likely a billing oversight.',
    'high',
    'overlap_elimination',
    (items) => {
      const chatgptItems = items.filter((i) => i.toolId === 'chatgpt' && i.monthlySpend > 0);
      if (chatgptItems.length < 2) return null;
      const totalSpend = chatgptItems.reduce((sum, i) => sum + i.monthlySpend, 0);
      const cheapest = chatgptItems.reduce((min, i) => (i.monthlySpend < min.monthlySpend ? i : min));
      const savings = totalSpend - cheapest.monthlySpend;
      return {
        ruleId: 'OV-017',
        ruleName: 'Duplicate ChatGPT subscriptions',
        category: 'overlap_elimination',
        priority: 'high',
        triggered: true,
        reason: `Multiple ChatGPT subscriptions detected. This is likely a billing oversight.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.95,
        currentState: `${chatgptItems.length} ChatGPT plans: $${totalSpend}/mo`,
        recommendedAction: `Consolidate to a single ChatGPT plan. Save $${savings}/mo.`,
        affectedToolIds: ['chatgpt'],
      };
    }
  ),

  makeRule(
    'OV-018',
    'Duplicate Claude subscriptions',
    'Multiple Claude plans is likely a billing oversight.',
    'high',
    'overlap_elimination',
    (items) => {
      const claudeItems = items.filter((i) => i.toolId === 'claude' && i.monthlySpend > 0);
      if (claudeItems.length < 2) return null;
      const totalSpend = claudeItems.reduce((sum, i) => sum + i.monthlySpend, 0);
      const cheapest = claudeItems.reduce((min, i) => (i.monthlySpend < min.monthlySpend ? i : min));
      const savings = totalSpend - cheapest.monthlySpend;
      return {
        ruleId: 'OV-018',
        ruleName: 'Duplicate Claude subscriptions',
        category: 'overlap_elimination',
        priority: 'high',
        triggered: true,
        reason: `Multiple Claude subscriptions detected. This is likely a billing oversight.`,
        expectedMonthlySavings: savings,
        expectedAnnualSavings: savings * 12,
        confidenceScore: 0.95,
        currentState: `${claudeItems.length} Claude plans: $${totalSpend}/mo`,
        recommendedAction: `Consolidate to a single Claude plan.`,
        affectedToolIds: ['claude'],
      };
    }
  ),

  makeRule(
    'OV-019',
    'v0 overlap with Cursor',
    'v0 for frontend generation overlaps with Cursor agentic capabilities.',
    'medium',
    'tool_consolidation',
    (items) => {
      const v0 = getItemsByToolId(items, 'v0');
      const cursor = getItemsByToolId(items, 'cursor');
      if (!v0 || !cursor || v0.monthlySpend === 0 || cursor.monthlySpend === 0) return null;
      return {
        ruleId: 'OV-019',
        ruleName: 'v0 overlap with Cursor',
        category: 'tool_consolidation',
        priority: 'medium',
        triggered: true,
        reason: `v0 generates UI code that Cursor can also generate using its agent mode. Consider using Cursor for all code generation.`,
        expectedMonthlySavings: v0.monthlySpend,
        expectedAnnualSavings: v0.monthlySpend * 12,
        confidenceScore: 0.65,
        currentState: `v0 ($${v0.monthlySpend}/mo) + Cursor ($${cursor.monthlySpend}/mo)`,
        recommendedAction: `Cancel v0 and use Cursor's agent mode for UI generation. Save $${v0.monthlySpend}/mo.`,
        affectedToolIds: ['v0', 'cursor'],
      };
    }
  ),

  makeRule(
    'OV-020',
    'Dual API provider overlap',
    'Using both OpenAI API and Anthropic API for the same use case is redundant.',
    'medium',
    'tool_consolidation',
    (items) => {
      const openai = getItemsByToolId(items, 'openai-api');
      const anthropic = getItemsByToolId(items, 'anthropic-api');
      if (!openai || !anthropic || openai.monthlySpend === 0 || anthropic.monthlySpend === 0) return null;
      if (openai.useCase !== anthropic.useCase) return null;
      const cheaper = openai.monthlySpend <= anthropic.monthlySpend ? openai : anthropic;
      const expensive = openai.monthlySpend > anthropic.monthlySpend ? openai : anthropic;
      return {
        ruleId: 'OV-020',
        ruleName: 'Dual API provider overlap',
        category: 'tool_consolidation',
        priority: 'medium',
        triggered: true,
        reason: `Both OpenAI API ($${openai.monthlySpend}/mo) and Anthropic API ($${anthropic.monthlySpend}/mo) are used for "${openai.useCase}". Consolidate to one provider.`,
        expectedMonthlySavings: expensive.monthlySpend,
        expectedAnnualSavings: expensive.monthlySpend * 12,
        confidenceScore: 0.70,
        currentState: `OpenAI API + Anthropic API for "${openai.useCase}"`,
        recommendedAction: `Consolidate to ${cheaper.toolId}. Save $${expensive.monthlySpend}/mo.`,
        affectedToolIds: ['openai-api', 'anthropic-api'],
      };
    }
  ),
];
