import { NextRequest, NextResponse } from 'next/server';
import {
  appendMessage,
  chatDbConfigured,
  createConversation,
  getConversation,
  getLatestConversationForUser,
  getLatestConversationForVisitor,
  lastDbError,
  listMessages,
  updateConversation,
  type ChatConversationRow,
  type ChatMessageRow,
} from '@/lib/chat/store';
import { handleButtonPayload, handleFreeText, type FlowState } from '@/lib/chat/flows';
import { notifyAdmin, notifyAdminTracked, openAdminButton, sendTelegramPhoto } from '@/lib/notify';

/**
 * Interim escalation heuristic (Phase 5 replaces this with the admin inbox):
 * distress words in free text ping Denny on WhatsApp/Telegram so he can
 * jump into the dashboard conversation early.
 */
const ESCALATION_WORDS =
  /\b(refund|scam|scammed|hacked|stolen|not received|didn'?t receive|did not receive|failed|fail(ed)? again|complain|fraud|charged twice|wrong number|no (otp|code)|didn'?t work|support team|human|agent|denny)\b/i;

function maybeEscalate(text: string, userId: string, conversationId: string): void {
  if (!ESCALATION_WORDS.test(text)) return;
  const snippet = text.length > 180 ? `${text.slice(0, 180)}…` : text;
  void notifyAdminTracked(
    `⚠️ Verxor chat escalation\nUser: ${userId}\nChat: ${conversationId}\n"${snippet}"\nSwipe-reply to this message (or use /reply) to answer the customer directly.`,
    { kind: 'web', conversationId },
    [openAdminButton()],
  );
}

/**
 * A conversation with no activity for 24h is archived (status=closed, rows
 * kept — never deleted) and the customer starts a fresh one on return.
 */
const STALE_MS = 24 * 60 * 60 * 1000;

