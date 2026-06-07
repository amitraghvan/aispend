/* eslint-disable */
import { groqProvider } from './GroqProvider';
import { AuditContextBuilder } from './AuditContextBuilder';
import { auditRepository } from '@/features/audit/repositories/AuditRepository';
import { cacheService } from '@/lib/cache/cache-service';
import { COPILOT_PROMPTS, ActionPlanSchema, ActionPlan } from '../prompts/copilot-templates';
import { trackServerEvent } from '@/lib/observability/posthog';
import * as Sentry from '@sentry/nextjs';

export class ActionPlanService {
  private cacheNamespace = 'copilot_action_plan';
  private ttlSeconds = 86400; // 24 hours

  async generatePlan(params: {
    auditId: string;
    organizationId?: string | null;
    bypassCache?: boolean;
  }): Promise<ActionPlan> {
    const startTime = Date.now();
    const orgId = params.organizationId || 'anonymous';

    // 1. Cache Check
    if (!params.bypassCache) {
      try {
        const cached = await cacheService.get<ActionPlan>(this.cacheNamespace, params.auditId);
        if (cached) {
          trackServerEvent(orgId, 'copilot_action_plan_cache_hit', {
            auditId: params.auditId,
            organizationId: orgId,
          });
          return cached;
        }
      } catch (err) {
        Sentry.captureException(err);
      }
    }

    // 2. Fetch Audit
    try {
      const audit = await auditRepository.findById(params.auditId);
      if (!audit) {
        throw new Error('Audit not found');
      }

      if (params.organizationId && audit.organizationId !== params.organizationId) {
        throw new Error('Forbidden');
      }

      const auditContext = AuditContextBuilder.build(audit as any);
      const system = COPILOT_PROMPTS.ACTION_PLAN.system;
      const userPrompt = COPILOT_PROMPTS.ACTION_PLAN.user(auditContext);

      // 3. Call Groq
      const plan = await groqProvider.generateStructuredJSON(
        system,
        userPrompt,
        ActionPlanSchema
      );

      // 4. Save to Cache
      try {
        await cacheService.set(this.cacheNamespace, params.auditId, plan, this.ttlSeconds);
      } catch (cacheErr) {
        Sentry.captureException(cacheErr);
      }

      const latency = Date.now() - startTime;
      trackServerEvent(orgId, 'copilot_action_plan_generated', {
        auditId: params.auditId,
        organizationId: orgId,
        latencyMs: latency,
      });

      return plan;

    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }
}

export const actionPlanService = new ActionPlanService();
