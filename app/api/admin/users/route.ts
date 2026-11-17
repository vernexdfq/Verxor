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

  const [profilesRes, walletsRes, accessRes, panelsRes, apiClientsRes, resellerRes, banned] = await Promise.all([
    fetch(`${base}/rest/v1/profiles?select=id,email,full_name,phone,created_at&order=created_at.desc&limit=1000`, { headers: hdr, cache: 'no-store' }),
    fetch(`${base}/rest/v1/wallets?select=user_id,balance_ngn&limit=1000`, { headers: hdr, cache: 'no-store' }),
    fetch(`${base}/rest/v1/service_access?select=user_id,service,enabled,unlock_note&limit=5000`, { headers: hdr, cache: 'no-store' }),
    fetch(`${base}/rest/v1/child_panels?select=id,user_id,name,domain,suspended&limit=500`, { headers: hdr, cache: 'no-store' }),
    fetch(`${base}/rest/v1/api_clients?select=id,name,is_active,markup_percent,meta&limit=500`, { headers: hdr, cache: 'no-store' }),
    fetch(`${base}/rest/v1/reseller_wallet?select=user_id,balance&limit=1000`, { headers: hdr, cache: 'no-store' }),
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

  // Panels: merge child_panels (registry) with api_clients (live keys) + env panel.
  const apiClients = apiClientsRes.ok
    ? ((await apiClientsRes.json()) as Array<{
        id?: string;
        name?: string;
        is_active?: boolean;
        markup_percent?: number;
        meta?: Record<string, unknown> | null;
      }>)
    : [];
  const resellerBalances = resellerRes.ok
    ? ((await resellerRes.json()) as Array<{ user_id?: string; balance?: number }>)
    : [];
  const resellerMap = new Map<string, number>();
  for (const w of resellerBalances) {
    if (w.user_id) resellerMap.set(w.user_id, Number(w.balance) || 0);
  }

  const envPanelKey = (process.env.VERXOR_PANEL_API_KEY || '').trim();
  const envPanelName = (process.env.VERXOR_PANEL_NAME || 'Env Child Panel').trim();
  const envWalletId = (process.env.VERXOR_PANEL_WALLET_USER_ID || '').trim();

  const merged = new Map<string, Record<string, unknown>>();
  const put = (id: string, data: Record<string, unknown>) => {
    merged.set(id, { ...(merged.get(id) || {}), ...data });
  };

  for (const c of apiClients) {
    const meta = (c.meta || {}) as Record<string, unknown>;
    const walletUserId =
      typeof meta.wallet_user_id === 'string' ? meta.wallet_user_id :
      typeof meta.walletUserId === 'string' ? meta.walletUserId : null;
    put(c.id || '', {
      id: c.id || '',
      name: c.name || 'Child Panel',
      source: 'api_clients',
      active: Boolean(c.is_active),
      suspended: !c.is_active,
      markupPercent: Number(c.markup_percent ?? 15) || 15,
      walletUserId,
      balanceNgn: walletUserId ? resellerMap.get(walletUserId) ?? 0 : 0,
    });
  }

  // Skip the env panel when the same panel already exists in api_clients
  // (matched by linked wallet or name) — it would otherwise show twice.
  const envDuplicate = apiClients.some((c) => {
    const meta = (c.meta || {}) as Record<string, unknown>;
    const cWallet = typeof meta.wallet_user_id === 'string' ? meta.wallet_user_id :
      typeof meta.walletUserId === 'string' ? meta.walletUserId : '';
    const cName = String(c.name || '').toLowerCase();
    return (envWalletId && cWallet === envWalletId) || (cName && cName === envPanelName.toLowerCase());
  });

  if (envPanelKey && !envDuplicate && !merged.has('env-panel')) {
    put('env-panel', {
      id: 'env-panel',
      name: envPanelName,
      source: 'env',
      active: true,
      suspended: false,
      markupPercent: Number(process.env.VERXOR_PANEL_MARKUP_PCT || 15) || 15,
      walletUserId: envWalletId || null,
      balanceNgn: envWalletId ? resellerMap.get(envWalletId) ?? 0 : 0,
    });
  }

  for (const p of panels) {
    put(p.id || '', {
      id: p.id || '',
      name: p.name || merged.get(p.id || '')?.name || 'Child Panel',
      domain: p.domain ?? null,
      suspended: merged.get(p.id || '')?.suspended ?? Boolean(p.suspended),
      userId: p.user_id ?? null,
    });
  }

  return NextResponse.json({
    ok: true,
    users,
    panels: Array.from(merged.values()).map((p) => ({
      id: String(p.id || ''),
      name: String(p.name || 'Child Panel'),
      domain: (p.domain as string | null) ?? null,
      suspended: Boolean(p.suspended),
      userId: (p.walletUserId as string | null) ?? (p.userId as string | null) ?? null,
      active: p.active !== false,
      source: String(p.source || 'child_panels'),
      markupPercent: Number(p.markupPercent ?? 15) || 15,
      balanceNgn: Number(p.balanceNgn ?? 0),
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
    name?: string;
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

    case 'panel-credit':
    case 'panel-debit': {
      // Moves the panel's reseller wallet directly (credit_reseller_wallet / debit_reseller_wallet).
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ ok: false, error: 'Invalid amount' }, { status: 400 });
      }
      const rpc = action === 'panel-credit' ? 'credit_reseller_wallet' : 'debit_reseller_wallet';
      const ref = `admin-panel-${action === 'panel-credit' ? 'credit' : 'debit'}-${userId.slice(0, 8)}-${Date.now()}`;
      const res = await fetch(`${base}/rest/v1/rpc/${rpc}`, {
        method: 'POST',
        headers: hdr,
        body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reference: ref }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        if (/INSUFFICIENT_BALANCE/i.test(t)) {
          return NextResponse.json({ ok: false, error: 'Panel wallet has insufficient balance' }, { status: 400 });
        }
        console.error('[admin/users] panel wallet rpc', res.status, t.slice(0, 200));
        return NextResponse.json({ ok: false, error: 'Panel wallet update failed' }, { status: 500 });
      }
      await audit(`panel_wallet_${action === 'panel-credit' ? 'credit' : 'debit'}`, {
        userId,
        amount,
        reason: body.reason,
      });
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

    case 'set-panel': {
      const enabled = Boolean(body.enabled);
      const panelId = `panel-${userId}`;
      if (enabled) {
        const res = await fetch(`${base}/rest/v1/child_panels`, {
          method: 'POST',
          headers: { ...hdr, Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            id: panelId,
            user_id: userId,
            name: String(body.name || 'Shield Panel'),
            suspended: false,
            updated_at: new Date().toISOString(),
          }),
          cache: 'no-store',
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          console.error('[admin/users] set-panel upsert', res.status, t.slice(0, 200));
          return NextResponse.json({ ok: false, error: 'Could not upgrade the user' }, { status: 500 });
        }
        await audit('shield_panel_upgrade', { userId });
        return NextResponse.json({ ok: true });
      }
      const del = await fetch(
        `${base}/rest/v1/child_panels?id=eq.${encodeURIComponent(panelId)}`,
        { method: 'DELETE', headers: hdr, cache: 'no-store' },
      );
      if (!del.ok) {
        return NextResponse.json({ ok: false, error: 'Could not downgrade the user' }, { status: 500 });
      }
      await audit('shield_panel_downgrade', { userId });
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
