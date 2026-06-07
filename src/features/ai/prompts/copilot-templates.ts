import { z } from 'zod';

// ─── SCHEMAS ───

export const ChatResponseSchema = z.object({
  reply: z.string().min(1),
  suggestedFollowUps: z.array(z.string()).optional(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const ActionPlanStepSchema = z.object({
  title: z.string().min(1),
  goal: z.string().min(1),
  impact: z.string().min(1),
  complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  actionableSteps: z.array(z.string()).min(1),
});

export const ActionPlanWeekSchema = z.object({
  weekNumber: z.number(),
  goal: z.string().min(1),
  steps: z.array(ActionPlanStepSchema).min(1),
});

export const ActionPlanSchema = z.object({
  weeks: z.array(ActionPlanWeekSchema).min(1),
});

export type ActionPlan = z.infer<typeof ActionPlanSchema>;

export const DeepDiveSchema = z.object({
  whyItExists: z.string().min(1),
  expectedOutcome: z.string().min(1),
  risk: z.string().min(1),
  complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  implementationGuidance: z.array(z.string()).min(1),
});

export type DeepDive = z.infer<typeof DeepDiveSchema>;

export const ExecutiveAdvisorSchema = z.object({
  peerComparison: z.string().min(1),
  biggestWasteArea: z.string().min(1),
  leadershipFocus: z.string().min(1),
  strategicRecommendations: z.array(z.string()).min(1),
  executiveSummary: z.string().min(1),
});

export type ExecutiveAdvisor = z.infer<typeof ExecutiveAdvisorSchema>;

// ─── SYSTEM INSTRUCTIONS ───

const BASE_COPILOT_SYSTEM_INSTRUCTION = `You are the AI Spend Copilot for the AISPEND platform, an expert in AI subscription spend optimization, SaaS management, and corporate finance.
Your tone must be executive, objective, helpful, analytical, and professional.
You answer user questions about their AI spend audits, tool usage, health scores, and recommended saving options.
CRITICAL MANDATE: Under no circumstances should you perform any mathematical calculations (including addition, subtraction, division, multiplication, percentages, or rounding differences).
Only refer to and summarize the exact figures provided in the audit context. Do not invent, adjust, or hallucinate any numbers.
If the user asks you to execute an action, buy or cancel a subscription, modify the database, or check another company's data, politely refuse, stating that you are a read-only advisor.
You must output ONLY a valid JSON object matching the requested schema. Do not include any explanation outside the JSON.`;

export const COPILOT_PROMPTS = {
  CHAT: {
    system: BASE_COPILOT_SYSTEM_INSTRUCTION,
    user: (question: string, auditContext: string, historyText: string) => `Audit Context:
${auditContext}

Conversation History:
${historyText || "No previous messages."}

User Question: "${question}"

Please answer the user's question. Output a valid JSON matching this schema:
{
  "reply": "Your markdown-formatted response, keeping numbers strictly corresponding to the audit context. Use bullet points or headers where helpful.",
  "suggestedFollowUps": ["Suggested follow-up question 1", "Suggested question 2"]
}`
  },

  ACTION_PLAN: {
    system: BASE_COPILOT_SYSTEM_INSTRUCTION,
    user: (auditContext: string) => `Audit Context:
${auditContext}

Please generate a 30-day week-by-week optimization plan based on this audit. Output a valid JSON matching this schema:
{
  "weeks": [
    {
      "weekNumber": 1,
      "goal": "Week 1 goal description",
      "steps": [
        {
          "title": "Step title",
          "goal": "Step goal details",
          "impact": "Financial/operational impact using context numbers",
          "complexity": "LOW" | "MEDIUM" | "HIGH",
          "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
          "actionableSteps": ["Concrete task 1", "Concrete task 2"]
        }
      ]
    }
  ]
}`
  },

  DEEP_DIVE: {
    system: BASE_COPILOT_SYSTEM_INSTRUCTION,
    user: (recommendationDetails: string) => `Recommendation details:
${recommendationDetails}

Please provide an in-depth implementation deep-dive for this recommendation. Output a valid JSON matching this schema:
{
  "whyItExists": "Contextual reason for this issue.",
  "expectedOutcome": "Detailed expected outcome using numbers provided.",
  "risk": "Technical or team impact risks.",
  "complexity": "LOW" | "MEDIUM" | "HIGH",
  "implementationGuidance": ["Step 1", "Step 2", "Step 3"]
}`
  },

  EXECUTIVE: {
    system: BASE_COPILOT_SYSTEM_INSTRUCTION,
    user: (auditContext: string) => `Audit Context:
${auditContext}

Please generate a board-level strategic brief and executive advisor analysis. Output a valid JSON matching this schema:
{
  "peerComparison": "Paragraph comparing their spend stance to typical peers.",
  "biggestWasteArea": "Paragraph pinpointing the absolute largest optimization wastage.",
  "leadershipFocus": "Summary of where executive leadership should focus.",
  "strategicRecommendations": ["Strategic action 1", "Strategic action 2"],
  "executiveSummary": "High-level summary of optimization headroom."
}`
  }
};
