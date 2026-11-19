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
    // Opening the thread clears the unread badge for the admin.
    if (conversation.unread_admin && conversation.unread_admin > 0) {
      await updateConversation(conversation.id, { unread_admin: 0 });
    }
    return NextResponse.json({ ok: true, conversation, messages });
  }
  const conversations = await listRecentConversations(40);

  // Enrich with the customer's contact details so the inbox is usable.
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  let customerMap: Record<string, { email: string | null; phone: string | null; name: string | null }> = {};
  const ids = Array.from(new Set(conversations.map((c) => c.user_id).filter(Boolean))) as string[];
  if (base && serviceKey && ids.length) {
    try {
      const inFilter = ids.map((id) => `"${id}"`).join(',');
      const profRes = await fetch(
        `${base}/rest/v1/profiles?id=in.(${inFilter})&select=id,email,phone,full_name&limit=${ids.length}`,
        {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          cache: 'no-store',
        },
      );
      if (profRes.ok) {
        const rows = (await profRes.json()) as Array<{ id?: string; email?: string; phone?: string; full_name?: string }>;
        customerMap = Object.fromEntries(
          rows
            .filter((r) => r.id)
            .map((r) => [r.id as string, { email: r.email || null, phone: r.phone || null, name: r.full_name || null }]),
        );
      }
    } catch {
      /* enrichment is optional */
    }
  }
  const enriched = conversations.map((c) => ({
    ...c,
    customer: c.user_id ? customerMap[c.user_id] || null : null,
  }));
  return NextResponse.json({ ok: true, conversations: enriched });
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
