'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  Package,
  RefreshCw,
  ShoppingBag,
  Download,
  ExternalLink,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionTokens, saveSessionTokens, loadSessionProfile, isSessionUnlocked } from './auth/session-unlock';
import type { AccountOrder } from './accounts-types';
import { downloadCredentialsTxt } from './accounts-client-download';
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
            <button
              type="button"
              className="detail-order-btn"
              style={{ minHeight: 38, width: 'auto', padding: '0 16px', marginTop: 8 }}
              onClick={() => void load()}
            >
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
          orders.map((o) => {
            const has2fa = (o.credentials || []).some(
              (c) => c.split(':').length >= 3 || /2fa/i.test(c),
            );
            return (
              <article key={o.id} className="delivery-card">
                {/* Header: Status badge, platform tag, reference ID */}
                <div className="delivery-card-header">
                  <div className="delivery-card-badges">
                    <span className="delivery-success-badge">
                      <Check size={12} strokeWidth={2.8} />
                      <span>{o.status || 'Delivered'}</span>
                    </span>
                    {o.platform && (
                      <span className="delivery-platform-tag">{o.platform}</span>
                    )}
                  </div>
                  <span className="delivery-ref-id" title="Order reference">
                    #{o.id.slice(0, 8)}
                  </span>
                </div>

                {/* Title */}
                <h2 className="delivery-title">{o.title}</h2>

                {/* Meta row: Qty, Total NGN, Date */}
                <div className="delivery-meta-row">
                  <span className="delivery-meta-item">
                    Qty: <strong>{o.quantity}</strong>
                  </span>
                  <span className="delivery-meta-dot">•</span>
                  <span className="delivery-meta-item delivery-meta-amount">
                    {money(o.total_ngn)}
                  </span>
                  {o.created_at && (
                    <>
                      <span className="delivery-meta-dot">•</span>
                      <span className="delivery-meta-date">
                        {new Date(o.created_at).toLocaleString('en-NG', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </>
                  )}
                </div>

                {/* Action Toolbar: Heading + Download (.txt) & Copy all buttons */}
                <div className="delivery-toolbar">
                  <div className="delivery-toolbar-label">
                    <KeyRound size={13} />
                    <span>
                      Delivered credentials ({o.credentials?.length || 1})
                    </span>
                  </div>
                  <div className="delivery-toolbar-actions">
                    <button
                      type="button"
                      className="delivery-action-btn delivery-btn-primary"
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
                      className="delivery-action-btn delivery-btn-secondary"
                      onClick={() =>
                        void copyText((o.credentials || []).join('\n'), `all-${o.id}`)
                      }
                      title="Copy all credentials to clipboard"
                    >
                      {copied === `all-${o.id}` ? (
                        <Check size={13} strokeWidth={2.4} />
                      ) : (
                        <Copy size={13} strokeWidth={2.4} />
                      )}
                      <span>{copied === `all-${o.id}` ? 'Copied all' : 'Copy all'}</span>
                    </button>
                  </div>
                </div>

                {/* Credentials list: each row in its own dark console row with a dedicated, non-wrapping Copy button */}
                <div className="delivery-creds">
                  {(o.credentials || []).map((line, i) => {
                    const isCopied = copied === `${o.id}-${i}`;
                    return (
                      <div key={`${o.id}-${i}`} className="delivery-cred-row">
                        <code className="delivery-cred-code">{line}</code>
                        <button
                          type="button"
                          className={`delivery-copy-btn ${isCopied ? 'copied' : ''}`}
                          onClick={() => void copyText(line, `${o.id}-${i}`)}
                          aria-label={`Copy account ${i + 1}`}
                          title="Copy account credentials"
                        >
                          {isCopied ? (
                            <Check size={13} strokeWidth={2.4} />
                          ) : (
                            <Copy size={13} strokeWidth={2.4} />
                          )}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Optional 2FA tip */}
                {has2fa && (
                  <div className="delivery-2fa-tip">
                    <span>💡 Format: login:password[:2fa] • Generate 2FA codes at </span>
                    <a
                      href="https://2fa.live"
                      target="_blank"
                      rel="noreferrer"
                      className="delivery-2fa-link"
                    >
                      2fa.live
                    </a>
                  </div>
                )}

                {/* Footer: Replacement coverage + Direct file link */}
                <div className="delivery-card-footer">
                  <span className="delivery-guarantee">
                    <ShieldCheck size={13} />
                    <span>24-hour replacement coverage</span>
                  </span>
                  {o.downloadUrl && (
                    <a
                      href={o.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="delivery-direct-link"
                    >
                      <span>Direct file</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
      </div>
    </div>
  );
}
