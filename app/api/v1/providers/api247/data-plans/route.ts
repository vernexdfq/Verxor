import { NextRequest, NextResponse } from 'next/server';

/** GET /api/v1/providers/api247/data-plans — read-only probe */
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
  const type = req.nextUrl.searchParams.get('type') || 'SME';

  const attempts: { method: string; url: string; status: number; body: unknown }[] = [];

  async function hit(method: string, url: string, body?: object) {
    for (const auth of [`Token ${token}`, `Bearer ${token}`] as const) {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: auth,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Verxor/1.0',
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { raw: text.slice(0, 400) };
      }
      attempts.push({ method: `${method}+${auth.split(' ')[0]}`, url, status: res.status, body: parsed });
      if (res.ok) {
        const list = Array.isArray(parsed)
          ? parsed
          : parsed && typeof parsed === 'object'
            ? (parsed as any).data || (parsed as any).plans || (parsed as any).result
            : null;
        if (Array.isArray(list) && list.length > 0) {
          return { ok: true as const, endpoint: url, auth: auth.split(' ')[0], data: parsed, list };
        }
      }
    }
    return null;
  }

  const getUrl = `${base}/get-data-plans?network=${encodeURIComponent(network)}&type=${encodeURIComponent(type)}`;
  let hitOk = await hit('GET', getUrl);
  if (!hitOk) hitOk = await hit('POST', `${base}/get-data-plans`, { network, type });
  if (!hitOk) hitOk = await hit('POST', `${base}/get-data-plans`, { network: Number(network), type });
  if (!hitOk) hitOk = await hit('GET', `${base}/get-networks?service=data`);

  if (hitOk) {
    return NextResponse.json(hitOk);
  }

  return NextResponse.json({
    ok: false,
    error: 'No data plans returned',
    attempts: attempts.map((a) => ({
      method: a.method,
      url: a.url,
      status: a.status,
      preview:
        typeof a.body === 'object' && a.body !== null
          ? a.body
          : String(a.body).slice(0, 200),
    })),
  });
}
