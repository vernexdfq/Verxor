import { NextResponse } from 'next/server';

/**
 * GET /api/v1/providers/api247/data-plans
 * Read-only: lists 247API data plans. Never purchases.
 */
export async function GET() {
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

  const url = `${base}/get-data-plans`;

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
