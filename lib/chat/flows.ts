/**
 * Chat flow engine — deterministic button flows (Phase 1: Data) plus a
 * lightweight router for free text. Buttons never go through the LLM:
 * taps advance a state machine stored on the conversation. Free text is
 * keyword-routed first (fast, free, exact); anything else goes to Mistral
 * (fallback Q&A brain until the Gemini shopping agent lands in Phase 2).
 */

import { getSyncedLivePlansForNetwork } from '@/lib/data-plan-sync';
import { notifyAdmin } from '@/lib/notify';
import { getUserOrdersSummary } from '@/lib/support-summary';
import {
  appendMessage,
  assignTicketId,
  findConversationByTicket,
  generateTicketId,
  getConversation,
  updateConversation,
  type ChatButton,
  type ChatMessageRow,
} from '@/lib/chat/store';

export type DataFlowState = {
  flow: 'data';
  step: 'network' | 'category' | 'plans' | 'phone' | 'confirm';
  network?: string;
  category?: string;
  planId?: number;
  planLabel?: string;
  planPrice?: number;
  phone?: string;
};

export type TicketFlowState = {
  flow: 'ticket';
  step: 'subject' | 'body';
  subject?: string;
};

export type FlowState = DataFlowState | TicketFlowState | null;

const NETWORKS: { id: string; label: string }[] = [
  { id: 'mtn', label: 'MTN' },
  { id: 'airtel', label: 'Airtel' },
  { id: 'glo', label: 'Glo' },
  { id: '9mobile', label: '9mobile' },
];

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'threemonths', label: '3 Months+' },
  { id: 'router', label: 'Router' },
  { id: 'yearly', label: 'Yearly' },
];

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

type Plan = {
  id: number;
  name: string;
  price: number;
  days: string;
  planType?: string;
  validityCategory?: string;
};

function planCategory(p: Plan): string {
  const t = (p.validityCategory || '').toLowerCase();
  if (t.includes('router')) return 'router';
  if (t.includes('3 month')) return 'threemonths';
  if (t.includes('year')) return 'yearly';
  if (t.includes('daily')) return 'daily';
  if (t.includes('week')) return 'weekly';
  const d = parseInt(String(p.days || '30'), 10) || 30;
  if (d >= 300) return 'yearly';
  if (d >= 60) return 'threemonths';
  if (d > 7) return 'monthly';
  if (d > 1) return 'weekly';
  return 'daily';
}

async function reply(
  conversationId: string,
  content: string,
  buttons?: ChatButton[],
  agent?: 'mistral' | 'gemini',
): Promise<ChatMessageRow[]> {
  const msg = await appendMessage({
    conversationId,
    role: 'ai',
    agent: agent || null,
    content,
    buttons,
  });
  return msg ? [msg] : [];
}

/** The three things the assistant can do. */
export const MENU_BUTTONS: ChatButton[] = [
  { label: '💬 Get Support', payload: 'get_support' },
  { label: '🎫 Open Ticket', payload: 'open_ticket' },
  { label: '🛒 Buy Service', payload: 'buy_service' },
];

/** Every service, shown after "Buy Service". */
export const SERVICE_MENU: ChatButton[] = [
  { label: '📱 Data', payload: 'start_data' },
  { label: '⚡ Airtime', payload: 'open_airtime' },
  { label: '🔢 Virtual Number', payload: 'open_vn' },
  { label: '📧 Email OTP', payload: 'open_email' },
  { label: '👥 Buy Logs', payload: 'open_logs' },
  { label: '🚀 Boost', payload: 'open_boost' },
  { label: '🎁 Gift Card', payload: 'open_giftcard' },
];

export function cancelButtons(): ChatButton[] {
  return [{ label: '✖ Cancel', payload: 'cancel_flow' }];
}

