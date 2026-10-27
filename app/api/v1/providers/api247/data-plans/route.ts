import { NextResponse } from 'next/server';
import { isApi247Configured } from '@/lib/providers/api247';

/**
 * GET /api/v1/providers/api247/data-plans
 * Read-only: lists 247API data plans (size, days, cost). Never purchases.
 */
export async function GET() {
  if (!isApi247Configured()) {
    return NextResponse.json(
      { ok: false, error: '247API env not configured' },
      { status: 503 },
    );
  }

  const key =
    process.env.API_247_KEY ||
    process.env.API247_KEY ||
    process.env.API_247_API_KEY ||
    process.env.API247_API_KEY ||
    process.env.API_247_TOKEN ||
    process.env.API247_TOKEN ||
    process.env.API_247 ||
    process.env.API247;

  if (!key) {
    return NextResponse.json({ ok: false, error: 'API_247_KEY missing' }, { status: 503 });
  }

  const token = key.trim().replace(/^(Token|Bearer)\s+/i, '');
  let base =
    process.env.API_247_BASE_URL ||
    process.env.API247_BASE_URL ||
    'https://247api.com.ng/api';
  base = base.trim().replace(/\/$/, '');
  if (!/\/api$/i.test(base)) base = `${base}/api`;

  const urls = [
    `${base}/get-data-plans`,
    `${base}/get-data-plans?network=1`,
    `${base}/data-plans`,
    `${base}/get-plans?service=data`,
  ];

  const attempts: { url: string; status: number; body: unknown }[] = [];

  for (const url of urls) {
    for (const auth of [`Token ${token}`, `Bearer ${token}`]) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: auth,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Verxor/1.0',
          },
          cache: 'no-store',
        });
        const text = await res.text().catch(() => '');
        let body: unknown = text;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = { raw: text.slice(0, 500) };
        }
        attempts.push({ url, status: res.status, body });
        if (res.ok) {
          return NextResponse.json({
            ok: true,
            provider: 'api247',
            endpoint: url,
            auth: auth.split(' ')[0],
            data: body,
          });
        }
      } catch (err) {
        attempts.push({
          url,
          status: 0,
          body: { error: err instanceof Error ? err.message : 'fetch failed' },
        });
      }
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'Could not list 247 data plans',
      attempts: attempts.map((a) => ({
        url: a.url,
        status: a.status,
        preview:
          typeof a.body === 'object'
            ? a.body
            : String(a.body).slice(0, 200),
      })),
    },
    { status: 502 },
  );
}
