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
      log.warn('copilot-session-missing', 'GET /api/copilot/conversations/[id] - Session missing');
      log.warn('copilot-401', 'GET /api/copilot/conversations/[id] - Returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    log.info('copilot-session-found', 'GET /api/copilot/conversations/[id] - Session found', { userId: session.user.id });

    if (!session.organization?.id) {
      log.warn('copilot-org-missing', 'GET /api/copilot/conversations/[id] - Org ID missing');
      log.warn('copilot-403', 'GET /api/copilot/conversations/[id] - Returning 403');
      return NextResponse.json({ error: 'Organization ID is missing in session' }, { status: 403 });
    }
    log.info('copilot-org-found', 'GET /api/copilot/conversations/[id] - Org ID found', { orgId: session.organization.id });

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
      log.info('copilot-conversation-found', 'GET /api/copilot/conversations/[id] - Conversation found', { convoId: id });
      return NextResponse.json({ data: conversation });
    } catch (err) {
      log.warn('copilot-conversation-missing', 'GET /api/copilot/conversations/[id] - Conversation not found or access denied', { convoId: id });
      if (err instanceof Error && err.message === 'Forbidden') {
        log.warn('copilot-403', 'GET /api/copilot/conversations/[id] - Returning 403');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (err instanceof Error && err.message === 'Conversation not found') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    log.error('copilot-500', 'GET /api/copilot/conversations/[id] - Uncaught exception', {
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
      log.warn('copilot-session-missing', 'PATCH /api/copilot/conversations/[id] - Session missing');
      log.warn('copilot-401', 'PATCH /api/copilot/conversations/[id] - Returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    log.info('copilot-session-found', 'PATCH /api/copilot/conversations/[id] - Session found', { userId: session.user.id });

    if (!session.organization?.id) {
      log.warn('copilot-org-missing', 'PATCH /api/copilot/conversations/[id] - Org ID missing');
      log.warn('copilot-403', 'PATCH /api/copilot/conversations/[id] - Returning 403');
      return NextResponse.json({ error: 'Organization ID is missing in session' }, { status: 403 });
    }
    log.info('copilot-org-found', 'PATCH /api/copilot/conversations/[id] - Org ID found', { orgId: session.organization.id });

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
      log.info('copilot-conversation-found', 'PATCH /api/copilot/conversations/[id] - Conversation pinned', { convoId: id });
      return NextResponse.json({ data: updated });
    } catch (err) {
      log.warn('copilot-conversation-missing', 'PATCH /api/copilot/conversations/[id] - Conversation not found or access denied', { convoId: id });
      if (err instanceof Error && err.message === 'Conversation not found') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    log.error('copilot-500', 'PATCH /api/copilot/conversations/[id] - Uncaught exception', {
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
      log.warn('copilot-session-missing', 'DELETE /api/copilot/conversations/[id] - Session missing');
      log.warn('copilot-401', 'DELETE /api/copilot/conversations/[id] - Returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    log.info('copilot-session-found', 'DELETE /api/copilot/conversations/[id] - Session found', { userId: session.user.id });

    if (!session.organization?.id) {
      log.warn('copilot-org-missing', 'DELETE /api/copilot/conversations/[id] - Org ID missing');
      log.warn('copilot-403', 'DELETE /api/copilot/conversations/[id] - Returning 403');
      return NextResponse.json({ error: 'Organization ID is missing in session' }, { status: 403 });
    }
    log.info('copilot-org-found', 'DELETE /api/copilot/conversations/[id] - Org ID found', { orgId: session.organization.id });

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
      log.info('copilot-conversation-found', 'DELETE /api/copilot/conversations/[id] - Conversation deleted', { convoId: id });
      return NextResponse.json({ success: true });
    } catch (err) {
      log.warn('copilot-conversation-missing', 'DELETE /api/copilot/conversations/[id] - Conversation not found or access denied', { convoId: id });
      if (err instanceof Error && err.message === 'Conversation not found') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    log.error('copilot-500', 'DELETE /api/copilot/conversations/[id] - Uncaught exception', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