/** Button payloads are simple tokens: "data_network:mtn", "data_plan:123", … */
export async function handleButtonPayload(
  conversationId: string,
  state: FlowState,
  payload: string,
  ctx: { purchaseOrigin: string; authHeader: string | null; userId?: string | null; email?: string | null; contact?: string | null },
): Promise<ChatMessageRow[]> {
  const dataState: DataFlowState | null = state && state.flow === 'data' ? state : null;

  // --- navigation buttons (handled by the widget, but answer server-side too)
  if (payload.startsWith('open_')) {
    await updateConversation(conversationId, { state: null });
    return [];
  }

  if (payload === 'menu') {
    await updateConversation(conversationId, { state: null });
    return reply(conversationId, 'What would you like to do?', MENU_BUTTONS);
  }

  if (payload === 'cancel_flow') {
    await updateConversation(conversationId, { state: null });
    return reply(conversationId, 'No problem — cancelled. What next?', MENU_BUTTONS);
  }

  if (payload === 'get_support') {
    await updateConversation(conversationId, { state: null });
    return reply(
      conversationId,
      'Tell me what is going on — a failed order, OTP not arriving, being stuck mid-purchase, anything. I will help you sort it out, and I will bring in a human if needed.',
      [...cancelButtons(), { label: '🛒 Buy Service', payload: 'buy_service' }],
    );
  }

  if (payload === 'buy_service') {
    await updateConversation(conversationId, { state: null });
    return reply(conversationId, 'Which service do you want?', [...SERVICE_MENU, ...cancelButtons()]);
  }

  if (payload === 'open_ticket') {
    await updateConversation(conversationId, {
      state: { flow: 'ticket', step: 'subject' },
    });
    return reply(
      conversationId,
      'Opening a ticket for you. What is the subject? (one short line, e.g. "Data order not delivered")',
      cancelButtons(),
    );
  }

  // --- data flow: network → category → plans → phone → confirm
  if (payload === 'start_data') {
    await updateConversation(conversationId, {
      state: { flow: 'data', step: 'network' },
      subject: 'Data purchase',
    });
    return reply(
      conversationId,
      'Which network?',
      [...NETWORKS.map((n) => ({ label: n.label, payload: `data_network:${n.id}` })), ...cancelButtons()],
    );
  }

  if (payload.startsWith('data_network:')) {
    const net = payload.split(':')[1];
    const found = NETWORKS.find((n) => n.id === net);
    if (!found) {
      return reply(conversationId, 'Pick a network to continue.', [
        ...NETWORKS.map((n) => ({ label: n.label, payload: `data_network:${n.id}` })),
        ...cancelButtons(),
      ]);
    }
    await updateConversation(conversationId, {
      state: { flow: 'data', step: 'category', network: net },
    });
    return reply(
      conversationId,
      `${found.label} data — pick a validity:`,
      [...CATEGORIES.map((c) => ({ label: c.label, payload: `data_category:${c.id}` })), ...cancelButtons()],
    );
  }

  if (payload.startsWith('data_category:') && dataState?.network) {
    const cat = payload.split(':')[1];
    const { plans } = await getSyncedLivePlansForNetwork(dataState.network);
    const grouped = (plans as Plan[])
      .filter((p) => planCategory(p) === cat)
      .sort((a, b) => a.price - b.price)
      .slice(0, 12);
    if (grouped.length === 0) {
      return reply(
        conversationId,
        'No plans in that group right now. Pick another validity:',
        [...CATEGORIES.map((c) => ({ label: c.label, payload: `data_category:${c.id}` })), ...cancelButtons()],
      );
    }
    await updateConversation(conversationId, {
      state: { ...dataState, step: 'plans', category: cat },
    });
    const buttons: ChatButton[] = grouped.map((p) => ({
      label: `${p.name} · ${naira(p.price)} · ${p.days || '?'}d`,
      payload: `data_plan:${p.id}`,
    }));
    return reply(conversationId, 'Tap a plan:', [...buttons, ...cancelButtons()]);
  }

  if (payload.startsWith('data_plan:') && dataState?.network) {
    const planId = Number(payload.split(':')[1]);
    const { plans } = await getSyncedLivePlansForNetwork(dataState.network);
    const plan = (plans as Plan[]).find((p) => p.id === planId);
    if (!plan) {
      return reply(conversationId, 'That plan is no longer available. Pick another:', cancelButtons());
    }
    await updateConversation(conversationId, {
      state: {
        ...dataState,
        step: 'phone',
        planId: plan.id,
        planLabel: `${plan.name} · ${plan.days || '?'} days`,
        planPrice: plan.price,
      },
    });
    return reply(
      conversationId,
      `Type the phone number to load (e.g. 08031234567):`,
      cancelButtons(),
    );
  }

  if (payload === 'data_confirm' && dataState?.phone && dataState.planId) {
    return purchaseData(conversationId, dataState, ctx);
  }

  if (payload === 'data_change_phone' && dataState) {
    await updateConversation(conversationId, { state: { ...dataState, step: 'phone', phone: undefined } });
    return reply(conversationId, 'Type the phone number to load (e.g. 08031234567):', cancelButtons());
  }

  // Unknown payload → reset to menu.
  await updateConversation(conversationId, { state: null });
  return reply(conversationId, 'Let us start over — what would you like to do?', MENU_BUTTONS);
}

