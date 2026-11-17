import { NextRequest, NextResponse } from 'next/server';
import { getSyncedLivePlansForNetwork } from '@/lib/data-plan-sync';
import {
  getOrCreateConversation,
  appendMessage,
  listMessages,
  type ChatMessage,
} from '@/lib/chat-store';

/**
 * Live chat backend.
 *   GET  /api/chat?conversationId=... (or userId/visitorKey) → conversation + messages
 *   POST /api/chat { type:'action'|'text', text?, action?, visitorKey? }
 *
 * Phase 1: deterministic button flows (Data as the template) + keyword intents.
 * When MISTRAL_API_KEY is configured, free text is answered by Mistral.
 * The customer never sees the seams: buttons run scripts, typing runs the LLM.
 */

export const dynamic = 'force-dynamic';

const NETWORK_LABELS: Record<string, string> = {
  mtn: 'MTN',
  airtel: 'Airtel',
  glo: 'Glo',
  '9mobile': '9mobile',
};

const CATEGORY_ORDER = ['Hot deals', 'Daily', 'Weekly', 'Monthly', '3 Months+', 'Router', 'Yearly'];

type Plan = { id: number | string; name: string; price: number; validityCategory?: string; days?: string };

type ChatAction = {
  flow?: string;
  step?: string;
  data?: Record<string, unknown>;
};

type CardButton = { label: string; action: ChatAction };
type CardRow = { label: string; sub?: string; action: ChatAction };
type Card = { kind: 'card'; title?: string; body?: string; buttons?: CardButton[]; rows?: CardRow[] };

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

/** Look up the customer's saved phone (their own profile row) if available. */
async function savedPhone(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const base = supabaseBase();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(`${base}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=phone&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ phone?: string }>;
    const p = String(rows[0]?.phone || '').replace(/\D/g, '');
    return p.length >= 10 ? p : null;
  } catch {
    return null;
  }
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

function networkCard(): Card {
  return {
    kind: 'card',
    title: 'Which network?',
    buttons: ['mtn', 'airtel', 'glo', '9mobile'].map((n) => ({
      label: NETWORK_LABELS[n],
      action: { flow: 'data-buy', step: 'network', data: { network: n } },
    })),
  };
}

function planGroups(plans: Plan[]): Card['rows'] {
  const byCat = new Map<string, CardRow[]>();
  for (const p of plans) {
    const cat = (p.validityCategory || 'Other').trim();
    if (!byCat.has(cat)) byCat.set(cat, []);
    const rows = byCat.get(cat)!;
    rows.push({
      label: `${p.name} · ${naira(p.price)}`,
      action: { flow: 'data-buy', step: 'plan', data: { planId: p.id, planName: p.name, price: p.price } },
    });
  }
  const out: Card['rows'] = [];
  for (const cat of CATEGORY_ORDER) {
    const rows = byCat.get(cat);
    if (rows?.length) out.push(...rows);
  }
  for (const [cat, rows] of byCat) {
    if (!CATEGORY_ORDER.includes(cat)) out.push(...rows);
  }
  return out.slice(0, 24);
}

function welcomeCard(firstName?: string): Card {
  return {
    kind: 'card',
    title: `Hi${firstName ? ` ${firstName}` : ''} 👋 I'm the Verxor assistant.`,
    body: 'I can place orders, deliver codes and check status — day or night. What do you need?',
    buttons: [
      { label: '📱 Buy Data', action: { flow: 'data-buy', step: 'start' } },
      { label: '💵 Buy Airtime', action: { flow: 'airtime-buy', step: 'start' } },
      { label: '🛟 Human support', action: { flow: 'human', step: 'start' } },
    ],
  };
}

function cardToMessage(card: Card) {
  return { content: card.title || '', actions: card };
}

