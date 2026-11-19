'use client';

/**
 * Gift Cards — image-led grid + dynamic buy sheet, MooGold powered.
 *
 * Tiles fall back to a clean gradient + initials card until real artwork
 * lands in /public/giftcards/<id>.webp (drop-in, no code change needed).
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AlertCircle, ArrowLeft, Check, Gift, Loader2, Search, Wallet, X } from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionProfile, loadSessionTokens, saveSessionProfile, saveSessionTokens } from './auth/session-unlock';
import './giftcard-store-page.css';

type Category = { id: string; name: string };
type CatalogProduct = { id: string; name: string; fromNgn: number | null };
type Variation = { id: string; name: string; priceNgn: number; inStock: boolean };
type DetailField = { field: string };
type Server = { id: string; name: string };
type ProductDetail = {
  id: string;
  name: string;
  image: string | null;
  fields: DetailField[];
  variations: Variation[];
  servers: Server[];
};
type OrderResult = {
  ref: string;
  status: string;
  message?: string;
  accountDetails?: Record<string, string>;
  totalNgn: number;
  productName: string;
  variationName: string;
  quantity: number;
};

const ngn = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

/** Stable gradient per product id — placeholder art until real images land. */
function gradientFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h} 70% 42%), hsl(${(h + 40) % 360} 65% 26%))`;
}

function initialsFor(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/);
  const a = words[0]?.[0] || 'G';
  const b = words.length > 1 ? words[1][0] : words[0]?.[1] || '';
  return (a + b).toUpperCase();
}

/** Artwork resolution: real image → id-based public path → gradient initials. */
function tileArt(p: { id: string; name: string; image?: string | null }) {
  if (p.image && /^https?:\/\//.test(p.image)) return { kind: 'img' as const, src: p.image };
  return { kind: 'initials' as const, gradient: gradientFor(p.id), label: initialsFor(p.name) };
}

export function GiftCardStorePage({
  onBack,
  session,
  onFund,
}: {
  onBack: () => void;
  session: AuthSession | null;
  onFund: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState(false);

  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<'popular' | 'az'>('popular');

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [needsFund, setNeedsFund] = useState(false);

  /* ---------- catalog ---------- */

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/v1/giftcards/catalog', { cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; error?: string; categories?: Category[] };
      if (!res.ok || !data.ok) {
        const msg = data.error || 'Could not load the gift card catalog.';
        setLoadError(/not configured/i.test(msg) ? 'Gift card store is going live — provider setup is finishing. Try again shortly.' : msg);
        setIsSetup(/not configured/i.test(msg));
      } else {
        const cats = data.categories || [];
        setCategories(cats);
        if (cats.length && !categoryId) setCategoryId(cats[0].id);
      }
    } catch {
      setLoadError('Network error loading the catalog.');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  const loadProducts = useCallback(async (catId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/v1/giftcards/catalog?category_id=${encodeURIComponent(catId)}`, {
        cache: 'no-store',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; products?: CatalogProduct[] };
      if (!res.ok || !data.ok) {
        const msg = data.error || 'Could not load gift cards.';
        setLoadError(/not configured/i.test(msg) ? 'Gift card store is going live — provider setup is finishing. Try again shortly.' : msg);
        setIsSetup(/not configured/i.test(msg));
        setProducts([]);
      } else {
        setProducts(data.products || []);
      }
    } catch {
      setLoadError('Network error loading products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (categoryId) void loadProducts(categoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => !q || p.name.toLowerCase().includes(q));
    return sortMode === 'az'
      ? [...list].sort((a, b) => a.name.localeCompare(b.name))
      : list; // popular = provider order
  }, [products, query, sortMode]);

  /* ---------- product detail ---------- */

  const openProduct = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    setDetailError(null);
    setSelectedVariation(null);
    setFieldValues({});
    setQuantity(1);
    setBuyError(null);
    setOrder(null);
    setNeedsFund(false);
    try {
      const res = await fetch(`/api/v1/giftcards/product?product_id=${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; product?: ProductDetail };
      if (!res.ok || !data.ok || !data.product) {
        setDetailError(data.error || 'Could not load this product.');
      } else {
        setDetail(data.product);
        const inStock = data.product.variations.find((v) => v.inStock && v.priceNgn > 0);
        if (inStock) setSelectedVariation(inStock.id);
      }
    } catch {
      setDetailError('Network error loading this product.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setOrder(null);
    setBuyError(null);
  };

  const chosenVariation = detail?.variations.find((v) => v.id === selectedVariation) || null;
  const totals = {
    ngn: chosenVariation ? chosenVariation.priceNgn * quantity : 0,
  };

  const missingField = useMemo(() => {
    if (!detail) return null;
    const missing = detail.fields.find((f) => !String(fieldValues[f.field] || '').trim());
    return missing ? missing.field : null;
  }, [detail, fieldValues]);

  /* ---------- purchase ---------- */

  const buy = async () => {
    if (!chosenVariation || !detail || buying) return;
    setBuying(true);
    setBuyError(null);
    setNeedsFund(false);

    let accessToken = loadSessionTokens()?.access_token || session?.accessToken || '';
    let userId = session?.userId || loadSessionProfile()?.userId || '';
    try {
      const { getSupabaseBrowser } = await import('../lib/supabase/client');
      const sb = getSupabaseBrowser();
      if (sb) {
        let { data: sess } = await sb.auth.getSession();
        if (!sess.session && accessToken) {
          const tokens = loadSessionTokens();
          if (tokens?.refresh_token) {
            const { data: refreshed } = await sb.auth
              .setSession({ access_token: tokens.access_token || accessToken, refresh_token: tokens.refresh_token })
              .catch(() => ({ data: { session: null as never } }));
            if (refreshed?.session) sess = refreshed;
          }
        }
        if (sess.session?.access_token) {
          accessToken = sess.session.access_token;
          saveSessionTokens({ access_token: sess.session.access_token, refresh_token: sess.session.refresh_token });
        }
        if (sess.session?.user?.id) {
          userId = sess.session.user.id;
          const existingProf = loadSessionProfile();
          if (existingProf) saveSessionProfile({ ...existingProf, userId });
        }
      }
    } catch {
      /* optional */
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    try {
      const res = await fetch('/api/v1/giftcards/purchase', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: detail.id,
          variationId: chosenVariation.id,
          quantity,
          fields: fieldValues,
          userId: userId || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; order?: OrderResult };
      if (!res.ok || !data.ok || !data.order) {
        setBuyError(data.error || 'The purchase failed. Try again.');
        setNeedsFund(res.status === 402);
        return;
      }
      setOrder(data.order);
    } catch {
      setBuyError('Network error while purchasing. Check your history before retrying.');
    } finally {
      setBuying(false);
    }
  };

  /* ---------- render ---------- */

  const stripAds = [
    { id: 'a2', title: 'Steam, Apple and Razer codes delivered in minutes', cta: 'Browse cards', emoji: '🎁', onClick: () => setQuery('Steam') },
  ];

  return (
    <div className="gcs-page">
      <header className="gcs-head">
        <button type="button" className="gcs-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>Gift Cards</h1>
          <p>Apple, Steam, Razer and more — codes delivered to your email.</p>
        </div>
        <span className="gcs-head-badge">
          <Gift size={16} /> Powered by MooGold
        </span>
      </header>

      {/* Slim ad strips instead of a big banner */}
      <div className="gcs-strips">
        {stripAds.map((ad) => (
          <button key={ad.id} type="button" className="gcs-strip" onClick={ad.onClick}>
            <span className="gcs-strip-emoji">{ad.emoji}</span>
            <span className="gcs-strip-title">{ad.title}</span>
            <span className="gcs-strip-cta">{ad.cta}</span>
          </button>
        ))}
      </div>

      {/* Controls: category chips + search + sort */}
      <div className="gcs-controls">
        {categories.length > 1 ? (
          <div className="gcs-cat-row">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`gcs-cat-chip${categoryId === c.id ? ' active' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        ) : null}
        <div className="gcs-search-row">
          <label className="gcs-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gift cards…"
              aria-label="Search gift cards"
            />
            {query ? (
              <button type="button" className="gcs-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={14} />
              </button>
            ) : null}
          </label>
          <div className="gcs-sort">
            {(['popular', 'az'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`gcs-sort-btn${sortMode === m ? ' active' : ''}`}
                onClick={() => setSortMode(m)}
              >
                {m === 'popular' ? 'Popular' : 'A–Z'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError ? (
        <div className={`gcs-error${isSetup ? ' config' : ''}`}>
          <AlertCircle size={16} /> {loadError}
          <button type="button" onClick={() => (categoryId ? loadProducts(categoryId) : loadCategories())}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="gcs-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="gcs-tile skeleton" aria-hidden>
              <div className="gcs-tile-art pulse" />
              <div className="gcs-tile-lines"><span className="pulse" /><span className="pulse short" /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="gcs-grid">
          {visible.map((p) => {
            const art = tileArt({ id: p.id, name: p.name });
            return (
              <button key={p.id} type="button" className="gcs-tile" onClick={() => void openProduct(p.id)}>
                <div className="gcs-tile-art">
                  {art.kind === 'img' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art.src} alt={p.name} loading="lazy" />
                  ) : (
                    <span className="gcs-tile-initials" style={{ background: art.gradient }}>{art.label}</span>
                  )}
                </div>
                <div className="gcs-tile-body">
                  <strong>{p.name}</strong>
                  <span className="gcs-tile-from">{p.fromNgn ? `From ${ngn(p.fromNgn)}` : 'View prices'}</span>
                  <span className="gcs-tile-choose">Choose options</span>
                </div>
              </button>
            );
          })}
          {!loadError && visible.length === 0 ? (
            <p className="gcs-empty">
              {query ? `No gift cards match “${query}”.` : 'No gift cards here yet.'}
            </p>
          ) : null}
        </div>
      )}

      {/* ---------- buy sheet ---------- */}
      {detailLoading || detail || detailError ? (
        <div className="gcs-sheet-overlay" onClick={closeDetail}>
          <div className="gcs-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
            <button type="button" className="gcs-sheet-close" onClick={closeDetail} aria-label="Close">
              <X size={16} />
            </button>

            {detailLoading ? (
              <div className="gcs-sheet-loading"><Loader2 className="spin" size={22} /> Loading product…</div>
            ) : detailError ? (
              <div className="gcs-error">
                <AlertCircle size={16} /> {detailError}
              </div>
            ) : detail ? (
              <>
                <div className="gcs-sheet-head">
                  {(() => {
                    const art = tileArt({ id: detail.id, name: detail.name, image: detail.image });
                    return art.kind === 'img' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={art.src} alt={detail.name} className="gcs-sheet-img" />
                    ) : (
                      <span className="gcs-sheet-initials" style={{ background: art.gradient }}>
                        {initialsFor(detail.name)}
                      </span>
                    );
                  })()}
                  <div>
                    <h2>{detail.name}</h2>
                    <p>Pick a denomination, enter your delivery details, pay with your wallet.</p>
                  </div>
                </div>

                {order ? (
                  <div className="gcs-order-result">
                    <Check size={20} className="gcs-order-ok" />
                    <h3>Order placed!</h3>
                    <p className="gcs-order-line">{order.productName} · {order.variationName}{order.quantity > 1 ? ` ×${order.quantity}` : ''}</p>
                    <p className="gcs-order-line">Total: <strong>{ngn(order.totalNgn)}</strong> · Status: {order.status}</p>
                    <p className="gcs-order-line">Ref: <code>{order.ref}</code></p>
                    {order.accountDetails && Object.keys(order.accountDetails).length ? (
                      <div className="gcs-order-details">
                        {Object.entries(order.accountDetails).map(([k, v]) => (
                          <div key={k} className="gcs-order-detail-row">
                            <span>{k}</span>
                            <code>{v}</code>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <p className="gcs-order-note">Codes are usually delivered within minutes. Watch the chat or your history for updates.</p>
                    <button type="button" className="gcs-buy" onClick={closeDetail}>Done</button>
                  </div>
                ) : (
                  <>
                    {/* Dynamic fields (User ID, Server/region, contact…) */}
                    {detail.fields.length ? (
                      <div className="gcs-fields">
                        {detail.fields.map((f) => {
                          const isServer = /server|region/i.test(f.field);
                          const serversForField = isServer && detail.servers.length ? detail.servers : null;
                          return serversForField ? (
                            <label key={f.field} className="gcs-field">
                              <span>{f.field}</span>
                              <select
                                value={String(fieldValues[f.field] || '')}
                                onChange={(e) => setFieldValues((prev) => ({ ...prev, [f.field]: e.target.value }))}
                              >
                                <option value="">Select {f.field.toLowerCase()}…</option>
                                {serversForField.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <label key={f.field} className="gcs-field">
                              <span>{f.field}</span>
                              <input
                                value={String(fieldValues[f.field] || '')}
                                onChange={(e) => setFieldValues((prev) => ({ ...prev, [f.field]: e.target.value }))}
                                placeholder={`Enter ${f.field.toLowerCase()}`}
                              />
                            </label>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* Denominations */}
                    <div className="gcs-variations">
                      {detail.variations.map((v) => {
                        const oos = !v.inStock;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={oos}
                            className={`gcs-variation${selectedVariation === v.id ? ' active' : ''}${oos ? ' oos' : ''}`}
                            onClick={() => setSelectedVariation(v.id)}
                          >
                            <span className="gcs-variation-name">{v.name || 'Option'}</span>
                            <span className="gcs-variation-price">{oos ? 'Out of stock' : ngn(v.priceNgn)}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quantity */}
                    <div className="gcs-qty">
                      <span>Quantity</span>
                      <div className="gcs-qty-step">
                        <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                        <input
                          value={quantity}
                          onChange={(e) => {
                            const n = Math.max(1, Math.min(99, Math.floor(Number(e.target.value.replace(/\D/g, '')) || 1)));
                            setQuantity(n);
                          }}
                          inputMode="numeric"
                          aria-label="Quantity"
                        />
                        <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} aria-label="Increase">+</button>
                      </div>
                    </div>

                    {buyError ? (
                      <div className="gcs-error">
                        <AlertCircle size={16} /> {buyError}
                        {needsFund ? (
                          <button type="button" onClick={onFund}><Wallet size={14} /> Fund wallet</button>
                        ) : null}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      className="gcs-buy"
                      disabled={buying || !chosenVariation || Boolean(missingField) || needsFund}
                      onClick={() => void buy()}
                    >
                      {buying ? <Loader2 className="spin" size={16} /> : <Wallet size={16} />}
                      {chosenVariation
                        ? missingField
                          ? `Enter ${missingField}`
                          : needsFund
                            ? 'Fund wallet to continue'
                            : `Pay ${ngn(totals.ngn)}`
                        : 'Select a denomination'}
                    </button>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