async function purchaseData(
  conversationId: string,
  state: DataFlowState,
  ctx: { purchaseOrigin: string; authHeader: string | null; userId?: string | null; email?: string | null; contact?: string | null },
): Promise<ChatMessageRow[]> {
  try {
    const res = await fetch(`${ctx.purchaseOrigin}/api/v1/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ctx.authHeader ? { Authorization: ctx.authHeader } : {}),
      },
      body: JSON.stringify({
        network: state.network,
        phone: state.phone,
        dataPlanId: state.planId,
        userId: ctx.userId || undefined,
        email: ctx.email || undefined,
        contact: ctx.contact || undefined,
      }),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      reference?: string;
    };
    if (!res.ok || !data?.ok) {
      const insufficient = res.status === 402 || /balance|funds/i.test(data?.error || '');
      await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
      if (!insufficient) {
        // Real failure — alert the admin so it never goes unnoticed.
        void notifyAdmin(
          `⚠️ Verxor chat order FAILED\n${state.network?.toUpperCase()} ${state.planLabel} → ${state.phone}\nError: ${data?.error || `HTTP ${res.status}`}\nCustomer: ${ctx.email || ctx.userId || 'unknown'}`,
        );
      }
      return reply(
        conversationId,
        insufficient
          ? `Not enough wallet balance for ${state.planLabel} (${naira(state.planPrice || 0)}). Fund your wallet and come back — your order is saved.`
          : data?.error || 'The purchase failed. Tap Retry to try again.',
        insufficient
          ? [{ label: '💰 Fund Wallet', payload: 'open_fund' }, { label: 'Retry', payload: 'data_confirm' }]
          : [{ label: 'Retry', payload: 'data_confirm' }, ...cancelButtons()],
      );
    }
    await updateConversation(conversationId, { state: null });
    return reply(
      conversationId,
      `✅ Done! ${state.planLabel} sent to ${state.phone}.${data.reference ? ` Ref: ${data.reference}.` : ''} Anything else?`,
      MENU_BUTTONS,
    );
  } catch {
    await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
    void notifyAdmin(
      `⚠️ Verxor chat order ERROR\n${state.network?.toUpperCase()} ${state.planLabel} → ${state.phone}\nCustomer: ${ctx.email || ctx.userId || 'unknown'}`,
    );
    return reply(conversationId, 'Network error while purchasing. Tap Retry to try again.', [
      { label: 'Retry', payload: 'data_confirm' },
      ...cancelButtons(),
    ]);
  }
}

/** Show the confirm card once the phone number is typed. */
export async function handleDataPhoneInput(
  conversationId: string,
  state: DataFlowState,
  phone: string,
): Promise<ChatMessageRow[]> {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11) {
    return reply(
      conversationId,
      'That does not look like a valid Nigerian number — it should be 11 digits like 08031234567. Try again:',
      cancelButtons(),
    );
  }
  await updateConversation(conversationId, { state: { ...state, step: 'confirm', phone: digits } });
  const net = NETWORKS.find((n) => n.id === state.network)?.label || state.network;
  return reply(
    conversationId,
    `Confirm your order:\n\n${net} · ${state.planLabel}\nPhone: ${digits}\nPrice: ${naira(state.planPrice || 0)}`,
    [
      { label: `Confirm ${naira(state.planPrice || 0)}`, payload: 'data_confirm' },
      { label: 'Change number', payload: 'data_change_phone' },
      { label: '✖ Cancel', payload: 'cancel_flow' },
    ],
  );
}

/**
 * Phase 2 — Gemini free-text shopping. The model only extracts intent
 * (network, size, duration, phone) as strict JSON; the actual plan matching
 * and purchase remain deterministic code, so the AI can never invent prices.
 */
type GeminiIntent = {
  action: 'buy_data' | 'price_check' | 'other';
  network?: string | null;
  size_text?: string | null;
  duration?: string | null;
  phone?: string | null;
};

function parseJsonLoose(raw: string): GeminiIntent | null {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as GeminiIntent;
  } catch {
    return null;
  }
}

async function geminiExtract(text: string): Promise<GeminiIntent | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const prompt = [
    'You extract shopping intent from a Nigerian customer message for the Verxor data service.',
    `Respond with ONLY a JSON object, no prose. Fields: "action" ("buy_data" if they want to purchase data, "price_check" if they only ask what a plan costs, "other" if the message is not about buying or checking data prices), "network" (one of "mtn","airtel","glo","9mobile", or null), "size_text" (the data size they want like "5GB" or "500MB", or null), "duration" (one of "daily","weekly","monthly","threemonths","router","yearly", or null), "phone" (the phone number as 11 digits starting with 0, or null).`,
    'If they ask a general question or mention several things, use "other".',
    `Message: "${text.slice(0, 300)}"`,
  ].join('\n');
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 120,
            responseMimeType: 'application/json',
          },
        }),
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseJsonLoose(raw);
  } catch {
    return null;
  }
}

/** Normalise "5 GB", "5gb", "500MB" -> "5GB" / "500MB" for comparisons. */
function normaliseSize(s: string): string {
  const m = s.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(gb|gig|mb)/);
  if (!m) return '';
  const num = m[1].replace(/\.0+$/, '');
  const unit = m[2].startsWith('g') ? 'GB' : 'MB';
  return `${num}${unit}`;
}

/**
 * Run the Gemini intent, then resolve it against the real plan list.
 * Returns null when Gemini is not configured or the intent is "other"
 * (caller falls back to the Mistral Q&A brain).
 */
async function geminiShopping(
  conversationId: string,
  text: string,
): Promise<ChatMessageRow[] | null> {
  const intent = await geminiExtract(text);
  if (!intent || intent.action === 'other') return null;

  const net =
    NETWORKS.find((n) => n.id === (intent.network || '').toLowerCase()) ||
    NETWORKS.find((n) => n.label.toLowerCase() === (intent.network || '').toLowerCase()) ||
    null;
  if (!net) {
    return handleButtonPayload(conversationId, null, 'start_data', {
      purchaseOrigin: '',
      authHeader: null,
    });
  }

  const { plans } = await getSyncedLivePlansForNetwork(net.id);
  let pool = plans as Plan[];
  if (intent.duration) {
    const filtered = pool.filter((p) => planCategory(p) === intent.duration);
    if (filtered.length > 0) pool = filtered;
  }
  const wanted = intent.size_text ? normaliseSize(intent.size_text) : '';
  let match: Plan | null = null;
  if (wanted) {
    match =
      pool.find((p) => normaliseSize(p.name) === wanted) ||
      pool.find((p) => normaliseSize(p.name).startsWith(wanted)) ||
      null;
  } else if (pool.length > 0) {
    match = [...pool].sort((a, b) => a.price - b.price)[0];
  }
  if (!match) {
    const closest = [...pool].sort((a, b) => a.price - b.price).slice(0, 6);
    const buttons: ChatButton[] = closest.map((p) => ({
      label: `${p.name} · ${naira(p.price)}`,
      payload: `data_plan:${p.id}`,
    }));
    return reply(
      conversationId,
      `I could not find ${wanted || 'that plan'} on ${net.label} right now. These are available:`,
      buttons.length > 0 ? [...buttons, ...cancelButtons()] : [...cancelButtons()],
    );
  }

  const phoneDigits = (intent.phone || '').replace(/\D/g, '');
  const planLabel = `${match.name} · ${match.days || '?'} days`;
  if (intent.action === 'price_check') {
    return reply(
      conversationId,
      `${planLabel} on ${net.label} is ${naira(match.price)}. Want it?`,
      [
        { label: `Buy · ${naira(match.price)}`, payload: `data_plan:${match.id}` },
        ...cancelButtons(),
      ],
    );
  }
  if (phoneDigits.length === 11) {
    const state: DataFlowState = {
      flow: 'data',
      step: 'plans',
      network: net.id,
      planId: match.id,
      planLabel,
      planPrice: match.price,
    };
    return handleDataPhoneInput(conversationId, state, phoneDigits);
  }
  await updateConversation(conversationId, {
    state: {
      flow: 'data',
      step: 'phone',
      network: net.id,
      category: intent.duration || undefined,
      planId: match.id,
      planLabel,
      planPrice: match.price,
    },
  });
  return reply(
    conversationId,
    `Found it: ${planLabel} on ${net.label} for ${naira(match.price)}. What phone number should I send it to? (e.g. 08031234567)`,
    cancelButtons(),
  );
}

/**
 * Free text routing. Keywords hit the deterministic flows first; everything
 * else falls through to the Mistral Q&A brain (if configured).
 */
export async function handleFreeText(
  conversationId: string,
  state: FlowState,
  text: string,
  opts: {
    history: { role: string; content: string }[];
    user?: {
      userId?: string | null;
      name?: string | null;
      email?: string | null;
      balanceNgn?: number | null;
    } | null;
  },
): Promise<ChatMessageRow[]> {
  const lower = text.toLowerCase().trim();

  // Ticket flow: subject → body → submit.
  if (state?.flow === 'ticket' && state.step === 'subject') {
    const subject = text.trim().slice(0, 80);
    await updateConversation(conversationId, {
      state: { flow: 'ticket', step: 'body', subject },
    });
    return reply(
      conversationId,
      `Subject: "${subject}". Now describe the problem in detail (order reference, phone number, what happened):`,
      cancelButtons(),
    );
  }
  if (state?.flow === 'ticket' && state.step === 'body' && state.subject) {
    const body = text.trim().slice(0, 1500);
    const ticketId = generateTicketId();
    await updateConversation(conversationId, { state: null, subject: state.subject, status: 'waiting_admin' });
    await assignTicketId(conversationId, ticketId, state.subject);
    void notifyAdmin(
      `🎫 NEW TICKET ${ticketId}\nSubject: ${state.subject}\nCustomer: ${opts.user?.email || opts.user?.name || 'unknown'}\n\n${body}\n\n/ticket ${ticketId} for status — or just type a reply to answer the customer waiting longest.`,
    );
    return reply(
      conversationId,
      `🎫 Ticket received! Your ticket ID is ${ticketId} — keep it safe and quote it any time to check the status. Our team has been notified and will get back to you here. You can keep chatting with me while you wait.`,
      MENU_BUTTONS,
    );
  }

  // Ticket status lookup — "ticket status", "my ticket", or a VX-1234 reference.
  const ticketRefMatch = lower.match(/vx-?\s?(\d{3,6})\b/);
  if (ticketRefMatch || /\bticket status\b|\bmy tickets?\b/.test(lower)) {
    const ref = ticketRefMatch ? `VX-${ticketRefMatch[1]}` : null;
    const ticketConvo = ref
      ? await findConversationByTicket(ref)
      : await getConversation(conversationId);
    const ticketId =
      ticketConvo?.ticket_id ||
      (ticketConvo?.subject?.match(/\[(VX-\d{3,6})\]/)?.[1] ?? null) ||
      ref;
    if (!ticketConvo || !ticketId) {
      return reply(
        conversationId,
        ref
          ? `I could not find ticket ${ref.toUpperCase()}. Check the ID (it looks like VX-1234) and send it again.`
          : 'I do not have a ticket ID on this chat yet. If you opened one before, send it here (it looks like VX-1234) and I will check it.',
        MENU_BUTTONS,
      );
    }
    const statusLine: Record<string, string> = {
      ai: 'being handled by the assistant',
      waiting_admin: 'with our support team, waiting for their reply',
      admin: 'being handled by our team right now',
      closed: 'closed (archived)',
    };
    return reply(
      conversationId,
      `🎫 Ticket ${ticketId} — "${ticketConvo.subject?.replace(/^\[VX-\d{3,6}\]\s*/, '') || 'no subject'}"\nStatus: ${statusLine[ticketConvo.status] || ticketConvo.status}.${
        ticketConvo.status === 'closed' ? ' If it is not solved, tap Open Ticket and quote this ID.' : ''
      }`,
      MENU_BUTTONS,
    );
  }

  // Active data flow expecting a phone number?
  if (state?.flow === 'data' && state.step === 'phone') {
    return handleDataPhoneInput(conversationId, state, text);
  }
  if (state?.flow === 'data' && state.step === 'confirm') {
    const digits = text.replace(/\D/g, '');
    if (digits.length === 11) return handleDataPhoneInput(conversationId, state, text);
  }

  // Keyword routing — start the data flow.
  if (/\bdata\b|gb\b|bundle/.test(lower) || lower.includes('internet')) {
    // Phase 2: let Gemini resolve specifics ("buy 5GB MTN for 0803…") first.
    const shopped = await geminiShopping(conversationId, text);
    if (shopped) return shopped;
    return handleButtonPayload(conversationId, null, 'start_data', {
      purchaseOrigin: '',
      authHeader: null,
    });
  }

  // Small talk.
  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lower)) {
    return reply(
      conversationId,
      'Hello 👋 I am the Verxor assistant. Jump to any service, buy right here in chat, or get support from me. What would you like?',
      MENU_BUTTONS,
    );
  }

  // Phase 3 support tool — real order status from the database.
  if (/\b(my orders?|order status|orders? status|where.?s my order|track|order history|recent orders?)\b/.test(lower)) {
    const summary = opts.user?.userId ? await getUserOrdersSummary(opts.user.userId) : null;
    if (summary) {
      return reply(
        conversationId,
        `Here are your most recent orders:\n\n${summary}\n\nTap a service below or ask me anything about them.`,
        MENU_BUTTONS,
      );
    }
    return reply(
      conversationId,
      'I could not find any recent orders on your account. If you just placed one, give it a minute and check again. Anything else I can do?',
      MENU_BUTTONS,
    );
  }

  // Support detection — a customer describing a problem escalates to Denny.
  if (
    /\b(fail|failed|error|stuck|problem|issue|not work\w*|not deliver\w*|refund|wrong number|missing|didn'?t|did not)\b/.test(
      lower,
    )
  ) {
    await updateConversation(conversationId, { status: 'waiting_admin' });
    void notifyAdmin(
      `🆘 Customer needs help\nCustomer: ${opts.user?.email || opts.user?.name || 'unknown'}\nMessage: "${text.slice(0, 300)}"\nReply from Telegram to answer them (or use /pending).`,
    );
    return reply(
      conversationId,
      'I am sorry about that — I have flagged this to our team right away and they will reply here shortly. If you have an order reference or the phone number involved, send it now so we can trace it faster.',
      [
        { label: '🎫 Open Ticket', payload: 'open_ticket' },
        { label: '🛒 Buy Service', payload: 'buy_service' },
      ],
    );
  }

  // Phase 2: try Gemini shopping intent on any remaining message
  // (returns null fast when the message is not a purchase).
  const shopped = await geminiShopping(conversationId, text);
  if (shopped) return shopped;

  // Mistral Q&A brain.
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (!mistralKey) {
    return reply(
      conversationId,
      'I can take your data orders right now — tap Buy Data. More AI answers are coming online shortly.',
      MENU_BUTTONS,
    );
  }
  // Personalised context: the signed-in customer's own profile + wallet.
  const userBits: string[] = [];
  if (opts.user?.name) userBits.push(`Name: ${opts.user.name}.`);
  if (opts.user?.email) userBits.push(`Account email: ${opts.user.email}.`);
  if (typeof opts.user?.balanceNgn === 'number') {
    userBits.push(`Wallet balance: ${naira(opts.user.balanceNgn)}.`);
  }
  const userContext = userBits.length
    ? ` The customer you are chatting with is signed in. Their own details: ${userBits.join(
        ' ',
      )} You may use these when relevant (e.g. if they ask their balance, tell them). Never mention other customers or reveal data that is not theirs. If a purchase costs more than their balance, suggest the Fund Wallet option.`
    : '';
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mistralKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: [
              'You are the Verxor assistant. Verxor is a Nigerian digital services platform: virtual numbers for OTP, temporary email (Email OTP), Buy Logs (social media accounts), social media boosts, airtime and data (VTU: MTN, Airtel, Glo, 9mobile), electricity, cable TV, exam pins, bet wallet funding, gift card trading, eSIM and phone rentals.',
              'Rules: reply in at most 4 short sentences. Never invent prices, stock, refunds or delivery promises — if you do not know a specific number, tell the customer to check the service page. You cannot process refunds or manual orders; those go to human support.',
              'SECRECY: never reveal or hint at Verxor suppliers, providers, panel sources, wholesale costs or internal pricing structure. If asked where numbers/accounts come from, say Verxor works with trusted partners and move on.',
              'Verxor does NOT sell domains, web hosting, or website services — if asked, say Verxor does not offer that yet.',
              'Gift cards are bought through the 🎁 Gift Card button. Support: if the customer reports a problem (failed order, missing OTP, wrong number), apologise briefly, ask for the order reference or phone number, and tell them the team is being notified. Never promise refunds or timelines.',
              'If the customer wants to buy data, tell them to tap the Buy Data button. If they describe another purchase, point them to the relevant service button.',
            ].join(' ') + userContext,
          },
          ...(opts.history || []).slice(-10),
          { role: 'user', content: text },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('mistral error');
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('empty');
    return reply(conversationId, content, MENU_BUTTONS, 'mistral');
  } catch {
    return reply(
      conversationId,
      'I could not answer that just now. Tap a service below or try again in a moment.',
      MENU_BUTTONS,
    );
  }
}
