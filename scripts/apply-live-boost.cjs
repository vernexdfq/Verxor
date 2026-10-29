#!/usr/bin/env node
/**
 * Applies live Boost order wiring to src/boost-page.tsx at prebuild.
 * Idempotent: skips if placeBoostOrder already present AND status poll is wired.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'boost-page.tsx');
let text = fs.readFileSync(file, 'utf8');

if (
  text.includes('placeBoostOrder') &&
  text.includes('completionMessage') &&
  text.includes('setInterval') &&
  !text.includes('setTimeout(r, 850)')
) {
  console.log('[apply-live-boost] already live with status poll — skip');
  process.exit(0);
}

// If partially wired from an older apply, reset from mock is not available;
// still try to inject from mock patterns below.

const replacements = [
  {
    from: "import type { AuthSession } from './auth/AuthFlow';\nimport type { BoostPlatform",
    to: "import type { AuthSession } from './auth/AuthFlow';\nimport {\n  placeBoostOrder,\n  cancelBoostOrder,\n  fetchBoostStatus,\n  isJapOrderId,\n  mapJapStatus,\n  completionMessage,\n} from './boost/live-orders';\nimport type { BoostPlatform",
  },
];

if (!text.includes('remains?: number')) {
  text = text.replace(
    `export interface BoostOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  platform: string;
  targetUrl: string;
  quantity: number;
  amount: number;
  status: OrderStatus;
  createdAt: string;
}`,
    `export interface BoostOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  platform: string;
  targetUrl: string;
  quantity: number;
  amount: number;
  status: OrderStatus;
  createdAt: string;
  charge?: string;
  remains?: number;
  startCount?: string;
  currency?: string;
}`,
  );
}

for (const { from, to } of replacements) {
  if (text.includes(from)) text = text.replace(from, to);
}

const mockPlace = `  const handlePlaceOrder = async () => {
    if (!formReady || !selectedService || isInsufficient || submitting) return;
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 850));
      const newOrder: BoostOrder = {
        id:
          'BX-' +
          Math.random().toString(36).substring(2, 7).toUpperCase() +
          Date.now().toString(36).slice(-3).toUpperCase(),
        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        platform: selectedService.platform,
        targetUrl: link.trim(),
        quantity: qtyNum,
        amount: totalAmount,
        status: 'processing',
        createdAt: new Date().toISOString(),
      };
      saveOrders([newOrder, ...orders]);
      setLink('');
      showToast('Order placed successfully! Ref: ' + newOrder.id);
    } catch {
      showToast('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };`;

const livePlace = `  const handlePlaceOrder = async () => {
    if (!formReady || !selectedService || isInsufficient || submitting) return;
    setSubmitting(true);
    try {
      const result = await placeBoostOrder({
        serviceId: selectedService.id,
        link: link.trim(),
        quantity: qtyNum,
      });
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      const ord = result.order;
      const orderId = String(ord?.ref || ord?.providerOrderId || '');
      const newOrder: BoostOrder = {
        id: orderId || \`BX-\${Date.now()}\`,
        serviceId: String(ord?.serviceId || selectedService.id),
        serviceTitle: String(ord?.serviceTitle || selectedService.title),
        platform: String(ord?.platform || selectedService.platform),
        targetUrl: String(ord?.link || link.trim()),
        quantity: Number(ord?.quantity ?? qtyNum),
        amount: Number(ord?.amount ?? totalAmount),
        status: 'processing',
        createdAt: new Date().toISOString(),
      };
      saveOrders([newOrder, ...orders]);
      setLink('');
      showToast(
        ord?.message ||
          ord?.title ||
          \`Boost order was successful — \${newOrder.serviceTitle} × \${formatQty(newOrder.quantity)} for \${formatNaira(newOrder.amount)}\`,
      );
    } catch {
      showToast('Network error — try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (order: BoostOrder) => {
    if (order.status === 'completed' || order.status === 'canceled') return;
    if (!isJapOrderId(order.id)) {
      showToast('This order is local-only and cannot be canceled on the provider');
      return;
    }
    try {
      const result = await cancelBoostOrder({ orderId: order.id, amount: order.amount });
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      saveOrders(
        orders.map((o) => (o.id === order.id ? { ...o, status: 'canceled' as OrderStatus } : o)),
      );
      showToast(result.message || 'Order canceled');
    } catch {
      showToast('Network error — try again');
    }
  };

  const refreshOrderStatuses = useCallback(async () => {
    let current = orders;
    try {
      const raw = localStorage.getItem(BOOST_ORDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) current = parsed;
      }
    } catch {}
    const live = current.filter(
      (o) => isJapOrderId(o.id) && o.status !== 'completed' && o.status !== 'canceled',
    );
    if (!live.length) return;
    const updated = current.map((o) => ({ ...o }));
    let changed = false;
    const newlyCompleted = [];
    await Promise.all(
      live.map(async (o) => {
        const data = await fetchBoostStatus(o.id);
        if (!data.ok) return;
        const idx = updated.findIndex((x) => x.id === o.id);
        if (idx < 0) return;
        const nextStatus = mapJapStatus(data.status);
        const remains =
          data.remains != null && data.remains !== ''
            ? Number(data.remains)
            : updated[idx].remains;
        const prev = updated[idx].status;
        updated[idx] = {
          ...updated[idx],
          status: nextStatus,
          charge: data.charge != null ? String(data.charge) : updated[idx].charge,
          remains: Number.isFinite(remains) ? remains : updated[idx].remains,
          startCount:
            data.startCount != null ? String(data.startCount) : updated[idx].startCount,
          currency: data.currency != null ? String(data.currency) : updated[idx].currency,
        };
        if (prev !== 'completed' && nextStatus === 'completed') newlyCompleted.push(updated[idx]);
        if (prev !== nextStatus || data.remains != null || data.charge != null) changed = true;
      }),
    );
    if (changed) {
      setOrders(updated);
      try {
        localStorage.setItem(BOOST_ORDERS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
    for (const o of newlyCompleted) {
      showToast(completionMessage(o.serviceTitle, o.platform));
    }
  }, [orders, showToast]);

  useEffect(() => {
    void refreshOrderStatuses();
    const t = window.setInterval(() => {
      void refreshOrderStatuses();
    }, 20000);
    return () => window.clearInterval(t);
  }, [refreshOrderStatuses]);`;

if (text.includes(mockPlace)) {
  text = text.replace(mockPlace, livePlace);
} else if (!text.includes('placeBoostOrder')) {
  console.error('[apply-live-boost] mock handlePlaceOrder not found — abort');
  process.exit(1);
}

const oldBtn =
  '          <button type="button" className="boost-refresh-btn" onClick={() => loadCatalog(true)} disabled={refreshing}>';
const newBtn =
  '          <button type="button" className="boost-refresh-btn" onClick={() => { loadCatalog(true); void refreshOrderStatuses(); }} disabled={refreshing}>';
if (text.includes(oldBtn)) text = text.replace(oldBtn, newBtn);

const oldDetails = `                <div className="boost-order-details">
                  <div className="boost-order-detail-item">
                    <span className="boost-order-detail-label">Qty</span>
                    <span className="boost-order-detail-val">{formatQty(o.quantity)}</span>
                  </div>
                  <div className="boost-order-detail-item">
                    <span className="boost-order-detail-label">Amount</span>
                    <span className="boost-order-detail-val">{formatNaira(o.amount)}</span>
                  </div>
                </div>
                <div className="boost-order-footer">
                  <button type="button" className="boost-order-ref" onClick={() => handleCopy(o.id)}>
                    <Copy size={11} /> {o.id}
                  </button>
                  <span className="boost-order-date">
                    {new Date(o.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>`;

const newDetails = `                <div className="boost-order-details">
                  <div className="boost-order-detail-item">
                    <span className="boost-order-detail-label">Qty</span>
                    <span className="boost-order-detail-val">{formatQty(o.quantity)}</span>
                  </div>
                  <div className="boost-order-detail-item">
                    <span className="boost-order-detail-label">Amount</span>
                    <span className="boost-order-detail-val">{formatNaira(o.amount)}</span>
                  </div>
                  {o.remains != null && Number.isFinite(o.remains) && (
                    <div className="boost-order-detail-item">
                      <span className="boost-order-detail-label">Remains</span>
                      <span className="boost-order-detail-val">{formatQty(o.remains)}</span>
                    </div>
                  )}
                  {o.charge != null && o.charge !== '' && (
                    <div className="boost-order-detail-item">
                      <span className="boost-order-detail-label">Charge</span>
                      <span className="boost-order-detail-val">
                        {o.currency === 'USD' || !o.currency ? \`$\${o.charge}\` : o.charge}
                      </span>
                    </div>
                  )}
                </div>
                <div className="boost-order-footer">
                  <button type="button" className="boost-order-ref" onClick={() => handleCopy(o.id)}>
                    <Copy size={11} /> {o.id}
                  </button>
                  {(o.status === 'pending' || o.status === 'processing') && (
                    <button
                      type="button"
                      className="boost-order-ref"
                      style={{ marginLeft: 8, color: '#DC2626' }}
                      onClick={() => handleCancelOrder(o)}
                    >
                      Cancel
                    </button>
                  )}
                  <span className="boost-order-date">
                    {new Date(o.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>`;

if (text.includes(oldDetails)) text = text.replace(oldDetails, newDetails);

fs.writeFileSync(file, text);
console.log('[apply-live-boost] wired live orders into boost-page.tsx (' + text.length + ' bytes)');
