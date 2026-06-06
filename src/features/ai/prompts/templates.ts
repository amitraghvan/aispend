import { z } from 'zod';

// ═══════════════════════════════════════════════
// ZOD SCHEMAS & TYPES
// ═══════════════════════════════════════════════

export const ExecutiveSummarySchema = z.object({
  summary: z.string().min(1),
  keyFindings: z.array(z.string()).min(1),
  topOpportunity: z.string().min(1),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

export type ExecutiveSummary = z.infer<typeof ExecutiveSummarySchema>;

export const RecommendationExplanationSchema = z.object({
  whyItExists: z.string().min(1),
  expectedOutcome: z.string().min(1),
  risk: z.string().min(1),
  complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  confidence: z.number().min(0).max(1),
  businessImpact: z.string().min(1),
});

export type RecommendationExplanation = z.infer<typeof RecommendationExplanationSchema>;

export const HealthScoreExplanationSchema = z.object({
  narrative: z.string().min(1),
  strengths: z.array(z.string()).min(1),
  weaknesses: z.array(z.string()).min(1),
  biggestFactors: z.array(z.string()).min(1),
  improvementActions: z.array(z.string()).min(1),
});

export type HealthScoreExplanation = z.infer<typeof HealthScoreExplanationSchema>;

export const BenchmarkNarrativeSchema = z.object({
  positionNarrative: z.string().min(1),
  percentileAnalysis: z.string().min(1),
  industryComparison: z.string().min(1),
  optimizationPotential: z.string().min(1),
});

export type BenchmarkNarrative = z.infer<typeof BenchmarkNarrativeSchema>;

export const OpportunityInsightSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  impact: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  confidence: z.number().min(0).max(1),
});

export type OpportunityInsight = z.infer<typeof OpportunityInsightSchema>;

export const OpportunityInsightListSchema = z.object({
  opportunities: z.array(OpportunityInsightSchema).min(1).max(3),
});

export type OpportunityInsightList = z.infer<typeof OpportunityInsightListSchema>;

// ═══════════════════════════════════════════════
// SYSTEM INSTRUCTION & TEMPLATES
// ═══════════════════════════════════════════════

const BASE_SYSTEM_INSTRUCTION = `You are the AI CFO for the AISPEND platform, an expert in AI subscription spend optimization, SaaS management, and corporate finance.
Your tone must be highly executive, objective, analytical, and professional.
CRITICAL MANDATE: Under no circumstances should you perform any mathematical calculations (including addition, subtraction, division, multiplication, percentages, or rounding differences). 
Only refer to and summarize the exact figures provided in the user prompt. Do not invent, adjust, or hallucinate any numbers.
You must output ONLY a valid JSON object starting with { and ending with }. Do not include any explanation outside the JSON.`;

export const PROMPTS = {
  EXECUTIVE_SUMMARY: {
    system: BASE_SYSTEM_INSTRUCTION,
    user: (data: {
      currentSpend: number;
      optimizedSpend: number;
      monthlySavings: number;
      annualSavings: number;
      healthScore: number;
      healthGrade: string;
      toolCount: number;
      recommendationCount: number;
      overlapGroupCount: number;
    }) => `Here is the AI Spend Audit Result:
* Current Monthly Spend: $${data.currentSpend}
* Optimized Monthly Spend: $${data.optimizedSpend}
* Potential Monthly Savings: $${data.monthlySavings}
* Potential Annual Savings: $${data.annualSavings}
* Health Score: ${data.healthScore}/100 (${data.healthGrade})
* Total Unique Tools: ${data.toolCount}
* Overlapping Tool Groups: ${data.overlapGroupCount}
* Active Recommendations: ${data.recommendationCount}

Please analyze this data and generate a JSON object matching this schema:
{
  "summary": "High-level summary of the spend audit findings.",
  "keyFindings": ["Key finding 1 based strictly on inputs", "Key finding 2"],
  "topOpportunity": "Description of the single most actionable saving opportunity from the stack.",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}`,
  },

  RECOMMENDATION: {
    system: BASE_SYSTEM_INSTRUCTION,
    user: (data: {
      ruleName: string;
      category: string;
      priority: string;
      reason: string;
      currentState: string;
      recommendedAction: string;
      estimatedMonthlySavings: number;
    }) => `Please explain the following spend audit recommendation:
* Recommendation Name: ${data.ruleName}
* Category: ${data.category}
* Priority: ${data.priority}
* Context / Reason: ${data.reason}
* Current State: ${data.currentState}
* Recommended Action: ${data.recommendedAction}
* Estimated Monthly Savings: $${data.estimatedMonthlySavings}

Generate a JSON object matching this schema:
{
  "whyItExists": "Contextual explanation of why this inefficiency exists.",
  "expectedOutcome": "What this action will achieve (using the exact savings provided).",
  "risk": "Assessment of potential organizational or technical risks (e.g. migration, productivity).",
  "complexity": "LOW" | "MEDIUM" | "HIGH",
  "confidence": 0.0 to 1.0 confidence score based on the clarity of the action,
  "businessImpact": "The overall impact on operations or cost efficiency."
}`,
  },

  HEALTH_SCORE: {
    system: BASE_SYSTEM_INSTRUCTION,
    user: (data: {
      overallScore: number;
      grade: string;
      subscoresText: string;
    }) => `Please analyze the AI Spend Health Score metrics:
* Overall Health Score: ${data.overallScore}/100
* Grade: ${data.grade}
* Core Subscores breakdown:
${data.subscoresText}

Generate a JSON object matching this schema:
{
  "narrative": "Executive narrative explaining the stack health status.",
  "strengths": ["Core stack strength 1", "Core stack strength 2"],
  "weaknesses": ["Core weakness 1", "Core weakness 2"],
  "biggestFactors": ["Primary factor affecting the score 1", "Primary factor 2"],
  "improvementActions": ["Actionable improvement recommendation 1", "Improvement 2"]
}`,
  },

  BENCHMARK: {
    system: BASE_SYSTEM_INSTRUCTION,
    user: (data: {
      spendPerEmployee: number;
      percentile: number;
      optimizationRating: string;
      industryAverage: number;
    }) => `Please analyze the company's AI spend benchmark position:
* Spend per Employee: $${data.spendPerEmployee}
* Percentile Position: ${data.percentile}th (Note: lower percentile indicates better spend efficiency)
* Optimization Rating: ${data.optimizationRating}
* Industry Average Spend: $${data.industryAverage}

Generate a JSON object matching this schema:
{
  "positionNarrative": "Explains where they sit in relation to peers.",
  "percentileAnalysis": "Analyzes the percentile ranking strictly using the percentile provided.",
  "industryComparison": "Compares their spend to the average industry rate.",
  "optimizationPotential": "Outlines the optimization potential without calculating new numbers."
}`,
  },

  OPPORTUNITIES: {
    system: BASE_SYSTEM_INSTRUCTION,
    user: (data: {
      recsText: string;
    }) => `Please review the active recommendations list and extract the top 3 high-impact opportunities:
${data.recsText}

Generate a JSON object matching this schema:
{
  "opportunities": [
    {
      "title": "Short title of opportunity 1",
      "description": "Clear description of what to do",
      "impact": "Description of financial and organizational impact",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "complexity": "LOW" | "MEDIUM" | "HIGH",
      "confidence": 0.0 to 1.0 confidence score
    }
  ]
}`,
  },
};
