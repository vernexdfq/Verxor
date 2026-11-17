import { NextRequest, NextResponse } from 'next/server';

/**
 * GET  /api/admin/users — list users with wallet, API/panel flags, bans, service overrides.
 * POST /api/admin/users — actions: credit | debit | ban | unban | set-phone | set-service
 * Auth: x-admin-password header must match ADMIN_PASSWORD.
 */
export const dynamic = 'force-dynamic';

type ProfileRow = {
  id?: string;
  email?: string;
  full_name?: string | null;
  phone?: string | null;
  created_at?: string;
};

type ServiceAccessRow = {
  user_id: string;
  service: string;
  enabled: boolean;
  unlock_note?: string | null;
};

type PanelRow = {
  id?: string;
  user_id?: string | null;
  name?: string;
  domain?: string | null;
  suspended?: boolean;
};

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function dbHeaders() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
}

function authorized(req: NextRequest): boolean {
  const pw = req.headers.get('x-admin-password') || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  return Boolean(expected) && pw === expected;
}

async function audit(action: string, opts: { userId?: string; amount?: number; reason?: string; meta?: Record<string, unknown> }) {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return;
  try {
    await fetch(`${base}/rest/v1/admin_audit_log`, {
      method: 'POST',
      headers: hdr,
      body: JSON.stringify({
        action,
        user_id: opts.userId ?? null,
        amount_ngn: opts.amount ?? null,
        reason: opts.reason ?? null,
        meta: opts.meta ?? {},
      }),
      cache: 'no-store',
    });
  } catch {
    /* best effort */
  }
}

