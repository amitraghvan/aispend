/* eslint-disable */
import { groqProvider } from './GroqProvider';
import { conversationService } from './ConversationService';
import { AuditContextBuilder } from './AuditContextBuilder';
import { auditRepository } from '@/features/audit/repositories/AuditRepository';
import { COPILOT_PROMPTS, ChatResponseSchema, ChatResponse } from '../prompts/copilot-templates';
import { trackServerEvent } from '@/lib/observability/posthog';
import { logger } from '@/lib/logger/logger';
import * as Sentry from '@sentry/nextjs';

const log = logger.forService('audit-copilot-service');

export class AuditCopilotService {
  async askQuestion(params: {
    conversationId: string;
    question: string;
    organizationId?: string | null;
  }): Promise<ChatResponse> {
    const startTime = Date.now();
    const orgId = params.organizationId || 'anonymous';
    
    try {
      // 1. Fetch conversation history & verify ownership
      const convo = await conversationService.getConversation(params.conversationId, params.organizationId);
      
      // 2. Fetch audit details with items and recommendations
      const audit = await auditRepository.findById(convo.auditId);
      if (!audit) {
        throw new Error('Audit context not found');
      }

      // Add USER message to DB
      await conversationService.addMessage(params.conversationId, 'USER', params.question, params.organizationId);

      // 3. Build sanitized audit context
      const auditContext = AuditContextBuilder.build(audit as any);

      // 4. Build chat history representation
      // We only take the last 10 messages before the current question to avoid context length bloat
      const relevantMessages = convo.messages.slice(-10);
      const historyText = relevantMessages
        .map((m) => `${m.sender === 'USER' ? 'User' : 'Copilot'}: ${m.content}`)
        .join('\n');

      const system = COPILOT_PROMPTS.CHAT.system;
      const userPrompt = COPILOT_PROMPTS.CHAT.user(params.question, auditContext, historyText);

      // 5. Generate structured JSON reply
      const response = await groqProvider.generateStructuredJSON(
        system,
        userPrompt,
        ChatResponseSchema
      );

      // Add COPILOT message to DB
      await conversationService.addMessage(params.conversationId, 'COPILOT', response.reply, params.organizationId);

      const latency = Date.now() - startTime;
      log.info('copilot_response_generated', `Generated reply for convo ${params.conversationId} in ${latency}ms`);

      // Track PostHog event
      trackServerEvent(orgId, 'copilot_message_sent', {
        conversationId: params.conversationId,
        auditId: convo.auditId,
        organizationId: orgId,
        latencyMs: latency,
        questionLength: params.question.length,
      });

      return response;

    } catch (err) {
      log.error('copilot_response_failed', `Failed to generate response for convo ${params.conversationId}`, { error: err });
      Sentry.captureException(err);
      
      trackServerEvent(orgId, 'copilot_response_failed', {
        conversationId: params.conversationId,
        organizationId: orgId,
        error: err instanceof Error ? err.message : String(err),
      });

      throw err;
    }
  }
}

export const auditCopilotService = new AuditCopilotService();
