import { DATA_CATALOG } from '@/lib/data-catalog';

/**
 * Admin pricing overrides (data_plan_overrides in Supabase).
 * Missing/invalid override values fall back to the code catalog.
 * Cached 60s to keep the hot path fast.
 */
export type DataOverride = {
  cost: number | null;
  retail: number | null;
  apiPrice: number | null;
  active: boolean;
};

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function dbHeaders() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return serviceKey
    ? { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
    : null;
}

const numOrNull = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

let cache: { at: number; map: Map<number, DataOverride> } | null = null;
const TTL_MS = 60_000;

/** planId -> override map (missing key = use catalog defaults). */
export async function loadOverrides(force = false): Promise<Map<number, DataOverride>> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.map;
  const map = new Map<number, DataOverride>();
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (base && hdr) {
    try {
      const res = await fetch(`${base}/rest/v1/data_plan_overrides?select=*`, {
        headers: hdr, cache: 'no-store',
      });
      if (res.ok) {
        const rows = (await res.json()) as Array<Record<string, unknown>>;
        for (const r of rows) {
          const id = Number(r.plan_id);
          if (!Number.isFinite(id) || id <= 0) continue;
          if (r.active === false) continue;
          map.set(id, {
            cost: numOrNull(r.override_cost),
            retail: numOrNull(r.override_retail),
            apiPrice: numOrNull(r.override_api_price),
            active: true,
          });
        }
      }
    } catch {
      /* fall back to catalog */
    }
  }
  cache = { at: Date.now(), map };
  return map;
}

export function catalogIds(): number[] {
  return DATA_CATALOG.map((p) => p.id);
}
