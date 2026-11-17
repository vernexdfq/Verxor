'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Check,
  Copy,
  History as HistoryIcon,
  Loader2,
  Mail,
  RefreshCw,
  Zap,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import './email-otp-page.css';

type OrderRow = {
  id: string;
  providerOrderId: string;
  email: string;
  site: string;
  domain: string;
  priceNgn: number;
  status: string;
  message?: string;
  createdAt: string;
};

type Tab = 'activations' | 'history' | 'stats';

function formatNgn(n: number) {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusChip(status: string) {
  if (status === 'received') return 'received';
  if (status === 'cancelled') return 'cancelled';
  return 'waiting';
}

function statusLabel(status: string) {
  if (status === 'received') return 'Received';
  if (status === 'cancelled') return 'Cancelled';
  return 'Waiting';
}

/**
 * Email OTP history — ACTIVATIONS (active emails), HISTORY (all orders),
 * STATISTICS (spend and usage). Fed by the same /api/v1/email-otp/orders
 * data as the "My Emails" tab on the Email OTP page.
 */
export function EmailHistoryPage({
  onBack,
  session,
  onBuy,
}: {
  onBack: () => void;
  session?: AuthSession | null;
  onBuy?: () => void;
}) {
  const [tab, setTab] = useState<Tab>('activations');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const headers = useMemo<Record<string, string>>(() => {
    const h: Record<string, string> = {};
    if (session?.userId) h['x-vx-user'] = session.userId;
    return h;
  }, [session?.userId]);

  const load = useCallback(async () => {
    if (!session?.userId) {
      setError('Sign in required to view your email history.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/email-otp/orders?userId=${encodeURIComponent(session.userId)}`,
        { cache: 'no-store', headers },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Could not load your email history.');
        setOrders([]);
        return;
      }
      setOrders(Array.isArray(data.orders) ? (data.orders as OrderRow[]) : []);
    } catch {
      setError('Network error. Tap refresh to retry.');
    } finally {
      setLoading(false);
    }
  }, [session?.userId, headers]);

  useEffect(() => {
    void load();
  }, [load]);

  const checkInbox = async (o: OrderRow) => {
    if (!session?.userId) return;
    setCheckingId(o.id);
    try {
      const res = await fetch(
        `/api/v1/email-otp/message?orderId=${encodeURIComponent(o.id)}&userId=${encodeURIComponent(session.userId)}`,
        { cache: 'no-store', headers },
      );
      const data = await res.json().catch(() => ({}));
      if (data?.ok && data.status === 'received' && data.message) {
        setOrders((prev) =>
          prev.map((x) => (x.id === o.id ? { ...x, status: 'received', message: String(data.message) } : x)),
        );
      }
    } catch {
      /* silent — user can retry */
    } finally {
      setCheckingId(null);
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

  const active = useMemo(
    () => orders.filter((o) => o.status !== 'cancelled'),
    [orders],
  );

  const stats = useMemo(() => {
    const spent = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.priceNgn) || 0), 0);
    const bySite = new Map<string, number>();
    const byStatus = new Map<string, number>();
    for (const o of orders) {
      const site = o.site || 'other';
      bySite.set(site, (bySite.get(site) || 0) + 1);
      byStatus.set(o.status || 'waiting', (byStatus.get(o.status || 'waiting') || 0) + 1);
    }
    const topSites = Array.from(bySite.entries())
      .map(([site, count]) => ({ site, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    return {
      total: orders.length,
      received: byStatus.get('received') || 0,
      waiting: byStatus.get('waiting') || 0,
      cancelled: byStatus.get('cancelled') || 0,
      spent,
      topSites,
    };
  }, [orders]);

  const renderOrder = (o: OrderRow) => (
    <li key={o.id} className="eotp-order">
      <div className="eotp-order-top">
        <div className="eotp-order-email">
          <strong>{o.email}</strong>
          <button
            type="button"
            className="eotp-copy-btn"
            onClick={() => void copy(o.email, 'email-' + o.id)}
            aria-label="Copy email"
          >
            {copiedKey === 'email-' + o.id ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <span className={`eotp-status ${statusChip(o.status)}`}>{statusLabel(o.status)}</span>
      </div>
      <div className="eotp-order-meta">
        <span>{o.site}</span>
        <span>·</span>
        <span>{formatNgn(o.priceNgn)}</span>
        <span>·</span>
        <span>{formatWhen(o.createdAt)}</span>
      </div>
      {o.message ? (
        <div className="eotp-order-msg">
          <div className="eotp-order-msg-text">{o.message}</div>
          <button
            type="button"
            className="eotp-copy-btn"
            onClick={() => void copy(o.message || '', 'msg-' + o.id)}
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
            onClick={() => void checkInbox(o)}
          >
            {checkingId === o.id ? <Loader2 size={14} className="spin" /> : <Mail size={14} />}
            <span>{o.message ? 'Refresh inbox' : 'Check inbox'}</span>
          </button>
        </div>
      ) : null}
    </li>
  );

  return (
    <div className="eotp-page">
      <header className="eotp-header">
        <button type="button" className="eotp-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="eotp-header-text">
          <p className="eotp-eyebrow">EMAIL OTP</p>
          <h1>Email History</h1>
        </div>
        <button
          type="button"
          className="eotp-copy-btn"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh history"
          style={{ marginLeft: 'auto' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </header>

      <div className="eotp-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'activations'}
          className={tab === 'activations' ? 'active' : ''}
          onClick={() => setTab('activations')}
        >
          Activations
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          className={tab === 'history' ? 'active' : ''}
          onClick={() => setTab('history')}
        >
          History
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stats'}
          className={tab === 'stats' ? 'active' : ''}
          onClick={() => setTab('stats')}
        >
          Statistics
        </button>
      </div>

      {error ? (
        <div className="eotp-state">
          <Mail size={22} />
          <p>{error}</p>
          <button type="button" className="eotp-primary" onClick={() => void load()}>
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="eotp-state">
          <Loader2 size={22} className="spin" />
          <p>Loading your email history…</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="eotp-empty">
          <div className="eotp-empty-icon">
            <Mail size={28} />
          </div>
          <strong>No email activations yet</strong>
          <p>Purchase an email address and every activation will be recorded here.</p>
          {onBuy ? (
            <button type="button" className="eotp-primary" onClick={onBuy}>
              Buy an email
            </button>
          ) : null}
        </div>
      ) : tab === 'activations' ? (
        <section className="eotp-section">
          <p className="eotp-label" style={{ marginBottom: 10 }}>
            <Zap size={13} style={{ verticalAlign: -2 }} /> Active activations — waiting for OTP or
            already received
          </p>
          {active.length === 0 ? (
            <div className="eotp-state">
              <Mail size={20} />
              <p>No active activations. Every email was cancelled.</p>
            </div>
          ) : (
            <ul className="eotp-order-list">{active.map(renderOrder)}</ul>
          )}
        </section>
      ) : tab === 'history' ? (
        <section className="eotp-section">
          <p className="eotp-label" style={{ marginBottom: 10 }}>
            <HistoryIcon size={13} style={{ verticalAlign: -2 }} /> All {orders.length} orders,
            newest first
          </p>
          <ul className="eotp-order-list">{orders.map(renderOrder)}</ul>
        </section>
      ) : (
        <section className="eotp-section">
          <p className="eotp-label" style={{ marginBottom: 10 }}>
            <BarChart3 size={13} style={{ verticalAlign: -2 }} /> Your email OTP usage
          </p>
          <ul className="eotp-order-list">
            <li className="eotp-order">
              <div className="eotp-order-top">
                <div className="eotp-order-email">
                  <strong>Total orders</strong>
                </div>
                <span className="eotp-status received">{stats.total}</span>
              </div>
              <div className="eotp-order-meta">
                <span>Received {stats.received}</span>
                <span>·</span>
                <span>Waiting {stats.waiting}</span>
                <span>·</span>
                <span>Cancelled {stats.cancelled}</span>
              </div>
            </li>
            <li className="eotp-order">
              <div className="eotp-order-top">
                <div className="eotp-order-email">
                  <strong>Total spent</strong>
                </div>
                <span className="eotp-status received">{formatNgn(stats.spent)}</span>
              </div>
              <div className="eotp-order-meta">
                <span>Cancelled orders are refunded and not counted</span>
              </div>
            </li>
            {stats.topSites.length > 0 ? (
              <li className="eotp-order">
                <div className="eotp-order-top">
                  <div className="eotp-order-email">
                    <strong>Top platforms</strong>
                  </div>
                </div>
                <div className="eotp-order-meta">
                  {stats.topSites.map((s) => (
                    <span key={s.site}>
                      {s.site} × {s.count}
                    </span>
                  ))}
                </div>
              </li>
            ) : null}
          </ul>
        </section>
      )}
    </div>
  );
}
