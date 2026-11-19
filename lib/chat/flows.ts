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
  deleteSignupDraft,
  findConversationByTicket,
  generateTicketId,
  getConversation,
  loadSignupDraft,
  saveSignupDraft,
  updateConversation,
  type ChatButton,
  type ChatMessageRow,
  type SignupDraft,
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

export type SignupFlowState = {
  flow: 'signup';
  step: 'name' | 'email' | 'phone' | 'pin' | 'password' | 'referrer';
};

export type ElectricityFlowState = {
  flow: 'electricity';
  step: 'disco' | 'meterType' | 'meter' | 'amount' | 'phone' | 'confirm';
  disco?: string;
  meterType?: 'prepaid' | 'postpaid';
  meterNo?: string;
  customerName?: string;
  amount?: number;
  phone?: string;
};

export type BoostFlowState = {
  flow: 'boost';
  step: 'platform' | 'services' | 'quantity' | 'link' | 'confirm';
  platform?: string;
  platformName?: string;
  serviceId?: string;
  serviceTitle?: string;
  ratePer1000?: number;
  min?: number;
  max?: number;
  qty?: number;
  link?: string;
};

export type LogsFlowState = {
  flow: 'logs';
  step: 'platform' | 'offers' | 'quantity' | 'confirm';
  platform?: string;
  providerListingId?: number;
  offerTitle?: string;
  unitPrice?: number;
  qty?: number;
};

export type EmailOtpFlowState = {
  flow: 'emailotp';
  step: 'site' | 'domains' | 'confirm';
  site?: string;
  siteName?: string;
  domain?: string;
};

export type AirtimeFlowState = {
  flow: 'airtime';
  step: 'network' | 'amount' | 'phone' | 'confirm';
  network?: string;
  amount?: number;
  phone?: string;
};

export type FlowState =
  | DataFlowState
  | TicketFlowState
  | SignupFlowState
  | AirtimeFlowState
  | ElectricityFlowState
  | EmailOtpFlowState
  | LogsFlowState
  | BoostFlowState
  | null;

const NETWORKS: { id: string; label: string }[] = [
  { id: 'mtn', label: 'MTN' },
  { id: 'airtel', label: 'Airtel' },
  { id: 'glo', label: 'Glo' },
  { id: '9mobile', label: '9mobile' },
];

const EMAIL_OTP_PLATFORMS: { id: string; name: string; site: string }[] = [
  { id: 'instagram', name: 'Instagram', site: 'instagram.com' },
  { id: 'google', name: 'Google / Gmail', site: 'google.com' },
  { id: 'tiktok', name: 'TikTok', site: 'tiktok.com' },
  { id: 'facebook', name: 'Facebook', site: 'facebook.com' },
  { id: 'discord', name: 'Discord', site: 'discord.com' },
  { id: 'x', name: 'X (Twitter)', site: 'x.com' },
  { id: 'telegram', name: 'Telegram', site: 'telegram.org' },
  { id: 'whatsapp', name: 'WhatsApp', site: 'whatsapp.com' },
  { id: 'reddit', name: 'Reddit', site: 'reddit.com' },
  { id: 'microsoft', name: 'Microsoft', site: 'microsoft.com' },
  { id: 'apple', name: 'Apple', site: 'apple.com' },
  { id: 'amazon', name: 'Amazon', site: 'amazon.com' },
];

function cleanSiteName(raw: string): string | null {
  const t = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  const byName = EMAIL_OTP_PLATFORMS.find((p) => p.name.toLowerCase() === t || p.id === t);
  if (byName) return byName.site;
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}\/?$/.test(t)) return t.split('/')[0];
  return null;
}

const LOGS_PLATFORMS: string[] = [
  'Facebook',
  'Instagram',
  'TikTok',
  'X / Twitter',
  'Telegram',
  'Gmail',
  'YouTube',
  'WhatsApp',
  'Discord',
  'Reddit',
  'Snapchat',
  'Spotify',
];

const LOGS_ALIASES: Record<string, string> = {
  ig: 'Instagram',
  insta: 'Instagram',
  instagram: 'Instagram',
  fb: 'Facebook',
  wa: 'WhatsApp',
  tg: 'Telegram',
  yt: 'YouTube',
  twitter: 'X / Twitter',
  x: 'X / Twitter',
};

type LogsOffer = {
  providerListingId: number;
  title: string;
  priceNgn: number;
  count: number;
};

async function fetchLogsCatalog(
  origin: string,
  platform: string,
): Promise<{ ok: boolean; error?: string; offers?: LogsOffer[] }> {
  try {
    const res = await fetch(
      `${origin || 'https://www.verxor.com'}/api/v1/accounts/catalog?platform=${encodeURIComponent(platform)}`,
      { cache: 'no-store' },
    );
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      offers?: { providerListingId?: number | string; title?: string; priceNgn?: number; quantity?: number; count?: number }[];
    };
    if (!res.ok || !data?.ok || !Array.isArray(data.offers)) {
      return { ok: false, error: data?.error || `Could not load ${platform} stock right now` };
    }
    const offers: LogsOffer[] = [];
    for (const o of data.offers) {
      const id = Number(o.providerListingId);
      const price = Number(o.priceNgn);
      if (!Number.isSafeInteger(id) || !Number.isFinite(price)) continue;
      offers.push({ providerListingId: id, title: String(o.title || 'Account'), priceNgn: price, count: Number(o.count ?? o.quantity ?? 0) || 0 });
    }
    return { ok: true, offers };
  } catch {
    return { ok: false, error: 'network' };
  }
}

type BoostCatalogService = {
  id: string;
  platform: string;
  platformName: string;
  title: string;
  ratePer1000: number;
  min: number;
  max: number;
};

type BoostCatalogPlatform = { id: string; name: string; totalServices: number };

async function fetchBoostCatalog(
  origin: string,
): Promise<{ ok: boolean; error?: string; platforms?: BoostCatalogPlatform[]; services?: BoostCatalogService[] }> {
  try {
    const res = await fetch(`${origin || 'https://www.verxor.com'}/api/v1/boost/catalog`, { cache: 'no-store' });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      platforms?: BoostCatalogPlatform[];
      services?: BoostCatalogService[];
    };
    if (!res.ok || !data?.ok) return { ok: false, error: data?.error || 'Catalog unavailable' };
    return { ok: true, platforms: data.platforms || [], services: data.services || [] };
  } catch {
    return { ok: false, error: 'network' };
  }
}

function boostPrice(ratePer1000: number, qty: number): number {
  return Math.round((qty / 1000) * ratePer1000);
}

const ELECTRICITY_DISCOS: { id: string; label: string }[] = [
  { id: 'ikeja', label: 'Ikeja Electric' },
  { id: 'eko', label: 'Eko Electric' },
  { id: 'ibadan', label: 'Ibadan Electric' },
  { id: 'abuja', label: 'Abuja Electric' },
  { id: 'kaduna', label: 'Kaduna Electric' },
  { id: 'kano', label: 'Kano Electric' },
  { id: 'jos', label: 'Jos Electric' },
  { id: 'ph', label: 'Port Harcourt Electric' },
  { id: 'enugu', label: 'Enugu Electric' },
  { id: 'benin', label: 'Benin Electric' },
  { id: 'yola', label: 'Yola Electric' },
  { id: 'aba', label: 'Aba Electric' },
];

