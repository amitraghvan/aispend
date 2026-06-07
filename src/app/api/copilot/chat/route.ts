import { NextRequest, NextResponse } from 'next/server';
import { auditCopilotService } from '@/features/ai/services/AuditCopilotService';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

const log = logger.forService('copilot-api-chat');

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, question } = body;

    if (!conversationId || !question) {
      return NextResponse.json({ error: 'Missing conversationId or question' }, { status: 400 });
    }

    const orgId = session?.organization.id || null;

    try {
      const response = await auditCopilotService.askQuestion({
        conversationId,
        question,
        organizationId: orgId,
      });

      return NextResponse.json({ data: response });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'Forbidden') {
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
    log.error('chat_api_error', 'Failed to generate copilot reply', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
