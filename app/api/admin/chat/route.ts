import { NextRequest, NextResponse } from 'next/server';
import {
  appendMessage,
  getConversation,
  listMessages,
  listRecentConversations,
  updateConversation,
} from '@/lib/chat/store';

/**
 * Admin live-chats inbox (Phase 3 dashboard chat continuation).
 *
 *   GET  /api/admin/chat                  → recent conversations
 *   GET  /api/admin/chat?conversationId=  → one conversation + full messages
 *   POST /api/admin/chat                  → { conversationId, text } reply
 *
 * Auth: x-admin-password header must match ADMIN_PASSWORD (same as the rest
 * of the operator console). Replies are stored as role=admin and mark the
 * conversation as handled by a human.
 */
export const dynamic = 'force-dynamic';

function authed(req: NextRequest): boolean {
  const pw = req.headers.get('x-admin-password') || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  return Boolean(expected) && pw === expected;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const conversationId = req.nextUrl.searchParams.get('conversationId');
  if (conversationId) {
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return NextResponse.json({ ok: false, error: 'Conversation not found' }, { status: 404 });
    }
    const messages = await listMessages(conversation.id);
    return NextResponse.json({ ok: true, conversation, messages });
  }
  const conversations = await listRecentConversations(40);
  return NextResponse.json({ ok: true, conversations });
}

export async function POST(req: NextRequest) {
  if (!authed(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { conversationId?: string; text?: string };
  const conversationId = (body.conversationId || '').trim();
  const text = (body.text || '').trim();
  if (!conversationId || !text) {
    return NextResponse.json({ ok: false, error: 'Missing conversationId or text' }, { status: 400 });
  }
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    return NextResponse.json({ ok: false, error: 'Conversation not found' }, { status: 404 });
  }
  const msg = await appendMessage({ conversationId, role: 'admin', content: text.slice(0, 4000) });
  if (!msg) {
    return NextResponse.json({ ok: false, error: 'Could not save the reply' }, { status: 500 });
  }
  await updateConversation(conversationId, {
    status: 'admin',
    last_agent: 'admin',
    unread_admin: 0,
  });
  return NextResponse.json({ ok: true, message: msg });
}
