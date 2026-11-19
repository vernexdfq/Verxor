/**
 * Admin notifications — Telegram bot + WhatsApp (TextMeBot personal API).
 *
 * All sends are best-effort and env-gated: with no keys configured every
 * function is a silent no-op, so the app works exactly the same without them.
 *
 * Env vars:
 *   TELEGRAM_BOT_TOKEN  — bot token from @BotFather
 *   TELEGRAM_CHAT_ID     — Denny's chat id (numeric)
 *   WHATSAPP_API_KEY     — TextMeBot apikey
 *   WHATSAPP_PHONE       — receiving number, international format, no "+"
 */

const TG_LIMIT = 3500;

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE);
}

export type TelegramButton = { label: string; url: string };

export async function sendTelegramRaw(
  text: string,
  opts?: { buttons?: TelegramButton[] },
): Promise<{ ok: boolean; messageId: number | null }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, messageId: null };
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: text.slice(0, TG_LIMIT),
      disable_web_page_preview: true,
    };
    if (opts?.buttons?.length) {
      body.reply_markup = {
        inline_keyboard: opts.buttons.map((b) => [{ text: b.label.slice(0, 60), url: b.url }]),
      };
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: { message_id?: number };
    };
    return { ok: Boolean(data.ok), messageId: data.result?.message_id ?? null };
  } catch {
    return { ok: false, messageId: null };
  }
}

export async function sendTelegram(text: string): Promise<boolean> {
  return (await sendTelegramRaw(text)).ok;
}

export async function sendWhatsApp(text: string): Promise<boolean> {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const phone = (process.env.WHATSAPP_PHONE || '').replace(/\D/g, '');
  if (!apiKey || !phone) return false;
  try {
    const qs = new URLSearchParams({ recipient: phone, apikey: apiKey, text });
    const res = await fetch(`https://api.textmebot.com/send.php?${qs.toString()}`, {
      cache: 'no-store',
    });
    const body = await res.text().catch(() => '');
    return res.ok && !/error/i.test(body);
  } catch {
    return false;
  }
}

/** Send a photo (base64 jpeg/png/webp data URL) to the admin Telegram chat. */
export async function sendTelegramPhoto(
  base64Image: string,
  caption: string,
  routeMeta?: TelegramRouteMap,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const b64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('photo', new Blob([buf], { type: 'image/jpeg' }), 'photo.jpg');
    if (caption) form.append('caption', caption.slice(0, 900));
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form,
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: { message_id?: number };
    };
    if (routeMeta && data.ok && data.result?.message_id) {
      await saveTelegramMap(data.result.message_id, routeMeta);
    }
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

/** Push an alert to every configured channel. Never throws. */
export async function notifyAdmin(text: string): Promise<void> {
  await Promise.allSettled([sendTelegram(text), sendWhatsApp(text)]);
}

/**
 * ── Telegram native swipe-to-reply routing ──────────────────────────────────
 * Every customer-facing notification we send stores the Telegram message_id
 * mapped to its source conversation (website chat or Telegram chat), in
 * admin_settings rows keyed `tgmap:<message_id>`. When Denny swipe-replies to
 * one of those messages, the webhook looks the id up here and routes the text
 * to the exact customer. No SQL migration needed — admin_settings already
 * exists, and each mapping is its own row so upserts never clobber.
 */
export type TelegramRouteMap = {
  kind: 'web' | 'telegram';
  conversationId?: string;
  tgChatId?: number;
  name?: string;
};

function tgMapBase(): { base: string; key: string } | null {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) return null;
  return { base, key };
}

export async function saveTelegramMap(
  messageId: number,
  meta: TelegramRouteMap,
): Promise<void> {
  const conf = tgMapBase();
  if (!conf) return;
  try {
    await fetch(`${conf.base}/rest/v1/admin_settings`, {
      method: 'POST',
      headers: {
        apikey: conf.key,
        Authorization: `Bearer ${conf.key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify([
        { key: `tgmap:${messageId}`, value: JSON.stringify(meta) },
      ]),
      cache: 'no-store',
    });
  } catch {
    /* best effort — swipe-reply falls back to /reply */
  }
}

export async function loadTelegramMap(
  messageId: number,
): Promise<TelegramRouteMap | null> {
  const conf = tgMapBase();
  if (!conf) return null;
  try {
    const res = await fetch(
      `${conf.base}/rest/v1/admin_settings?key=eq.${encodeURIComponent(
        `tgmap:${messageId}`,
      )}&select=value&limit=1`,
      { headers: { apikey: conf.key, Authorization: `Bearer ${conf.key}` }, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { value?: string }[];
    const parsed = JSON.parse(rows?.[0]?.value || 'null') as TelegramRouteMap | null;
    return parsed?.kind ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Admin alert tied to a swiped-replyable customer surface. Sends to all
 * channels like notifyAdmin, but the Telegram copy is mapped so a native
 * swipe-reply routes back to that exact customer. Optional deep-link URL
 * buttons are attached under the message.
 */
export async function notifyAdminTracked(
  text: string,
  meta: TelegramRouteMap,
  buttons?: TelegramButton[],
): Promise<void> {
  const [tgRes] = await Promise.allSettled([
    sendTelegramRaw(text, { buttons }),
    sendWhatsApp(text),
  ]);
  if (tgRes.status === 'fulfilled' && tgRes.value.ok && tgRes.value.messageId) {
    await saveTelegramMap(tgRes.value.messageId, meta);
  }
}

/** Deep-link button that opens the admin panel (used on account + escalation alerts). */
export function openAdminButton(label = '👤 Open Admin Panel'): TelegramButton {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.verxor.com';
  return { label, url: `${site.replace(/\/$/, '')}/admin` };
}
