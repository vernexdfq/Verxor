'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Copy, Check, Package, RefreshCw, ShoppingBag } from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionTokens, isSessionUnlocked } from './auth/session-unlock';
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

  const load = useCallback(async () => {
    const tokens = loadSessionTokens();
    const token = tokens?.access_token;
    if (!token && !session && !isSessionUnlocked()) {
      setError('Your session has expired. Sign in again to view your logs.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/v1/accounts/orders', {
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
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
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
            <article key={o.id} className="delivery-card" style={{ margin: '0 0 14px' }}>
              <div className="delivery-success-badge">
                <Check size={14} />
                <span>{o.status || 'Delivered'}</span>
              </div>
              <h2 className="delivery-title" style={{ fontSize: 16 }}>
                {o.title}
              </h2>
              <p className="delivery-sub">
                {o.platform} · Qty {o.quantity} · {money(o.total_ngn)} ·{' '}
                {o.created_at ? new Date(o.created_at).toLocaleString() : ''}
              </p>
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
            </article>
          ))}
      </div>
    </div>
  );
}
