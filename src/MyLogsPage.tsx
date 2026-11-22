'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, Copy, Check, Package, RefreshCw, ShoppingBag, Download, ExternalLink } from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionTokens, saveSessionTokens, loadSessionProfile, isSessionUnlocked } from './auth/session-unlock';
import type { AccountOrder } from './accounts-types';
import './product-pages.css';

const money = (value: number) => `₦${value.toLocaleString('en-NG')}`;

export function MyLogsPage({
  onBack,
  session,
}: {
  onBack: () => void;
  session?: AuthSession | null;
}) {
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const load = useCallback(async () => {
    const tokens = loadSessionTokens();
    let token = tokens?.access_token || sessionRef.current?.accessToken || '';
    const profile = loadSessionProfile();
    let userId = sessionRef.current?.userId || profile?.userId || '';

    // Refresh Supabase browser token if needed
    try {
      const { getSupabaseBrowser } = await import('../lib/supabase/client');
      const sb = getSupabaseBrowser();
      if (sb) {
        let { data: sess } = await sb.auth.getSession();
        if (!sess.session && token && tokens?.refresh_token) {
          const { data: refreshed } = await sb.auth
            .setSession({
              access_token: token,
              refresh_token: tokens.refresh_token,
            })
            .catch(() => ({ data: { session: null } }));
          if (refreshed?.session) sess = refreshed;
        }
        if (sess.session?.access_token) {
          token = sess.session.access_token;
          saveSessionTokens({
            access_token: sess.session.access_token,
            refresh_token: sess.session.refresh_token,
          });
        }
        if (sess.session?.user?.id) {
          userId = sess.session.user.id;
        }
      }
    } catch {
      /* ignore */
    }

    if (!token && !userId && !isSessionUnlocked()) {
      setError('Your session has expired. Sign in again to view your logs.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const url = userId
        ? `/api/v1/accounts/orders?userId=${encodeURIComponent(userId)}`
        : '/api/v1/accounts/orders';
      const res = await fetch(url, {
        cache: 'no-store',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Could not load orders');
        setOrders([]);
        return;
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      setError('Network connection error. Tap refresh to retry.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once on open. Further refreshes only happen when the user taps Refresh.
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!copyError) return;
    const t = setTimeout(() => setCopyError(null), 2500);
    return () => clearTimeout(t);
  }, [copyError]);

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setCopyError(null);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
      setCopyError('Copy failed — select the text and copy it manually.');
    }
  }

  return (
    <div className="accounts-page accounts-logs-page" role="main">
      <header className="accounts-header">
        <button
          type="button"
          className="accounts-back-btn"
          onClick={onBack}
          aria-label="Back to listings"
        >
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
        <div className="accounts-header-titles">
          <h1>My Orders</h1>
          <p>Delivered accounts & logs history</p>
        </div>
        <button
          type="button"
          className="accounts-refresh-btn"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh orders"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} strokeWidth={2.2} />
          <span>Refresh</span>
        </button>
      </header>

      <div className="accounts-logs-body">
        {copyError && (
          <p className="accounts-catalog-hint" role="status">
            {copyError}
          </p>
        )}

        {loading && (
          <div className="accounts-empty">
            <Package size={26} />
            <strong>Loading your orders…</strong>
            <p>Fetching delivered credentials from secure storage.</p>
          </div>
        )}

        {!loading && error && (
          <div className="accounts-empty accounts-empty-error">
            <Package size={26} />
            <strong>{error}</strong>
            <button type="button" className="detail-order-btn" style={{ minHeight: 38, width: 'auto', padding: '0 16px', marginTop: 8 }} onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="accounts-empty">
            <ShoppingBag size={28} />
            <strong>No orders yet</strong>
            <p>Purchased accounts and aged logs will appear here instantly after delivery.</p>
          </div>
        )}

        {!loading &&
          orders.map((o) => (
            <article key={o.id} className="delivery-card" style={{ margin: '0 0 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <div className="delivery-success-badge">
                  <Check size={14} />
                  <span>{o.status || 'Delivered'}</span>
                </div>
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                  #{o.id.slice(0, 8)}
                </span>
              </div>

              <h2 className="delivery-title" style={{ fontSize: 16 }}>
                {o.title}
              </h2>
              <p className="delivery-sub">
                {o.platform} · Qty {o.quantity} · {money(o.total_ngn)} ·{' '}
                {o.created_at ? new Date(o.created_at).toLocaleString('en-NG') : ''}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, margin: '10px 0 6px' }}>
                <button
                  type="button"
                  className="account-download-btn"
                  style={{ padding: '6px 10px', fontSize: 11 }}
                  onClick={() =>
                    downloadCredentialsTxt(
                      o.id,
                      o.platform,
                      o.title,
                      o.credentials || [],
                    )
                  }
                  title="Download credentials as .txt file"
                >
                  <Download size={13} />
                  <span>Download (.txt)</span>
                </button>
                <button
                  type="button"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #dbe3ef', background: '#fff', color: '#334155', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => void copyText((o.credentials || []).join('\n'), `all-${o.id}`)}
                >
                  {copied === `all-${o.id}` ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied === `all-${o.id}` ? 'Copied' : 'Copy all'}</span>
                </button>
              </div>

              <div className="delivery-creds">
                {(o.credentials || []).map((line, i) => (
                  <div key={`${o.id}-${i}`} className="delivery-cred-row">
                    <code>{line}</code>
                    <button
                      type="button"
                      className="delivery-copy-btn"
                      onClick={() => void copyText(line, `${o.id}-${i}`)}
                    >
                      {copied === `${o.id}-${i}` ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied === `${o.id}-${i}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                <span>✓ 24-hour replacement coverage</span>
                {o.downloadUrl && (
                  <a
                    href={o.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#382080', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
                  >
                    <span>Direct file</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}
