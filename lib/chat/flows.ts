/**
 * Chat flow engine — deterministic button flows (Phase 1: Data) plus a
 * lightweight router for free text. Buttons never go through the LLM:
 * taps advance a state machine stored on the conversation. Free text is
 * keyword-routed first (fast, free, exact); anything else goes to Mistral
 * (fallback Q&A brain until the Gemini shopping agent lands in Phase 2).
 */

import { getSyncedLivePlansForNetwork } from '@/lib/data-plan-sync';
import {
  appendMessage,
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

export type FlowState = DataFlowState | null;

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

export const MENU_BUTTONS: ChatButton[] = [
  { label: '📱 Buy Data', payload: 'start_data' },
  { label: '⚡ Buy Airtime', payload: 'open_airtime' },
  { label: '🔢 Virtual Number', payload: 'open_vn' },
  { label: '📧 Email OTP', payload: 'open_email' },
  { label: '👥 Buy Logs', payload: 'open_logs' },
  { label: '🚀 Boost', payload: 'open_boost' },
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
    return reply(conversationId, 'No problem — order cancelled. What next?', MENU_BUTTONS);
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
 * Free text routing. Keywords hit the deterministic flows first; everything
 * else falls through to the Mistral Q&A brain (if configured).
 */
export async function handleFreeText(
  conversationId: string,
  state: FlowState,
  text: string,
  opts: { history: { role: string; content: string }[] },
): Promise<ChatMessageRow[]> {
  const lower = text.toLowerCase().trim();

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
    return handleButtonPayload(conversationId, null, 'start_data', {
      purchaseOrigin: '',
      authHeader: null,
    });
  }

  // Small talk.
  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lower)) {
    return reply(
      conversationId,
      'Hello 👋 I am the Verxor assistant. I can sell you data right here in chat, or take you to any service. What would you like?',
      MENU_BUTTONS,
    );
  }

  // Mistral Q&A brain.
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (!mistralKey) {
    return reply(
      conversationId,
      'I can take your data orders right now — tap Buy Data. More AI answers are coming online shortly.',
      MENU_BUTTONS,
    );
  }
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
              'You are the Verxor assistant. Verxor is a Nigerian digital services platform: virtual numbers for OTP, temporary email (Email OTP), Buy Logs (social media accounts), social media boosts, airtime and data (VTU: MTN, Airtel, Glo, 9mobile), electricity, cable TV, exam pins and bet wallet funding.',
              'Rules: reply in at most 4 short sentences. Never invent prices, stock, refunds or delivery promises — if you do not know a specific number, tell the customer to check the service page. You cannot process refunds or manual orders; those go to human support.',
              'If the customer wants to buy data, tell them to tap the Buy Data button. If they describe another purchase, point them to the relevant service button.',
            ].join(' '),
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
