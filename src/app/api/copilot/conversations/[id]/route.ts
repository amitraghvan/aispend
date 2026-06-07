import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/features/ai/services/ConversationService';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

const log = logger.forService('copilot-api-conversation-detail');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const orgId = session?.organization.id || null;

    try {
      const conversation = await conversationService.getConversation(id, orgId);
      return NextResponse.json({ data: conversation });
    } catch (err) {
      if (err instanceof Error && err.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (err instanceof Error && err.message === 'Conversation not found') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    log.error('get_conversation_error', 'Failed to retrieve conversation details', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const orgId = session?.organization.id || null;

    const body = await request.json();
    const { isPinned } = body;

    if (isPinned === undefined) {
      return NextResponse.json({ error: 'Missing isPinned in request body' }, { status: 400 });
    }

    try {
      const updated = await conversationService.pinConversation(id, isPinned, orgId);
      return NextResponse.json({ data: updated });
    } catch (err) {
      if (err instanceof Error && err.message === 'Conversation not found') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    log.error('patch_conversation_error', 'Failed to update conversation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const orgId = session?.organization.id || null;

    try {
      await conversationService.deleteConversation(id, orgId);
      return NextResponse.json({ success: true });
    } catch (err) {
      if (err instanceof Error && err.message === 'Conversation not found') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    log.error('delete_conversation_error', 'Failed to delete conversation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
