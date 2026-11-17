/**
 * Admin alert notifications — WhatsApp (TextMeBot) + Telegram.
 *
 * Server-side only. Both channels are optional: each stays silent until its
 * env vars are present. Sends are best-effort and never throw, so a failed
 * alert can never break a customer request.
 *
 * Env vars:
 *   TEXTMEBOT_API_KEY       — from api.textmebot.com (WhatsApp alerts)
 *   ALERT_WHATSAPP_PHONE    — e.g. +2348141620644 (must be the number
 *                             connected to the TextMeBot API)
 *   TELEGRAM_BOT_TOKEN      — from @BotFather
 *   ALERT_TELEGRAM_CHAT_ID  — the admin's chat id with the bot
 */

const WA_ENDPOINT = 'https://api.textmebot.com/send.php';

export async function sendWhatsAppAlert(text: string): Promise<boolean> {
  const apikey = process.env.TEXTMEBOT_API_KEY;
  const phone = process.env.ALERT_WHATSAPP_PHONE;
  if (!apikey || !phone) return false;
  const url = `${WA_ENDPOINT}?phone=${encodeURIComponent(phone)}&apikey=${encodeURIComponent(
    apikey,
  )}&text=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const body = await res.text();
    if (res.ok && !/error/i.test(body)) return true;
    // TextMeBot rate-limits 1 message / 5s. One polite retry after the window.
    if (/limit of 1 messages/i.test(body)) {
      await new Promise((r) => setTimeout(r, 6500));
      const retry = await fetch(url, { cache: 'no-store' });
      const retryBody = await retry.text();
      return retry.ok && !/error/i.test(retryBody);
    }
    return false;
  } catch {
    return false;
  }
}

export async function sendTelegramAlert(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ALERT_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Push an alert to every configured channel. Never throws. */
export async function notifyAdmin(text: string): Promise<void> {
  await Promise.allSettled([sendWhatsAppAlert(text), sendTelegramAlert(text)]);
}
