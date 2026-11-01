'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Check, Package, RefreshCw } from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionTokens } from './auth/session-unlock';
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

  async function load() {
    if (!session) {
      setError('Sign in to view your logs.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      const tok = loadSessionTokens()?.access_token;
      if (tok) headers.Authorization = `Bearer ${tok}`;
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
      setError('Network error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.contact]);

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
    <div className="detail-page" role="main">
      <header className="detail-page-top">
        <button type="button" className="detail-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
          <span>My Logs</span>
        </button>
        <button
          type="button"
          className="detail-page-wallet"
          onClick={() => void load()}
          aria-label="Refresh"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </header>

      <div className="detail-page-body">
        {loading && (
          <div className="accounts-empty">
            <Package size={22} />
            <strong>Loading purchases…</strong>
          </div>
        )}

        {!loading && error && (
          <div className="accounts-empty">
            <Package size={22} />
            <strong>{error}</strong>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="accounts-empty">
            <Package size={22} />
            <strong>No purchases yet</strong>
            <p>Bought accounts will appear here after delivery.</p>
          </div>
        )}

        {!loading &&
          orders.map((o) => (
            <article key={o.id} className="delivery-card" style={{ margin: '0 0 14px' }}>
              <div className="delivery-success-badge">
                <Check size={14} />
                <span>{o.status}</span>
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