const ELECTRICITY_MIN = 1000;
const ELECTRICITY_MAX = 200000;

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
  { label: '⚡ Airtime', payload: 'start_airtime' },
  { label: '🔢 Virtual Number', payload: 'open_vn' },
  { label: '📧 Email OTP', payload: 'start_emailotp' },
  { label: '👥 Buy Logs', payload: 'start_buylogs' },
  { label: '🚀 Boost', payload: 'start_boost' },
  { label: '🎁 Gift Card', payload: 'open_giftcard' },
  { label: '💡 Electricity', payload: 'start_electricity' },
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
  const airtimeState: AirtimeFlowState | null = state && state.flow === 'airtime' ? state : null;
  const elecState: ElectricityFlowState | null = state && state.flow === 'electricity' ? state : null;
  const emailOtpState: EmailOtpFlowState | null = state && state.flow === 'emailotp' ? state : null;
  const logsState: LogsFlowState | null = state && state.flow === 'logs' ? state : null;
  const boostState: BoostFlowState | null = state && state.flow === 'boost' ? state : null;

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
      [
        ...cancelButtons(),
        { label: '🎫 Open Ticket', payload: 'open_ticket' },
        { label: '🛒 Buy Service', payload: 'buy_service' },
      ],
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

  // --- chat account creation (mostly for signed-out visitors) ---
  if (payload === 'create_account') {
    if (ctx.userId) {
      return reply(
        conversationId,
        'You already have an account 😊 You are signed in. What would you like to do?',
        MENU_BUTTONS,
      );
    }
    await deleteSignupDraft(conversationId);
    await updateConversation(conversationId, {
      state: { flow: 'signup', step: 'name' },
      subject: 'Account created via chat',
    });
    return reply(
      conversationId,
      'Let us set up your free Verxor account right here. What is your full name (first and last)?',
      cancelButtons(),
    );
  }

  if (payload === 'signup_skip_ref') {
    // No referrer — go straight to creating the account.
    const draft = await loadSignupDraft(conversationId);
    if (draft?.password) {
      return createChatAccount(conversationId, draft, ctx.purchaseOrigin, null);
    }
    await updateConversation(conversationId, { state: null });
    return reply(conversationId, 'Let us start over — what would you like to do?', MENU_BUTTONS);
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

  // --- airtime flow: network → amount → phone → confirm
  if (payload === 'start_airtime') {
    await updateConversation(conversationId, {
      state: { flow: 'airtime', step: 'network' },
      subject: 'Airtime purchase',
    });
    return reply(
      conversationId,
      'Which network for the airtime?',
      [...NETWORKS.map((n) => ({ label: n.label, payload: `airtime_network:${n.id}` })), ...cancelButtons()],
    );
  }

  if (payload.startsWith('airtime_network:')) {
    const net = payload.split(':')[1];
    const found = NETWORKS.find((n) => n.id === net);
    if (!found) {
      return reply(conversationId, 'Pick a network to continue.', [
        ...NETWORKS.map((n) => ({ label: n.label, payload: `airtime_network:${n.id}` })),
        ...cancelButtons(),
      ]);
    }
    await updateConversation(conversationId, {
      state: { flow: 'airtime', step: 'amount', network: net },
    });
    return reply(conversationId, `How much ${found.label} airtime?`, [
      ...[100, 200, 500, 1000, 2000].map((a) => ({ label: naira(a), payload: `airtime_amount:${a}` })),
      { label: '✏️ Custom amount', payload: 'airtime_amount_custom' },
      ...cancelButtons(),
    ]);
  }

  if (payload === 'airtime_amount_custom' && airtimeState?.network) {
    await updateConversation(conversationId, {
      state: { ...airtimeState, step: 'amount', amount: undefined },
    });
    return reply(conversationId, 'Type the amount in naira (₦50 – ₦50,000):', cancelButtons());
  }

  if (payload.startsWith('airtime_amount:') && airtimeState?.network) {
    const amount = Number(payload.split(':')[1]);
    if (!Number.isFinite(amount) || amount < 50 || amount > 50000) {
      return reply(conversationId, 'Type the amount in naira (₦50 – ₦50,000):', cancelButtons());
    }
    await updateConversation(conversationId, {
      state: { ...airtimeState, step: 'phone', amount },
    });
    return reply(
      conversationId,
      `${naira(amount)} airtime — type the phone number to load (e.g. 08031234567):`,
      cancelButtons(),
    );
  }

  if (payload === 'airtime_confirm' && airtimeState?.amount && airtimeState.phone) {
    return purchaseAirtime(conversationId, airtimeState, ctx);
  }

  if (payload === 'airtime_change_phone' && airtimeState) {
    await updateConversation(conversationId, { state: { ...airtimeState, step: 'phone', phone: undefined } });
    return reply(
      conversationId,
      'Type the phone number to load (e.g. 08031234567):',
      cancelButtons(),
    );
  }

  if (payload === 'airtime_change_amount' && airtimeState) {
    await updateConversation(conversationId, { state: { ...airtimeState, step: 'amount', amount: undefined } });
    const net = NETWORKS.find((n) => n.id === airtimeState.network)?.label || '';
    return reply(conversationId, `How much ${net} airtime?`, [
      ...[100, 200, 500, 1000, 2000].map((a) => ({ label: naira(a), payload: `airtime_amount:${a}` })),
      { label: '✏️ Custom amount', payload: 'airtime_amount_custom' },
      ...cancelButtons(),
    ]);
  }

  // --- electricity flow: disco → meter type → meter (verify) → amount → phone → confirm
  if (payload === 'start_electricity') {
    await updateConversation(conversationId, {
      state: { flow: 'electricity', step: 'disco' },
      subject: 'Electricity payment',
    });
    return reply(
      conversationId,
      'Which electricity company?',
      [...ELECTRICITY_DISCOS.map((d) => ({ label: d.label, payload: `elec_disco:${d.id}` })), ...cancelButtons()],
    );
  }

  if (payload.startsWith('elec_disco:')) {
    const disco = payload.split(':')[1];
    const found = ELECTRICITY_DISCOS.find((d) => d.id === disco);
    if (!found || !elecState) {
      return reply(conversationId, 'Which electricity company?', [
        ...ELECTRICITY_DISCOS.map((d) => ({ label: d.label, payload: `elec_disco:${d.id}` })),
        ...cancelButtons(),
      ]);
    }
    await updateConversation(conversationId, { state: { ...elecState, step: 'meterType', disco } });
    return reply(conversationId, `${found.label} — is the meter prepaid or postpaid?`, [
      { label: '⚡ Prepaid (buy token)', payload: 'elec_meter_type:prepaid' },
      { label: '📄 Postpaid (pay bill)', payload: 'elec_meter_type:postpaid' },
      ...cancelButtons(),
    ]);
  }

  if (payload.startsWith('elec_meter_type:') && elecState) {
    const mt = payload.split(':')[1] === 'postpaid' ? 'postpaid' : 'prepaid';
    await updateConversation(conversationId, { state: { ...elecState, step: 'meter', meterType: mt } });
    return reply(
      conversationId,
      `Type the ${mt} meter number (digits only, e.g. 45123456789):`,
      cancelButtons(),
    );
  }

  if (payload.startsWith('elec_amount:') && elecState) {
    const amount = Number(payload.split(':')[1]);
    if (!Number.isFinite(amount) || amount < ELECTRICITY_MIN || amount > ELECTRICITY_MAX) {
      return reply(conversationId, `Type the amount (₦${ELECTRICITY_MIN.toLocaleString('en-NG')} – ₦${ELECTRICITY_MAX.toLocaleString('en-NG')}):`, cancelButtons());
    }
    await updateConversation(conversationId, { state: { ...elecState, step: 'phone', amount } });
    return reply(
      conversationId,
      `${naira(amount)} — type your phone number for the receipt (e.g. 08031234567):`,
      cancelButtons(),
    );
  }

  if (payload === 'elec_amount_custom' && elecState) {
    await updateConversation(conversationId, { state: { ...elecState, step: 'amount', amount: undefined } });
    return reply(
      conversationId,
      `Type the amount (₦${ELECTRICITY_MIN.toLocaleString('en-NG')} – ₦${ELECTRICITY_MAX.toLocaleString('en-NG')}):`,
      cancelButtons(),
    );
  }

  if (payload === 'elec_change_meter' && elecState) {
    await updateConversation(conversationId, {
      state: { ...elecState, step: 'meter', meterNo: undefined, customerName: undefined },
    });
    return reply(
      conversationId,
      `Type the ${elecState.meterType || 'prepaid'} meter number (digits only):`,
      [
        { label: 'Change meter type', payload: `elec_disco:${elecState.disco}` },
        ...cancelButtons(),
      ],
    );
  }

  if (payload === 'elec_confirm' && elecState?.amount && elecState.meterNo) {
    return purchaseElectricity(conversationId, elecState, ctx);
  }

  // --- email OTP flow: platform → domain → confirm
  if (payload === 'start_emailotp' || payload === 'emailotp_site_custom') {
    await updateConversation(conversationId, {
      state: { flow: 'emailotp', step: 'site' },
      subject: 'Email OTP purchase',
    });
    return reply(
      conversationId,
      'Which platform do you need the email OTP for? (pick one, or type any site like "spotify.com")',
      [
        ...EMAIL_OTP_PLATFORMS.map((p) => ({ label: p.name, payload: `emailotp_site:${p.site}` })),
        { label: '✏️ Type another site', payload: 'emailotp_site_custom' },
        ...cancelButtons(),
      ],
    );
  }

  if (payload.startsWith('emailotp_site:') && emailOtpState?.step === 'site') {
    const site = payload.split('emailotp_site:')[1];
    const plat = EMAIL_OTP_PLATFORMS.find((p) => p.site === site);
    return loadEmailOtpDomains(conversationId, site, plat?.name || site, ctx);
  }

  if (payload.startsWith('emailotp_domain:') && emailOtpState?.site) {
    const domain = payload.split('emailotp_domain:')[1];
    return loadEmailOtpDomains(conversationId, emailOtpState.site, emailOtpState.siteName || emailOtpState.site, ctx, domain);
  }

  if (payload === 'emailotp_confirm' && emailOtpState?.site && emailOtpState.domain) {
    return purchaseEmailOtp(conversationId, emailOtpState, ctx);
  }

  // --- buy logs flow: platform → offer → quantity → confirm
  if (payload === 'start_buylogs' || payload === 'logs_change_platform') {
    await updateConversation(conversationId, {
      state: { flow: 'logs', step: 'platform' },
      subject: 'Buy Logs purchase',
    });
    return reply(
      conversationId,
      'Which platform do you need accounts (logs) for? Tap one, or type a name.',
      [
        ...LOGS_PLATFORMS.map((p) => ({ label: p, payload: `logs_platform:${p}` })),
        ...cancelButtons(),
      ],
    );
  }

  if (payload.startsWith('logs_platform:') && !payload.startsWith('logs_platform:--')) {
    const platform = payload.split('logs_platform:')[1];
    return loadLogsOffers(conversationId, platform, ctx);
  }

  if (payload.startsWith('logs_offer:') && logsState?.platform && logsState.step === 'offers') {
    const id = Number(payload.split('logs_offer:')[1]);
    const catalog = await fetchLogsCatalog(ctx.purchaseOrigin, logsState.platform);
    const offer = catalog.offers?.find((o) => o.providerListingId === id);
    if (catalog.ok && offer && offer.count > 0) {
      await updateConversation(conversationId, {
        state: {
          ...logsState,
          step: 'quantity',
          providerListingId: id,
          offerTitle: offer.title,
          unitPrice: offer.priceNgn,
        },
      });
      return reply(
        conversationId,
        `${offer.title} — ${naira(offer.priceNgn)} each. How many do you want? (1–10)`,
        [
          ...[1, 2, 3, 5, 10].map((q) => ({ label: `${q}× ${naira(offer.priceNgn * q)}`, payload: `logs_qty:${q}` })),
          { label: '↩ Other accounts', payload: `logs_platform:${logsState.platform}` },
          ...cancelButtons(),
        ],
      );
    }
    return loadLogsOffers(conversationId, logsState.platform, ctx, 'That listing just sold out. Pick another one:');
  }

  if (payload.startsWith('logs_qty:') && logsState?.providerListingId && logsState.platform && logsState.offerTitle) {
    const qty = Number(payload.split('logs_qty:')[1]);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 10) {
      return reply(conversationId, 'How many do you want? (1–10)', cancelButtons());
    }
    await updateConversation(conversationId, {
      state: { ...logsState, step: 'confirm', qty },
    });
    return logsConfirmCard(conversationId, logsState.platform, logsState.offerTitle, logsState.unitPrice || 0, qty);
  }

  if (payload === 'logs_change_qty' && logsState?.providerListingId && logsState.platform && logsState.offerTitle) {
    await updateConversation(conversationId, { state: { ...logsState, step: 'quantity' } });
    return reply(
      conversationId,
      `${logsState.offerTitle} — ${naira(logsState.unitPrice || 0)} each. How many do you want? (1–10)`,
      [
        ...[1, 2, 3, 5, 10].map((q) => ({ label: `${q}× ${naira((logsState.unitPrice || 0) * q)}`, payload: `logs_qty:${q}` })),
        { label: '↩ Other accounts', payload: `logs_platform:${logsState.platform}` },
        ...cancelButtons(),
      ],
    );
  }

  if (payload === 'logs_confirm' && logsState?.providerListingId && logsState.platform && logsState.qty) {
    return purchaseLogs(conversationId, logsState, ctx);
  }

  // --- boost flow: platform → service → quantity → link → confirm
  if (payload === 'start_boost' || payload === 'boost_change_platform') {
    const catalog = await fetchBoostCatalog(ctx.purchaseOrigin);
    if (!catalog.ok || !catalog.platforms || catalog.platforms.length === 0) {
      await updateConversation(conversationId, { state: null });
      return reply(
        conversationId,
        catalog.error === 'network'
          ? 'Could not reach the boost provider right now. Try again in a moment.'
          : catalog.error || 'The boost catalog is not available right now.',
        MENU_BUTTONS,
      );
    }
    await updateConversation(conversationId, {
      state: { flow: 'boost', step: 'platform' },
      subject: 'Boost order',
    });
    const plats = catalog.platforms.slice(0, 12);
    return reply(
      conversationId,
      'Which platform do you want to boost?',
      [...plats.map((p) => ({ label: p.name, payload: `boost_platform:${p.id}` })), ...cancelButtons()],
    );
  }

  if (payload.startsWith('boost_platform:') && !payload.startsWith('boost_platform:--')) {
    const platform = payload.split('boost_platform:')[1];
    const catalog = await fetchBoostCatalog(ctx.purchaseOrigin);
    const services = (catalog.services || [])
      .filter((sv) => sv.platform === platform && sv.max > 0)
      .sort((a, b) => a.ratePer1000 - b.ratePer1000)
      .slice(0, 6);
    if (!catalog.ok || services.length === 0) {
      return reply(conversationId, 'No boost services for that platform right now. Pick another:', [
        ...(catalog.platforms || []).slice(0, 12).map((p) => ({ label: p.name, payload: `boost_platform:${p.id}` })),
        ...cancelButtons(),
      ]);
    }
    const platformName = services[0].platformName || platform;
    await updateConversation(conversationId, {
      state: { flow: 'boost', step: 'services', platform, platformName },
    });
    return reply(
      conversationId,
      `${platformName} boosts — cheapest first:`,
      [
        ...services.map((sv) => ({ label: `${sv.title.slice(0, 32)} · ${naira(sv.ratePer1000)}/1k`, payload: `boost_service:${sv.id}` })),
        { label: '↩ Other platform', payload: 'boost_change_platform' },
        ...cancelButtons(),
      ],
    );
  }

  if (payload.startsWith('boost_service:') && boostState?.platform) {
    const serviceId = payload.split('boost_service:')[1];
    const catalog = await fetchBoostCatalog(ctx.purchaseOrigin);
    const svc = (catalog.services || []).find((sv) => sv.id === serviceId && sv.platform === boostState.platform);
    if (!svc) {
      return reply(conversationId, 'That boost service is no longer available. Pick another:', [
        { label: '↩ Back', payload: `boost_platform:${boostState.platform}` },
        ...cancelButtons(),
      ]);
    }
    await updateConversation(conversationId, {
      state: {
        ...boostState,
        step: 'quantity',
        serviceId: svc.id,
        serviceTitle: svc.title,
        ratePer1000: svc.ratePer1000,
        min: svc.min || 100,
        max: svc.max,
      },
    });
    const qtys = Array.from(new Set([svc.min || 100, 1000, 5000, 10000].filter((q) => q >= (svc.min || 100) && q <= svc.max)))
      .slice(0, 4);
    return reply(
      conversationId,
      `${svc.title} — ${naira(svc.ratePer1000)} per 1,000.\nHow many do you want? (allowed ${svc.min || 100}–${svc.max.toLocaleString('en-NG')})`,
      [
        ...qtys.map((q) => ({ label: `${q.toLocaleString('en-NG')} · ${naira(boostPrice(svc.ratePer1000, q))}`, payload: `boost_qty:${q}` })),
        { label: '↩ Other boost', payload: `boost_platform:${boostState.platform}` },
        ...cancelButtons(),
      ],
    );
  }

  if (payload.startsWith('boost_qty:') && boostState?.serviceId) {
    return boostAfterQty(conversationId, boostState, Number(payload.split('boost_qty:')[1]));
  }

  if (payload === 'boost_change_qty' && boostState?.serviceId) {
    await updateConversation(conversationId, { state: { ...boostState, step: 'quantity' } });
    return reply(
      conversationId,
      `How many do you want? (${boostState.min || 100}–${(boostState.max || 100000).toLocaleString('en-NG')})`,
      cancelButtons(),
    );
  }

  if (payload === 'boost_confirm' && boostState?.serviceId && boostState.link && boostState.qty) {
    return purchaseBoost(conversationId, boostState, ctx);
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
  // Visitors cannot buy — no wallet. Point them at account creation.
  if (!ctx.userId) {
    await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
    return reply(
      conversationId,
      'You need a free Verxor account to buy — it unlocks your wallet and order history. Create one right here in chat or sign in.',
      [
        { label: '👤 Create Account', payload: 'create_account' },
        { label: '🔑 Sign In', payload: 'open_signin' },
      ],
    );
  }
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

async function purchaseAirtime(
  conversationId: string,
  state: AirtimeFlowState,
  ctx: { purchaseOrigin: string; authHeader: string | null; userId?: string | null; email?: string | null; contact?: string | null },
): Promise<ChatMessageRow[]> {
  // Visitors cannot buy — no wallet. Point them at account creation.
  if (!ctx.userId) {
    await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
    return reply(
      conversationId,
      'You need a free Verxor account to buy — it unlocks your wallet and order history. Create one right here in chat or sign in.',
      [
        { label: '👤 Create Account', payload: 'create_account' },
        { label: '🔑 Sign In', payload: 'open_signin' },
      ],
    );
  }
  try {
    const res = await fetch(`${ctx.purchaseOrigin}/api/v1/airtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ctx.authHeader ? { Authorization: ctx.authHeader } : {}),
      },
      body: JSON.stringify({
        network: state.network,
        phone: state.phone,
        amount: state.amount,
        userId: ctx.userId || undefined,
      }),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      order?: { ref?: string } | null;
    };
    if (!res.ok || !data?.ok) {
      const insufficient = res.status === 402 || /balance|funds/i.test(data?.error || '');
      await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
      if (!insufficient) {
        void notifyAdmin(
          `⚠️ Verxor chat airtime FAILED\n${state.network?.toUpperCase()} ${naira(state.amount || 0)} → ${state.phone}\nError: ${data?.error || `HTTP ${res.status}`}\nCustomer: ${ctx.email || ctx.userId || 'unknown'}`,
        );
      }
      return reply(
        conversationId,
        insufficient
          ? `Not enough wallet balance for ${naira(state.amount || 0)} airtime. Fund your wallet and come back — your order is saved.`
          : data?.error || 'The purchase failed. Tap Retry to try again.',
        insufficient
          ? [{ label: '💰 Fund Wallet', payload: 'open_fund' }, { label: 'Retry', payload: 'airtime_confirm' }]
          : [{ label: 'Retry', payload: 'airtime_confirm' }, ...cancelButtons()],
      );
    }
    await updateConversation(conversationId, { state: null });
    const net = NETWORKS.find((n) => n.id === state.network)?.label || state.network;
    return reply(
      conversationId,
      `✅ Done! ${naira(state.amount || 0)} ${net} airtime sent to ${state.phone}.${data.order?.ref ? ` Ref: ${data.order.ref}.` : ''} Anything else?`,
      MENU_BUTTONS,
    );
  } catch {
    await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
    void notifyAdmin(
      `⚠️ Verxor chat airtime ERROR\n${state.network?.toUpperCase()} ${naira(state.amount || 0)} → ${state.phone}\nCustomer: ${ctx.email || ctx.userId || 'unknown'}`,
    );
    return reply(conversationId, 'Network error while purchasing. Tap Retry to try again.', [
      { label: 'Retry', payload: 'airtime_confirm' },
      ...cancelButtons(),
    ]);
  }
}

/** Airtime free-text: amounts at the amount step, phone numbers at the phone step. */
export async function handleAirtimeText(
  conversationId: string,
  state: AirtimeFlowState,
  text: string,
): Promise<ChatMessageRow[]> {
  const digits13 = text.replace(/\D/g, '');
  // Allow combined input at the amount step: "500 for 08031234567".
  const phoneMatch = text.match(/\b(0\d{10})\b/);

  if (state.step === 'amount') {
    const amount = Number(digits13.slice(0, 6).replace(/^0+(?=\d)/, ''));
    if (!Number.isFinite(amount) || amount < 50 || amount > 50000) {
      return reply(conversationId, 'Type the amount in naira (₦50 – ₦50,000):', cancelButtons());
    }
    const net = NETWORKS.find((n) => n.id === state.network)?.label || '';
    if (phoneMatch) {
      const phone = phoneMatch[1];
      await updateConversation(conversationId, { state: { ...state, step: 'confirm', amount, phone } });
      return airtimeConfirmCard(conversationId, state, amount, phone);
    }
    await updateConversation(conversationId, { state: { ...state, step: 'phone', amount } });
    return reply(
      conversationId,
      `${naira(amount)} ${net} airtime — type the phone number to load (e.g. 08031234567):`,
      cancelButtons(),
    );
  }

  if (state.step === 'phone' || state.step === 'confirm') {
    if (digits13.length === 11) {
      await updateConversation(conversationId, { state: { ...state, step: 'confirm', phone: digits13 } });
      return airtimeConfirmCard(conversationId, state, state.amount || 0, digits13);
    }
    if (phoneMatch) {
      const phone = phoneMatch[1];
      await updateConversation(conversationId, { state: { ...state, step: 'confirm', phone } });
      return airtimeConfirmCard(conversationId, state, state.amount || 0, phone);
    }
    return reply(
      conversationId,
      'That does not look like a valid Nigerian number — it should be 11 digits like 08031234567. Try again:',
      cancelButtons(),
    );
  }

  return reply(conversationId, 'Which network for the airtime?', [
    ...NETWORKS.map((n) => ({ label: n.label, payload: `airtime_network:${n.id}` })),
    ...cancelButtons(),
  ]);
}

function airtimeConfirmCard(
  conversationId: string,
  state: AirtimeFlowState,
  amount: number,
  phone: string,
): Promise<ChatMessageRow[]> {
  const net = NETWORKS.find((n) => n.id === state.network)?.label || state.network || '';
  return reply(
    conversationId,
    `Confirm your order:\n\n${net} airtime\nAmount: ${naira(amount)}\nPhone: ${phone}`,
    [
      { label: `Confirm ${naira(amount)}`, payload: 'airtime_confirm' },
      { label: 'Change number', payload: 'airtime_change_phone' },
      { label: 'Change amount', payload: 'airtime_change_amount' },
      { label: '✖ Cancel', payload: 'cancel_flow' },
    ],
  );
}

async function purchaseElectricity(
  conversationId: string,
  state: ElectricityFlowState,
  ctx: { purchaseOrigin: string; authHeader: string | null; userId?: string | null; email?: string | null; contact?: string | null },
): Promise<ChatMessageRow[]> {
  if (!ctx.userId) {
    await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
    return reply(
      conversationId,
      'You need a free Verxor account to buy — it unlocks your wallet and order history. Create one right here in chat or sign in.',
      [
        { label: '👤 Create Account', payload: 'create_account' },
        { label: '🔑 Sign In', payload: 'open_signin' },
      ],
    );
  }
  try {
    const res = await fetch(`${ctx.purchaseOrigin}/api/v1/electricity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ctx.authHeader ? { Authorization: ctx.authHeader } : {}),
      },
      body: JSON.stringify({
        action: 'pay',
        disco: state.disco,
        meterType: state.meterType,
        meterNo: state.meterNo,
        amount: state.amount,
        phone: state.phone,
        userId: ctx.userId || undefined,
      }),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      order?: { ref?: string; token?: string | null; status?: string } | null;
    };
    if (!res.ok || !data?.ok) {
      const insufficient = res.status === 402 || /balance|funds/i.test(data?.error || '');
      await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
      if (!insufficient) {
        void notifyAdmin(
          `⚠️ Verxor chat electricity FAILED\n${state.disco?.toUpperCase()} ${naira(state.amount || 0)} → meter ${state.meterNo}\nError: ${data?.error || `HTTP ${res.status}`}\nCustomer: ${ctx.email || ctx.userId || 'unknown'}`,
        );
      }
      return reply(
        conversationId,
        insufficient
          ? `Not enough wallet balance for ${naira(state.amount || 0)}. Fund your wallet and come back — your order is saved.`
          : data?.error || 'The payment failed. Tap Retry to try again.',
        insufficient
          ? [{ label: '💰 Fund Wallet', payload: 'open_fund' }, { label: 'Retry', payload: 'elec_confirm' }]
          : [{ label: 'Retry', payload: 'elec_confirm' }, ...cancelButtons()],
      );
    }
    const discoLabel = ELECTRICITY_DISCOS.find((d) => d.id === state.disco)?.label || state.disco;
    const tokenLine = data.order?.token ? `\n🔑 Token: ${data.order.token}` : '';
    await updateConversation(conversationId, { state: null });
    return reply(
      conversationId,
      `✅ Done! ${naira(state.amount || 0)} paid to ${discoLabel} for meter ${state.meterNo}${tokenLine}${data.order?.ref ? `\nRef: ${data.order.ref}.` : ''} Anything else?`,
      MENU_BUTTONS,
    );
  } catch {
    await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
    void notifyAdmin(
      `⚠️ Verxor chat electricity ERROR\n${state.disco?.toUpperCase()} ${naira(state.amount || 0)} → meter ${state.meterNo}\nCustomer: ${ctx.email || ctx.userId || 'unknown'}`,
    );
    return reply(conversationId, 'Network error while purchasing. Tap Retry to try again.', [
      { label: 'Retry', payload: 'elec_confirm' },
      ...cancelButtons(),
    ]);
  }
}

