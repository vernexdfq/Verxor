import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  appendMessage,
  findConversationByTicket,
  listLatestOpenConversations,
  listMessages,
  updateConversation,
} from '@/lib/chat/store';
import { notifyAdmin } from '@/lib/notify';

/**
 * POST /api/telegram/webhook — two-way bot.
 *
 * From Denny (TELEGRAM_CHAT_ID):
 *   /help      → command list
 *   /pending   → the website customer waiting the longest
 *   /reply <t> → answer the last customer who messaged from Telegram
 *   <text>     → delivered to the most recent website customer waiting
 *
 * From anyone else (customers who find @verxorsupport_bot):
 *   → friendly auto-reply + the message is forwarded to Denny, and the
 *     sender is remembered so /reply reaches them.
 *
 * Auth: Telegram's X-Telegram-Bot-Api-Secret-Token must match the secret
 * registered via setWebhook (sha256 prefix of the bot token).
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

async function tg(chatId: string | number, text: string): Promise<void> {
  const token = botToken();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    cache: 'no-store',
  }).catch(() => undefined);
}

/** Remember the last Telegram customer so /reply can reach them. */
async function rememberTelegramCustomer(info: {
  chatId: number;
  name: string;
  username?: string;
}): Promise<void> {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) return;
  try {
    // PostgREST upsert: POST first (PATCH on zero rows is a silent no-op).
    await fetch(`${base}/rest/v1/admin_settings`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify([
        {
          key: 'telegram_last_customer',
          value: JSON.stringify({
            chatId: info.chatId,
            name: info.name,
            username: info.username || null,
            at: new Date().toISOString(),
          }),
        },
      ]),
      cache: 'no-store',
    });
  } catch {
    /* best effort */
  }
}

async function loadTelegramCustomer(): Promise<{ chatId: number; name: string } | null> {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(
      `${base}/rest/v1/admin_settings?key=eq.telegram_last_customer&select=value&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { value?: string }[];
    const parsed = JSON.parse(rows?.[0]?.value || 'null') as
      | { chatId: number; name: string }
      | null;
    return parsed?.chatId ? parsed : null;
  } catch {
    return null;
  }
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
    message?: {
      chat?: { id?: number };
      from?: { first_name?: string; username?: string };
      text?: string;
    };
  };
  const fromId = update.message?.chat?.id;
  const fromName = update.message?.from?.first_name || 'Customer';
  const fromUsername = update.message?.from?.username || '';
  const text = (update.message?.text || '').trim();
  if (!fromId || !text) {
    return NextResponse.json({ ok: true });
  }

  // ── A customer (anyone who is not the admin) messaged the bot. ──
  if (fromId !== Number(chatId)) {
    await tg(
      fromId,
      `Hello ${fromName} 👋 You have reached Verxor Support.\n\n` +
        'Describe your issue in one message and our team will get back to you here. ' +
        'For instant help with buying, use the chat assistant in the app.',
    );
    await rememberTelegramCustomer({ chatId: fromId, name: fromName, username: fromUsername });
    await notifyAdmin(
      `📥 Telegram customer message\nFrom: ${fromName}${fromUsername ? ` (@${fromUsername})` : ''}\n\n${text.slice(0, 400)}\n\nReply with: /reply <your message>`,
    );
    return NextResponse.json({ ok: true });
  }

  // ── Denny's commands. ──
  if (text === '/help' || text === '/start') {
    await tg(
      chatId,
      'Verxor admin bot — commands:\n' +
        '/pending — the website customer waiting for a reply\n' +
        '/ticket <VX-1234> — status of a customer ticket\n' +
        '/reply <message> — answer the last Telegram customer\n' +
        '/help — this list\n\n' +
        'Anything else you type goes to the most recent customer waiting in the website chat.',
    );
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith('/reply ')) {
    const replyText = text.slice('/reply '.length).trim();
    const customer = await loadTelegramCustomer();
    if (!replyText || !customer) {
      await tg(chatId, 'Usage: /reply <message>. No Telegram customer has messaged us yet.');
      return NextResponse.json({ ok: true });
    }
    await tg(customer.chatId, `💬 Verxor Support:\n\n${replyText.slice(0, 3500)}`);
    await tg(chatId, `✅ Sent to ${customer.name} (Telegram).`);
    return NextResponse.json({ ok: true });
  }

  // ── /ticket VX-1234 — ticket status lookup. ──
  if (text.toLowerCase().startsWith('/ticket ')) {
    const ref = text.slice('/ticket '.length).trim().toUpperCase();
    const convo = await findConversationByTicket(ref);
    if (!convo) {
      await tg(chatId, `No ticket ${ref || '(empty)'} found. The ID looks like VX-1234.`);
      return NextResponse.json({ ok: true });
    }
    const msgs = await listMessages(convo.id);
    const last = msgs[msgs.length - 1];
    const ticketId = convo.ticket_id || convo.subject?.match(/\[(VX-\d{3,6})\]/)?.[1] || ref;
    const statusLine: Record<string, string> = {
      ai: 'assistant',
      waiting_admin: 'waiting for our reply',
      admin: 'we replied',
      closed: 'closed (archived)',
    };
    await tg(
      chatId,
      `🎫 Ticket ${ticketId}\nSubject: ${convo.subject?.replace(/^\[VX-\d{3,6}\]\s*/, '') || '(no subject)'}\n` +
        `Status: ${statusLine[convo.status] || convo.status} · customer: ${convo.user_id || 'unknown'}\n` +
        (last ? `Last message (${last.role}): "${last.content.slice(0, 200)}"` : 'No messages.'),
    );
    return NextResponse.json({ ok: true });
  }

  // ── Plain text → the most recent website customer waiting. ──
  const conversations = await listLatestOpenConversations(3);
  for (const c of conversations) {
    const msgs = await listMessages(c.id);
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== 'user') continue;
    if (text === '/pending') {
      await tg(
        chatId,
        `⏳ Waiting customer${c.ticket_id ? ` — ticket ${c.ticket_id}` : ''}: ${c.subject || '(no subject)'}\nLast message: "${last.content.slice(0, 200)}"\nType your reply to answer them.`,
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
      : 'No website customer is waiting for a reply. Use /reply <message> to answer a Telegram customer.',
  );
  return NextResponse.json({ ok: true });
}
