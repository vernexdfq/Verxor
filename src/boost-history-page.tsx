'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Inbox,
  Loader2,
  RefreshCw,

  Info,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import './boost-history-page.css';
import { PlatformMark, type BoostOrder, type OrderStatus } from './boost-page';
import {
  fetchBoostOrders,
  fetchBoostStatus,
  cancelBoostOrder,
  isJapOrderId,
  mapJapStatus,
} from './boost/live-orders';

/** Must match boost-page.tsx so both views share the same order cache. */
const BOOST_ORDERS_STORAGE_KEY = 'verxor_boost_orders_v2';

type HistoryOrder = BoostOrder & { rawStatus?: string };

type StatusFilter = 'all' | OrderStatus;

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'partial', label: 'Partial' },
  { id: 'completed', label: 'Completed' },
  { id: 'canceled', label: 'Cancelled' },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  partial: 'Partial',
  completed: 'Completed',
  canceled: 'Cancelled',
};

function formatNaira(n: number): string {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQty(n: number): string {
  return n.toLocaleString('en-NG');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

/** Display exactly what the provider said when we have the raw string. */
function statusLabel(o: HistoryOrder): string {
  const raw = String(o.rawStatus || '').trim();
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);
  return STATUS_LABEL[o.status] || String(o.status);
}

function readLocalOrders(): HistoryOrder[] {
  try {
    const raw = localStorage.getItem(BOOST_ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryOrder[]) : [];
  } catch {
    return [];
  }
}

export function BoostHistoryPage({
  onBack,
  onNewOrder,
}: {
  onBack: () => void;
  onNewOrder?: () => void;
}) {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const persist = useCallback((next: HistoryOrder[]) => {
    setOrders(next);
    try {
      localStorage.setItem(BOOST_ORDERS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  /** Merge server truth (wallet ledger) with the local cache; newest first. */
  const loadOrders = useCallback(async () => {
    const res = await fetchBoostOrders();
    const local = readLocalOrders();
    if (!res.ok || !Array.isArray(res.orders)) {
      // Honest state: show the real reason instead of a silently empty list.
      setLoadError(res.error || 'Could not load your boost orders right now.');
      if (local.length) {
        setOrders(sortOrders(local));
        setLoadError((res.error || 'Could not load your boost orders right now.') + ' Showing locally saved orders.');
      }
      setLoading(false);
      return;
    }
    setLoadError(null);
    const byId = new Map<string, HistoryOrder>();
    for (const o of local) {
      if (o && String(o.id || '')) byId.set(String(o.id), o);
    }
    for (const o of res.orders) {
      const id = String(o.id || '').trim();
      if (!id) continue;
      const mapped: HistoryOrder = {
        id,
        serviceId: String(o.serviceId || ''),
        serviceTitle: String(o.serviceTitle || 'Boost'),
        platform: String(o.platform || ''),
        targetUrl: String(o.targetUrl || ''),
        quantity: Number(o.quantity || 0),
        amount: Number(o.amount || 0),
        status: mapJapStatus(String(o.status || '')) as OrderStatus,
        createdAt: String(o.createdAt || new Date().toISOString()),
        charge: o.charge,
        remains: o.remains,
        startCount: o.startCount,
        currency: o.currency,
      };
      // Server rows carry live-synced status; local rows keep any raw provider
      // string captured by a manual refresh. Server wins on everything else.
      const prev = byId.get(id);
      byId.set(id, { ...prev, ...mapped, rawStatus: prev?.rawStatus && prev.status === mapped.status ? prev.rawStatus : undefined });
    }
    const merged = sortOrders(Array.from(byId.values()));
    setOrders(merged);
    setLoading(false);
  }, []);

  function sortOrders(list: HistoryOrder[]): HistoryOrder[] {
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const handleCopy = useCallback(
    (text: string) => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        showToast('Copied: ' + text);
      }
    },
    [showToast],
  );

  /** Refresh a single order so its status/remain matches exactly what the provider reports. */
  const refreshOne = useCallback(
    async (order: HistoryOrder) => {
      if (refreshingId) return;
      if (!isJapOrderId(String(order.id))) {
        showToast('This order is local-only; provider status is unavailable');
        return;
      }
      setRefreshingId(String(order.id));
      try {
        const data = await fetchBoostStatus(String(order.id), {
          platform: order.platform,
          serviceTitle: order.serviceTitle,
          quantity: order.quantity,
          link: order.targetUrl,
          amountNgn: order.amount,
          createdAt: order.createdAt,
        });
        if (!data.ok) {
          showToast('Could not refresh status — try again shortly');
          return;
        }
        const next = mapJapStatus(data.status) as OrderStatus;
        const remains =
          data.remains != null && data.remains !== '' ? Number(data.remains) : order.remains;
        persist(
          orders.map((o) =>
            String(o.id) === String(order.id)
              ? {
                  ...o,
                  status: next,
                  rawStatus: data.status != null ? String(data.status) : o.rawStatus,
                  charge: data.charge != null ? String(data.charge) : o.charge,
                  remains: Number.isFinite(remains as number) ? (remains as number) : o.remains,
                  startCount:
                    data.startCount != null ? String(data.startCount) : o.startCount,
                  currency: data.currency != null ? String(data.currency) : o.currency,
                }
              : o,
          ),
        );
        showToast(statusLabel({ ...order, status: next, rawStatus: data.status }));
      } catch {
        showToast('Network error — try again');
      } finally {
        setRefreshingId(null);
      }
    },
    [orders, persist, refreshingId, showToast],
  );

  const refreshAll = useCallback(async () => {
    if (refreshingAll) return;
    setRefreshingAll(true);
    try {
      await loadOrders();
      showToast('Orders refreshed');
    } finally {
      setRefreshingAll(false);
    }
  }, [loadOrders, refreshingAll, showToast]);

  const handleCancel = useCallback(
    async (order: HistoryOrder) => {
      if (order.status === 'completed' || order.status === 'canceled') return;
      if (!isJapOrderId(String(order.id))) {
        showToast('This order is local-only and cannot be canceled on the provider');
        return;
      }
      try {
        const result = await cancelBoostOrder({ orderId: order.id, amount: order.amount, quantity: order.quantity });
        if (!result.ok) {
          showToast(result.error);
          return;
        }
        persist(
          orders.map((o) => (String(o.id) === String(order.id) ? { ...o, status: 'canceled' as OrderStatus } : o)),
        );
        showToast(result.message || 'Order canceled and refunded to your wallet');
      } catch {
        showToast('Network error — try again');
      }
    },
    [orders, persist, showToast],
  );

  return (
    <div className="bh-page">
      <header className="bh-topbar">
        <button type="button" className="bh-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
        <div className="bh-title-wrap">
          <h1 className="bh-title">
            Boost History
            <span className="bh-count-badge">{orders.length}</span>
          </h1>
          <p className="bh-subtitle">All your boost orders and live delivery status</p>
        </div>
        {onNewOrder && (
          <button type="button" className="bh-new-btn" onClick={onNewOrder}>
            New Order
          </button>
        )}
      </header>

      {loadError ? (
        <div className="bh-load-error" role="alert">
          {loadError}
        </div>
      ) : null}

      <div className="bh-toolbar">
        <button type="button" className="bh-refresh-all" onClick={refreshAll} disabled={refreshingAll}>
          <RefreshCw size={13} className={refreshingAll ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bh-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filter === f.id ? 'bh-tab active' : 'bh-tab'}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {counts[f.id] ? <span className="bh-tab-count">{counts[f.id]}</span> : null}
          </button>
        ))}
      </div>

      <div className="bh-list">
        {loading ? (
          <div className="bh-empty">
            <Loader2 size={26} className="spin" />
            <p>Loading your orders…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bh-empty">
            <Inbox size={28} />
            <p>No orders in this view yet.</p>
            {onNewOrder && (
              <button type="button" className="bh-empty-cta" onClick={onNewOrder}>
                Place your first boost
              </button>
            )}
          </div>
        ) : (
          filtered.map((o) => (
            <div key={o.id} className="bh-card">
              <div className="bh-card-head">
                <div className="bh-card-service">
                  <div className="bh-card-icon">
                    <PlatformMark platform={o.platform} size={18} />
                  </div>
                  <span className="bh-card-title">{o.serviceTitle}</span>
                </div>
                <span className={`bh-badge st-${o.status}`}>
                  {o.status === 'completed' ? <CheckCircle2 size={11} /> : null}
                  {statusLabel(o)}
                </span>
              </div>

              <div className="bh-grid">
                <div className="bh-cell">
                  <span className="bh-label">Order ID</span>
                  <button type="button" className="bh-id" onClick={() => handleCopy(o.id)}>
                    <Copy size={10} /> #{o.id}
                  </button>
                </div>
                <div className="bh-cell">
                  <span className="bh-label">Date</span>
                  <span className="bh-value">{formatDate(o.createdAt)}</span>
                </div>
                <div className="bh-cell">
                  <span className="bh-label">Quantity</span>
                  <span className="bh-value">{formatQty(o.quantity)}</span>
                </div>
                <div className="bh-cell">
                  <span className="bh-label">Amount</span>
                  <span className="bh-value">{formatNaira(o.amount)}</span>
                </div>
                {o.startCount != null && o.startCount !== '' && (
                  <div className="bh-cell">
                    <span className="bh-label">Start Count</span>
                    <span className="bh-value">{o.startCount}</span>
                  </div>
                )}
                {o.remains != null && Number.isFinite(o.remains) && (
                  <div className="bh-cell">
                    <span className="bh-label">Remains</span>
                    <span className="bh-value">{formatQty(o.remains as number)}</span>
                  </div>
                )}
              </div>

              {o.targetUrl ? (
                <div className="bh-link-row">
                  <ExternalLink size={12} className="bh-link-icon" />
                  <button type="button" className="bh-link" onClick={() => handleCopy(o.targetUrl)} title={o.targetUrl}>
                    {o.targetUrl}
                  </button>
                </div>
              ) : null}

              <div className="bh-card-actions">
                <button
                  type="button"
                  className="bh-refresh"
                  onClick={() => void refreshOne(o)}
                  disabled={refreshingId === String(o.id) || !isJapOrderId(String(o.id))}
                >
                  {refreshingId === String(o.id) ? (
                    <Loader2 size={12} className="spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  <span>Refresh Status</span>
                </button>
                {(o.status === 'pending' || o.status === 'processing') && (
                  <button type="button" className="bh-cancel" onClick={() => void handleCancel(o)}>
                    <Ban size={12} />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {toast && (
        <div className="bh-toast" role="status">
          <Info size={15} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
