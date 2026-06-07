import { NextRequest, NextResponse } from 'next/server';
import { auditCopilotService } from '@/features/ai/services/AuditCopilotService';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger/logger';
import { z } from 'zod';
import { rateLimit } from '@/lib/redis/rate-limiter';

export const dynamic = 'force-dynamic';

const log = logger.forService('copilot-api-chat');

const chatSchema = z.object({
  conversationId: z.string().min(1, 'Invalid conversation ID format'),
  question: z.string().min(1, 'Question cannot be empty').max(2000, 'Question is too long'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      log.warn('copilot-session-missing', 'POST /api/copilot/chat - Session missing');
      log.warn('copilot-401', 'POST /api/copilot/chat - Returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    log.info('copilot-session-found', 'POST /api/copilot/chat - Session found', { userId: session.user.id });

    if (!session.organization?.id) {
      log.warn('copilot-org-missing', 'POST /api/copilot/chat - Org ID missing');
      log.warn('copilot-403', 'POST /api/copilot/chat - Returning 403');
      return NextResponse.json({ error: 'Organization ID is missing in session' }, { status: 403 });
    }
    log.info('copilot-org-found', 'POST /api/copilot/chat - Org ID found', { orgId: session.organization.id });

    // ── Rate Limiting ──
    const identifier = `copilot_chat:${session.user.id}`;
    // Limit to 30 requests per minute
    const limitResult = await rateLimit(identifier, 30, 60);

    if (!limitResult.success) {
      const errorRes = NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.` },
        { status: 429 }
      );
      errorRes.headers.set('X-RateLimit-Limit', String(limitResult.limit));
      errorRes.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
      errorRes.headers.set('X-RateLimit-Reset', String(limitResult.reset));
      return errorRes;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { conversationId, question } = parsed.data;
    const orgId = session.organization.id;

    try {
      const response = await auditCopilotService.askQuestion({
        conversationId,
        question,
        organizationId: orgId,
      });

      log.info('copilot-conversation-found', 'POST /api/copilot/chat - Conversation found & chat processed', { conversationId });
      const successRes = NextResponse.json({ data: response });
      successRes.headers.set('X-RateLimit-Limit', String(limitResult.limit));
      successRes.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
      successRes.headers.set('X-RateLimit-Reset', String(limitResult.reset));
      return successRes;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      log.warn('copilot-conversation-missing', 'POST /api/copilot/chat - Conversation not found or access denied', { conversationId });
      if (msg === 'Forbidden') {
        log.warn('copilot-403', 'POST /api/copilot/chat - Returning 403');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (msg === 'Conversation not found' || msg === 'Conversation not found or access denied') {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      if (msg === 'Audit context not found') {
        return NextResponse.json({ error: 'Audit context not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    log.error('copilot-500', 'POST /api/copilot/chat - Uncaught exception', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

