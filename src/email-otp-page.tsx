'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { ServiceLogo } from './virtual-numbers-components';
import './email-otp-page.css';

// Platform catalog for autocomplete (AnyMessage accepts any site)
const POPULAR_PLATFORMS: { id: string; name: string; site: string; logoId?: string }[] = [
  { id: 'instagram', name: 'Instagram', site: 'instagram.com', logoId: 'instagram' },
  { id: 'google', name: 'Google / Gmail', site: 'google.com', logoId: 'google' },
  { id: 'tiktok', name: 'TikTok', site: 'tiktok.com', logoId: 'tiktok' },
  { id: 'facebook', name: 'Facebook', site: 'facebook.com', logoId: 'facebook' },
  { id: 'discord', name: 'Discord', site: 'discord.com', logoId: 'discord' },
  { id: 'x', name: 'X (Twitter)', site: 'x.com', logoId: 'twitter' },
  { id: 'telegram', name: 'Telegram', site: 'telegram.org', logoId: 'telegram' },
  { id: 'whatsapp', name: 'WhatsApp', site: 'whatsapp.com', logoId: 'whatsapp' },
  { id: 'reddit', name: 'Reddit', site: 'reddit.com', logoId: 'reddit' },
  { id: 'microsoft', name: 'Microsoft / Outlook', site: 'microsoft.com', logoId: 'microsoft' },
  { id: 'apple', name: 'Apple / iCloud', site: 'apple.com', logoId: 'apple' },
  { id: 'amazon', name: 'Amazon', site: 'amazon.com', logoId: 'amazon' },
  { id: 'netflix', name: 'Netflix', site: 'netflix.com', logoId: 'netflix' },
  { id: 'spotify', name: 'Spotify', site: 'spotify.com', logoId: 'spotify' },
  { id: 'linkedin', name: 'LinkedIn', site: 'linkedin.com', logoId: 'linkedin' },
  { id: 'snapchat', name: 'Snapchat', site: 'snapchat.com', logoId: 'snapchat' },
  { id: 'pinterest', name: 'Pinterest', site: 'pinterest.com', logoId: 'pinterest' },
  { id: 'twitch', name: 'Twitch', site: 'twitch.tv', logoId: 'twitch' },
  { id: 'steam', name: 'Steam', site: 'steamcommunity.com', logoId: 'steam' },
  { id: 'paypal', name: 'PayPal', site: 'paypal.com', logoId: 'paypal' },
];

type Platform = (typeof POPULAR_PLATFORMS)[0];

type DomainRow = {
  domain: string;
  count: number;
  costUsd: number;
  priceNgn: number;
};

type OrderRow = {
  id: string;
  providerOrderId: string;
  email: string;
  site: string;
  domain: string;
  priceNgn: number;
  status: string;
  message?: string;
  code?: string;
  link?: string;
  createdAt: string;
};

type Tab = 'buy' | 'my-emails';

type Toast = { kind: 'ok' | 'error' | 'funds'; text: string } | null;

