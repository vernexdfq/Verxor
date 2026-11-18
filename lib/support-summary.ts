/**
 * Phase 3 support tools — deterministic lookups the assistant uses to answer
 * "where is my order?" style questions with REAL data (no LLM guessing).
 * Server-side only, service-role access.
 */

function db() {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) return null;
  return {
    base,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    } as Record<string, string>,
  };
}

async function selectRows(table: string, query: string): Promise<Record<string, unknown>[]> {
  const d = db();
  if (!d) return [];
  try {
    const res = await fetch(`${d.base}/rest/v1/${table}?${query}`, {
      headers: d.headers,
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Record<string, unknown>[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** One-line order summaries for the chat assistant (most recent first). */
export async function getUserOrdersSummary(userId: string): Promise<string | null> {
  if (!userId) return null;
  const lines: string[] = [];

  const [emails, accounts, vns] = await Promise.all([
    selectRows(
      'email_orders',
      `user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=4&select=email_address,site,status,created_at`,
    ),
    selectRows(
      'account_orders',
      `user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=4&select=id,status,created_at,meta`,
    ),
    selectRows(
      'vn_orders',
      `user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=4&select=phone_number,service_code,status,created_at`,
    ),
  ]);

  for (const e of emails) {
    lines.push(
      `📧 Email OTP · ${String(e.site || '?')} (${String(e.email_address || '')}) · ${String(
        e.status || 'waiting',
      )} · ${timeAgo(String(e.created_at || ''))}`,
    );
  }
  for (const a of accounts) {
    const meta = (a.meta && typeof a.meta === 'object' ? (a.meta as Record<string, unknown>) : {}) as Record<string, unknown>;
    lines.push(
      `👥 Buy Logs · ${String(meta.platform || meta.name || 'order ' + (a.id ?? ''))} · ${String(
        a.status || 'processing',
      )} · ${timeAgo(String(a.created_at || ''))}`,
    );
  }
  for (const v of vns) {
    lines.push(
      `🔢 Virtual Number · ${String(v.service_code || '')} ${String(v.phone_number || '')} · ${String(
        v.status || '?',
      )} · ${timeAgo(String(v.created_at || ''))}`,
    );
  }

  if (lines.length === 0) return null;
  return lines.slice(0, 8).join('\n');
}
