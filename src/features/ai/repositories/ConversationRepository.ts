/* eslint-disable */
import { prisma } from '@/lib/prisma';
import { Conversation, Message } from '@prisma/client';

export class ConversationRepository {
  async createConversation(data: {
    organizationId?: string | null;
    auditId: string;
    title: string;
  }): Promise<Conversation> {
    return prisma.conversation.create({
      data: {
        organizationId: data.organizationId || null,
        auditId: data.auditId,
        title: data.title,
      },
    });
  }

  async findConversationById(id: string, organizationId?: string | null): Promise<(Conversation & { messages: Message[] }) | null> {
    const where: any = { id, deletedAt: null };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    return prisma.conversation.findFirst({
      where,
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    }) as any;
  }

  async listConversations(params: {
    auditId: string;
    organizationId?: string | null;
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]> {
    const where: any = {
      auditId: params.auditId,
      deletedAt: null,
    };
    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }

    return prisma.conversation.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: params.limit || 50,
      skip: params.offset || 0,
    });
  }

  async pinConversation(id: string, isPinned: boolean, organizationId?: string | null): Promise<Conversation> {
    const where: any = { id, deletedAt: null };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const exists = await prisma.conversation.findFirst({ where });
    if (!exists) {
      throw new Error('Conversation not found');
    }

    return prisma.conversation.update({
      where: { id },
      data: { isPinned },
    });
  }

  async deleteConversation(id: string, organizationId?: string | null): Promise<Conversation> {
    const where: any = { id, deletedAt: null };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const exists = await prisma.conversation.findFirst({ where });
    if (!exists) {
      throw new Error('Conversation not found');
    }

    return prisma.conversation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async appendMessage(conversationId: string, sender: 'USER' | 'COPILOT', content: string): Promise<Message> {
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          sender,
          content,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return message;
  }
}

export const conversationRepository = new ConversationRepository();
