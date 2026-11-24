import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function dbHeaders() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return serviceKey ? { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } : null;
}

type StoredOtp = {
  code?: string;
  email?: string;
  userId?: string;
  expiresAt?: number;
  tries?: number;
};

function parseOtpValue(raw: unknown): StoredOtp | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(parsed);
        } catch {
          return null;
        }
      }
      return parsed;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw as StoredOtp;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    let body: { email?: string; phone?: string; identifier?: string; code?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 });
    }

    const rawInput = (body.email || body.phone || body.identifier || '').trim().toLowerCase();
    const rawCode = (body.code || '').trim();
    const cleanCode = rawCode.replace(/\D/g, '');

    if (!cleanCode || cleanCode.length !== 6) {
      return NextResponse.json({ error: 'Please enter the 6-digit verification code' }, { status: 400 });
    }

    const base = supabaseBase();
    const hdr = dbHeaders();
    if (!base || !hdr) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
    }

    // Step 1: Look up by code directly (fastest and most reliable)
    const codeQueryRes = await fetch(
      `${base}/rest/v1/admin_settings?key=eq.pwdotp:code:${encodeURIComponent(cleanCode)}&select=key,value&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );

    let matchedRow: { key: string; value?: unknown } | null = null;
    if (codeQueryRes.ok) {
      const rows = (await codeQueryRes.json().catch(() => [])) as Array<{ key: string; value?: unknown }>;
      if (rows.length > 0 && rows[0]) {
        matchedRow = rows[0];
      }
    }

    // Step 2: If not found by direct code key, search by email or user ID
    if (!matchedRow && rawInput) {
      const candidates = [`pwdotp:email:${rawInput}`];
      // Also look up profile to get user ID if needed
      let profileId = '';
      if (rawInput.includes('@')) {
        const pRes = await fetch(
          `${base}/rest/v1/profiles?email=ilike.${encodeURIComponent(rawInput)}&select=id&limit=1`,
          { headers: hdr, cache: 'no-store' },
        );
        if (pRes.ok) {
          const pRows = (await pRes.json().catch(() => [])) as Array<{ id: string }>;
          if (pRows[0]?.id) profileId = pRows[0].id;
        }
      }
      if (profileId) {
        candidates.push(`pwdotp:user:${profileId}`);
        candidates.push(`pwdotp:${profileId}`);
      }

      for (const candKey of candidates) {
        if (matchedRow) break;
        const candRes = await fetch(
          `${base}/rest/v1/admin_settings?key=eq.${encodeURIComponent(candKey)}&select=key,value&limit=1`,
          { headers: hdr, cache: 'no-store' },
        );
        if (candRes.ok) {
          const candRows = (await candRes.json().catch(() => [])) as Array<{ key: string; value?: unknown }>;
          if (candRows[0]) matchedRow = candRows[0];
        }
      }
    }

    if (!matchedRow) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    const otp = parseOtpValue(matchedRow.value);
    if (!otp || !otp.code) {
      return NextResponse.json({ error: 'This code has expired. Request a new one.' }, { status: 400 });
    }

    const now = Date.now();
    const expiry = Number(otp.expiresAt) || 0;
    if (expiry > 0 && now > expiry) {
      return NextResponse.json({ error: 'This code has expired. Request a new one.' }, { status: 400 });
    }

    const tries = Number(otp.tries) || 0;
    if (tries >= 5) {
      return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 });
    }

    if (otp.code !== cleanCode) {
      // Increment attempt counter
      const updatedOtp = { ...otp, tries: tries + 1 };
      await fetch(`${base}/rest/v1/admin_settings?key=eq.${encodeURIComponent(matchedRow.key)}`, {
        method: 'PATCH',
        headers: { ...hdr, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: JSON.stringify(updatedOtp) }),
        cache: 'no-store',
      });
      return NextResponse.json({ error: 'Incorrect verification code. Please check and try again.' }, { status: 400 });
    }

    // Code is valid! Mark verified in state
    const verifiedPayload = { ...otp, verified: true, verifiedAt: now };
    await fetch(`${base}/rest/v1/admin_settings?key=eq.${encodeURIComponent(matchedRow.key)}`, {
      method: 'PATCH',
      headers: { ...hdr, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(verifiedPayload) }),
      cache: 'no-store',
    });

    return NextResponse.json({
      ok: true,
      verified: true,
      email: otp.email || rawInput,
    });
  } catch (err) {
    console.error('[verify-reset-code] unexpected error', err);
    return NextResponse.json({ error: 'Could not verify code. Please try again.' }, { status: 500 });
  }
}