async function readBannedList(): Promise<string[]> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return [];
  try {
    const res = await fetch(
      `${base}/rest/v1/admin_settings?key=eq.banned_users&select=value&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ value?: string }>;
    const parsed = JSON.parse(rows[0]?.value || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function writeBannedList(list: string[]): Promise<boolean> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return false;
  const res = await fetch(`${base}/rest/v1/admin_settings?key=eq.banned_users`, {
    method: 'PATCH',
    headers: { ...hdr, Prefer: 'return=minimal' },
    body: JSON.stringify({ value: JSON.stringify(list), updated_at: new Date().toISOString() }),
    cache: 'no-store',
  });
  if (!res.ok && res.status === 404) {
    // Row missing — insert it.
    const ins = await fetch(`${base}/rest/v1/admin_settings`, {
      method: 'POST',
      headers: { ...hdr, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ key: 'banned_users', value: JSON.stringify(list) }),
      cache: 'no-store',
    });
    return ins.ok;
  }
  return res.ok;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) {
    return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  }

  const [profilesRes, walletsRes, accessRes, panelsRes, banned] = await Promise.all([
    fetch(`${base}/rest/v1/profiles?select=id,email,full_name,phone,created_at&order=created_at.desc&limit=1000`, { headers: hdr, cache: 'no-store' }),
    fetch(`${base}/rest/v1/wallets?select=user_id,balance_ngn&limit=1000`, { headers: hdr, cache: 'no-store' }),
    fetch(`${base}/rest/v1/service_access?select=user_id,service,enabled,unlock_note&limit=5000`, { headers: hdr, cache: 'no-store' }),
    fetch(`${base}/rest/v1/child_panels?select=id,user_id,name,domain,suspended&limit=500`, { headers: hdr, cache: 'no-store' }),
    readBannedList(),
  ]);

  if (!profilesRes.ok) {
    console.error('[admin/users] profiles', profilesRes.status);
    return NextResponse.json({ ok: false, error: 'Could not load profiles' }, { status: 500 });
  }

  const profiles = (await profilesRes.json()) as ProfileRow[];
  const wallets = walletsRes.ok
    ? ((await walletsRes.json()) as Array<{ user_id?: string; balance_ngn?: number }>)
    : [];
  const access = accessRes.ok ? ((await accessRes.json()) as ServiceAccessRow[]) : [];
  const panels = panelsRes.ok ? ((await panelsRes.json()) as PanelRow[]) : [];
  const bannedSet = new Set(banned);

  const walletMap = new Map<string, number>();
  for (const w of wallets) {
    if (w.user_id) walletMap.set(w.user_id, Number(w.balance_ngn) || 0);
  }

  const accessMap = new Map<string, Record<string, { enabled: boolean; note: string | null }>>();
  for (const a of access) {
    if (!accessMap.has(a.user_id)) accessMap.set(a.user_id, {});
    accessMap.get(a.user_id)![a.service] = {
      enabled: Boolean(a.enabled),
      note: a.unlock_note ?? null,
    };
  }

  const panelMap = new Map<string, PanelRow>();
  for (const p of panels) {
    if (p.user_id) panelMap.set(p.user_id, p);
  }

  const users = profiles.map((p) => {
    const services = accessMap.get(p.id || '') || {};
    const panel = panelMap.get(p.id || '') || null;
    return {
      id: p.id || '',
      email: p.email || '',
      phone: p.phone || '',
      name: p.full_name || '',
      joined: p.created_at ? p.created_at.slice(0, 10) : '',
      balanceNgn: walletMap.get(p.id || '') ?? 0,
      // A user counts as an API developer once any service override exists.
      apiKey: Object.keys(services).length > 0,
      panel: panel
        ? { id: panel.id || '', name: panel.name || '', domain: panel.domain ?? null, suspended: Boolean(panel.suspended) }
        : null,
      banned: bannedSet.has(p.id || ''),
      services,
    };
  });

  return NextResponse.json({
    ok: true,
    users,
    panels: panels.map((p) => ({
      id: p.id || '',
      name: p.name || '',
      domain: p.domain ?? null,
      suspended: Boolean(p.suspended),
      userId: p.user_id ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) {
    return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  }

  let body: {
    action?: string;
    userId?: string;
    amount?: number;
    reason?: string;
    phone?: string;
    service?: string;
    enabled?: boolean;
    unlockNote?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const action = String(body.action || '');
  const userId = String(body.userId || '');
  if (!action || !userId) {
    return NextResponse.json({ ok: false, error: 'Missing action or userId' }, { status: 400 });
  }

  switch (action) {
    case 'credit':
    case 'debit': {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ ok: false, error: 'Invalid amount' }, { status: 400 });
      }
      const ref = `admin-${action}-${userId.slice(0, 8)}-${Date.now()}`;
      const desc = `Admin ${action} — ${String(body.reason || 'no reason given')}`;
      const res = await fetch(`${base}/rest/v1/rpc/${action === 'credit' ? 'credit_wallet' : 'debit_wallet'}`, {
        method: 'POST',
        headers: hdr,
        body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reference: ref, p_description: desc }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        if (/INSUFFICIENT_BALANCE/i.test(t)) {
          return NextResponse.json({ ok: false, error: 'User has insufficient balance' }, { status: 400 });
        }
        console.error('[admin/users] wallet rpc', res.status, t.slice(0, 200));
        return NextResponse.json({ ok: false, error: 'Wallet update failed' }, { status: 500 });
      }
      await audit(`wallet_${action}`, { userId, amount, reason: body.reason });
      return NextResponse.json({ ok: true });
    }

    case 'ban':
    case 'unban': {
      const list = await readBannedList();
      const set = new Set(list);
      if (action === 'ban') set.add(userId);
      else set.delete(userId);
      const ok = await writeBannedList(Array.from(set));
      if (!ok) return NextResponse.json({ ok: false, error: 'Could not update ban list' }, { status: 500 });
      await audit(action, { userId, reason: body.reason });
      return NextResponse.json({ ok: true });
    }

    case 'set-phone': {
      const phone = String(body.phone || '').trim();
      if (phone.replace(/\D/g, '').length < 8) {
        return NextResponse.json({ ok: false, error: 'Invalid phone number' }, { status: 400 });
      }
      const res = await fetch(`${base}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { ...hdr, Prefer: 'return=minimal' },
        body: JSON.stringify({ phone, updated_at: new Date().toISOString() }),
        cache: 'no-store',
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: 'Could not update the phone number' }, { status: 500 });
      }
      await audit('set_phone', { userId, reason: phone });
      return NextResponse.json({ ok: true });
    }

    case 'set-service': {
      const service = String(body.service || '');
      if (!service) {
        return NextResponse.json({ ok: false, error: 'Missing service' }, { status: 400 });
      }
      const enabled = Boolean(body.enabled);
      const res = await fetch(`${base}/rest/v1/service_access`, {
        method: 'POST',
        headers: { ...hdr, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          user_id: userId,
          service,
          enabled,
          unlock_note: body.unlockNote ? String(body.unlockNote) : null,
          updated_at: new Date().toISOString(),
        }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        console.error('[admin/users] set-service', res.status, t.slice(0, 200));
        return NextResponse.json({ ok: false, error: 'Could not update the service' }, { status: 500 });
      }
      await audit(enabled ? 'service_unlock' : 'service_lock', {
        userId,
        reason: body.unlockNote,
        meta: { service },
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  }
}
