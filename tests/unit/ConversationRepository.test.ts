import { describe, it, expect, vi, beforeEach } from 'vitest';
import { conversationRepository } from '@/features/ai/repositories/ConversationRepository';
import { prismaMock } from '../setup';

describe('ConversationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createConversation', () => {
    it('should create a conversation in the database', async () => {
      const convoData = {
        id: 'convo-1',
        organizationId: 'org-123',
        auditId: 'audit-123',
        title: 'Optimizations Chat',
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      prismaMock.conversation.create.mockResolvedValue(convoData);

      const result = await conversationRepository.createConversation({
        organizationId: 'org-123',
        auditId: 'audit-123',
        title: 'Optimizations Chat',
      });

      expect(prismaMock.conversation.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.conversation.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-123',
          auditId: 'audit-123',
          title: 'Optimizations Chat',
        },
      });
      expect(result.id).toBe('convo-1');
      expect(result.title).toBe('Optimizations Chat');
    });
  });

  describe('findConversationById', () => {
    it('should fetch conversation with messages ordered by createdAt', async () => {
      const convoWithMessages = {
        id: 'convo-1',
        organizationId: 'org-123',
        auditId: 'audit-123',
        title: 'Optimizations Chat',
        messages: [
          { id: 'm1', content: 'hello', sender: 'USER', createdAt: new Date() },
          { id: 'm2', content: 'hi', sender: 'COPILOT', createdAt: new Date() },
        ],
      };

      prismaMock.conversation.findFirst.mockResolvedValue(convoWithMessages);

      const result = await conversationRepository.findConversationById('convo-1', 'org-123');

      expect(prismaMock.conversation.findFirst).toHaveBeenCalledWith({
        where: { id: 'convo-1', organizationId: 'org-123', deletedAt: null },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
      expect(result).toEqual(convoWithMessages);
    });
  });

  describe('listConversations', () => {
    it('should query all non-deleted conversations scoped by audit and organization', async () => {
      prismaMock.conversation.findMany.mockResolvedValue([
        { id: 'convo-1', title: 'Session 1', isPinned: true },
        { id: 'convo-2', title: 'Session 2', isPinned: false },
      ]);

      const result = await conversationRepository.listConversations({
        auditId: 'audit-123',
        organizationId: 'org-123',
        limit: 10,
        offset: 0,
      });

      expect(prismaMock.conversation.findMany).toHaveBeenCalledWith({
        where: {
          auditId: 'audit-123',
          deletedAt: null,
          organizationId: 'org-123',
        },
        orderBy: [
          { isPinned: 'desc' },
          { updatedAt: 'desc' },
        ],
        take: 10,
        skip: 0,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('pinConversation', () => {
    it('should throw if conversation is not found', async () => {
      prismaMock.conversation.findFirst.mockResolvedValue(null);

      await expect(
        conversationRepository.pinConversation('convo-1', true, 'org-123')
      ).rejects.toThrow('Conversation not found');
    });

    it('should update the pin status of the conversation', async () => {
      prismaMock.conversation.findFirst.mockResolvedValue({ id: 'convo-1' });
      prismaMock.conversation.update.mockResolvedValue({ id: 'convo-1', isPinned: true });

      const result = await conversationRepository.pinConversation('convo-1', true, 'org-123');

      expect(prismaMock.conversation.update).toHaveBeenCalledWith({
        where: { id: 'convo-1' },
        data: { isPinned: true },
      });
      expect(result.id).toBe('convo-1');
    });
  });

  describe('deleteConversation', () => {
    it('should soft delete conversation by setting deletedAt date', async () => {
      prismaMock.conversation.findFirst.mockResolvedValue({ id: 'convo-1' });
      prismaMock.conversation.update.mockResolvedValue({ id: 'convo-1', deletedAt: new Date() });

      const result = await conversationRepository.deleteConversation('convo-1', 'org-123');

      expect(prismaMock.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'convo-1' },
        data: { deletedAt: expect.any(Date) },
      }));
      expect(result.id).toBe('convo-1');
    });
  });

  describe('appendMessage', () => {
    it('should run transaction to create message and update conversation updatedAt timestamp', async () => {
      const mockMessage = { id: 'msg-1', conversationId: 'convo-1', content: 'test', sender: 'USER' };
      
      prismaMock.message.create.mockResolvedValue(mockMessage);
      prismaMock.conversation.update.mockResolvedValue({ id: 'convo-1' });

      const result = await conversationRepository.appendMessage('convo-1', 'USER', 'test');

      expect(prismaMock.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'convo-1',
          sender: 'USER',
          content: 'test',
        },
      });
      expect(prismaMock.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'convo-1' },
        data: { updatedAt: expect.any(Date) },
      }));
      expect(result).toEqual(mockMessage);
    });
  });
});
