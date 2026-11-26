/**
 * Gaming catalog snapshot in Supabase.
 * Stores the provider catalog + product details in Supabase
 * so browsing serves from Supabase and only refetches when stale.
 */

import { sbSelect, sbUpsertBatch, supabaseConfigured } from './supabase-admin';
import type { MgProduct, MgProductDetail } from './providers/moogold';

export const PRODUCTS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DETAIL_TTL_MS = 12 * 60 * 60 * 1000;

/** Product names+order for one category, from the snapshot. */
export async function cachedProducts(
  categoryId: string,
): Promise<{ products: MgProduct[]; rows: { id: string; name: string; syncedAt: string }[] }> {
  const rows = await sbSelect(
    'gaming_products',
    `category_id=eq.${categoryId}&select=id,name,position,synced_at&order=position.asc`,
  );
  const list = Array.isArray(rows) ? rows : [];
  return {
    products: list.map((r: { id: string; name: string }) => ({ id: String(r.id), name: String(r.name) })),
    rows: list.map((r: { id: string; name: string; synced_at: string }) => ({
      id: String(r.id),
      name: String(r.name),
      syncedAt: String(r.synced_at),
    })),
  };
}

export function productsFresh(syncedAt: string | undefined): boolean {
  return Boolean(syncedAt && Date.now() - Date.parse(syncedAt) < PRODUCTS_TTL_MS);
}

export async function saveProducts(categoryId: string, products: MgProduct[]): Promise<void> {
  const rows = products.map((p, i) => ({
    id: p.id,
    category_id: categoryId,
    name: p.name,
    position: i,
    synced_at: new Date().toISOString(),
  }));
  await sbUpsertBatch('gaming_products', rows, 'id');
}

export type CachedDetail = {
  detail: MgProductDetail;
  syncedAt: string;
};

export async function cachedDetail(productId: string): Promise<CachedDetail | null> {
  const rows = await sbSelect(
    'gaming_product_details',
    `product_id=eq.${productId}&select=name,image_url,fields,variations,synced_at&limit=1`,
  );
  const r = Array.isArray(rows) && rows.length ? rows[0] : null;
  if (!r) return null;
  const variations = Array.isArray(r.variations) ? r.variations : [];
  // Buy-sheet details cached with zero prices are stale: treat those rows as
  // a miss so the caller refetches live unit prices and resaves.
  const allZero = variations.length > 0 && variations.every(
    (v: { priceUsd?: number | null }) => !v.priceUsd || v.priceUsd <= 0,
  );
  if (allZero) return null;

  return {
    detail: {
      id: productId,
      name: String(r.name),
      image: r.image_url ? String(r.image_url) : null,
      fields: Array.isArray(r.fields) ? r.fields : [],
      variations,
    },
    syncedAt: String(r.synced_at),
  };
}

export function detailFresh(syncedAt: string | undefined, ttlMs = DETAIL_TTL_MS): boolean {
  return Boolean(syncedAt && Date.now() - Date.parse(syncedAt) < ttlMs);
}

export async function saveDetail(detail: MgProductDetail): Promise<void> {
  await sbUpsertBatch(
    'gaming_product_details',
    [
      {
        product_id: detail.id,
        name: detail.name,
        image_url: detail.image || null,
        fields: detail.fields || [],
        variations: detail.variations || [],
        synced_at: new Date().toISOString(),
      },
    ],
    'product_id',
  );
}

/** Batch fetch all game details in one query from Supabase snapshot */
export async function cachedAllGameDetails(): Promise<Record<string, CachedDetail>> {
  try {
    const rows = await sbSelect(
      'gaming_product_details',
      'product_id=like.game-*&select=product_id,name,image_url,fields,variations,synced_at',
    );
    const result: Record<string, CachedDetail> = {};
    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (!r.product_id) continue;
        const variations = Array.isArray(r.variations) ? r.variations : [];
        const allZero = variations.length > 0 && variations.every((v: any) => !v.priceUsd || v.priceUsd <= 0);
        if (allZero) continue; // skip stale zero-price snapshot so it warms fresh
        result[String(r.product_id)] = {
          detail: {
            id: String(r.product_id),
            name: String(r.name || ''),
            image: r.image_url ? String(r.image_url) : null,
            fields: Array.isArray(r.fields) ? r.fields : [],
            variations,
          },
          syncedAt: String(r.synced_at),
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

export { supabaseConfigured };
