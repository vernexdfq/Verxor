#!/usr/bin/env node
/**
 * Restore boost-page from known-good 2fb43fb if placeholder/corrupt,
 * then wire loadOrdersFromServer → fetchBoostOrders so My Orders persists,
 * and prefer JAP providerOrderId on place.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const page = path.join(__dirname, '..', 'src', 'boost-page.tsx');
const GOOD =
  'https://raw.githubusercontent.com/vernexdfq/Verxor/2fb43fbfa1e2341b9165cd09ceaa62ec5a759bc7/src/boost-page.tsx';

function isBad(text) {
  if (!text || text.length < 5000) return true;
  if (text.includes('PLACEHOLDER')) return true;
  if (!text.includes('export function BoostPage')) return true;
  return false;
}

let text = fs.existsSync(page) ? fs.readFileSync(page, 'utf8') : '';
if (isBad(text)) {
  console.log('[wire-boost-orders] restoring boost-page from 2fb43fb...');
  execSync(`curl -fsSL "${GOOD}" -o "${page}"`, { stdio: 'inherit' });
  text = fs.readFileSync(page, 'utf8');
  if (isBad(text)) {
    console.error('[wire-boost-orders] restore failed');
    process.exit(1);
  }
}

const oldImport = `import {
  placeBoostOrder,
  cancelBoostOrder,
  fetchBoostStatus,
  isJapOrderId,
  mapJapStatus,
} from './boost/live-orders';`;

const newImport = `import {
  placeBoostOrder,
  cancelBoostOrder,
  fetchBoostStatus,
  fetchBoostOrders,
  isJapOrderId,
  mapJapStatus,
} from './boost/live-orders';`;

if (text.includes(oldImport)) {
  text = text.replace(oldImport, newImport);
} else if (!text.includes('fetchBoostOrders')) {
  if (text.includes('fetchBoostStatus,\n  isJapOrderId,')) {
    text = text.replace('fetchBoostStatus,\n  isJapOrderId,', 'fetchBoostStatus,\n  fetchBoostOrders,\n  isJapOrderId,');
  }
}

if (!text.includes('loadOrdersFromServer')) {
  const oldLoad = `  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOST_ORDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setOrders(parsed);
      }
    } catch {}
  }, []);

  const saveOrders = useCallback((newOrders: BoostOrder[]) => {
    setOrders(newOrders);
    try {
      localStorage.setItem(BOOST_ORDERS_STORAGE_KEY, JSON.stringify(newOrders));
    } catch {}
  }, []);
`;

  const newLoad = `  const saveOrders = useCallback((newOrders: BoostOrder[]) => {
    setOrders(newOrders);
    try {
      localStorage.setItem(BOOST_ORDERS_STORAGE_KEY, JSON.stringify(newOrders));
    } catch {}
  }, []);

  /** Merge server truth with local cache so past + current orders never disappear. */
  const loadOrdersFromServer = useCallback(async () => {
    let local: BoostOrder[] = [];
    try {
      const raw = localStorage.getItem(BOOST_ORDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) local = parsed as BoostOrder[];
      }
    } catch {}
    if (local.length) setOrders(local);

    const remote = await fetchBoostOrders();
    if (!remote.ok) {
      if (local.length) setOrders(local);
      return;
    }
    if (!remote.orders.length) {
      if (local.length) setOrders(local);
      return;
    }

    const byId = new Map<string, BoostOrder>();
    for (const o of remote.orders) {
      const id = String(o.id || '').trim();
      if (!id) continue;
      byId.set(id, {
        id,
        serviceId: String(o.serviceId || ''),
        serviceTitle: String(o.serviceTitle || 'Boost'),
        platform: String(o.platform || ''),
        targetUrl: String(o.targetUrl || ''),
        quantity: Number(o.quantity) || 0,
        amount: Number(o.amount) || 0,
        status: mapJapStatus(o.status) as OrderStatus,
        createdAt: String(o.createdAt || new Date().toISOString()),
        charge: o.charge != null ? String(o.charge) : undefined,
        remains: o.remains != null ? Number(o.remains) : undefined,
        startCount: o.startCount != null ? String(o.startCount) : undefined,
        currency: o.currency != null ? String(o.currency) : 'NGN',
      });
    }
    for (const o of local) {
      const id = String(o.id || '').trim();
      if (!id || byId.has(id)) continue;
      byId.set(id, o);
    }
    const merged = Array.from(byId.values()).sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    );
    saveOrders(merged);
  }, [saveOrders]);

  useEffect(() => {
    void loadOrdersFromServer();
  }, [loadOrdersFromServer]);
`;

  if (text.includes(oldLoad)) {
    text = text.replace(oldLoad, newLoad);
  } else {
    console.warn('[wire-boost-orders] load block not found — may already be custom');
  }
}

const oldPlaceId = "const orderId = String(ord?.ref || ord?.providerOrderId || '');";
const newPlaceId = "const orderId = String(ord?.providerOrderId ?? ord?.ref ?? '');";
if (text.includes(oldPlaceId)) {
  text = text.replace(oldPlaceId, newPlaceId);
}

const oldBtn = `onClick={() => { loadCatalog(true); void refreshOrderStatuses(); }}`;
const newBtn = `onClick={() => { loadCatalog(true); void loadOrdersFromServer(); void refreshOrderStatuses(); }}`;
if (text.includes(oldBtn) && text.includes('loadOrdersFromServer')) {
  text = text.replace(oldBtn, newBtn);
}

if (text.includes('PLACEHOLDER') || text.includes('ratePer1000Ngn')) {
  console.error('[wire-boost-orders] bad markers in output');
  process.exit(1);
}

fs.writeFileSync(page, text);
console.log('[wire-boost-orders] wired durable My Orders + JAP status (' + text.length + ' bytes)');
