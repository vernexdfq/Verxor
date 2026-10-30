#!/usr/bin/env node
/**
 * Downloads known-good apply-live-boost from e3a481d, runs it, then patches status poll.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const real = path.join(dir, '_apply_from_e3.cjs');
const url =
  'https://raw.githubusercontent.com/vernexdfq/Verxor/e3a481d7a05590c83ba57378f944f09abb6f447e/scripts/apply-live-boost.cjs';

try {
  execSync(`curl -fsSL "${url}" -o "${real}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('[apply-live-boost] failed to download e3 apply script');
  process.exit(1);
}

require(real);

// --- status patch on the wired page ---
const page = path.join(dir, '..', 'src', 'boost-page.tsx');
let text = fs.readFileSync(page, 'utf8');
if (!text.includes('placeBoostOrder')) {
  console.error('[status-patch] page not live-wired');
  process.exit(1);
}

if (text.includes('doneTitles') && text.includes('setInterval')) {
  console.log('[status-patch] already has status poll — skip');
  process.exit(0);
}

const oldRefresh = `  const refreshOrderStatuses = async () => {
    const live = orders.filter(
      (o) => isJapOrderId(o.id) && o.status !== 'completed' && o.status !== 'canceled',
    );
    if (!live.length) return;
    const updated = [...orders];
    let changed = false;
    await Promise.all(
      live.map(async (o) => {
        const data = await fetchBoostStatus(o.id);
        if (!data.ok) return;
        const idx = updated.findIndex((x) => x.id === o.id);
        if (idx < 0) return;
        const remains =
          data.remains != null && data.remains !== ''
            ? Number(data.remains)
            : updated[idx].remains;
        updated[idx] = {
          ...updated[idx],
          status: mapJapStatus(data.status),
          charge: data.charge != null ? String(data.charge) : updated[idx].charge,
          remains: Number.isFinite(remains) ? remains : updated[idx].remains,
          startCount:
            data.startCount != null ? String(data.startCount) : updated[idx].startCount,
          currency: data.currency != null ? String(data.currency) : updated[idx].currency,
        };
        changed = true;
      }),
    );
    if (changed) saveOrders(updated);
  };`;

const newRefresh = `  const refreshOrderStatuses = async () => {
    let current: BoostOrder[] = orders;
    try {
      const raw = localStorage.getItem(BOOST_ORDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) current = parsed as BoostOrder[];
      }
    } catch {}
    const live = current.filter(
      (o) => isJapOrderId(String(o.id)) && o.status !== 'completed' && o.status !== 'canceled',
    );
    if (!live.length) return;
    const updated = current.map((o) => ({ ...o }));
    let changed = false;
    const doneTitles: string[] = [];
    await Promise.all(
      live.map(async (o) => {
        const data = await fetchBoostStatus(String(o.id));
        if (!data.ok) return;
        const idx = updated.findIndex((x) => String(x.id) === String(o.id));
        if (idx < 0) return;
        const prev = updated[idx].status;
        const next = mapJapStatus(data.status);
        const remains =
          data.remains != null && data.remains !== ''
            ? Number(data.remains)
            : updated[idx].remains;
        updated[idx] = {
          ...updated[idx],
          status: next,
          charge: data.charge != null ? String(data.charge) : updated[idx].charge,
          remains: Number.isFinite(remains as number) ? (remains as number) : updated[idx].remains,
          startCount:
            data.startCount != null ? String(data.startCount) : updated[idx].startCount,
          currency: data.currency != null ? String(data.currency) : updated[idx].currency,
        };
        if (prev !== next || data.remains != null || data.charge != null) changed = true;
        if (prev !== 'completed' && next === 'completed') {
          doneTitles.push(String(updated[idx].serviceTitle || 'Boost'));
        }
      }),
    );
    if (changed) saveOrders(updated);
    for (const title of doneTitles) {
      const short = title.length > 40 ? title.slice(0, 37) + '…' : title;
      showToast('Your ' + short + ' order has been completed');
    }
  };

  useEffect(() => {
    void refreshOrderStatuses();
    const id = window.setInterval(() => {
      void refreshOrderStatuses();
    }, 15000);
    return () => window.clearInterval(id);
  }, []);`;

if (!text.includes(oldRefresh)) {
  console.error('[status-patch] refresh block not found — abort');
  process.exit(1);
}
text = text.replace(oldRefresh, newRefresh);
fs.writeFileSync(page, text);
console.log('[status-patch] added JAP Completed poll + toast (' + text.length + ' bytes)');
