import { conversationRepository } from '../repositories/ConversationRepository';
import { cacheService } from '@/lib/cache/cache-service';
import { Conversation, Message } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';

export class ConversationService {
  private cacheNamespace = 'copilot_conversation';
  private ttlSeconds = 86400; // 24 hours

  async startConversation(params: {
    organizationId?: string | null;
    auditId: string;
    title: string;
  }): Promise<Conversation> {
    try {
      const convo = await conversationRepository.createConversation(params);
      return convo;
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }

  async getConversation(id: string, organizationId?: string | null): Promise<Conversation & { messages: Message[] }> {
    // 1. Try Cache
    let cached: (Conversation & { messages: Message[] }) | null = null;
    try {
      cached = await cacheService.get<Conversation & { messages: Message[] }>(this.cacheNamespace, id);
    } catch (err) {
      Sentry.captureException(err);
    }

    if (cached) {
      if (organizationId && cached.organizationId !== organizationId) {
        throw new Error('Forbidden');
      }
      return cached;
    }

    // 2. Read DB
    try {
      const convo = await conversationRepository.findConversationById(id, organizationId);
      if (!convo) {
        throw new Error('Conversation not found');
      }

      // Store in Cache
      try {
        await cacheService.set(this.cacheNamespace, id, convo, this.ttlSeconds);
      } catch (cacheErr) {
        Sentry.captureException(cacheErr);
      }

      return convo;
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }

  async listConversations(params: {
    auditId: string;
    organizationId?: string | null;
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]> {
    try {
      return await conversationRepository.listConversations(params);
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }

  async pinConversation(id: string, isPinned: boolean, organizationId?: string | null): Promise<Conversation> {
    try {
      const convo = await conversationRepository.pinConversation(id, isPinned, organizationId);
      await cacheService.invalidate(this.cacheNamespace, id);
      return convo;
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }

  async deleteConversation(id: string, organizationId?: string | null): Promise<Conversation> {
    try {
      const convo = await conversationRepository.deleteConversation(id, organizationId);
      await cacheService.invalidate(this.cacheNamespace, id);
      return convo;
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }

  async addMessage(
    conversationId: string,
    sender: 'USER' | 'COPILOT',
    content: string,
    organizationId?: string | null
  ): Promise<Message> {
    try {
      const convo = await conversationRepository.findConversationById(conversationId, organizationId);
      if (!convo) {
        throw new Error('Conversation not found or access denied');
      }

      const message = await conversationRepository.appendMessage(conversationId, sender, content);
      await cacheService.invalidate(this.cacheNamespace, conversationId);
      return message;
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  }
}

export const conversationService = new ConversationService();
