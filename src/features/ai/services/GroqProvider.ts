import { LLMProvider } from './LLMProvider';
import { env } from '@/validators/env';
import { z } from 'zod';
import { logger } from '@/lib/logger/logger';
import * as Sentry from '@sentry/nextjs';

const log = logger.forService('groq-provider');

export class GroqProvider implements LLMProvider {
  private isMockMode: boolean = false;
  private apiKey: string = '';

  constructor() {
    const key = env.GROQ_API_KEY;
    if (!key || key.startsWith('gsk_mock') || process.env.NODE_ENV === 'test') {
      this.isMockMode = true;
      log.warn('mock_mode', 'Groq API key is mock or absent. Running in mock fallback mode.');
    } else {
      this.apiKey = key;
    }
  }

  async generateStructuredJSON<T>(
    systemInstruction: string,
    prompt: string,
    schema: z.ZodType<T>,
    timeoutMs: number = 10000
  ): Promise<T> {
    if (this.isMockMode) {
      return this.generateMockResponse(schema);
    }

    let lastError: unknown;
    // 3x exponential retry backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Groq API returned status ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('Expected message content from Groq response');
        }

        const jsonText = this.extractJSON(content);
        const parsed = JSON.parse(jsonText);
        return schema.parse(parsed);

      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        log.warn('groq_attempt_failed', `Attempt ${attempt + 1} failed: ${msg}`);
        if (attempt < 2) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    log.error('groq_failed', `Groq request failed after 3 attempts`, { error: lastError });
    Sentry.captureException(lastError);
    throw lastError;
  }

  private extractJSON(text: string): string {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return text.substring(start, end + 1);
    }
    
    return text.trim();
  }

  private generateMockResponse<T>(schema: z.ZodType<T>): T {
    const dummyObj: Record<string, unknown> = {};
    
    dummyObj.summary = "The AI spend audit reveals significant cost optimization opportunities across coding and research tools. By addressing redundancies and plan misfits, the company can improve its spending posture and boost stack health.";
    dummyObj.keyFindings = [
      "Detected redundant seat licenses on high-tier coding tools.",
      "Identified duplicate software usage across overlapping development domains."
    ];
    dummyObj.topOpportunity = "Consolidate coding platforms into a single enterprise standard, downgrading duplicate developers.";
    dummyObj.riskLevel = "MEDIUM";

    dummyObj.whyItExists = "This rule is triggered because the team size matches standard tiers but is configured with excess individual developer seat counts.";
    dummyObj.expectedOutcome = "Implementing this recommendation will reduce unnecessary licensing waste and save the team direct monthly subscription costs.";
    dummyObj.risk = "Minor impact on developer onboarding speeds if licenses are cut too close to the current team ceiling.";
    dummyObj.complexity = "LOW";
    dummyObj.confidence = 0.95;
    dummyObj.businessImpact = "High operational savings with zero code disruption.";

    dummyObj.narrative = "The overall stack score is average. While database configurations and billing frequency are well-optimized, user licensing and software overlaps represent the largest friction points.";
    dummyObj.strengths = ["Annual billing frequency matches vendor discount tiers.", "Clean database indexes ensure high API execution performance."];
    dummyObj.weaknesses = ["High redundancy in writing/coding tools.", "Over-provisioned developer seats."];
    dummyObj.biggestFactors = ["Unused seat licenses on GitHub Copilot.", "Overlapping Claude Pro and ChatGPT Team subscriptions."];
    dummyObj.improvementActions = ["Revoke 5 unused GitHub Copilot licenses.", "Cancel overlapping mixed-use tools."];

    dummyObj.positionNarrative = "Your AI spend is slightly higher than the industry median for mid-market technology firms.";
    dummyObj.percentileAnalysis = "Sitting at the 65th percentile indicates that 65% of peer organizations spend less than you per employee.";
    dummyObj.industryComparison = "Your average spend per developer is $45 compared to the technology sector average of $32.";
    dummyObj.optimizationPotential = "By executing standard downgrades, your organization can move into the top 25% of best-in-class spenders.";

    dummyObj.opportunities = [
      {
        title: "Consolidate mixed-use writing models",
        description: "Standardize writing tools on a single provider to eliminate mixed overlap.",
        impact: "Saves subscription spend by merging duplicate tools.",
        priority: "HIGH",
        complexity: "LOW",
        confidence: 0.9
      },
      {
        title: "Downgrade Pro licenses to developer tiers",
        description: "Re-evaluate developer usage and move infrequent editors to read-only seats.",
        impact: "Improves overall spend efficiency.",
        priority: "MEDIUM",
        complexity: "MEDIUM",
        confidence: 0.85
      }
    ];

    try {
      return schema.parse(dummyObj);
    } catch {
      return dummyObj as unknown as T;
    }
  }
}

export const groqProvider = new GroqProvider();
