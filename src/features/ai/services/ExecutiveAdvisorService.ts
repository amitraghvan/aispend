/* eslint-disable */
import { groqProvider } from './GroqProvider';
import { AuditContextBuilder } from './AuditContextBuilder';
import { auditRepository } from '@/features/audit/repositories/AuditRepository';
import { cacheService } from '@/lib/cache/cache-service';
import { COPILOT_PROMPTS, ExecutiveAdvisorSchema, ExecutiveAdvisor } from '../prompts/copilot-templates';
import { trackServerEvent } from '@/lib/observability/posthog';
import * as Sentry from '@sentry/nextjs';

export class ExecutiveAdvisorService {
  private cacheNamespace = 'copilot_executive';
  private ttlSeconds = 86400; // 24 hours

  async generateExecutiveAnalysis(params: {
    auditId: string;
    organizationId?: string | null;
    bypassCache?: boolean;
  }): Promise<ExecutiveAdvisor> {
    const startTime = Date.now();
    const orgId = params.organizationId || 'anonymous';

    // 1. Cache Check
    if (!params.bypassCache) {
      try {
        const cached = await cacheService.get<ExecutiveAdvisor>(this.cacheNamespace, params.auditId);
        if (cached) {
          trackServerEvent(orgId, 'copilot_executive_cache_hit', {
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
      const system = COPILOT_PROMPTS.EXECUTIVE.system;
      const userPrompt = COPILOT_PROMPTS.EXECUTIVE.user(auditContext);

      // 3. Call Groq
      const analysis = await groqProvider.generateStructuredJSON(
        system,
        userPrompt,
        ExecutiveAdvisorSchema
      );

      // 4. Save Cache
      try {
        await cacheService.set(this.cacheNamespace, params.auditId, analysis, this.ttlSeconds);
      } catch (cacheErr) {
        Sentry.captureException(cacheErr);
      }

      const latency = Date.now() - startTime;
      trackServerEvent(orgId, 'copilot_executive_generated', {
        auditId: params.auditId,
        organizationId: orgId,
        latencyMs: latency,
      });

      return analysis;

    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }
}

export const executiveAdvisorService = new ExecutiveAdvisorService();
