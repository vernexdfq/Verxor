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

export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, TG_LIMIT),
        disable_web_page_preview: true,
      }),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return Boolean(data.ok);
  } catch {
    return false;
  }
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
export async function sendTelegramPhoto(base64Image: string, caption: string): Promise<boolean> {
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
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

/** Push an alert to every configured channel. Never throws. */
export async function notifyAdmin(text: string): Promise<void> {
  await Promise.allSettled([sendTelegram(text), sendWhatsApp(text)]);
}