/** Electricity free-text: meter number at verify step, amounts, receipt phone. */
export async function handleElectricityText(
  conversationId: string,
  state: ElectricityFlowState,
  text: string,
  chatOrigin: string,
): Promise<ChatMessageRow[]> {
  const digitsAll = text.replace(/\D/g, '');

  if (state.step === 'meter') {
    if (digitsAll.length < 8 || digitsAll.length > 13) {
      return reply(conversationId, 'That does not look like a meter number — type the digits only (8–13 digits).', cancelButtons());
    }
    const origin = chatOrigin || 'https://www.verxor.com';
    let data: { ok?: boolean; error?: string; customerName?: string } = {};
    try {
      const res = await fetch(`${origin}/api/v1/electricity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', disco: state.disco, meterType: state.meterType, meterNo: digitsAll }),
        cache: 'no-store',
      });
      data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; customerName?: string };
      if (!res.ok || !data?.ok) {
        return reply(
          conversationId,
          data?.error || 'Meter not found. Check the number and try again.',
          [
            { label: 'Change meter type', payload: `elec_disco:${state.disco}` },
            { label: '💰 Start over', payload: 'start_electricity' },
            ...cancelButtons(),
          ],
        );
      }
    } catch {
      return reply(conversationId, 'Could not reach the electricity provider right now. Try again in a moment.', [
        { label: 'Retry meter', payload: 'elec_change_meter' },
        ...cancelButtons(),
      ]);
    }
    await updateConversation(conversationId, {
      state: { ...state, step: 'amount', meterNo: digitsAll, customerName: data.customerName || '' },
    });
    return reply(
      conversationId,
      `Meter verified ✅\nCustomer: ${data.customerName || 'name unavailable'}\nMeter: ${digitsAll}\n\nHow much ${state.meterType === 'postpaid' ? 'is the bill' : 'electricity'} do you want to ${state.meterType === 'postpaid' ? 'pay' : 'buy'}?`,
      [
        ...[1000, 2000, 5000, 10000].map((a) => ({ label: naira(a), payload: `elec_amount:${a}` })),
        { label: '✏️ Custom amount', payload: 'elec_amount_custom' },
        { label: 'Change meter', payload: 'elec_change_meter' },
        ...cancelButtons(),
      ],
    );
  }

  if (state.step === 'amount') {
    const amount = Number(digitsAll.slice(0, 6));
    if (!Number.isFinite(amount) || amount < ELECTRICITY_MIN || amount > ELECTRICITY_MAX) {
      return reply(
        conversationId,
        `Type the amount (₦${ELECTRICITY_MIN.toLocaleString('en-NG')} – ₦${ELECTRICITY_MAX.toLocaleString('en-NG')}):`,
        cancelButtons(),
      );
    }
    return elecAfterAmount(conversationId, state, amount);
  }

  if (state.step === 'phone' || state.step === 'confirm') {
    if (digitsAll.length === 11) {
      await updateConversation(conversationId, { state: { ...state, step: 'confirm', phone: digitsAll } });
      return elecConfirmCard(conversationId, state, state.amount || 0, digitsAll);
    }
    return reply(conversationId, 'Type your phone number for the receipt (e.g. 08031234567):', cancelButtons());
  }

  return reply(conversationId, 'Which electricity company?', [
    ...ELECTRICITY_DISCOS.map((d) => ({ label: d.label, payload: `elec_disco:${d.id}` })),
    ...cancelButtons(),
  ]);
}

async function elecAfterAmount(
  conversationId: string,
  state: ElectricityFlowState,
  amount: number,
): Promise<ChatMessageRow[]> {
  await updateConversation(conversationId, { state: { ...state, step: 'phone', amount } });
  return reply(
    conversationId,
    `${naira(amount)} — type your phone number for the receipt (e.g. 08031234567):`,
    cancelButtons(),
  );
}

function elecConfirmCard(
  conversationId: string,
  state: ElectricityFlowState,
  amount: number,
  phone: string,
): Promise<ChatMessageRow[]> {
  const discoLabel = ELECTRICITY_DISCOS.find((d) => d.id === state.disco)?.label || state.disco;
  return reply(
    conversationId,
    `Confirm your payment:\n\n${discoLabel} · ${(state.meterType || 'prepaid').toUpperCase()}\nMeter: ${state.meterNo}\nCustomer: ${state.customerName || '—'}\nAmount: ${naira(amount)}\nReceipt phone: ${phone}`,
    [
      { label: `Pay ${naira(amount)}`, payload: 'elec_confirm' },
      { label: 'Change meter', payload: 'elec_change_meter' },
      { label: '✖ Cancel', payload: 'cancel_flow' },
    ],
  );
}

async function fetchEmailOtpDomains(
  origin: string,
  site: string,
  authHeader: string | null,
  userId?: string | null,
): Promise<{ ok: boolean; error?: string; domains?: { domain: string; count: number; priceNgn: number }[] }> {
  try {
    const res = await fetch(
      `${origin || 'https://www.verxor.com'}/api/v1/email-otp/quantity?site=${encodeURIComponent(site)}`,
      {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-vx-user': userId } : {}),
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      domains?: { domain: string; count: number; priceNgn: number }[];
    };
    if (!res.ok || !data?.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, domains: data.domains || [] };
  } catch {
    return { ok: false, error: 'network' };
  }
}

async function loadEmailOtpDomains(
  conversationId: string,
  site: string,
  siteName: string,
  ctx: { purchaseOrigin: string; authHeader: string | null; userId?: string | null },
  pickedDomain?: string,
): Promise<ChatMessageRow[]> {
  const fetched = await fetchEmailOtpDomains(ctx.purchaseOrigin, site, ctx.authHeader, ctx.userId);
  if (!fetched.ok || !fetched.domains || fetched.domains.length === 0) {
    await updateConversation(conversationId, { state: { flow: 'emailotp', step: 'site' } });
    return reply(
      conversationId,
      fetched.error === 'network'
        ? 'Could not reach the email provider right now. Try again in a moment.'
        : 'No domains available for that platform right now. Pick another:',
      [
        ...EMAIL_OTP_PLATFORMS.map((p) => ({ label: p.name, payload: `emailotp_site:${p.site}` })),
        { label: '✏️ Type another site', payload: 'emailotp_site_custom' },
        ...cancelButtons(),
      ],
    );
  }
  const inStock = fetched.domains.filter((d) => d.count > 0);
  if (pickedDomain) {
    const chosen = inStock.find((d) => d.domain === pickedDomain) || fetched.domains.find((d) => d.domain === pickedDomain);
    if (!chosen) {
      return reply(conversationId, 'That domain is not available for this platform. Pick one:', [
        ...inStock.slice(0, 8).map((d) => ({ label: `@${d.domain} · ${naira(d.priceNgn)}`, payload: `emailotp_domain:${d.domain}` })),
        ...cancelButtons(),
      ]);
    }
    if (chosen.count <= 0) {
      return reply(conversationId, `@${chosen.domain} is out of stock. Pick another one:`, [
        ...inStock.slice(0, 8).map((d) => ({ label: `@${d.domain} · ${naira(d.priceNgn)}`, payload: `emailotp_domain:${d.domain}` })),
        ...cancelButtons(),
      ]);
    }
    await updateConversation(conversationId, {
      state: {
        flow: 'emailotp',
        step: 'confirm',
        site,
        siteName,
        domain: chosen.domain,
      },
    });
    return reply(
      conversationId,
      `Confirm your order:\n\n${siteName} email on @${chosen.domain}\nPrice: ${naira(chosen.priceNgn)}\n\nYou will get an email address instantly and OTP messages land in it.`,
      [
        { label: `Confirm ${naira(chosen.priceNgn)}`, payload: 'emailotp_confirm' },
        { label: '↩ Other platform', payload: 'start_emailotp' },
        { label: '✖ Cancel', payload: 'cancel_flow' },
      ],
    );
  }
  await updateConversation(conversationId, {
    state: { flow: 'emailotp', step: 'domains', site, siteName },
  });
  const buttons = inStock.slice(0, 8).map((d) => ({
    label: `@${d.domain} · ${naira(d.priceNgn)} · ${d.count} left`,
    payload: `emailotp_domain:${d.domain}`,
  }));
  return reply(
    conversationId,
    `${siteName} — available email domains:`,
    [...buttons, { label: '↩ Other platform', payload: 'start_emailotp' }, ...cancelButtons()],
  );
}

async function purchaseEmailOtp(
  conversationId: string,
  state: EmailOtpFlowState,
  ctx: { purchaseOrigin: string; authHeader: string | null; userId?: string | null; email?: string | null; contact?: string | null },
): Promise<ChatMessageRow[]> {
  if (!ctx.userId) {
    await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
    return reply(
      conversationId,
      'You need a free Verxor account to buy — it unlocks your wallet and order history. Create one right here in chat or sign in.',
      [
        { label: '👤 Create Account', payload: 'create_account' },
        { label: '🔑 Sign In', payload: 'open_signin' },
      ],
    );
  }
  // Fresh stock + price check before charging.
  const fresh = await fetchEmailOtpDomains(ctx.purchaseOrigin, state.site || '', ctx.authHeader, ctx.userId);
  const chosen = fresh.domains?.find((d) => d.domain === state.domain);
  if (fresh.ok && chosen && chosen.count <= 0) {
    await updateConversation(conversationId, { state: { ...state, step: 'domains' } });
    return reply(conversationId, `@${state.domain} just sold out. Pick another one:`, [
      ...(fresh.domains || [])
        .filter((d) => d.count > 0)
        .slice(0, 8)
        .map((d) => ({ label: `@${d.domain} · ${naira(d.priceNgn)}`, payload: `emailotp_domain:${d.domain}` })),
      ...cancelButtons(),
    ]);
  }
  try {
    const res = await fetch(`${ctx.purchaseOrigin}/api/v1/email-otp/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ctx.userId ? { 'x-vx-user': ctx.userId } : {}),
        ...(ctx.authHeader ? { Authorization: ctx.authHeader } : {}),
      },
      body: JSON.stringify({ site: state.site, domain: state.domain, userId: ctx.userId }),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      order?: { email?: string; priceNgn?: number; status?: string } | null;
    };
    if (!res.ok || !data?.ok) {
      const insufficient = res.status === 402 || /balance|funds/i.test(data?.error || '');
      await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
      if (!insufficient) {
        void notifyAdmin(
          `⚠️ Verxor chat email OTP FAILED\n${state.site} on @${state.domain}\nError: ${data?.error || `HTTP ${res.status}`}\nCustomer: ${ctx.email || ctx.userId || 'unknown'}`,
        );
      }
      return reply(
        conversationId,
        insufficient
          ? `Not enough wallet balance for @${state.domain}. Fund your wallet and come back — your order is saved.`
          : data?.error || 'The purchase failed. Tap Retry to try again.',
        insufficient
          ? [{ label: '💰 Fund Wallet', payload: 'open_fund' }, { label: 'Retry', payload: 'emailotp_confirm' }]
          : [{ label: 'Retry', payload: 'emailotp_confirm' }, ...cancelButtons()],
      );
    }
    await updateConversation(conversationId, { state: null });
    return reply(
      conversationId,
      `✅ Your email is ready: ${data.order?.email || 'check your ORDERS'}. Use it to sign up on ${state.siteName || state.site} — OTP messages will arrive in the inbox.`,
      [
        { label: '📥 Open Inbox', payload: 'open_email' },
        ...MENU_BUTTONS,
      ],
    );
  } catch {
    await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
    void notifyAdmin(
      `⚠️ Verxor chat email OTP ERROR\n${state.site} on @${state.domain}\nCustomer: ${ctx.email || ctx.userId || 'unknown'}`,
    );
    return reply(conversationId, 'Network error while purchasing. Tap Retry to try again.', [
      { label: 'Retry', payload: 'emailotp_confirm' },
      ...cancelButtons(),
    ]);
  }
}