function formatNgn(n: number) {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

export function EmailOtpPage({
  onBack,
  session,
  onFund,
}: {
  onBack: () => void;
  session?: AuthSession | null;
  onFund?: () => void;
}) {
  const [tab, setTab] = useState<Tab>('buy');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<Platform | null>(null);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [buyingDomain, setBuyingDomain] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  const vxHeaders = useMemo<Record<string, string>>(() => {
    const h: Record<string, string> = {};
    if (session?.userId) h['x-vx-user'] = session.userId;
    return h;
  }, [session?.userId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR_PLATFORMS;
    return POPULAR_PLATFORMS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.site.toLowerCase().includes(q) ||
        p.id.includes(q),
    );
  }, [query]);

  const loadDomains = useCallback(async (site: string) => {
    setLoading(true);
    setError(null);
    setDomains([]);
    try {
      const res = await fetch(`/api/v1/email-otp/quantity?site=${encodeURIComponent(site)}`, {
        cache: 'no-store',
        headers: vxHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        setError(data.error || 'Failed to load domains');
        return;
      }
      setDomains(Array.isArray(data.domains) ? data.domains : []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [vxHeaders]);

  const fetchOrders = useCallback(async () => {
    if (!session?.userId) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(
        `/api/v1/email-otp/orders?userId=${encodeURIComponent(session?.userId || '')}`,
        { cache: 'no-store', headers: vxHeaders },
      );
      const data = await res.json().catch(() => ({}));
      if (data.ok && Array.isArray(data.orders)) {
        setOrders(data.orders as OrderRow[]);
      }
    } catch {
      /* silent */
    } finally {
      setOrdersLoading(false);
    }
  }, [session?.userId, vxHeaders]);

  useEffect(() => {
    if (tab === 'my-emails') void fetchOrders();
  }, [tab, fetchOrders]);

  // Auto-polling for active waiting orders
  useEffect(() => {
    if (tab !== 'my-emails' || !session?.userId) return;
    const waitingOrders = orders.filter((o) => o.status === 'waiting');
    if (waitingOrders.length === 0) return;

    let stopped = false;
    const pollWaiting = async () => {
      for (const o of waitingOrders) {
        if (stopped) break;
        try {
          const res = await fetch(
            `/api/v1/email-otp/message?orderId=${encodeURIComponent(o.id)}&userId=${encodeURIComponent(session?.userId || '')}`,
            { cache: 'no-store', headers: vxHeaders },
          );
          if (!res.ok || stopped) continue;
          const data = await res.json().catch(() => ({}));
          if (data?.ok && data.status === 'received') {
            setOrders((prev) =>
              prev.map((x) =>
                x.id === o.id
                  ? {
                      ...x,
                      status: 'received',
                      message: data.message || x.message,
                      code: data.code || x.code,
                      link: data.link || x.link,
                    }
                  : x,
              ),
            );
            showToast({
              kind: 'ok',
              text: `OTP received for ${o.email}${data.code ? ': ' + data.code : ''}!`,
            });
          } else if (data?.ok && data.status === 'cancelled') {
            setOrders((prev) =>
              prev.map((x) => (x.id === o.id ? { ...x, status: 'cancelled' } : x)),
            );
            showToast({
              kind: 'funds',
              text: data.note || 'Email session expired. Wallet refunded.',
            });
          }
        } catch {
          /* network blip */
        }
      }
    };

    const timer = setInterval(() => {
      void pollWaiting();
    }, 4500);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [tab, orders, session?.userId, vxHeaders, showToast]);

  const buyDomain = async (d: DomainRow) => {
    if (!selected || !session?.userId) {
      showToast({ kind: 'error', text: 'Sign in to purchase an email address.' });
      return;
    }
    setBuyingDomain(d.domain);
    try {
      const res = await fetch('/api/v1/email-otp/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...vxHeaders },
        body: JSON.stringify({ site: selected.site, domain: d.domain, userId: session?.userId || '' }),
      });
      const data = await res.json().catch(() => ({ ok: false, error: 'Network error' }));
      if (!res.ok || !data.ok) {
        if (res.status === 402) {
          showToast({ kind: 'funds', text: data.error || 'Insufficient wallet balance. Fund your wallet and try again.' });
        } else {
          showToast({ kind: 'error', text: data.error || 'Purchase failed. Try again.' });
        }
        return;
      }
      showToast({ kind: 'ok', text: `Purchased ${data.order.email} for ${formatNgn(data.order.priceNgn)}` });
      setTab('my-emails');
      await fetchOrders();
    } catch {
      showToast({ kind: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBuyingDomain(null);
    }
  };

  const checkInbox = async (o: OrderRow) => {
    if (!session?.userId) return;
    setCheckingId(o.id);
    try {
      const res = await fetch(
        `/api/v1/email-otp/message?orderId=${encodeURIComponent(o.id)}&userId=${encodeURIComponent(session?.userId || '')}`,
        { cache: 'no-store', headers: vxHeaders },
      );
      const data = await res.json().catch(() => ({}));
      if (data?.ok && data.status === 'received') {
        setOrders((prev) =>
          prev.map((x) =>
            x.id === o.id
              ? {
                  ...x,
                  status: 'received',
                  message: data.message || x.message,
                  code: data.code || x.code,
                  link: data.link || x.link,
                }
              : x,
          ),
        );
        showToast({ kind: 'ok', text: `Message received: ${data.code || 'Check details below'}` });
      } else if (data?.ok && data.status === 'waiting') {
        showToast({ kind: 'ok', text: 'Still waiting for email OTP. Trigger the code on the platform now.' });
      } else if (data?.ok && data.status === 'cancelled') {
        setOrders((prev) =>
          prev.map((x) => (x.id === o.id ? { ...x, status: 'cancelled' } : x)),
        );
        showToast({ kind: 'funds', text: data.note || 'Email session expired. Wallet refunded.' });
      } else {
        showToast({ kind: 'error', text: data?.error || 'Could not check the inbox.' });
      }
    } catch {
      showToast({ kind: 'error', text: 'Network error.' });
    } finally {
      setCheckingId(null);
    }
  };

  const cancelOrder = async (o: OrderRow) => {
    if (!session?.userId) return;
    setCancellingId(o.id);
    try {
      const res = await fetch('/api/v1/email-otp/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...vxHeaders },
        body: JSON.stringify({ orderId: o.id, userId: session?.userId || '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        showToast({ kind: 'error', text: data?.error || 'Cancel failed.' });
        return;
      }
      showToast({
        kind: 'ok',
        text: data.refunded
          ? `Cancelled. ${formatNgn(data.priceNgn || o.priceNgn)} refunded to your wallet.`
          : 'Cancelled. Refund processing.',
      });
      await fetchOrders();
    } catch {
      showToast({ kind: 'error', text: 'Network error.' });
    } finally {
      setCancellingId(null);
    }
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const selectPlatform = (p: Platform) => {
    setSelected(p);
    setQuery(p.name);
    setFocused(false);
    void loadDomains(p.site);
  };

  const searchCustomSite = () => {
    const q = query.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '');
    if (!q) return;
    const site = q.includes('.') ? q : `${q}.com`;
    selectPlatform({ id: 'custom', name: site, site });
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery('');
    setDomains([]);
    setError(null);
    inputRef.current?.focus();
  };

  // Close suggestions on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.eotp-search-wrap')) setFocused(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const showList = focused && !selected;
  const typed = query.trim().toLowerCase();
  const typedIsKnown = typed === '' || POPULAR_PLATFORMS.some(
    (p) => p.site.toLowerCase().includes(typed) || p.name.toLowerCase().includes(typed),
  );

  const statusChip = (status: string) => {
    if (status === 'received') return 'received';
    if (status === 'cancelled') return 'cancelled';
    return 'waiting';
  };

  return (
    <div className="eotp-page">
      <header className="eotp-header">
        <button type="button" className="eotp-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="eotp-header-text">
          <p className="eotp-eyebrow">EMAIL OTP</p>
          <h1>Temporary Email</h1>
        </div>
      </header>

      <div className="eotp-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'buy'}
          className={tab === 'buy' ? 'active' : ''}
          onClick={() => setTab('buy')}
        >
          Buy Email
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'my-emails'}
          className={tab === 'my-emails' ? 'active' : ''}
          onClick={() => setTab('my-emails')}
        >
          My Emails
        </button>
      </div>

      {tab === 'buy' ? (
        <>
          <section className="eotp-search-section">
            <label className="eotp-label" htmlFor="eotp-search">
              Select platform
            </label>
            <div className={`eotp-search-wrap${focused && !selected ? ' focused' : ''}`}>
              <Search size={19} className="eotp-search-icon" />
              <input
                id="eotp-search"
                ref={inputRef}
                className="eotp-search-input"
                placeholder={selected ? selected.name : 'Search platform, e.g. Instagram…'}
                value={query}
                autoComplete="off"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFocused(true);
                  if (selected) setSelected(null);
                }}
                onFocus={() => setFocused(true)}
              />
              {query ? (
                <button
                  type="button"
                  className="eotp-clear"
                  aria-label="Clear"
                  onClick={clearSelection}
                >
                  <X size={16} />
                </button>
              ) : null}

              {showList ? (
                <div className="eotp-listbox" role="listbox">
                  {filtered.length > 0 ? (
                    <ul className="eotp-suggestions">
                      {filtered.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="eotp-suggestion"
                            onClick={() => selectPlatform(p)}
                          >
                            <span className="eotp-suggestion-icon">
                              <ServiceLogo id={p.logoId || p.id} name={p.name} />
                            </span>
                            <span className="eotp-suggestion-text">
                              <strong>{p.name}</strong>
                              <small>{p.site}</small>
                            </span>
                            <ChevronRight size={16} className="eotp-chevron" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="eotp-listbox-empty">No matching platform</p>
                  )}
                  {!typedIsKnown ? (
                    <button type="button" className="eotp-suggestion eotp-suggestion-custom" onClick={searchCustomSite}>
                      <span className="eotp-suggestion-icon">
                        <Globe size={18} />
                      </span>
                      <span className="eotp-suggestion-text">
                        <strong>Search “{query.trim()}”</strong>
                        <small>Look up any website domain</small>
                      </span>
                      <ChevronRight size={16} className="eotp-chevron" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {!selected && !focused ? (
              <p className="eotp-search-note">Tap the search bar to pick a platform</p>
            ) : null}
          </section>

          {selected ? (
            <section className="eotp-domains">
              <div className="eotp-domains-head">
                <div className="eotp-selected">
                  <ServiceLogo id={selected.logoId || selected.id} name={selected.name} />
                  <div>
                    <strong>{selected.name}</strong>
                    <small>{selected.site}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="eotp-refresh"
                  disabled={loading}
                  onClick={() => loadDomains(selected.site)}
                  aria-label="Refresh"
                >
                  <RefreshCw size={16} className={loading ? 'spin' : ''} />
                </button>
              </div>

              {loading ? (
                <div className="eotp-state">
                  <Loader2 size={22} className="spin" />
                  <p>Loading available emails…</p>
                </div>
              ) : error ? (
                <div className="eotp-state error">
                  <p>{error}</p>
                  <button type="button" className="eotp-retry" onClick={() => loadDomains(selected.site)}>
                    Try again
                  </button>
                </div>
              ) : domains.length === 0 ? (
                <div className="eotp-state">
                  <Mail size={22} />
                  <p>No domains available for this platform right now.</p>
                </div>
              ) : (
                <ul className="eotp-domain-list">
                  {domains.map((d) => (
                    <li key={d.domain} className={d.count === 0 ? 'sold-out' : ''}>
                      <div className="eotp-domain-main">
                        <span className="eotp-domain-name">@{d.domain}</span>
                        <span className={d.count > 0 ? 'eotp-domain-stock in-stock' : 'eotp-domain-stock'}>
                          {d.count > 0
                            ? `${d.count.toLocaleString()} available`
                            : 'Out of stock'}
                        </span>
                      </div>
                      <div className="eotp-domain-action">
                        <strong className="eotp-price">{formatNgn(d.priceNgn)}</strong>
                        <button
                          type="button"
                          className="eotp-buy"
                          disabled={d.count === 0 || buyingDomain === d.domain}
                          onClick={() => buyDomain(d)}
                        >
                          {buyingDomain === d.domain ? (
                            <Loader2 size={14} className="spin" />
                          ) : (
                            'Buy'
                          )}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </>
      ) : (
        <section className="eotp-my-emails">
          <div className="eotp-my-head">
            <strong>Your email addresses</strong>
            <button type="button" className="eotp-refresh" onClick={() => fetchOrders()} aria-label="Refresh">
              <RefreshCw size={16} className={ordersLoading ? 'spin' : ''} />
            </button>
          </div>

          {ordersLoading && orders.length === 0 ? (
            <div className="eotp-state">
              <Loader2 size={22} className="spin" />
              <p>Loading your emails…</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="eotp-empty">
              <div className="eotp-empty-icon">
                <Inbox size={28} />
              </div>
              <strong>No emails yet</strong>
              <p>Purchase an email address to get started. Your activations will appear here.</p>
              <button type="button" className="eotp-primary" onClick={() => setTab('buy')}>
                Buy an email
              </button>
            </div>
          ) : (
            <ul className="eotp-order-list">
              {orders.map((o) => (
                <li key={o.id} className="eotp-order">
                  <div className="eotp-order-top">
                    <div className="eotp-order-email">
                      <strong>{o.email}</strong>
                      <button
                        type="button"
                        className="eotp-copy-btn"
                        onClick={() => copy(o.email, 'email-' + o.id)}
                        aria-label="Copy email"
                      >
                        {copiedKey === 'email-' + o.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <span className={`eotp-status ${statusChip(o.status)}`}>
                      {o.status === 'received' ? 'Received' : o.status === 'cancelled' ? 'Cancelled' : 'Waiting'}
                    </span>
                  </div>
                  <div className="eotp-order-meta">
                    <span>{o.site}</span>
                    <span>·</span>
                    <span>{formatNgn(o.priceNgn)}</span>
                    {o.status === 'waiting' ? (
                      <>
                        <span>·</span>
                        <span className="eotp-live-indicator">Auto-checking inbox…</span>
                      </>
                    ) : null}
                  </div>

                  {o.code ? (
                    <div className="eotp-otp-card">
                      <div className="eotp-otp-header">
                        <span className="eotp-otp-badge">VERIFICATION CODE</span>
                        <span className="eotp-otp-hint">1-tap copy</span>
                      </div>
                      <div className="eotp-otp-body">
                        <span className="eotp-otp-val">{o.code}</span>
                        <button
                          type="button"
                          className="eotp-otp-copy-btn"
                          onClick={() => copy(o.code || '', 'code-' + o.id)}
                          aria-label="Copy verification code"
                        >
                          {copiedKey === 'code-' + o.id ? <Check size={16} /> : <Copy size={16} />}
                          <span>{copiedKey === 'code-' + o.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {o.link ? (
                    <div className="eotp-link-card">
                      <a
                        href={o.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="eotp-link-btn"
                      >
                        <ExternalLink size={14} />
                        <span>Open Verification Link</span>
                      </a>
                      <button
                        type="button"
                        className="eotp-copy-btn"
                        onClick={() => copy(o.link || '', 'link-' + o.id)}
                        aria-label="Copy verification link"
                      >
                        {copiedKey === 'link-' + o.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  ) : null}

                  {o.message && (!o.code || !o.message.startsWith(o.code)) ? (
                    <div className="eotp-order-msg">
                      <div className="eotp-order-msg-text">{o.message}</div>
                      <button
                        type="button"
                        className="eotp-copy-btn"
                        onClick={() => copy(o.message || '', 'msg-' + o.id)}
                        aria-label="Copy message"
                      >
                        {copiedKey === 'msg-' + o.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  ) : null}

                  {o.status !== 'cancelled' ? (
                    <div className="eotp-order-actions">
                      <button
                        type="button"
                        className="eotp-secondary"
                        disabled={checkingId === o.id}
                        onClick={() => checkInbox(o)}
                      >
                        {checkingId === o.id ? <Loader2 size={14} className="spin" /> : <Mail size={14} />}
                        <span>{o.message ? 'Refresh inbox' : 'Check inbox'}</span>
                      </button>
                      {o.status === 'waiting' ? (
                        <button
                          type="button"
                          className="eotp-cancel-btn"
                          disabled={cancellingId === o.id}
                          onClick={() => cancelOrder(o)}
                        >
                          {cancellingId === o.id ? <Loader2 size={14} className="spin" /> : <X size={14} />}
                          <span>Cancel & refund</span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {toast ? (
        <div className={`eotp-toast ${toast.kind}`}>
          <span>{toast.text}</span>
          {toast.kind === 'funds' && onFund ? (
            <button
              type="button"
              className="eotp-toast-action"
              onClick={() => {
                setToast(null);
                onFund();
              }}
            >
              Fund Wallet
            </button>
          ) : (
            <button type="button" className="eotp-toast-close" onClick={() => setToast(null)} aria-label="Dismiss">
              <X size={14} />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
