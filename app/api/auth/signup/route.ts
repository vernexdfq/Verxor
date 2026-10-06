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

/**
 * Server signup: creates confirmed Auth user (no email wait),
 * upserts profile with pin_hash.
 * Only writes columns that exist on public.profiles in our schema.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.fullName || body.full_name || '').trim();
    const phone = String(body.phone || '').trim();
    const phoneCountry = String(body.phoneCountry || body.phone_country || 'NG');
    const pin = String(body.pin || '').trim();

    if (!email || !password || !fullName || !phone || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'Name, phone, email, password, and 4-digit PIN are required' },
        { status: 400 },
      );
    }

    const base = baseUrl();
    const service = serviceKey();
    if (!base || !service) {
      return NextResponse.json({ error: 'Auth is not configured' }, { status: 503 });
    }

    const createRes = await fetch(`${base}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone,
          phone_country: phoneCountry,
        },
      }),
    });

    const createBody = (await createRes.json().catch(() => ({}))) as {
      id?: string;
      email?: string;
      msg?: string;
      message?: string;
      error_description?: string;
    };

    if (!createRes.ok) {
      const msg =
        createBody.msg ||
        createBody.message ||
        createBody.error_description ||
        'Could not create account';
      if (/already|registered|exists/i.test(msg)) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Sign in instead.' },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const userId = createBody.id;
    if (!userId) {
      return NextResponse.json({ error: 'Could not create account' }, { status: 500 });
    }

    const pinHash = await bcryptHash(pin, 10);
    const now = new Date().toISOString();

    const profileRow: Record<string, unknown> = {
      id: userId,
      email,
      full_name: fullName,
      phone,
      pin_hash: pinHash,
      country_code: phoneCountry,
      updated_at: now,
    };

    async function writeProfile(row: Record<string, unknown>) {
      const res = await fetch(`${base}/rest/v1/profiles?on_conflict=id`, {
        method: 'POST',
        headers: {
          apikey: service,
          Authorization: `Bearer ${service}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(row),
      });
      const text = await res.text().catch(() => '');
      return { ok: res.ok, status: res.status, text };
    }

    let written = await writeProfile(profileRow);

    if (!written.ok && /phone_country|PGRST204|column/i.test(written.text)) {
      written = await writeProfile({
        id: userId,
        email,
        full_name: fullName,
        phone,
        pin_hash: pinHash,
        updated_at: now,
      });
    }

    if (!written.ok) {
      const patchRes = await fetch(
        `${base}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: service,
            Authorization: `Bearer ${service}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            email,
            full_name: fullName,
            phone,
            pin_hash: pinHash,
            country_code: phoneCountry,
            updated_at: now,
          }),
        },
      );
      const patchText = await patchRes.text().catch(() => '');
      if (patchRes.ok && patchText && patchText !== '[]') {
        written = { ok: true, status: patchRes.status, text: patchText };
      } else {
        const ins = await fetch(`${base}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            apikey: service,
            Authorization: `Bearer ${service}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            id: userId,
            email,
            full_name: fullName,
            phone,
            pin_hash: pinHash,
            updated_at: now,
          }),
        });
        written = {
          ok: ins.ok,
          status: ins.status,
          text: await ins.text().catch(() => ''),
        };
      }
    }

    if (!written.ok) {
      console.error('[auth/signup] profile write failed', written.status, written.text.slice(0, 400));
      return NextResponse.json(
        {
          error:
            'Account was created but profile could not be saved. Run the Verxor SQL schema in Supabase (profiles.pin_hash), then contact support.',
          detail: written.text.slice(0, 200),
          user_id: userId,
        },
        { status: 500 },
      );
    }

    await fetch(`${base}/rest/v1/wallets?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        balance_usd: 0,
        balance_ngn: 0,
        updated_at: now,
      }),
    }).catch(() => null);

    const anon = anonKey();
    let access_token: string | undefined;
    let refresh_token: string | undefined;
    if (anon) {
      const tokenRes = await fetch(`${base}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: anon,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      if (tokenRes.ok) {
        const tokens = (await tokenRes.json()) as {
          access_token?: string;
          refresh_token?: string;
        };
        access_token = tokens.access_token;
        refresh_token = tokens.refresh_token;
      }
    }

    return NextResponse.json({
      ok: true,
      user_id: userId,
      email,
      phone,
      access_token,
      refresh_token,
    });
  } catch (e) {
    console.error('[auth/signup]', e);
    return NextResponse.json({ error: 'Sign up failed' }, { status: 500 });
  }
}