/** Email OTP free-text: resolve the site the customer names on the site step. */
export async function handleEmailOtpText(
  conversationId: string,
  state: EmailOtpFlowState,
  text: string,
  ctx: { purchaseOrigin: string; authHeader: string | null; userId?: string | null },
): Promise<ChatMessageRow[]> {
  if (state.step === 'site') {
    const site = cleanSiteName(text);
    if (!site) {
      return reply(
        conversationId,
        'Which platform? Tap one of the buttons or type a site like "spotify.com".',
        cancelButtons(),
      );
    }
    return loadEmailOtpDomains(conversationId, site, site, ctx);
  }
  if (state.step === 'domains') {
    const cleaned = cleanSiteName(text);
    if (cleaned && cleaned !== state.site) {
      return loadEmailOtpDomains(conversationId, cleaned, cleaned, ctx);
    }
    return reply(conversationId, 'Tap a domain to continue:', cancelButtons());
  }
  return reply(conversationId, 'Which platform do you need the email OTP for?', [
    ...EMAIL_OTP_PLATFORMS.map((p) => ({ label: p.name, payload: `emailotp_site:${p.site}` })),
    { label: '✏️ Type another site', payload: 'emailotp_site_custom' },
    ...cancelButtons(),
  ]);
}

async function loadLogsOffers(
  conversationId: string,
  platform: string,
  ctx: { purchaseOrigin: string; authHeader: string | null; userId?: string | null },
  intro?: string,
): Promise<ChatMessageRow[]> {
  const catalog = await fetchLogsCatalog(ctx.purchaseOrigin, platform);
  if (!catalog.ok || !catalog.offers || catalog.offers.length === 0) {
    await updateConversation(conversationId, { state: { flow: 'logs', step: 'platform' } });
    return reply(
      conversationId,
      catalog.error === 'network'
        ? 'Could not reach the stock provider right now. Try again in a moment.'
        : (catalog.error || `No ${platform} stock right now.`) + ' Pick another platform:',
      [...LOGS_PLATFORMS.map((p) => ({ label: p, payload: `logs_platform:${p}` })), ...cancelButtons()],
    );
  }
  const inStock = catalog.offers.filter((o) => o.count > 0).sort((a, b) => a.priceNgn - b.priceNgn).slice(0, 6);
  if (inStock.length === 0) {
    await updateConversation(conversationId, { state: { flow: 'logs', step: 'platform' } });
    return reply(conversationId, `No ${platform} accounts in stock right now. Pick another platform:`, [
      ...LOGS_PLATFORMS.map((p) => ({ label: p, payload: `logs_platform:${p}` })),
      ...cancelButtons(),
    ]);
  }
  await updateConversation(conversationId, {
    state: { flow: 'logs', step: 'offers', platform },
  });
  const buttons = inStock.map((o) => ({
    label: `${o.title.slice(0, 38)} · ${naira(o.priceNgn)}`,
    payload: `logs_offer:${o.providerListingId}`,
  }));
  return reply(
    conversationId,
    intro || `${platform} accounts in stock — cheapest first:`,
    [
      ...buttons,
      { label: '↩ Other platform', payload: 'logs_change_platform' },
      ...cancelButtons(),
    ],
  );
}

