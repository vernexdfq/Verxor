/**
 * Verxor platform admin (operator console)
 * Proper module export so next build / Vercel type-check succeeds.
 */
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  KeyRound,
  LayoutDashboard,
  Lock,
  Percent,
  Plug,
} from 'lucide-react';
import './admin-page.css';

type AdminSection = 'overview' | 'pricing' | 'providers' | 'settings';

type PriceRow = {
  poolId: string;
  title: string;
  region: string;
  tier: string;
  server: number;
  stock: number;
  costUsd: number | null;
  costProvider: string | null;
  retailMarkupPct: number;
  retailUsd: number | null;
  retailNgn: number | null;
  panelMarkupPct: number;
  panelUsd: number | null;
  profitUsd: number | null;
  live: boolean;
  hasOverride: boolean;
};

const SESSION_KEY = 'verxor-admin-ok';
const PASS_KEY = 'verxor-admin-pw';

const NAV: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'pricing', label: 'Pricing', icon: Percent },
  { id: 'providers', label: 'Providers', icon: Plug },
  { id: 'settings', label: 'Settings', icon: KeyRound },
];

const PRICE_PRODUCTS = [
  'whatsapp', 'telegram', 'instagram', 'facebook', 'google', 'tiktok',
  'twitter', 'discord', 'microsoft', 'amazon', 'apple', 'paypal',
];

function panelPriceUsd(cost: number, markupPct: number) {
  return Math.round(cost * (1 + markupPct / 100) * 100) / 100;
}

