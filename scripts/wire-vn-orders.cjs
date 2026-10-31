#!/usr/bin/env node
/**
 * Wire VirtualNumbersPage to load My Orders from GET /api/v1/numbers/orders
 * so history comes back from vn_orders (not only localStorage).
 */
const fs = require('fs');
const path = require('path');
const page = path.join(__dirname, '..', 'src', 'virtual-numbers-page.tsx');
if (!fs.existsSync(page)) {
  console.error('[wire-vn-orders] page missing');
  process.exit(1);
}
let text = fs.readFileSync(page, 'utf8');
if (text.includes('loadOrdersFromServer') && text.includes('/api/v1/numbers/orders')) {
  console.log('[wire-vn-orders] already wired');
  process.exit(0);
}

const marker = "const [inboxOrder, setInboxOrder] = useState<CustomerNumberOrder | null>(null);";
if (!text.includes(marker)) {
  console.error('[wire-vn-orders] inboxOrder marker not found');
  process.exit(1);
}

const inject = `const [inboxOrder, setInboxOrder] = useState<CustomerNumberOrder | null>(null);

  const loadOrdersFromServer = async () => {
    try {
      const tokens = loadSessionTokens();
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (tokens?.access_token) headers.Authorization = \`Bearer \${tokens.access_token}\`;
      const res = await fetch('/api/v1/numbers/orders', { headers, cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        orders?: CustomerNumberOrder[];
      };
      if (!data.ok || !Array.isArray(data.orders) || data.orders.length === 0) return;
      setLocalOrders((prev) => {
        const byKey = new Map<string, CustomerNumberOrder>();
        for (const o of prev) {
          const k = String(o.providerOrderId || o.id || o.number);
          if (k) byKey.set(k, o);
        }
        for (const o of data.orders!) {
          const k = String(o.providerOrderId || o.id || o.number);
          if (!k) continue;
          const existing = byKey.get(k);
          if (existing) {
            byKey.set(k, {
              ...o,
              ...existing,
              status: existing.status === 'received' || existing.status === 'completed' ? existing.status : o.status,
              otp: existing.otp || o.otp,
              providerOrderId: existing.providerOrderId || o.providerOrderId,
            });
          } else {
            byKey.set(k, o);
          }
        }
        const merged = Array.from(byKey.values()).sort((a, b) =>
          String(b.createdAt).localeCompare(String(a.createdAt)),
        );
        try {
          localStorage.setItem('verxor-vn-orders', JSON.stringify(merged));
        } catch {}
        return merged;
      });
    } catch (e) {
      console.warn('[vn] loadOrdersFromServer failed', e);
    }
  };

  useEffect(() => {
    void loadOrdersFromServer();
  }, [session?.authenticated]);`;

text = text.replace(marker, inject);
fs.writeFileSync(page, text);
console.log('[wire-vn-orders] wired server history (' + text.length + ' bytes)');