function isStale(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return false;
  const t = new Date(updatedAt).getTime();
  return Number.isFinite(t) && Date.now() - t > STALE_MS;
}

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
  const base = supabaseBase();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (token && !token.startsWith('vx_panel_') && token.startsWith('eyJ')) {
    if (!base || !anon) return null;
    try {
      const res = await fetch(`${base}/auth/v1/user`, {
        headers: { apikey: anon, Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const u = (await res.json()) as { id?: string };
        if (u.id) return u.id;
      }
    } catch {
      /* fall through to soft session */
    }
  }
  // Soft-session fallback (same trust model as /api/v1/wallet/balance and
  // /api/v1/email-otp/orders): the profile userId is trusted when the JWT
  // cannot be validated, e.g. the browser's stored token expired.
  const vxUser = (req.headers.get('x-vx-user') || '').trim();
  if (vxUser && base) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (key) {
      try {
        const res = await fetch(
          `${base}/rest/v1/profiles?id=eq.${encodeURIComponent(vxUser)}&select=id&limit=1`,
          { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
        );
        if (res.ok) {
          const rows = (await res.json()) as { id?: string }[];
          if (rows?.[0]?.id) return rows[0].id;
        }
      } catch {
        /* ignore */
      }
    }
  }
  return null;
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

/** Visitor key for signed-out chat (generated client-side, sent as a header). */
function visitorKeyOf(req: NextRequest): string {
  return (req.headers.get('x-vx-visitor') || '').trim().slice(0, 64);
}

/** Does this conversation belong to the requesting user / visitor? */
function ownsConversation(
  conversation: ChatConversationRow | null,
  userId: string | null,
  visitorKey: string,
): conversation is ChatConversationRow {
  if (!conversation) return false;
  if (conversation.user_id && conversation.user_id === userId) return true;
  return !conversation.user_id && Boolean(visitorKey) && conversation.visitor_key === visitorKey;
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  const visitorKey = visitorKeyOf(req);
  if (!userId && !visitorKey) {
    return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
  }
  const requested = req.nextUrl.searchParams.get('conversationId');
  const conversation = requested
    ? await getConversation(requested)
    : userId
      ? await getLatestConversationForUser(userId)
      : await getLatestConversationForVisitor(visitorKey);
  if (!ownsConversation(conversation, userId, visitorKey)) {
    return NextResponse.json({ ok: true, conversationId: null, messages: [] });
  }
  if (isStale(conversation.updated_at)) {
    // 24h auto-close: archive the old chat, customer gets a fresh start.
    await updateConversation(conversation.id, { status: 'closed', state: null });
    return NextResponse.json({ ok: true, conversationId: null, messages: [] });
  }
  const messages = await listMessages(conversation.id);
  return NextResponse.json({ ok: true, conversationId: conversation.id, messages });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  const visitorKey = visitorKeyOf(req);
  if (!userId && !visitorKey) {
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
    image?: string;
  };
  const text = (body.text || '').trim();
  const payload = (body.payload || '').trim();
  const imageData =
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image || '') &&
    (body.image || '').length < 2500000
      ? (body.image as string)
      : '';
  if (!text && !payload && !imageData) {
    return NextResponse.json({ ok: false, error: 'Empty message' }, { status: 400 });
  }

  // Find or create the conversation.
  let conversation = null as Awaited<ReturnType<typeof getConversation>>;
  if (body.conversationId) {
    conversation = await getConversation(body.conversationId);
    if (!ownsConversation(conversation, userId, visitorKey)) conversation = null;
  }
  if (!conversation) {
    conversation = userId
      ? await getLatestConversationForUser(userId)
      : await getLatestConversationForVisitor(visitorKey);
  }
  if (conversation && isStale(conversation.updated_at)) {
    // 24h auto-close: archive the old chat and start a fresh one below.
    await updateConversation(conversation.id, { status: 'closed', state: null });
    conversation = null;
  }
  if (!conversation) {
    conversation = await createConversation({
      userId,
      visitorKey: userId ? null : visitorKey,
      subject: text ? text.slice(0, 60) : null,
    });
  }
  if (!conversation) {
    void notifyAdmin(`🚨 Verxor chat: could not create a conversation for user ${userId}\n${lastDbError || 'no DB error recorded'}`);
    return NextResponse.json({ ok: false, error: 'Could not open a chat' }, { status: 500 });
  }
  const conversationId = conversation.id;

  // The customer's tap / text is stored too. PINs and passwords typed during
  // the chat-signup flow are masked so the secret never lands in the transcript.
  const priorState = (conversation.state || null) as FlowState;
  const isSecretStep =
    priorState?.flow === 'signup' && (priorState.step === 'pin' || priorState.step === 'password');
  const userMsg = await appendMessage({
    conversationId,
    role: 'user',
    content: isSecretStep
      ? '••••••'
      : imageData
        ? `📷 Photo${text ? ` — ${text}` : ''}`
        : (text || body.label || payload),
  });

  const state = priorState;
  let replies: ChatMessageRow[] = [];

  try {
    if (payload) {
      const profile = userId ? await resolveProfile(req, userId) : null;
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
    } else if (text || imageData) {
      if (imageData) {
        void sendTelegramPhoto(
          imageData,
          `📷 Verxor chat photo${conversation.subject ? `\nSubject: ${conversation.subject}` : ''}\nCustomer: ${userId || 'visitor'}${text ? `\n"${text.slice(0, 200)}"` : ''}`,
          { kind: 'web', conversationId },
        );
      }
      if (!text) {
        const ack = await appendMessage({
          conversationId,
          role: 'ai',
          content: '📷 Photo received — our team can see it now. Tell me what it shows so I can help you faster.',
          buttons: [
            { label: '💬 Get Support', payload: 'get_support' },
            { label: '🎫 Open Ticket', payload: 'open_ticket' },
          ],
        });
        replies = ack ? [ack] : [];
      } else {
        maybeEscalate(text, userId || 'visitor', conversationId);
        const history = (await listMessages(conversationId)).map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        }));
        history.pop(); // the just-appended message is re-sent below
        const profile = userId ? await resolveProfile(req, userId) : null;
        replies = await handleFreeText(conversationId, state, text, {
          history,
          chatOrigin: new URL(req.url).origin,
          user: {
            userId,
            name: profile?.fullName ?? null,
            email: profile?.email ?? null,
            balanceNgn: profile?.balanceNgn ?? null,
          },
        });
      }
    }
  } catch (err) {
    replies = [];
    void notifyAdmin(
      `⚠️ Verxor chat route error\nConversation: ${conversationId}\n${err instanceof Error ? err.message.slice(0, 300) : 'unknown error'}`,
    );
  }

  return NextResponse.json({
    ok: true,
    conversationId,
    userMessage: userMsg,
    messages: replies,
  });
}