function logsConfirmCard(
  conversationId: string,
  platform: string,
  offerTitle: string,
  unitPrice: number,
  qty: number,
): Promise<ChatMessageRow[]> {
  const total = unitPrice * qty;
  return reply(
    conversationId,
    `Confirm your order:\n\n${offerTitle}\nPlatform: ${platform}\nQuantity: ${qty}\nTotal: ${naira(total)}`,
    [
      { label: `Confirm ${naira(total)}`, payload: 'logs_confirm' },
      { label: 'Change quantity', payload: 'logs_change_qty' },
      { label: '↩ Other platform', payload: 'logs_change_platform' },
      { label: '✖ Cancel', payload: 'cancel_flow' },
    ],
  );
}

async function purchaseLogs(
  conversationId: string,
  state: LogsFlowState,
  ctx: { purchaseOrigin: string; authHeader: string | null; userId?: string | null; email?: string | null },
): Promise<ChatMessageRow[]> {
  if (!ctx.userId) {
    await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
    return reply(
      conversationId,
      'You need a free Verxor account to buy — it unlocks your wallet and order history. Create one right here in chat or sign in.',
      [
        { label: '👤 Create Account', payload: 'create_account' },
        { label: '🔑 Sign In', payload: 'open_signin' },
      ],
    );
  }
  // Fresh price/stock before charging.
  const catalog = await fetchLogsCatalog(ctx.purchaseOrigin, state.platform || '');
  const offer = catalog.offers?.find((o) => o.providerListingId === state.providerListingId);
  if (catalog.ok && offer && offer.count < (state.qty || 1)) {
    await updateConversation(conversationId, { state: { ...state, step: 'offers' } });
    return reply(conversationId, 'Not enough stock left for that quantity. Pick an account:', [
      ...(catalog.offers || [])
        .filter((o) => o.count > 0)
        .slice(0, 6)
        .map((o) => ({ label: `${o.title.slice(0, 38)} · ${naira(o.priceNgn)}`, payload: `logs_offer:${o.providerListingId}` })),
      ...cancelButtons(),
    ]);
  }
  try {
    const res = await fetch(`${ctx.purchaseOrigin}/api/v1/accounts/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ctx.authHeader ? { Authorization: ctx.authHeader } : {}),
      },
      body: JSON.stringify({
        providerListingId: state.providerListingId,
        quantity: state.qty,
        platform: state.platform,
      }),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      orderId?: string | number;
      credentials?: string[];
      totalNgn?: number;
      warning?: string;
    };
    if (!res.ok || !data?.ok) {
      const insufficient = res.status === 402 || /balance|funds/i.test(data?.error || '');
      const needsAuth = res.status === 401;
      await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
      if (!insufficient && !needsAuth) {
        void notifyAdmin(
          `⚠️ Verxor chat buy logs FAILED\n${state.offerTitle} x${state.qty} (${state.platform})\nError: ${data?.error || `HTTP ${res.status}`}\nCustomer: ${ctx.email || ctx.userId || 'unknown'}`,
        );
      }
      return reply(
        conversationId,
        needsAuth
          ? 'Your sign-in expired. Sign in again, then tap Retry — your order is saved.'
          : insufficient
            ? `Not enough wallet balance for ${naira(data.totalNgn || (state.unitPrice || 0) * (state.qty || 1))}. Fund your wallet and come back — your order is saved.`
            : data?.error || 'The purchase failed. Tap Retry to try again.',
        needsAuth
          ? [{ label: '🔑 Sign In Now', payload: 'open_signin' }, { label: 'Retry', payload: 'logs_confirm' }]
          : insufficient
            ? [{ label: '💰 Fund Wallet', payload: 'open_fund' }, { label: 'Retry', payload: 'logs_confirm' }]
            : [{ label: 'Retry', payload: 'logs_confirm' }, ...cancelButtons()],
      );
    }
    await updateConversation(conversationId, { state: null });
    const credentials = (data.credentials || []).slice(0, 10);
    const credLines = credentials.map((c) => `• ${c}`);
    const total = Number.isFinite(data.totalNgn) && data.totalNgn ? naira(data.totalNgn) : naira((state.unitPrice || 0) * (state.qty || 1));
    const warning = data.warning ? `\n⚠️ ${data.warning}` : '';
    return reply(
      conversationId,
      `✅ Bought ${state.qty}× ${state.offerTitle} (${state.platform}) for ${total}.${data.orderId ? ` Order: ${data.orderId}.` : ''}\n\nYour account details:\n${credLines.join('\n')}\nSave them now — you can also find them under Accounts → My Orders.${warning}`,
      MENU_BUTTONS,
    );
  } catch {
    await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
    void notifyAdmin(
      `⚠️ Verxor chat buy logs ERROR\n${state.offerTitle} x${state.qty} (${state.platform})\nCustomer: ${ctx.email || ctx.userId || 'unknown'}`,
    );
    return reply(conversationId, 'Network error while purchasing. Tap Retry to try again.', [
      { label: 'Retry', payload: 'logs_confirm' },
      ...cancelButtons(),
    ]);
  }
}

/** Buy Logs free-text: platform name on the platform step, quantity on the quantity step. */
export async function handleLogsText(
  conversationId: string,
  state: LogsFlowState,
  text: string,
  ctx: { purchaseOrigin: string; authHeader: string | null; userId?: string | null },
): Promise<ChatMessageRow[]> {
  const digits = text.replace(/\D/g, '');
  if (state.step === 'quantity' && state.platform && state.providerListingId && state.offerTitle) {
    const qty = Number(digits.slice(0, 2));
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 10) {
      return reply(conversationId, 'How many do you want? Pick a number from 1 to 10.', cancelButtons());
    }
    await updateConversation(conversationId, { state: { ...state, step: 'confirm', qty } });
    return logsConfirmCard(conversationId, state.platform, state.offerTitle, state.unitPrice || 0, qty);
  }
  if (state.step === 'confirm' && state.platform) {
    if (/confirm|yes|buy|proceed/i.test(text)) {
      return purchaseLogs(conversationId, state, ctx);
    }
    if (digits && Number(digits) >= 1 && Number(digits) <= 10) {
      await updateConversation(conversationId, { state: { ...state, step: 'confirm', qty: Number(digits) } });
      return logsConfirmCard(conversationId, state.platform, state.offerTitle || '', state.unitPrice || 0, Number(digits));
    }
    return logsConfirmCard(conversationId, state.platform, state.offerTitle || '', state.unitPrice || 0, state.qty || 1);
  }
  if (state.step === 'platform' || state.step === 'offers') {
    const word = text.trim().toLowerCase();
    const platform = LOGS_ALIASES[word] || titleCasePlatform(text.trim());
    if (platform) {
      return loadLogsOffers(conversationId, platform, ctx);
    }
    return reply(conversationId, 'Which platform? Tap one of the buttons, or type a name like "Facebook".', cancelButtons());
  }
  return reply(conversationId, 'Which platform do you need accounts for?', [
    ...LOGS_PLATFORMS.map((p) => ({ label: p, payload: `logs_platform:${p}` })),
    ...cancelButtons(),
  ]);
}

function titleCasePlatform(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length < 2 || t.length > 30) return null;
  return t
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function boostAfterQty(
  conversationId: string,
  state: BoostFlowState,
  qty: number,
): Promise<ChatMessageRow[]> {
  if (!Number.isFinite(qty) || qty < (state.min || 100) || qty > (state.max || 1000000)) {
    return reply(
      conversationId,
      `Pick a quantity between ${state.min || 100} and ${(state.max || 1000000).toLocaleString('en-NG')} — or tap a button.`,
      cancelButtons(),
    );
  }
  await updateConversation(conversationId, { state: { ...state, step: 'link', qty } });
  return reply(
    conversationId,
    `${qty.toLocaleString('en-NG')} for ${naira(boostPrice(state.ratePer1000 || 0, qty))}.\nNow type the link to boost (the profile, post or video URL):`,
    cancelButtons(),
  );
}

async function purchaseBoost(
  conversationId: string,
  state: BoostFlowState,
  ctx: { purchaseOrigin: string; authHeader: string | null; userId?: string | null; email?: string | null },
): Promise<ChatMessageRow[]> {
  if (!ctx.userId) {
    await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
    return reply(
      conversationId,
      'You need a free Verxor account to buy — it unlocks your wallet and order history. Create one right here in chat or sign in.',
      [
        { label: '👤 Create Account', payload: 'create_account' },
        { label: '🔑 Sign In', payload: 'open_signin' },
      ],
    );
  }
  try {
    const res = await fetch(`${ctx.purchaseOrigin}/api/v1/boost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ctx.authHeader ? { Authorization: ctx.authHeader } : {}),
      },
      body: JSON.stringify({
        serviceId: state.serviceId,
        link: state.link,
        quantity: state.qty,
        userId: ctx.userId || undefined,
      }),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      order?: { ref?: string; status?: string } | null;
    };
    if (!res.ok || !data?.ok) {
      const insufficient = res.status === 402 || /balance|funds/i.test(data?.error || '');
      await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
      if (!insufficient) {
        void notifyAdmin(
          `⚠️ Verxor chat boost FAILED\n${state.serviceTitle} x${state.qty}\nLink: ${state.link}\nError: ${data?.error || `HTTP ${res.status}`}\nCustomer: ${ctx.email || ctx.userId || 'unknown'}`,
        );
      }
      return reply(
        conversationId,
        insufficient
          ? `Not enough wallet balance for ${naira(boostPrice(state.ratePer1000 || 0, state.qty || 1))}. Fund your wallet and come back — your order is saved.`
          : data?.error || 'The boost order failed. Tap Retry to try again.',
        insufficient
          ? [{ label: '💰 Fund Wallet', payload: 'open_fund' }, { label: 'Retry', payload: 'boost_confirm' }]
          : [{ label: 'Retry', payload: 'boost_confirm' }, ...cancelButtons()],
      );
    }
    await updateConversation(conversationId, { state: null });
    return reply(
      conversationId,
      `🚀 Boost started! ${state.serviceTitle} · ${state.qty?.toLocaleString('en-NG')} · ${state.platformName || state.platform}\nLink: ${state.link}${data.order?.ref ? `\nOrder: ${data.order.ref}` : ''}\nDelivery starts soon and completes gradually — track it under Boost → Orders.`,
      [{ label: '🚀 My Boost Orders', payload: 'open_boost-orders' }, ...MENU_BUTTONS],
    );
  } catch {
    await updateConversation(conversationId, { state: { ...state, step: 'confirm' } });
    void notifyAdmin(
      `⚠️ Verxor chat boost ERROR\n${state.serviceTitle} x${state.qty}\nCustomer: ${ctx.email || ctx.userId || 'unknown'}`,
    );
    return reply(conversationId, 'Network error while ordering. Tap Retry to try again.', [
      { label: 'Retry', payload: 'boost_confirm' },
      ...cancelButtons(),
    ]);
  }
}

