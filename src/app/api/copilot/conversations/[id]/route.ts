import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/features/ai/services/ConversationService';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger/logger';
import { z } from 'zod';
import { rateLimit } from '@/lib/redis/rate-limiter';

export const dynamic = 'force-dynamic';

const log = logger.forService('copilot-api-conversation-detail');

const idParamSchema = z.string().min(1, 'Invalid conversation ID format');

const patchBodySchema = z.object({
  isPinned: z.boolean(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rate Limiting ──
    const identifier = `conversation_detail_get:${session.user.id}`;
    const limitResult = await rateLimit(identifier, 60, 60);

    if (!limitResult.success) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.` },
        { status: 429 }
      );
    }

    const { id } = await params;
    const parsedId = idParamSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedId.error.flatten() },
        { status: 400 }
      );
    }

    const orgId = session.organization.id;

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

    // ── Rate Limiting ──
    const identifier = `conversation_detail_patch:${session.user.id}`;
    const limitResult = await rateLimit(identifier, 60, 60);

    if (!limitResult.success) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.` },
        { status: 429 }
      );
    }

    const { id } = await params;
    const parsedId = idParamSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedId.error.flatten() },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const parsedBody = patchBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const orgId = session.organization.id;
    const { isPinned } = parsedBody.data;

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

    // ── Rate Limiting ──
    const identifier = `conversation_detail_delete:${session.user.id}`;
    const limitResult = await rateLimit(identifier, 60, 60);

    if (!limitResult.success) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.` },
        { status: 429 }
      );
    }

    const { id } = await params;
    const parsedId = idParamSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedId.error.flatten() },
        { status: 400 }
      );
    }

    const orgId = session.organization.id;

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