async function runDataFlow(action: ChatAction, userId: string | null): Promise<{ msg: ReturnType<typeof cardToMessage>; pending: { flow: string; step: string; data: Record<string, unknown> } | null }> {
  const data = { ...(action.data || {}) };
  const step = action.step || 'start';

  if (step === 'start' || !data.network) {
    return { msg: cardToMessage(networkCard()), pending: { flow: 'data-buy', step: 'network', data } };
  }

  const network = String(data.network);
  if (step === 'network') {
    const { plans } = await getSyncedLivePlansForNetwork(network);
    const card: Card = {
      kind: 'card',
      title: `${NETWORK_LABELS[network] || network} data plans`,
      body: 'Tap a plan to select it.',
      rows: planGroups(plans as Plan[]),
    };
    if (!card.rows?.length) {
      return {
        msg: cardToMessage({
          kind: 'card',
          title: `No ${NETWORK_LABELS[network] || network} plans are available right now.`,
          body: 'Try another network or ask me for help.',
          buttons: [{ label: 'Back to networks', action: { flow: 'data-buy', step: 'start' } }],
        }),
        pending: null,
      };
    }
    return {
      msg: cardToMessage(card),
      pending: { flow: 'data-buy', step: 'plan', data: { network } },
    };
  }

  // A plan button carried the plan details; wait for the phone number.
  if (step === 'plan' && data.planId) {
    const saved = await savedPhone(userId);
    const masked = saved ? `${saved.slice(0, 4)}•••${saved.slice(-4)}` : null;
    const card: Card = {
      kind: 'card',
      title: `${data.planName} · ${naira(Number(data.price))}`,
      body: masked
        ? `Send it to your saved number ${masked}? Or type another number.`
        : 'Which phone number should receive it? Type the number (e.g. 08031234567).',
      buttons: masked
        ? [
            { label: `Use ${masked}`, action: { flow: 'data-buy', step: 'phone', data: { ...data, phone: saved } } },
            { label: 'Type another', action: { flow: 'data-buy', step: 'ask-phone', data } },
          ]
        : undefined,
    };
    return {
      msg: cardToMessage(card),
      pending: { flow: 'data-buy', step: 'phone', data },
    };
  }

  if (step === 'ask-phone') {
    return {
      msg: cardToMessage({ kind: 'card', title: 'Type the phone number (e.g. 08031234567).' }),
      pending: { flow: 'data-buy', step: 'phone', data },
    };
  }

  // Phone collected → confirm.
  if (step === 'phone' && data.phone) {
    const card: Card = {
      kind: 'card',
      title: 'Confirm your order',
      body: `${NETWORK_LABELS[String(data.network)] || data.network} ${data.planName} → ${String(data.phone)} · ${naira(Number(data.price))}`,
      buttons: [
        { label: `Confirm ${naira(Number(data.price))}`, action: { flow: 'data-buy', step: 'confirm', data } },
        { label: 'Change', action: { flow: 'data-buy', step: 'start' } },
      ],
    };
    return { msg: cardToMessage(card), pending: { flow: 'data-buy', step: 'confirm', data } };
  }

  if (step === 'confirm') {
    const phone = String(data.phone || '').replace(/\D/g, '');
    const result = await placeDataOrder({
      network: String(data.network),
      phone,
      planId: data.planId as number | string,
      planName: String(data.planName || ''),
      amount: Number(data.price) || 0,
      userId,
    });
    if (result.ok) {
      return {
        msg: cardToMessage({
          kind: 'card',
          title: `✅ Sent! ${data.planName} is on its way to ${phone}.`,
          body: `Reference ${result.ref || 'VX-DATA'}. It usually lands within a minute. Anything else?`,
          buttons: [{ label: 'Buy more data', action: { flow: 'data-buy', step: 'start' } }],
        }),
        pending: null,
      };
    }
    return {
      msg: cardToMessage({
        kind: 'card',
        title: `❌ ${result.error || 'The order could not go through.'}`,
        body: 'I have flagged this for Denny. You can also try again now.',
        buttons: [
          { label: 'Try again', action: { flow: 'data-buy', step: 'start' } },
          { label: 'Human support', action: { flow: 'human', step: 'start' } },
        ],
      }),
      pending: null,
    };
  }

  return { msg: cardToMessage(networkCard()), pending: { flow: 'data-buy', step: 'network', data: {} } };
}