export function AdminPage({ onBack }: { onBack: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [section, setSection] = useState<AdminSection>('pricing');
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [priceProduct, setPriceProduct] = useState('whatsapp');
  const [priceCountry, setPriceCountry] = useState('usa');
  const [usdNgnRate, setUsdNgnRate] = useState(1600);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [priceSaveMsg, setPriceSaveMsg] = useState('');
  const [priceSaving, setPriceSaving] = useState(false);
  const [providersOnline, setProvidersOnline] = useState<string[]>([]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') setUnlocked(true);
    } catch { /* */ }
  }, []);

  const getAdminPassword = () => {
    try { return sessionStorage.getItem(PASS_KEY) || ''; } catch { return ''; }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean; reason?: string };
      if (!res.ok || !data.ok) {
        setLoginError(data.reason || 'Login failed');
        return;
      }
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
        sessionStorage.setItem(PASS_KEY, password);
      } catch { /* */ }
      setUnlocked(true);
      setPassword('');
    } catch {
      setLoginError('Network error');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(PASS_KEY);
    } catch { /* */ }
    setUnlocked(false);
  };

  const loadPricing = useCallback(async () => {
    setPriceLoading(true);
    setPriceError('');
    setPriceSaveMsg('');
    const pw = getAdminPassword();
    try {
      const q = new URLSearchParams({ password: pw, product: priceProduct, country: priceCountry });
      const res = await fetch(`/api/admin/pricing?${q}`, { cache: 'no-store' });
      const data = (await res.json()) as {
        ok?: boolean; reason?: string; rows?: PriceRow[];
        usdNgnRate?: number; providersOnline?: string[]; scrapeError?: string | null;
      };
      if (!res.ok || !data.ok) {
        setPriceError(data.reason || 'Could not load live rates');
        setPrices([]);
        return;
      }
      setPrices(Array.isArray(data.rows) ? data.rows : []);
      if (typeof data.usdNgnRate === 'number') setUsdNgnRate(data.usdNgnRate);
      setProvidersOnline(Array.isArray(data.providersOnline) ? data.providersOnline : []);
      if (data.scrapeError) setPriceError(`Provider note: ${data.scrapeError}`);
    } catch {
      setPriceError('Network error loading rates');
      setPrices([]);
    } finally {
      setPriceLoading(false);
    }
  }, [priceProduct, priceCountry]);

  useEffect(() => {
    if (section === 'pricing' && unlocked) void loadPricing();
  }, [section, unlocked, loadPricing]);

  const updatePriceField = (
    poolId: string,
    field: 'retailUsd' | 'retailNgn' | 'retailMarkupPct' | 'panelMarkupPct',
    value: number,
  ) => {
    setPrices((rows) =>
      rows.map((r) => {
        if (r.poolId !== poolId) return r;
        const next = { ...r, [field]: value };
        const cost = r.costUsd;
        if (field === 'retailUsd' && Number.isFinite(value)) {
          next.retailNgn = Math.round(value * usdNgnRate);
          if (cost != null && cost > 0) next.retailMarkupPct = Math.round(((value / cost - 1) * 100) * 10) / 10;
          next.profitUsd = cost != null ? Math.round((value - cost) * 100) / 100 : null;
        }
        if (field === 'retailMarkupPct' && cost != null && Number.isFinite(value)) {
          const retail = Math.round(cost * (1 + value / 100) * 100) / 100;
          next.retailUsd = retail;
          next.retailNgn = Math.round(retail * usdNgnRate);
          next.profitUsd = Math.round((retail - cost) * 100) / 100;
        }
        if (field === 'panelMarkupPct' && cost != null && Number.isFinite(value)) {
          next.panelUsd = Math.round(cost * (1 + value / 100) * 100) / 100;
        }
        if (field === 'retailNgn' && Number.isFinite(value) && usdNgnRate > 0) {
          const retail = Math.round((value / usdNgnRate) * 100) / 100;
          next.retailUsd = retail;
          if (cost != null && cost > 0) next.retailMarkupPct = Math.round(((retail / cost - 1) * 100) * 10) / 10;
          next.profitUsd = cost != null ? Math.round((retail - cost) * 100) / 100 : null;
        }
        return next;
      }),
    );
  };

  const savePricing = async () => {
    setPriceSaving(true);
    setPriceSaveMsg('');
    setPriceError('');
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: getAdminPassword(),
          product: priceProduct,
          rows: prices.map((r) => ({
            poolId: r.poolId,
            retailUsd: r.retailUsd,
            retailNgn: r.retailNgn,
            retailMarkupPct: r.retailMarkupPct,
            panelMarkupPct: r.panelMarkupPct,
          })),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; reason?: string; saved?: number; errors?: string[] };
      if (!res.ok || !data.ok) {
        setPriceError(data.reason || data.errors?.[0] || 'Save failed — run supabase/admin_pricing.sql first');
        return;
      }
      setPriceSaveMsg(`Saved ${data.saved ?? prices.length} rows for ${priceProduct}.`);
      void loadPricing();
    } catch {
      setPriceError('Network error while saving');
    } finally {
      setPriceSaving(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="vx-admin-login">
        <form className="vx-admin-login-card" onSubmit={handleLogin}>
          <div className="vx-admin-login-mark"><Lock size={22} /></div>
          <h1>Verxor Admin</h1>
          <p>Operator console. Set <strong>ADMIN_PASSWORD</strong> on Vercel, then sign in.</p>
          <label>
            Password
            <input type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" required />
          </label>
          {loginError ? <div className="vx-admin-login-error">{loginError}</div> : null}
          <button type="submit" disabled={loginBusy}>{loginBusy ? 'Checking…' : 'Enter admin'}</button>
          <button type="button" className="vx-admin-login-back" onClick={onBack}>Back to app</button>
        </form>
      </div>
    );
  }

  return (
    <div className="vx-admin">
      <aside className="vx-admin-side">
        <div className="vx-admin-brand">
          <span className="vx-admin-mark"><img src="/brand/verxor-logo.svg" alt="" width={34} height={34} /></span>
          <div><strong>Verxor Admin</strong><small>Platform operator</small></div>
        </div>
        <nav className="vx-admin-nav" aria-label="Admin sections">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => setSection(id)}>
              <Icon size={18} strokeWidth={section === id ? 2.25 : 1.85} />
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="vx-admin-exit" onClick={handleLogout}><KeyRound size={16} /> Lock admin</button>
        <button type="button" className="vx-admin-exit" onClick={onBack}><ArrowLeft size={16} /> Back to site</button>
      </aside>

      <div className="vx-admin-main">
        <header className="vx-admin-top">
          <div>
            <span className="vx-admin-eyebrow">VERXOR PLATFORM</span>
            <h1>{NAV.find((n) => n.id === section)?.label ?? 'Admin'}</h1>
          </div>
          <div className="vx-admin-badge">Authenticated · session</div>
        </header>

        {section === 'overview' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">
              Open <strong>Pricing</strong> to see live provider costs (USD), set your profit markup, and control
              platform sell prices (USD + NGN) and child-panel rates.
            </p>
          </section>
        )}

        {section === 'pricing' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">
              Live provider cost in <strong>USD</strong>. Set markup or sell price. Sell shows in{' '}
              <strong>USD + NGN</strong>. Panel price = cost × (1 + panel %). Vernex never sees retail.
            </p>
            <div className="vx-admin-card">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
                  Product
                  <select className="vx-admin-input" style={{ maxWidth: 160, height: 40 }}
                    value={priceProduct} onChange={(e) => setPriceProduct(e.target.value)}>
                    {PRICE_PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
                  Region
                  <select className="vx-admin-input" style={{ maxWidth: 140, height: 40 }}
                    value={priceCountry} onChange={(e) => setPriceCountry(e.target.value)}>
                    <option value="usa">USA</option>
                    <option value="worldwide">Worldwide</option>
                  </select>
                </label>
                <div style={{ fontSize: 12, color: '#64748b', paddingBottom: 8 }}>
                  Rate 1 USD = ₦{usdNgnRate}
                  {providersOnline.length > 0
                    ? <> · Online: <strong>{providersOnline.join(', ')}</strong></>
                    : <> · No providers detected (check Vercel keys)</>}
                </div>
                <div className="vx-admin-actions" style={{ marginTop: 0, marginLeft: 'auto' }}>
                  <button type="button" className="vx-admin-primary" disabled={priceLoading} onClick={() => void loadPricing()}>
                    {priceLoading ? 'Loading…' : 'Refresh live rates'}
                  </button>
                  <button type="button" className="vx-admin-primary" disabled={priceSaving || !prices.length} onClick={() => void savePricing()}>
                    {priceSaving ? 'Saving…' : 'Save rate card'}
                  </button>
                </div>
              </div>
            </div>
            {priceError ? <div className="vx-admin-login-error">{priceError}</div> : null}
            {priceSaveMsg ? <p className="vx-admin-note" style={{ color: '#047857', fontWeight: 700 }}>{priceSaveMsg}</p> : null}
            <div className="vx-admin-table-wrap">
              <table className="vx-admin-table">
                <thead>
                  <tr>
                    <th>Pool / tier</th>
                    <th>Stock</th>
                    <th>Provider cost USD</th>
                    <th>Your markup %</th>
                    <th>Sell USD</th>
                    <th>Sell NGN</th>
                    <th>Profit</th>
                    <th>Panel %</th>
                    <th>Panel USD</th>
                  </tr>
                </thead>
                <tbody>
                  {priceLoading && !prices.length ? (
                    <tr><td colSpan={9}>Loading live rates…</td></tr>
                  ) : !prices.length ? (
                    <tr><td colSpan={9}>Click Refresh. Economy / Standard / Fast / Premium rows appear when providers respond.</td></tr>
                  ) : prices.map((row) => (
                    <tr key={row.poolId}>
                      <td>
                        <strong>{row.title}</strong>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Server {row.server}{row.live ? '' : ' · no stock'}</div>
                      </td>
                      <td>{row.stock > 0 ? row.stock : '—'}</td>
                      <td>
                        {row.costUsd != null ? (
                          <><strong>${row.costUsd.toFixed(4)}</strong>
                          {row.costProvider ? <div style={{ fontSize: 11, color: '#94a3b8' }}>{row.costProvider}</div> : null}</>
                        ) : '—'}
                      </td>
                      <td>
                        <input className="vx-admin-input" type="number" step="0.5" value={row.retailMarkupPct}
                          onChange={(e) => updatePriceField(row.poolId, 'retailMarkupPct', Number(e.target.value))} />
                      </td>
                      <td>
                        <input className="vx-admin-input" type="number" step="0.01" value={row.retailUsd ?? ''}
                          onChange={(e) => updatePriceField(row.poolId, 'retailUsd', Number(e.target.value))} />
                      </td>
                      <td>
                        <input className="vx-admin-input" type="number" step="1" value={row.retailNgn ?? ''}
                          onChange={(e) => updatePriceField(row.poolId, 'retailNgn', Number(e.target.value))} />
                      </td>
                      <td>{row.profitUsd != null ? <strong style={{ color: '#047857' }}>${row.profitUsd.toFixed(2)}</strong> : '—'}</td>
                      <td>
                        <input className="vx-admin-input" type="number" step="1" value={row.panelMarkupPct}
                          onChange={(e) => updatePriceField(row.poolId, 'panelMarkupPct', Number(e.target.value))} />
                      </td>
                      <td>
                        <strong>${(row.panelUsd ?? (row.costUsd != null ? panelPriceUsd(row.costUsd, row.panelMarkupPct) : 0)).toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="vx-admin-note">
              Edit markup or Sell USD — NGN and profit update live. Save writes to pool_pricing (run supabase/admin_pricing.sql once).
            </p>
          </section>
        )}

        {section === 'providers' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">Upstream adapters. Keys stay on the server only.</p>
            <div className="vx-admin-table-wrap">
              <table className="vx-admin-table">
                <thead><tr><th>Provider</th><th>Use</th><th>Env</th></tr></thead>
                <tbody>
                  {[
                    ['5sim', 'OTP', 'FIVESIM_API_KEY'],
                    ['PVAPins', 'OTP', 'PVAPINS_API_KEY'],
                    ['GrizzlySMS', 'OTP', 'GRIZZLYSMS_API_KEY'],
                    ['SmsBower', 'OTP', 'SMSBOWER_API_KEY'],
                    ['YOYOMEDIA', 'Boost', 'YOYOMEDIA_API_KEY'],
                    ['AccsZone', 'Logs', 'ACCSZONE_API_KEY'],
                  ].map(([name, use, env]) => (
                    <tr key={name}><td>{name}</td><td>{use}</td><td><code>{env}</code></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === 'settings' && (
          <section className="vx-admin-section">
            <div className="vx-admin-card">
              <ul className="vx-admin-list">
                <li><span>Admin URL</span><em>/admin → /workspace?admin=1</em></li>
                <li><span>ADMIN_PASSWORD</span><em>Vercel secret</em></li>
                <li><span>Pricing SQL</span><em>supabase/admin_pricing.sql</em></li>
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
