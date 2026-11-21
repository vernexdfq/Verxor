'use client';

/**
 * Gaming Top-Up — image-led grid + dynamic buy sheet, Shop2TopUp powered.
 *
 * Tiles fall back to a clean gradient + initials card until real artwork
 * lands in /public/games/<id>.webp (drop-in, no code change needed).
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AlertCircle, ArrowLeft, Check, Gamepad2, Loader2, Search, Wallet, X } from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionProfile, loadSessionTokens, saveSessionProfile, saveSessionTokens } from './auth/session-unlock';
import './gaming-page.css';
import './gaming-page-polish.css';

type CatalogProduct = { id: string; name: string; fromNgn: number | null; image?: string | null };
type Variation = { id: string; name: string; priceNgn: number; inStock: boolean };
type DetailField = { field: string; label?: string };
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
  if (p.image && /^https:\/\//i.test(p.image)) return { kind: 'img' as const, src: p.image };
  return { kind: 'initials' as const, gradient: gradientFor(p.id), label: initialsFor(p.name) };
}

/** Real provider cover with a graceful initials fallback if the URL is unavailable. */
function GameArtwork({
  product,
  imageClassName,
  fallbackClassName,
}: {
  product: { id: string; name: string; image?: string | null };
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const art = tileArt(product);
  if (art.kind === 'img' && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={art.src} alt={product.name} className={imageClassName} loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <span className={fallbackClassName || 'gm-tile-initials'} style={{ background: gradientFor(product.id) }}>
      {initialsFor(product.name)}
    </span>
  );
}

export function GamingPage({
  onBack,
  session,
  onFund,
}: {
  onBack: () => void;
  session: AuthSession | null;
  onFund: () => void;
}) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState(false);

  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<'popular' | 'az'>('popular');
  const [activeStrip, setActiveStrip] = useState(0);
  const [activeLetter, setActiveLetter] = useState<string | null>(null); // null = all

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

  /* ---------- catalog: ONE full list (A–Z / Popular / search) ---------- */

  const loadGames = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/v1/gaming/catalog?all=1', { cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; error?: string; games?: CatalogProduct[] };
      if (!res.ok || !data.ok) {
        const msg = data.error || 'Could not load the gaming catalog.';
        setLoadError(/not configured/i.test(msg) ? 'Gaming store is going live — provider setup is finishing. Try again shortly.' : msg);
        setIsSetup(/not configured/i.test(msg));
        setProducts([]);
      } else {
        setProducts(data.games || []);
      }
    } catch {
      setLoadError('Network error loading the catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Letters present in the catalog (A–Z sidebar index); ignores leading
   *  non-letter characters so names like "8 Ball Pool" hash under B. */
  const letterOf = (name: string) => {
    const m = name.match(/[A-Za-z]/);
    return m ? m[0].toUpperCase() : '#';
  };
  const letters = useMemo(
    () => [...new Set(products.map((p) => letterOf(p.name)))].sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q)) &&
        (activeLetter === null || letterOf(p.name) === activeLetter),
    );
    return sortMode === 'az'
      ? [...list].sort((a, b) => a.name.localeCompare(b.name))
      : list; // popular = provider order
  }, [products, query, sortMode, activeLetter]);

  const pickLetter = (l: string | null) => {
    setActiveLetter(l);
    setQuery('');
  };

  /* ---------- product detail ---------- */

  const openProduct = async (id: string, imageFallback?: string | null) => {
    setDetailLoading(true);
    /* id may be a raw game id (grid tile) or an option id (`s2t-…`). */
    setDetail(null);
    setDetailError(null);
    setSelectedVariation(null);
    setFieldValues({});
    setQuantity(1);
    setBuyError(null);
    setOrder(null);
    setNeedsFund(false);
    try {
      const res = await fetch(`/api/v1/gaming/product?product_id=${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; product?: ProductDetail };
      if (!res.ok || !data.ok || !data.product) {
        setDetailError(data.error || 'Could not load this product.');
      } else {
        setDetail({ ...data.product, image: data.product.image || imageFallback || null });
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

  /* Game tiles open an option list first (UC Cards / Direct Topup / regions). */
  const variantMode = detail?.id.startsWith('game-') ?? false;

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
      const res = await fetch('/api/v1/gaming/purchase', {
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

  useEffect(() => {
    const timer = window.setInterval(() => setActiveStrip((current) => (current + 1) % 3), 4500);
    return () => window.clearInterval(timer);
  }, []);

  /* ---------- render ---------- */

  const stripAds = [
    { id: 'ml', title: 'Mobile Legends diamonds', body: 'Fast top-ups. Secure checkout.', cta: 'Explore', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80', onClick: () => setQuery('Mobile Legends') },
    { id: 'play', title: 'Ready for your next match?', body: 'Top up popular games in seconds.', cta: 'Browse games', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80', onClick: () => setQuery('') },
    { id: 'level', title: 'Your game. Your next level.', body: 'Choose a title and view available options.', cta: 'Shop now', image: 'https://images.unsplash.com/photo-1493711662062-fa541e42fce8?auto=format&fit=crop&w=900&q=80', onClick: () => setQuery('') },
  ];

  return (
    <div className="gm-page">
      <header className="gm-head">
        <button type="button" className="gm-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>Gaming Top-Up</h1>
          <p>Instant game credits, delivered to your player ID.</p>
        </div>
        <span className="gm-head-badge">
          <Gamepad2 size={16} /> Powered by Shop2TopUp
        </span>
      </header>

      {/* Slim ad strips instead of a big banner */}
      <div className="gm-ad-wrap" aria-label="Gaming offers">
        <div className="gm-strips">
          {stripAds.map((ad, index) => (
            <button
              key={ad.id}
              type="button"
              className={`gm-strip${activeStrip === index ? ' active' : ''}`}
              style={{ backgroundImage: 'linear-gradient(90deg, rgba(7,18,42,.88), rgba(7,18,42,.32)), url(' + ad.image + ')' }}
              onClick={ad.onClick}
              aria-hidden={activeStrip !== index}
              tabIndex={activeStrip === index ? 0 : -1}
            >
              <span className="gm-strip-copy"><strong>{ad.title}</strong><small>{ad.body}</small></span>
              <span className="gm-strip-cta">{ad.cta} →</span>
            </button>
          ))}
        </div>
        <div className="gm-ad-dots" aria-label="Choose gaming promotion">
          {stripAds.map((ad, index) => (
            <button key={ad.id} type="button" className={activeStrip === index ? 'active' : ''} onClick={() => setActiveStrip(index)} aria-label={`Show promotion ${index + 1}`} />
          ))}
        </div>
      </div>

      {/* Main: A–Z sidebar (desktop) + controls & grid */}
      <div className="gm-main">
        <aside className="gm-side" aria-label="Browse games by letter">
          <div className="gm-side-head">Browse</div>
          <button
            type="button"
            className={`gm-side-item${activeLetter === null ? ' active' : ''}`}
            onClick={() => pickLetter(null)}
          >
            All games
            <span className="gm-side-count">{products.length}</span>
          </button>
          <div className="gm-side-head letters">A–Z</div>
          <div className="gm-side-letters">
            {letters.map((l) => (
              <button
                key={l}
                type="button"
                className={`gm-side-letter${activeLetter === l ? ' active' : ''}`}
                onClick={() => pickLetter(activeLetter === l ? null : l)}
                aria-pressed={activeLetter === l}
              >
                {l}
              </button>
            ))}
          </div>
        </aside>

        <div className="gm-col">
          {/* Mobile: horizontal letter chips (sidebar collapses to this) */}
          <div className="gm-chip-row" aria-label="Filter games by letter">
            <button
              type="button"
              className={`gm-chip${activeLetter === null ? ' active' : ''}`}
              onClick={() => pickLetter(null)}
            >
              All
            </button>
            {letters.map((l) => (
              <button
                key={l}
                type="button"
                className={`gm-chip${activeLetter === l ? ' active' : ''}`}
                onClick={() => pickLetter(activeLetter === l ? null : l)}
              >
                {l}
              </button>
            ))}
          </div>

      {/* Controls: search + sort */}
      <div className="gm-controls">
        <div className="gm-search-row">
          <label className="gm-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games…"
              aria-label="Search games"
            />
            {query ? (
              <button type="button" className="gm-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={14} />
              </button>
            ) : null}
          </label>
          <div className="gm-sort">
            {(['popular', 'az'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`gm-sort-btn${sortMode === m ? ' active' : ''}`}
                onClick={() => setSortMode(m)}
              >
                {m === 'popular' ? 'Popular' : 'A–Z'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError ? (
        <div className={`gm-error${isSetup ? ' config' : ''}`}>
          <AlertCircle size={16} /> {loadError}
          <button type="button" onClick={() => void loadGames()}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="gm-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="gm-tile skeleton" aria-hidden>
              <div className="gm-tile-art pulse" />
              <div className="gm-tile-lines"><span className="pulse" /><span className="pulse short" /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="gm-grid">
          {visible.map((p) => {
            const art = tileArt({ id: p.id, name: p.name, image: p.image });
            return (
              <button key={p.id} type="button" className="gm-tile" onClick={() => void openProduct(`game-${p.id}`, p.image)}>
                <div className="gm-tile-art">
                  <GameArtwork product={p} />
                </div>
                <div className="gm-tile-body">
                  <strong>{p.name}</strong>
                  <span className="gm-tile-from">{p.fromNgn ? `From ${ngn(p.fromNgn)}` : 'View prices'}</span>
                  <span className="gm-tile-choose">View options →</span>
                </div>
              </button>
            );
          })}
          {!loadError && visible.length === 0 ? (
            <p className="gm-empty">
              {query ? `No games match “${query}”.` : 'No games yet — check back shortly.'}
            </p>
          ) : null}
        </div>
      )}
        </div>
      </div>

      {/* ---------- buy sheet ---------- */}
      {detailLoading || detail || detailError ? (
        <div className="gm-sheet-overlay" onClick={closeDetail}>
          <div className="gm-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
            <button type="button" className="gm-sheet-close" onClick={closeDetail} aria-label="Close">
              <X size={16} />
            </button>

            {detailLoading ? (
              <div className="gm-sheet-loading"><Loader2 className="spin" size={22} /> Loading product…</div>
            ) : detailError ? (
              <div className="gm-error">
                <AlertCircle size={16} /> {detailError}
              </div>
            ) : detail ? (
              <>
                <div className="gm-sheet-head">
                  <GameArtwork
                    product={{ id: detail.id, name: detail.name, image: detail.image }}
                    imageClassName="gm-sheet-img"
                    fallbackClassName="gm-sheet-initials"
                  />
                  <div>
                    <h2>{detail.name}</h2>
                    <p>
                      {variantMode
                        ? 'Pick an option to see its denominations and pay with your wallet.'
                        : 'Pick a denomination, enter your player details, pay with your wallet.'}
                    </p>
                  </div>
                </div>

                {order ? (
                  <div className="gm-order-result">
                    <Check size={20} className="gm-order-ok" />
                    <h3>Order placed!</h3>
                    <p className="gm-order-line">{order.productName} · {order.variationName}{order.quantity > 1 ? ` ×${order.quantity}` : ''}</p>
                    <p className="gm-order-line">Total: <strong>{ngn(order.totalNgn)}</strong> · Status: {order.status}</p>
                    <p className="gm-order-line">Ref: <code>{order.ref}</code></p>
                    {order.accountDetails && Object.keys(order.accountDetails).length ? (
                      <div className="gm-order-details">
                        {Object.entries(order.accountDetails).map(([k, v]) => (
                          <div key={k} className="gm-order-detail-row">
                            <span>{k}</span>
                            <code>{v}</code>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <p className="gm-order-note">Credits are usually delivered within minutes. Watch the chat or your history for updates.</p>
                    <button type="button" className="gm-buy" onClick={closeDetail}>Done</button>
                  </div>
                ) : (
                  <>
                    {/* Dynamic fields (Player ID, Server/region, contact…) */}
                    {!variantMode && detail.fields.length ? (
                      <div className="gm-fields">
                        {detail.fields.map((f) => {
                          const isServer = /server|region/i.test(f.field);
                          const serversForField = isServer && detail.servers.length ? detail.servers : null;
                          return serversForField ? (
                            <label key={f.field} className="gm-field">
                              <span>{f.label || f.field}</span>
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
                            <label key={f.field} className="gm-field">
                              <span>{f.label || f.field}</span>
                              <input
                                value={String(fieldValues[f.field] || '')}
                                onChange={(e) => setFieldValues((prev) => ({ ...prev, [f.field]: e.target.value }))}
                                placeholder={`Enter ${(f.label || f.field).toLowerCase()}`}
                              />
                            </label>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* Denominations */}
                    <div className="gm-variations">
                      {detail.variations.map((v) => {
                        const oos = !v.inStock;
                        if (variantMode) {
                          return (
                            <button
                              key={v.id}
                              type="button"
                              className="gm-variation"
                              onClick={() => void openProduct(v.id)}
                            >
                              <span className="gm-variation-name">{v.name || 'Option'}</span>
                              <span className="gm-variation-price">
                                {v.priceNgn > 0 ? `From ${ngn(v.priceNgn)}` : 'View prices'}
                              </span>
                            </button>
                          );
                        }
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={oos}
                            className={`gm-variation${selectedVariation === v.id ? ' active' : ''}${oos ? ' oos' : ''}`}
                            onClick={() => setSelectedVariation(v.id)}
                          >
                            <span className="gm-variation-name">{v.name || 'Option'}</span>
                            <span className="gm-variation-price">{oos ? 'Out of stock' : ngn(v.priceNgn)}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quantity */}
                    {!variantMode ? (
                    <div className="gm-qty">
                      <span>Quantity</span>
                      <div className="gm-qty-step">
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
                    ) : null}

                    {buyError ? (
                      <div className="gm-error">
                        <AlertCircle size={16} /> {buyError}
                        {needsFund ? (
                          <button type="button" onClick={onFund}><Wallet size={14} /> Fund wallet</button>
                        ) : null}
                      </div>
                    ) : null}

                    {variantMode ? null : (
                    <button
                      type="button"
                      className="gm-buy"
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
                    )}
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
