import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  appendMessage,
  listLatestOpenConversations,
  listMessages,
  updateConversation,
} from '@/lib/chat/store';

/**
 * POST /api/telegram/webhook — two-way admin bot.
 *
 * Denny messages @verxorsupport_bot on Telegram:
 *   /help     → command list
 *   /pending  → shows the customer waiting the longest
 *   <text>    → delivered to the most recent conversation whose last message
 *               is from a customer (they see it on their next chat open)
 *
 * Auth: Telegram's X-Telegram-Bot-Api-Secret-Token header must equal the
 * secret we registered via setWebhook (sha256 prefix of the bot token, so
 * no extra env var is needed). Only Denny's chat id is accepted.
 */
export const dynamic = 'force-dynamic';

function botToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

function webhookSecret(): string {
  const t = botToken();
  if (!t) return '';
  return createHash('sha256').update(t).digest('hex').slice(0, 32);
}

async function tg(chatId: string, text: string): Promise<void> {
  const token = botToken();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    cache: 'no-store',
  }).catch(() => undefined);
}

export async function POST(req: NextRequest) {
  const token = botToken();
  const chatId = process.env.TELEGRAM_CHAT_ID || '';
  if (!token || !chatId) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const secret = req.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!secret || secret !== webhookSecret()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await req.json().catch(() => ({}))) as {
    message?: { chat?: { id?: number }; text?: string };
  };
  const fromId = update.message?.chat?.id;
  const text = (update.message?.text || '').trim();
  if (fromId !== Number(chatId) || !text) {
    return NextResponse.json({ ok: true });
  }

  if (text === '/help' || text === '/start') {
    await tg(
      chatId,
      'Verxor admin bot — commands:\n' +
        '/pending — see the customer waiting for a reply\n' +
        '/help — this list\n' +
        '\nAnything else you type is delivered to the most recent customer waiting in chat.',
    );
    return NextResponse.json({ ok: true });
  }

  // Find the latest conversation whose last message is from a customer.
  // The admin handles one customer at a time here; the full inbox comes later.
  const conversations = await listLatestOpenConversations(3);
  for (const c of conversations) {
    const msgs = await listMessages(c.id);
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== 'user') continue;
    if (text === '/pending') {
      await tg(
        chatId,
        `⏳ Waiting customer: ${c.subject || '(no subject)'}\nLast message: "${last.content.slice(0, 200)}"\nType your reply to answer them.`,
      );
      return NextResponse.json({ ok: true });
    }
    await appendMessage({ conversationId: c.id, role: 'admin', content: text });
    await updateConversation(c.id, { status: 'admin', last_agent: 'admin' });
    await tg(chatId, `✅ Sent to ${c.subject || 'customer'}:\n${text.slice(0, 300)}`);
    return NextResponse.json({ ok: true });
  }
  await tg(
    chatId,
    text === '/pending'
      ? 'No customers waiting right now.'
      : 'No customer is waiting for a reply right now. Use /pending to check.',
  );
  return NextResponse.json({ ok: true });
}
