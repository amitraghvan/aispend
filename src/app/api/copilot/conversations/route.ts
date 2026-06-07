import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/features/ai/services/ConversationService';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger/logger';
import { z } from 'zod';
import { rateLimit } from '@/lib/redis/rate-limiter';

export const dynamic = 'force-dynamic';

const log = logger.forService('copilot-api-conversations');

const getConversationsSchema = z.object({
  auditId: z.string().min(1, 'Invalid audit ID format'),
});

const createConversationSchema = z.object({
  auditId: z.string().min(1, 'Invalid audit ID format'),
  title: z.string().min(1, 'Title cannot be empty').max(100, 'Title is too long'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      log.warn('copilot-session-missing', 'GET /api/copilot/conversations - Session missing');
      log.warn('copilot-401', 'GET /api/copilot/conversations - Returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    log.info('copilot-session-found', 'GET /api/copilot/conversations - Session found', { userId: session.user.id });

    if (!session.organization?.id) {
      log.warn('copilot-org-missing', 'GET /api/copilot/conversations - Org ID missing');
      log.warn('copilot-403', 'GET /api/copilot/conversations - Returning 403');
      return NextResponse.json({ error: 'Organization ID is missing in session' }, { status: 403 });
    }
    log.info('copilot-org-found', 'GET /api/copilot/conversations - Org ID found', { orgId: session.organization.id });

    // ── Rate Limiting ──
    const identifier = `conversations_get:${session.user.id}`;
    const limitResult = await rateLimit(identifier, 30, 60);

    if (!limitResult.success) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.` },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const auditIdParam = searchParams.get('auditId');

    if (!auditIdParam) {
      return NextResponse.json({ error: 'Missing auditId query parameter' }, { status: 400 });
    }

    const parsed = getConversationsSchema.safeParse({ auditId: auditIdParam });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { auditId } = parsed.data;

    // Enforce audit ownership if session and audit organization are present
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    if (audit.organizationId !== session.organization.id) {
      log.warn('copilot-conversation-missing', 'GET /api/copilot/conversations - Audit organization mismatch (BOLA)');
      log.warn('copilot-403', 'GET /api/copilot/conversations - Returning 403');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = session.organization.id;

    const conversations = await conversationService.listConversations({
      auditId,
      organizationId: orgId,
    });

    log.info('copilot-conversation-found', 'GET /api/copilot/conversations - Conversations retrieved successfully', { count: conversations.length });
    return NextResponse.json({ data: conversations });
  } catch (error) {
    log.error('copilot-500', 'GET /api/copilot/conversations - Uncaught exception', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      log.warn('copilot-session-missing', 'POST /api/copilot/conversations - Session missing');
      log.warn('copilot-401', 'POST /api/copilot/conversations - Returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    log.info('copilot-session-found', 'POST /api/copilot/conversations - Session found', { userId: session.user.id });

    if (!session.organization?.id) {
      log.warn('copilot-org-missing', 'POST /api/copilot/conversations - Org ID missing');
      log.warn('copilot-403', 'POST /api/copilot/conversations - Returning 403');
      return NextResponse.json({ error: 'Organization ID is missing in session' }, { status: 403 });
    }
    log.info('copilot-org-found', 'POST /api/copilot/conversations - Org ID found', { orgId: session.organization.id });

    // ── Rate Limiting ──
    const identifier = `conversations_post:${session.user.id}`;
    const limitResult = await rateLimit(identifier, 30, 60);

    if (!limitResult.success) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.` },
        { status: 429 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { auditId, title } = parsed.data;

    // Enforce audit ownership
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    if (audit.organizationId !== session.organization.id) {
      log.warn('copilot-conversation-missing', 'POST /api/copilot/conversations - Audit organization mismatch (BOLA)');
      log.warn('copilot-403', 'POST /api/copilot/conversations - Returning 403');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = session.organization.id;

    const conversation = await conversationService.startConversation({
      organizationId: orgId,
      auditId,
      title,
    });

    log.info('copilot-conversation-found', 'POST /api/copilot/conversations - Conversation created successfully', { convoId: conversation.id });
    return NextResponse.json({ data: conversation }, { status: 201 });
  } catch (error) {
    log.error('copilot-500', 'POST /api/copilot/conversations - Uncaught exception', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

