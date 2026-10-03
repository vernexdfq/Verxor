/**
 * Minimal Supabase REST helper (service role). No extra npm dependency.
 */

function baseUrl() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('SUPABASE_URL is not configured');
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

function serviceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return key;
}

export function supabaseConfigured() {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function sbInsert(table: string, row: Record<string, unknown>) {
  const res = await fetch(`${baseUrl()}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey(),
      Authorization: `Bearer ${serviceKey()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase insert ${table}: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function sbUpdate(
  table: string,
  match: Record<string, string>,
  patch: Record<string, unknown>,
) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(match)) q.set(k, `eq.${v}`);
  const res = await fetch(`${baseUrl()}/rest/v1/${table}?${q.toString()}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey(),
      Authorization: `Bearer ${serviceKey()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase update ${table}: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function sbSelect(table: string, query: string) {
  const res = await fetch(`${baseUrl()}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: serviceKey(),
      Authorization: `Bearer ${serviceKey()}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase select ${table}: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}
