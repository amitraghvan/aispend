import { groqProvider } from './GroqProvider';
import { prisma } from '@/lib/prisma';
import { cacheService } from '@/lib/cache/cache-service';
import { COPILOT_PROMPTS, DeepDiveSchema, DeepDive } from '../prompts/copilot-templates';
import { trackServerEvent } from '@/lib/observability/posthog';
import * as Sentry from '@sentry/nextjs';

export interface RawRecommendationInput {
  ruleName: string;
  category: string;
  priority: string;
  reason: string;
  currentState: string;
  recommendedAction: string;
  estimatedMonthlySavings: number;
}

export class RecommendationCopilotService {
  private cacheNamespace = 'copilot_deep_dive';
  private ttlSeconds = 86400; // 24 hours

  async generateDeepDive(params: {
    recommendationId?: string;
    rawInput?: RawRecommendationInput;
    organizationId?: string | null;
    bypassCache?: boolean;
  }): Promise<DeepDive> {
    const startTime = Date.now();
    const orgId = params.organizationId || 'anonymous';

    // 1. Cache Check
    if (params.recommendationId && !params.bypassCache) {
      try {
        const cached = await cacheService.get<DeepDive>(this.cacheNamespace, params.recommendationId);
        if (cached) {
          trackServerEvent(orgId, 'copilot_deep_dive_cache_hit', {
            recommendationId: params.recommendationId,
            organizationId: orgId,
          });
          return cached;
        }
      } catch (err) {
        Sentry.captureException(err);
      }
    }

    // 2. Fetch or Parse details
    try {
      let detailsText = '';

      if (params.recommendationId) {
        const rec = await prisma.recommendation.findUnique({
          where: { id: params.recommendationId },
          include: { audit: true },
        });

        if (!rec) {
          throw new Error('Recommendation not found');
        }

        if (params.organizationId && rec.audit.organizationId !== params.organizationId) {
          throw new Error('Forbidden');
        }

        detailsText = `Recommendation Name: ${rec.ruleName}
Category: ${rec.category}
Priority: ${rec.priority}
Context / Reason: ${rec.reason}
Current State: ${rec.currentState}
Recommended Action: ${rec.recommendedAction}
Estimated Monthly Savings: $${Number(rec.estimatedMonthlySavings)}`;
      } else if (params.rawInput) {
        const raw = params.rawInput;
        detailsText = `Recommendation Name: ${raw.ruleName}
Category: ${raw.category}
Priority: ${raw.priority}
Context / Reason: ${raw.reason}
Current State: ${raw.currentState}
Recommended Action: ${raw.recommendedAction}
Estimated Monthly Savings: $${raw.estimatedMonthlySavings}`;
      } else {
        throw new Error('Missing recommendationId or rawInput');
      }

      const system = COPILOT_PROMPTS.DEEP_DIVE.system;
      const userPrompt = COPILOT_PROMPTS.DEEP_DIVE.user(detailsText);

      // 3. Call Groq
      const deepDive = await groqProvider.generateStructuredJSON(
        system,
        userPrompt,
        DeepDiveSchema
      );

      // 4. Save Cache
      if (params.recommendationId) {
        try {
          await cacheService.set(this.cacheNamespace, params.recommendationId, deepDive, this.ttlSeconds);
        } catch (cacheErr) {
          Sentry.captureException(cacheErr);
        }
      }

      const latency = Date.now() - startTime;
      trackServerEvent(orgId, 'copilot_deep_dive_generated', {
        recommendationId: params.recommendationId || 'raw',
        organizationId: orgId,
        latencyMs: latency,
      });

      return deepDive;

    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }
}

export const recommendationCopilotService = new RecommendationCopilotService();
