import { NextResponse } from 'next/server';
import { hash as bcryptHash } from 'bcryptjs';

function env(name: string) {
  return (process.env[name] || '').trim();
}

function baseUrl() {
  return (
    env('SUPABASE_URL') ||
    env('NEXT_PUBLIC_SUPABASE_URL') ||
    ''
  ).replace(/\/$/, '');
}

function serviceKey() {
  return env('SUPABASE_SERVICE_ROLE_KEY');
}

function anonKey() {
  return env('NEXT_PUBLIC_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY');
}

/** Forgot PIN: verify password, set new pin_hash. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');
    const newPin = String(body.newPin || body.new_pin || '').trim();

    if (!password || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { error: 'Password and new 4-digit PIN are required' },
        { status: 400 },
      );
    }

    const base = baseUrl();
    const service = serviceKey();
    const anon = anonKey();
    if (!base || !service || !anon) {
      return NextResponse.json({ error: 'Auth is not configured' }, { status: 503 });
    }

    let accountEmail = email;
    let userId: string | null = null;

    if (!accountEmail && phone) {
      const digits = phone.replace(/\D/g, '');
      for (const p of [`+${digits}`, digits, phone]) {
        const res = await fetch(
          `${base}/rest/v1/profiles?phone=eq.${encodeURIComponent(p)}&select=id,email&limit=1`,
          {
            headers: { apikey: service, Authorization: `Bearer ${service}` },
            cache: 'no-store',
          },
        );
        if (!res.ok) continue;
        const rows = (await res.json()) as Array<{ id: string; email?: string | null }>;
        if (rows[0]) {
          userId = rows[0].id;
          accountEmail = (rows[0].email || '').trim().toLowerCase();
          break;
        }
      }
    }

    if (!accountEmail) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const tokenRes = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anon,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: accountEmail, password }),
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    if (!userId) {
      const res = await fetch(
        `${base}/rest/v1/profiles?email=eq.${encodeURIComponent(accountEmail)}&select=id&limit=1`,
        {
          headers: { apikey: service, Authorization: `Bearer ${service}` },
          cache: 'no-store',
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ id: string }>;
        userId = rows[0]?.id || null;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const pinHash = await bcryptHash(newPin, 10);
    const patchRes = await fetch(
      `${base}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: service,
          Authorization: `Bearer ${service}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          pin_hash: pinHash,
          updated_at: new Date().toISOString(),
        }),
      },
    );

    if (!patchRes.ok) {
      const text = await patchRes.text().catch(() => '');
      console.error('[auth/reset-pin]', patchRes.status, text.slice(0, 200));
      return NextResponse.json({ error: 'Could not update PIN' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[auth/reset-pin]', e);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
