import { NextRequest, NextResponse } from 'next/server';

/**
 * GET  /api/admin/users — live user list (profiles + wallets + access + panels).
 * POST /api/admin/users — admin actions: credit/debit wallet, set-phone,
 *       set-service (unlock matrix), ban/unban. Every action is audit-logged.
 * Auth: x-admin-password must match ADMIN_PASSWORD.
 */
export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function adminAuthed(req: NextRequest): boolean {
  const pw = req.headers.get('x-admin-password') || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  return Boolean(expected) && pw === expected;
}

async function audit(
  action: string,
  userId?: string,
  amountNgn?: number,
  reason?: string,
  meta?: Record<string, unknown>,
) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return;
  await fetch(`${base}/rest/v1/admin_audit_log`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      action,
      user_id: userId || null,
      amount_ngn: amountNgn ?? null,
      reason: reason || null,
      meta: meta || {},
    }),
  }).catch(() => null);
}

export async function GET(req: NextRequest) {
  if (!adminAuthed(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  const hdr = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  let profileRows: Array<Record<string, unknown>> = [];
  for (const sel of ['id,email,phone,name,created_at', 'id,email,phone,created_at', 'id,email,phone']) {
    const res = await fetch(
      `${base}/rest/v1/profiles?select=${sel}&limit=500`,
      { headers: hdr, cache: 'no-store' },
    );
    if (res.ok) {
      profileRows = (await res.json()) as Array<Record<string, unknown>>;
      break;
    }
  }
  if (!profileRows.length) {
    return NextResponse.json({ ok: false, error: 'Could not read profiles' }, { status: 500 });
  }

  const walletsRes = await fetch(
    `${base}/rest/v1/wallets?select=user_id,balance_ngn&limit=1000`,
    { headers: hdr, cache: 'no-store' },
  );
  const walletRows = walletsRes.ok
    ? ((await walletsRes.json()) as Array<{ user_id?: string; balance_ngn?: number }>)
    : [];
  const balanceByUser = new Map<string, number>();
  for (const w of walletRows) {
    if (w.user_id) balanceByUser.set(w.user_id, Number(w.balance_ngn) || 0);
  }

  const accessRes = await fetch(
    `${base}/rest/v1/service_access?select=*&limit=2000`,
    { headers: hdr, cache: 'no-store' },
  );
  const accessRows = accessRes.ok
    ? ((await accessRes.json()) as Array<{ user_id?: string; service?: string; enabled?: boolean; unlock_note?: string | null }>)
    : [];
  const accessByUser = new Map<string, Map<string, { enabled: boolean; note: string | null }>>();
  for (const a of accessRows) {
    if (!a.user_id || !a.service) continue;
    const m = accessByUser.get(a.user_id) || new Map<string, { enabled: boolean; note: string | null }>();
    m.set(a.service, { enabled: Boolean(a.enabled), note: a.unlock_note || null });
    accessByUser.set(a.user_id, m);
  }

  const panelsRes = await fetch(
    `${base}/rest/v1/child_panels?select=*&limit=200`,
    { headers: hdr, cache: 'no-store' },
  );
  const panelRows = panelsRes.ok
    ? ((await panelsRes.json()) as Array<{ id?: string; user_id?: string | null; name?: string; domain?: string | null; suspended?: boolean }>)
    : [];
  const panelByUser = new Map<string, { id: string; name: string; domain: string | null; suspended: boolean }>();
  for (const p of panelRows) {
    if (p.user_id && p.id) {
      panelByUser.set(p.user_id, { id: p.id, name: p.name || 'Panel', domain: p.domain || null, suspended: Boolean(p.suspended) });
    }
  }

  const bannedRes = await fetch(
    `${base}/rest/v1/admin_settings?key=eq.banned_users&select=value&limit=1`,
    { headers: hdr, cache: 'no-store' },
  );
  let bannedIds: string[] = [];
  if (bannedRes.ok) {
    const rows = (await bannedRes.json()) as Array<{ value?: string }>;
    try {
      const parsed = JSON.parse(rows[0]?.value || '[]');
      if (Array.isArray(parsed)) bannedIds = parsed.filter((x): x is string => typeof x === 'string');
    } catch { /* empty */ }
  }

  const users = profileRows.map((p) => {
    const id = String(p.id || '');
    const svcMap = accessByUser.get(id);
    const services: Record<string, { enabled: boolean; note: string | null }> = {};
    if (svcMap) {
      for (const [sid, info] of svcMap) services[sid] = info;
    }
    return {
      id,
      email: String(p.email || ''),
      phone: String(p.phone || ''),
      name: typeof p.name === 'string' ? p.name : '',
      joined: typeof p.created_at === 'string' ? p.created_at : '',
      balanceNgn: balanceByUser.get(id) ?? 0,
      apiKey: Boolean(svcMap && svcMap.size > 0),
      panel: panelByUser.get(id) || null,
      banned: bannedIds.includes(id),
      services,
    };
  });

  const panels = panelRows
    .filter((p) => p.id)
    .map((p) => ({
      id: String(p.id),
      name: p.name || 'Panel',
      domain: p.domain || null,
      suspended: Boolean(p.suspended),
      userId: p.user_id || null,
    }));

  return NextResponse.json({ ok: true, users, panels });
}

export async function POST(req: NextRequest) {
  if (!adminAuthed(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  const hdr = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  let body: {
    action?: string;
    userId?: string;
    amount?: number;
    reason?: string;
    phone?: string;
    service?: string;
    enabled?: boolean;
    unlockNote?: string;
    banned?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const userId = String(body.userId || '').trim();
  if (!userId) return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });

  if (body.action === 'credit' || body.action === 'debit') {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'Amount must be positive' }, { status: 400 });
    }
    const rpc = body.action === 'credit' ? 'credit_wallet' : 'debit_wallet';
    const ref = `admin-${body.action}-${Date.now()}`;
    const desc = `Admin ${body.action} — ${body.reason || 'no reason given'}`;
    const res = await fetch(`${base}/rest/v1/rpc/${rpc}`, {
      method: 'POST',
      headers: hdr,
      body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reference: ref, p_description: desc }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      if (/INSUFFICIENT_BALANCE/i.test(t)) {
        return NextResponse.json({ ok: false, error: 'User has insufficient balance for that debit' }, { status: 402 });
      }
      return NextResponse.json({ ok: false, error: `Wallet ${body.action} failed` }, { status: 500 });
    }
    await audit(`wallet_${body.action}`, userId, amount, body.reason, { ref });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'set-phone') {
    const phone = String(body.phone || '').trim();
    if (!phone) return NextResponse.json({ ok: false, error: 'Phone required' }, { status: 400 });
    const res = await fetch(`${base}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { ...hdr, Prefer: 'return=minimal' },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: 'Could not update phone' }, { status: 500 });
    await audit('phone_update', userId, undefined, undefined, { phone });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'set-service') {
    const service = String(body.service || '').trim();
    if (!service) return NextResponse.json({ ok: false, error: 'Service required' }, { status: 400 });
    const res = await fetch(`${base}/rest/v1/service_access`, {
      method: 'POST',
      headers: { ...hdr, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        service,
        enabled: Boolean(body.enabled),
        unlock_note: body.unlockNote || null,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: 'Could not save service access' }, { status: 500 });
    await audit(body.enabled ? 'service_unlock' : 'service_lock', userId, undefined, body.unlockNote, { service });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'ban' || body.action === 'unban') {
    // Ensure the banned_users settings row exists before patching it.
    const ensure = await fetch(
      `${base}/rest/v1/admin_settings`,
      {
        method: 'POST',
        headers: { ...hdr, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ key: 'banned_users', value: '[]' }),
      },
    );
    void ensure;

    const bannedRes = await fetch(
      `${base}/rest/v1/admin_settings?key=eq.banned_users&select=value&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    let ids: string[] = [];
    if (bannedRes.ok) {
      const rows = (await bannedRes.json()) as Array<{ value?: string }>;
      try {
        const parsed = JSON.parse(rows[0]?.value || '[]');
        if (Array.isArray(parsed)) ids = parsed.filter((x): x is string => typeof x === 'string');
      } catch { /* empty */ }
    }
    if (body.action === 'ban') {
      if (!ids.includes(userId)) ids.push(userId);
    } else {
      ids = ids.filter((x) => x !== userId);
    }
    const up = await fetch(`${base}/rest/v1/admin_settings?key=eq.banned_users`, {
      method: 'PATCH',
      headers: { ...hdr, Prefer: 'return=minimal' },
      body: JSON.stringify({ value: JSON.stringify(ids), updated_at: new Date().toISOString() }),
    });
    if (!up.ok) {
      return NextResponse.json({ ok: false, error: 'Could not save ban state' }, { status: 500 });
    }
    await audit(body.action, userId, undefined, body.reason, {});
    return NextResponse.json({ ok: true, banned: body.action === 'ban' });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
