import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/features/ai/services/ConversationService';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

const log = logger.forService('copilot-api-conversations');

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const auditId = searchParams.get('auditId');

    if (!auditId) {
      return NextResponse.json({ error: 'Missing auditId query parameter' }, { status: 400 });
    }

    // Enforce audit ownership if session and audit organization are present
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    if (audit.organizationId && session && session.organization.id !== audit.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = session?.organization.id || null;

    const conversations = await conversationService.listConversations({
      auditId,
      organizationId: orgId,
    });

    return NextResponse.json({ data: conversations });
  } catch (error) {
    log.error('list_conversations_error', 'Failed to list conversations', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { auditId, title } = body;

    if (!auditId || !title) {
      return NextResponse.json({ error: 'Missing auditId or title' }, { status: 400 });
    }

    // Enforce audit ownership
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    if (audit.organizationId && session && session.organization.id !== audit.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = session?.organization.id || null;

    const conversation = await conversationService.startConversation({
      organizationId: orgId,
      auditId,
      title,
    });

    return NextResponse.json({ data: conversation }, { status: 201 });
  } catch (error) {
    log.error('create_conversation_error', 'Failed to create conversation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