async function placeDataOrder(o: {
  network: string;
  phone: string;
  planId: number | string;
  planName: string;
  amount: number;
  userId: string | null;
}): Promise<{ ok: boolean; ref?: string; error?: string }> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.verxor.com';
  try {
    const res = await fetch(`${base}/api/v1/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: o.network,
        phone: o.phone,
        planId: o.planId,
        planName: o.planName,
        amount: o.amount,
        ...(o.userId ? { userId: o.userId } : {}),
      }),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; reference?: string; ref?: string };
    return { ok: Boolean(res.ok && data.ok), ref: data.reference || data.ref, error: data.error };
  } catch {
    return { ok: false, error: 'Network error while placing the order' };
  }
}

/** Keyword intents for phase 1 (before/without the LLM). */
function keywordIntent(text: string): ChatAction | null {
  const t = text.toLowerCase();
  if (/(buy|get|sell|send).*(data)|\bdata plan|mb\b|gb\b/.test(t)) return { flow: 'data-buy', step: 'start' };
  if (/(buy|get|sell|send).*(airtime|credit|recharge)|recharge/.test(t)) return { flow: 'airtime-buy', step: 'start' };
  return null;
}

async function askMistral(text: string): Promise<string | null> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content:
              'You are the Verxor assistant, a friendly support agent for verxor.com, a Nigerian digital services marketplace. Services: Virtual Numbers for OTP, Boost Account (social media growth), Buy Logs (social media accounts), Email OTP, Data/Airtime/Electricity/Cable TV/Exam pins/Bet wallet (VTU), Telegram Premium, Proxies. Prices are in naira. Keep replies short (max 3 sentences), warm and practical. Never invent prices, order IDs or policies. For buying, invite the customer to use the buttons in the chat.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 220,
        temperature: 0.4,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const out = data.choices?.[0]?.message?.content?.trim();
    return out || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url());
  const conversationId = searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json({ ok: false, error: 'conversationId required' }, { status: 400 });
  }
  const messages = await listMessages(conversationId);
  return NextResponse.json({ ok: true, messages });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    type?: 'text' | 'action';
    text?: string;
    action?: ChatAction;
    visitorKey?: string;
    firstName?: string;
  };
  const userId = await resolveUserId(req);
  const visitorKey = String(body.visitorKey || '').slice(0, 64) || null;
  const conversation = await getOrCreateConversation({ userId, visitorKey });
  if (!conversation) {
    return NextResponse.json({ ok: false, error: 'Chat is unavailable right now' }, { status: 500 });
  }
  const conversationId = conversation.id;
  const started = conversation.created_at === conversation.updated_at;

  const replies: Array<{ role: 'ai' | 'user'; content: string; actions?: unknown; agent?: string }> = [];
  let pending: { flow: string; step: string; data: Record<string, unknown> } | null = null;

  if (body.type === 'action' && body.action) {
    if (body.action.flow === 'welcome') {
      // Opening the chat for the first time — just the welcome card, no user message.
      if (started) {
        replies.push({ role: 'ai', content: '', actions: welcomeCard(body.firstName) });
      }
    } else if (body.action.flow === 'human') {
      await appendMessage(conversationId, { role: 'user', content: 'Human support please 🙋' });
      replies.push({
        role: 'ai',
        content: "Got it — Denny will take over here shortly. You'll get a reply in this chat.",
      });
      // TODO phase 5: also notify Denny (Telegram/WhatsApp).
    } else if (body.action.flow === 'airtime-buy') {
      await appendMessage(conversationId, { role: 'user', content: 'Buy airtime' });
      replies.push({
        role: 'ai',
        content: '',
        actions: {
          kind: 'card',
          title: 'Airtime is coming to chat very soon.',
          body: 'For now, tap below and I will walk you through it on the Airtime page. Data orders I can complete right here.',
          buttons: [{ label: 'Buy Data instead', action: { flow: 'data-buy', step: 'start' } }],
        },
      });
    } else if (body.action.flow === 'data-buy') {
      await appendMessage(conversationId, {
        role: 'user',
        content: body.action.step === 'start' ? 'Buy data' : `Selected ${body.action.step}`,
      });
      const { msg, pending: p } = await runDataFlow(body.action, userId);
      replies.push({ role: 'ai', content: msg.content, actions: msg.actions });
      pending = p;
    }
  } else if (body.type === 'text' && typeof body.text === 'string' && body.text.trim()) {
    const text = body.text.trim().slice(0, 1000);
    await appendMessage(conversationId, { role: 'user', content: text });

    if (started) {
      replies.push({ role: 'ai', content: '', actions: welcomeCard(body.firstName) });
    }

    const intent = keywordIntent(text);
    if (intent && intent.flow === 'data-buy') {
      const { msg, pending: p } = await runDataFlow(intent, userId);
      replies.push({ role: 'ai', content: msg.content, actions: msg.actions });
      pending = p;
    } else {
      const llm = await askMistral(text);
      if (llm) {
        replies.push({ role: 'ai', content: llm, agent: 'mistral' });
      } else {
        replies.push({
          role: 'ai',
          content: "I'm Verxor's assistant — I can place data orders right here in chat.",
          actions: {
            kind: 'card',
            buttons: [{ label: '📱 Buy Data', action: { flow: 'data-buy', step: 'start' } }],
          },
        });
      }
    }
  } else {
    return NextResponse.json({ ok: false, error: 'Nothing to send' }, { status: 400 });
  }

  for (const r of replies) {
    await appendMessage(conversationId, {
      role: r.role,
      content: r.content,
      agent: r.agent,
      ...(r.actions ? { actions: r.actions } : {}),
    });
  }

  return NextResponse.json({
    ok: true,
    conversationId,
    pending,
  });
}
