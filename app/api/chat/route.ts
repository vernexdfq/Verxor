import { NextRequest, NextResponse } from 'next/server';
import {
  appendMessage,
  chatDbConfigured,
  createConversation,
  getConversation,
  getLatestConversationForUser,
  listMessages,
  type ChatMessageRow,
} from '@/lib/chat/store';
import { handleButtonPayload, handleFreeText, type FlowState } from '@/lib/chat/flows';

/**
 * POST /api/chat — send a chat message or a button tap.
 * GET  /api/chat — restore the latest open conversation + messages.
 *
 * Auth: retail user JWT (Authorization: Bearer …). All storage is server-side
 * with the service role; the client never touches the chat tables directly.
 */
export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token.startsWith('vx_panel_')) return null;
  const base = supabaseBase();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return null;
  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: string };
    return u.id || null;
  } catch {
    return null;
  }
}

async function resolveProfile(req: NextRequest, userId: string): Promise<{
  email?: string | null;
  fullName?: string | null;
  balanceNgn?: number | null;
} | null> {
  const base = supabaseBase();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(
      `${base}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=email,full_name,balance_ngn&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as {
      email?: string;
      full_name?: string | null;
      balance_ngn?: number | null;
    }[];
    const r = rows?.[0];
    if (!r) return null;
    return {
      email: r.email || null,
      fullName: r.full_name || null,
      balanceNgn: typeof r.balance_ngn === 'number' ? r.balance_ngn : null,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
  }
  const requested = req.nextUrl.searchParams.get('conversationId');
  const conversation = requested
    ? await getConversation(requested)
    : await getLatestConversationForUser(userId);
  if (!conversation || conversation.user_id !== userId) {
    return NextResponse.json({ ok: true, conversationId: null, messages: [] });
  }
  const messages = await listMessages(conversation.id);
  return NextResponse.json({ ok: true, conversationId: conversation.id, messages });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
  }
  if (!chatDbConfigured()) {
    return NextResponse.json({ ok: false, error: 'Chat is not configured' }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    conversationId?: string;
    text?: string;
    payload?: string;
    label?: string;
  };
  const text = (body.text || '').trim();
  const payload = (body.payload || '').trim();
  if (!text && !payload) {
    return NextResponse.json({ ok: false, error: 'Empty message' }, { status: 400 });
  }

  // Find or create the conversation.
  let conversation = null as Awaited<ReturnType<typeof getConversation>>;
  if (body.conversationId) {
    conversation = await getConversation(body.conversationId);
    if (conversation && conversation.user_id !== userId) conversation = null;
  }
  if (!conversation) {
    conversation =
      (await getLatestConversationForUser(userId)) ||
      (await createConversation({ userId, subject: text ? text.slice(0, 60) : null }));
  }
  if (!conversation) {
    return NextResponse.json({ ok: false, error: 'Could not open a chat' }, { status: 500 });
  }
  const conversationId = conversation.id;

  // The customer's tap / text is stored too.
  const userMsg = await appendMessage({
    conversationId,
    role: 'user',
    content: text || body.label || payload,
  });

  const state = (conversation.state || null) as FlowState;
  let replies: ChatMessageRow[] = [];

  try {
    if (payload) {
      const profile = await resolveProfile(req, userId);
      const email = profile?.email ?? null;
      replies = await handleButtonPayload(conversationId, state, payload, {
        purchaseOrigin: new URL(req.url).origin,
        authHeader: req.headers.get('authorization'),
        userId,
        email,
        contact: null,
      });
      // Pure navigation payloads ("open_*") are handled by the widget.
      if (payload.startsWith('open_')) replies = [];
    } else if (text) {
      const history = (await listMessages(conversationId)).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
      history.pop(); // the just-appended message is re-sent below
      const profile = await resolveProfile(req, userId);
      replies = await handleFreeText(conversationId, state, text, {
        history,
        user: {
          name: profile?.fullName ?? null,
          email: profile?.email ?? null,
          balanceNgn: profile?.balanceNgn ?? null,
        },
      });
    }
  } catch {
    replies = [];
  }

  return NextResponse.json({
    ok: true,
    conversationId,
    userMessage: userMsg,
    messages: replies,
  });
}
