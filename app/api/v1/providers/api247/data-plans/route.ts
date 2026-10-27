import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/v1/providers/api247/data-plans?network=1
 * network: 1=MTN 2=Glo 3=9mobile 4=Airtel
 * Read-only. Never purchases.
 */
export async function GET(req: NextRequest) {
  const key = (
    process.env.API_247_KEY ||
    process.env.API247_KEY ||
    process.env.API_247_API_KEY ||
    process.env.API247_API_KEY ||
    process.env.API_247_TOKEN ||
    process.env.API247_TOKEN ||
    process.env.API_247 ||
    process.env.API247 ||
    ''
  ).trim();

  if (!key) {
    return NextResponse.json({ ok: false, error: 'API_247_KEY missing' }, { status: 503 });
  }

  const token = key.replace(/^(Token|Bearer)\s+/i, '');
  let base = (
    process.env.API_247_BASE_URL ||
    process.env.API247_BASE_URL ||
    'https://247api.com.ng/api'
  )
    .trim()
    .replace(/\/$/, '');
  if (!/\/api$/i.test(base)) base = `${base}/api`;

  const network = req.nextUrl.searchParams.get('network') || '1';
  const type = req.nextUrl.searchParams.get('type') || 'data';

  const qs = new URLSearchParams({ network, type });
  const url = `${base}/get-data-plans?${qs.toString()}`;

  try {
    let res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Token ${token}`,
        Accept: 'application/json',
        'User-Agent': 'Verxor/1.0',
      },
      cache: 'no-store',
    });
    let text = await res.text();

    if (res.status === 401) {
      res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'User-Agent': 'Verxor/1.0',
        },
        cache: 'no-store',
      });
      text = await res.text();
    }

    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 800) };
    }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      endpoint: url,
      data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'fetch failed',
      },
      { status: 502 },
    );
  }
}
