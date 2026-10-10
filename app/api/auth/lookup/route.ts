import { NextResponse } from 'next/server';

/**
 * Check if an account exists for phone or email (no secrets returned).
 * Used before showing the PIN screen.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phoneRaw = String(body.phone || body.phoneE164 || '').replace(/\D/g, '');
    const email = String(body.email || '').trim().toLowerCase();

    if (!phoneRaw && !email) {
      return NextResponse.json({ error: 'Phone or email required' }, { status: 400 });
    }

    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!base || !serviceKey) {
      return NextResponse.json({ error: 'Auth backend is not configured', configured: false }, { status: 503 });
    }

    type Profile = {
      id: string;
      email?: string | null;
      phone?: string | null;
      full_name?: string | null;
      phone_country?: string | null;
      country_code?: string | null;
      pin_hash?: string | null;
      tx_pin_hash?: string | null;
    };

    let profile: Profile | null = null;

    if (phoneRaw) {
      for (const p of [`+${phoneRaw}`, phoneRaw]) {
        const res = await fetch(
          `${base}/rest/v1/profiles?phone=eq.${encodeURIComponent(p)}&select=id,email,phone,full_name,phone_country,country_code,pin_hash,tx_pin_hash&limit=1`,
          {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
            cache: 'no-store',
          },
        );
        if (!res.ok) continue;
        const rows = (await res.json()) as Profile[];
        if (rows[0]) {
          profile = rows[0];
          break;
        }
      }
    }

    if (!profile && email) {
      const res = await fetch(
        `${base}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id,email,phone,full_name,phone_country,country_code,pin_hash,tx_pin_hash&limit=1`,
        {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          cache: 'no-store',
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as Profile[];
        if (rows[0]) profile = rows[0];
      }
    }

    if (!profile) {
      return NextResponse.json({ found: false });
    }

    const hasPin = Boolean(profile.pin_hash || profile.tx_pin_hash);

    return NextResponse.json({
      found: true,
      hasPin,
      email: profile.email || null,
      phone: profile.phone || null,
      fullName: profile.full_name || null,
      phoneCountry: profile.phone_country || profile.country_code || null,
    });
  } catch (e) {
    console.error('[auth/lookup]', e);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