/** Boost free-text: quantity at the quantity step, link at the link step. */
export async function handleBoostText(
  conversationId: string,
  state: BoostFlowState,
  text: string,
  ctx: { purchaseOrigin: string; authHeader: string | null; userId?: string | null },
): Promise<ChatMessageRow[]> {
  const digits = text.replace(/\D/g, '');
  if (state.step === 'quantity' && state.serviceId) {
    return boostAfterQty(conversationId, state, Number(digits.slice(0, 7)));
  }
  if (state.step === 'link' && state.qty) {
    const t = text.trim();
    if (t.length < 5 || !/[.\/]/.test(t)) {
      return reply(conversationId, 'Type the full link to boost (the profile, post or video URL):', cancelButtons());
    }
    await updateConversation(conversationId, { state: { ...state, step: 'confirm', link: t.slice(0, 300) } });
    const price = boostPrice(state.ratePer1000 || 0, state.qty);
    return reply(
      conversationId,
      `Confirm your boost:\n\n${state.serviceTitle}\nPlatform: ${state.platformName || state.platform}\nQuantity: ${state.qty.toLocaleString('en-NG')}\nPrice: ${naira(price)}\nLink: ${t.slice(0, 300)}`,
      [
        { label: `Confirm ${naira(price)}`, payload: 'boost_confirm' },
        { label: 'Change quantity', payload: 'boost_change_qty' },
        { label: '✖ Cancel', payload: 'cancel_flow' },
      ],
    );
  }
  if (state.step === 'confirm' && state.link && state.qty) {
    if (/^(confirm|yes|buy|proceed|go)\b/i.test(text)) {
      return purchaseBoost(conversationId, state, ctx);
    }
    if (digits && Number(digits) >= (state.min || 100) && Number(digits) <= (state.max || 1000000)) {
      await updateConversation(conversationId, { state: { ...state, step: 'link', qty: Number(digits) } });
      return boostAfterQty(conversationId, { ...state, qty: Number(digits) }, Number(digits));
    }
    const price = boostPrice(state.ratePer1000 || 0, state.qty);
    return reply(conversationId, `Tap Confirm ${naira(price)} to place the boost, or type a new quantity.`, [
      { label: `Confirm ${naira(price)}`, payload: 'boost_confirm' },
      { label: 'Change quantity', payload: 'boost_change_qty' },
      { label: '✖ Cancel', payload: 'cancel_flow' },
    ]);
  }
  return reply(conversationId, 'Which platform do you want to boost?', [
    { label: '🚀 Pick platform', payload: 'start_boost' },
    ...cancelButtons(),
  ]);
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
    chatOrigin?: string;
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

  // Chat account creation — collect one field per message (PIN and password
  // are masked in the transcript by the route; live only in the temp draft).
  if (state?.flow === 'signup') {
    if (state.step === 'name') {
      const name = text.trim().replace(/\s+/g, ' ');
      if (name.split(' ').length < 2 || name.length < 3) {
        return reply(conversationId, 'Enter your full name (first and last), e.g. "Ada Obi":', cancelButtons());
      }
      await saveSignupDraft(conversationId, { name });
      await updateConversation(conversationId, { state: { flow: 'signup', step: 'email' } });
      return reply(conversationId, `Nice to meet you, ${name.split(' ')[0]}! What is your email address?`, cancelButtons());
    }
    if (state.step === 'email') {
      const email = text.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return reply(conversationId, 'That does not look like a valid email address. Try again:', cancelButtons());
      }
      await saveSignupDraft(conversationId, { email });
      await updateConversation(conversationId, { state: { flow: 'signup', step: 'phone' } });
      return reply(conversationId, 'What is your phone number? (11 digits, e.g. 08031234567)', cancelButtons());
    }
    if (state.step === 'phone') {
      const digits = text.replace(/\D/g, '');
      if (digits.length !== 11 || !digits.startsWith('0')) {
        return reply(conversationId, 'Enter a valid Nigerian number — 11 digits like 08031234567:', cancelButtons());
      }
      await saveSignupDraft(conversationId, { phone: digits });
      await updateConversation(conversationId, { state: { flow: 'signup', step: 'pin' } });
      return reply(
        conversationId,
        'Now create a 4-digit PIN for transactions (send it here — it will be masked in the chat).',
        cancelButtons(),
      );
    }
    if (state.step === 'pin') {
      if (!/^\d{4}$/.test(text.trim())) {
        return reply(conversationId, 'The PIN must be exactly 4 digits (e.g. 4821). Try again:', cancelButtons());
      }
      await saveSignupDraft(conversationId, { pin: text.trim() });
      await updateConversation(conversationId, { state: { flow: 'signup', step: 'password' } });
      return reply(
        conversationId,
        'And a login password: at least 6 characters with an uppercase letter, a lowercase letter and a number (it will be masked here).',
        cancelButtons(),
      );
    }
    if (state.step === 'password') {
      const pass = text;
      if (pass.length < 6 || !/[A-Z]/.test(pass) || !/[a-z]/.test(pass) || !/\d/.test(pass)) {
        return reply(
          conversationId,
          'That password is too weak — at least 6 characters with an uppercase letter, a lowercase letter and a number. Try again:',
          cancelButtons(),
        );
      }
      await saveSignupDraft(conversationId, { password: pass });
      await updateConversation(conversationId, { state: { flow: 'signup', step: 'referrer' } });
      return reply(
        conversationId,
        'Almost done! If someone referred you to Verxor, send their name or code now — otherwise tap Skip.',
        [...cancelButtons(), { label: 'Skip', payload: 'signup_skip_ref' }],
      );
    }
    if (state.step === 'referrer') {
      const draft = await loadSignupDraft(conversationId);
      if (!draft?.password) {
        await updateConversation(conversationId, { state: null });
        return reply(conversationId, 'Sorry, that signup expired. Tap Create Account to start again.', [
          { label: '👤 Create Account', payload: 'create_account' },
        ]);
      }
      return createChatAccount(conversationId, draft, opts.chatOrigin || '', text.trim().slice(0, 60) || null);
    }
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

  // Active airtime flow expecting an amount or phone number?
  if (state?.flow === 'airtime') {
    return handleAirtimeText(conversationId, state, text);
  }

  // Active electricity flow expecting meter number / amount / receipt phone?
  if (state?.flow === 'electricity') {
    return handleElectricityText(conversationId, state, text, opts.chatOrigin || '');
  }

  // Active boost flow expecting a quantity / link?
  if (state?.flow === 'boost') {
    return handleBoostText(conversationId, state, text, {
      purchaseOrigin: opts.chatOrigin || '',
      authHeader: null,
      userId: opts.user?.userId || null,
    });
  }

  // Active buy logs flow expecting a platform / quantity?
  if (state?.flow === 'logs') {
    return handleLogsText(conversationId, state, text, {
      purchaseOrigin: opts.chatOrigin || '',
      authHeader: null,
      userId: opts.user?.userId || null,
    });
  }

  // Active email OTP flow expecting a site name?
  if (state?.flow === 'emailotp') {
    return handleEmailOtpText(conversationId, state, text, {
      purchaseOrigin: opts.chatOrigin || '',
      authHeader: null,
      userId: opts.user?.userId || null,
    });
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

  // Keyword routing — airtime.
  if (/\b(airtime|recharge|credit)\b/.test(lower)) {
    return handleButtonPayload(conversationId, null, 'start_airtime', {
      purchaseOrigin: '',
      authHeader: null,
    });
  }

  // Keyword routing — boost.
  if (/\b(boost|followers|likes|views|subscribers)\b/.test(lower)) {
    return handleButtonPayload(conversationId, null, 'start_boost', {
      purchaseOrigin: '',
      authHeader: null,
    });
  }

  // Keyword routing — buy logs.
  if (/\b(buy\s+logs?|purchase\s+logs?|logs?\s+account|social\s+media\s+accounts?)\b/.test(lower)) {
    return handleButtonPayload(conversationId, null, 'start_buylogs', {
      purchaseOrigin: '',
      authHeader: null,
    });
  }

  // Keyword routing — email OTP.
  if (/\b(email\s*otp|temporary email|temp(orary)? mail|otp email)\b/.test(lower)) {
    return handleButtonPayload(conversationId, null, 'start_emailotp', {
      purchaseOrigin: '',
      authHeader: null,
    });
  }

  // Keyword routing — electricity.
  if (/\b(electricity|meter|prepaid|postpaid|token)\b/.test(lower)) {
    return handleButtonPayload(conversationId, null, 'start_electricity', {
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

  // Support detection — a customer describing a problem escalates to Denny,
  // and gets a ticket reference immediately.
  if (
    /\b(fail|failed|error|stuck|problem|issue|not work\w*|not deliver\w*|refund|wrong number|missing|didn'?t|did not)\b/.test(
      lower,
    )
  ) {
    const ticketId = generateTicketId();
    const subject = text.trim().slice(0, 60) || 'Support request';
    await updateConversation(conversationId, { status: 'waiting_admin' });
    await assignTicketId(conversationId, ticketId, subject);
    void notifyAdmin(
      `🆘 Customer needs help — ticket ${ticketId}\nCustomer: ${opts.user?.email || opts.user?.name || 'unknown'}\nMessage: "${text.slice(0, 300)}"\nReply from Telegram (or admin dashboard → Live Chats) to answer them.`,
    );
    return reply(
      conversationId,
      `I am sorry about that — I have flagged this to our team right away as ticket ${ticketId} and they will reply here shortly. If you have an order reference or the phone number involved, send it now so we can trace it faster.`,
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


/**
 * Create the account from the collected chat-signup draft by calling the
 * normal /api/auth/register backend (same validation, PIN hashing and wallet
 * row creation as the sign-up page). Secrets never live in the conversation.
 */
async function createChatAccount(
  conversationId: string,
  draft: SignupDraft,
  origin: string,
  referrer: string | null,
): Promise<ChatMessageRow[]> {
  if (!origin) {
    await updateConversation(conversationId, { state: { flow: 'signup', step: 'referrer' } });
    return reply(conversationId, 'Something went wrong on our side. Tap Skip to retry the final step.', [
      { label: 'Skip', payload: 'signup_skip_ref' },
    ]);
  }
  try {
    const res = await fetch(`${origin}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: draft.name,
        email: draft.email,
        phone: draft.phone,
        pin: draft.pin,
        password: draft.password,
        referrer,
      }),
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !body?.ok) {
      const exists = res.status === 409 || /already exists/i.test(body?.error || '');
      await updateConversation(conversationId, { state: null });
      await deleteSignupDraft(conversationId);
      if (exists) {
        return reply(
          conversationId,
          'An account already exists with that email or phone number. Sign in instead, or start again with different details.',
          [
            { label: '🔑 Sign In', payload: 'open_signin' },
            { label: '👤 Try Again', payload: 'create_account' },
          ],
        );
      }
      return reply(
        conversationId,
        body?.error || 'I could not create the account just now. Tap Try Again in a moment.',
        [{ label: 'Try Again', payload: 'create_account' }, ...cancelButtons()],
      );
    }
    await updateConversation(conversationId, { state: null, subject: 'Account created via chat' });
    await deleteSignupDraft(conversationId);
    void notifyAdmin(
      `👤 New account created via chat\nName: ${draft.name}\nEmail: ${draft.email}\nPhone: ${draft.phone}${referrer ? `\nReferrer: ${referrer}` : ''}`,
    );
    return reply(
      conversationId,
      `🎉 Your free Verxor account is ready, ${draft.name?.split(' ')[0] || 'friend'}! Sign in with your email and password to start using your wallet. I will be right here in the app whenever you need me.`,
      [
        { label: '🔑 Sign In Now', payload: 'open_signin' },
        { label: '🛒 Buy Service', payload: 'buy_service' },
      ],
    );
  } catch {
    await updateConversation(conversationId, { state: { flow: 'signup', step: 'referrer' } });
    return reply(conversationId, 'Network error while creating your account. Tap Retry in a moment.', [
      { label: 'Retry', payload: 'signup_skip_ref' },
      ...cancelButtons(),
    ]);
  }
}
