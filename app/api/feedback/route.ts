import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Body = {
  type?: string;
  subject?: string;
  message?: string;
  userName?: string;
  userContact?: string;
  userEmail?: string;
};

const ALLOWED = new Set(['feature', 'bug', 'poor', 'like', 'general']);

const TYPE_LABEL: Record<string, string> = {
  feature: 'Feature Suggestion',
  bug: 'Bug / Issue Report',
  poor: 'Poor Experience',
  like: 'What You Like',
  general: 'General Suggestion',
};

function adminInbox() {
  return process.env.FEEDBACK_INBOX || process.env.SUPPORT_EMAIL || 'support@verxor.com';
}

async function sendEmail(opts: {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { sent: false, reason: 'RESEND_API_KEY not set' as const };
  }
  const from =
    process.env.FEEDBACK_FROM || process.env.RESEND_FROM || 'Verxor <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      reply_to: opts.replyTo || undefined,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return { sent: false, reason: `Resend ${res.status}: ${err.slice(0, 200)}` as const };
  }
  return { sent: true as const };
}

async function storeSupabase(row: {
  type: string;
  subject: string;
  message: string;
  user_name: string;
  user_contact: string;
  user_email: string;
  status: string;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { stored: false, id: null as string | null, reason: 'Supabase env missing' };
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/feedback`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return {
      stored: false,
      id: null as string | null,
      reason: `Supabase ${res.status}: ${err.slice(0, 200)}`,
    };
  }
  const data = (await res.json()) as Array<{ id?: string }>;
  const id = Array.isArray(data) && data[0]?.id ? String(data[0].id) : null;
  return { stored: true, id, reason: null as string | null };
}

async function listSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { ok: false, items: [] as unknown[], reason: 'Supabase env missing' };
  }
  const res = await fetch(
    `${url.replace(/\/$/, '')}/rest/v1/feedback?select=*&order=created_at.desc&limit=100`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    return { ok: false, items: [], reason: `Supabase ${res.status}` };
  }
  const items = await res.json();
  return { ok: true, items: Array.isArray(items) ? items : [], reason: null };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = (body.type || '').trim();
  const subject = (body.subject || '').trim();
  const message = (body.message || '').trim();
  const userName = (body.userName || 'User').trim().slice(0, 80);
  const userContact = (body.userContact || '').trim().slice(0, 80);
  const userEmail = (body.userEmail || '').trim().slice(0, 120);

  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
  }
  if (subject.length < 3 || subject.length > 120) {
    return NextResponse.json({ error: 'Subject must be 3–120 characters' }, { status: 400 });
  }
  if (message.length < 8 || message.length > 2000) {
    return NextResponse.json({ error: 'Message must be 8–2000 characters' }, { status: 400 });
  }

  const typeLabel = TYPE_LABEL[type] || type;
  const fallbackId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const store = await storeSupabase({
    type,
    subject,
    message,
    user_name: userName,
    user_contact: userContact,
    user_email: userEmail,
    status: 'received',
  });

  const text = [
    `New Verxor feedback`,
    `Type: ${typeLabel}`,
    `Subject: ${subject}`,
    `From: ${userName}`,
    `Contact: ${userContact || '—'}`,
    `Email: ${userEmail || '—'}`,
    '',
    message,
    '',
    `Reply directly to this email to reach the user (if Reply-To is set).`,
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin:0 0 8px;font-size:18px">New Verxor feedback</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:13px">${typeLabel}</p>
      <p style="margin:0 0 4px"><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p style="margin:0 0 4px"><strong>From:</strong> ${escapeHtml(userName)}</p>
      <p style="margin:0 0 4px"><strong>Contact:</strong> ${escapeHtml(userContact || '—')}</p>
      <p style="margin:0 0 16px"><strong>Email:</strong> ${escapeHtml(userEmail || '—')}</p>
      <div style="padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;white-space:pre-wrap;line-height:1.5">${escapeHtml(message)}</div>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Reply to this email to respond to the user when Reply-To is present.</p>
    </div>
  `;

  const mail = await sendEmail({
    to: adminInbox(),
    replyTo: userEmail.includes('@') ? userEmail : undefined,
    subject: `[Verxor Feedback] ${typeLabel}: ${subject}`,
    text,
    html,
  });

  return NextResponse.json({
    ok: true,
    id: store.id || fallbackId,
    emailed: mail.sent,
    stored: store.stored,
    mailReason: mail.sent ? null : 'reason' in mail ? mail.reason : null,
    storeReason: store.stored ? null : store.reason,
  });
}

export async function GET() {
  const list = await listSupabase();
  return NextResponse.json({
    ok: list.ok,
    items: list.items,
    reason: list.reason,
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}
