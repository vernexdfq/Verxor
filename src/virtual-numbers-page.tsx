'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Copy,
  Database,
  Info,
  Radio,
  Search,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import './virtual-numbers-page.css';
import type { AuthSession } from './auth/AuthFlow';
import {
  type CustomerNumberOrder,
  type Pool,
  type Service,
  type Country,
  type ServiceCategory,
  type PriceOption,
  type Step,
  SERVER1_POOLS,
  SERVER2_POOLS,
  USA_COUNTRY,
  WORLDWIDE_COUNTRIES,
  SERVICES,
  CATEGORIES,
  PROMO_SLIDES,
  LIFETIME_MS,
  CANCEL_LOCK_MS,
  formatNgn,
  formatUsd,
  formatTimer,
} from './virtual-numbers-data';
import { ServiceLogo, PoolCard } from './virtual-numbers-components';
import { loadSessionTokens, loadSessionProfile } from './auth/session-unlock';

export type { CustomerNumberOrder };

const SVC_TTL_MS = 24 * 60 * 60 * 1000;
const CTR_TTL_MS = 15 * 60 * 1000;

function readCache<T>(key: string, ttlMs: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - ts > ttlMs) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

function mapServices(raw: any[]): Service[] {
  return (raw || []).map((s: any) => ({
    id: s.code || s.id,
    name: s.name,
    category: (s.category || 'other') as ServiceCategory,
    logoId: s.logoId || s.code || s.id,
  }));
}

export function VirtualNumbersPage({
  onBack,
  onOpenNotifications: _onOpenNotifications,
  orders: externalOrders = [],
  session,
}: {
  onBack: () => void;
  onOpenNotifications: () => void;
  orders?: CustomerNumberOrder[];
  session?: AuthSession | null;
}) {
  const [step, setStep] = useState<Step>('pools');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [category, setCategory] = useState<ServiceCategory>('all');
  const [serviceQuery, setServiceQuery] = useState('');
  const [countryQuery, setCountryQuery] = useState('');
  const [liveServices, setLiveServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [liveCountries, setLiveCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);
  const balance = session?.balanceNgn ?? 0;
  const [localOrders, setLocalOrders] = useState<CustomerNumberOrder[]>(() => {
    if (externalOrders && externalOrders.length > 0) return externalOrders;
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('verxor-vn-orders');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CustomerNumberOrder[];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((o) => {
        if (o.cancelAvailableAt && o.cancelAvailableAt > 0) return o;
        const created = o.createdAt ? new Date(o.createdAt).getTime() : Date.now();
        return { ...o, cancelAvailableAt: created + CANCEL_LOCK_MS };
      });
    } catch {
      return [];
    }
  });
  const [inboxOrder, setInboxOrder] = useState<CustomerNumberOrder | null>(null);
  const [priceSheet, setPriceSheet] = useState<{
    open: boolean;
    options: PriceOption[];
    service: Service;
    country: Country;
    pool: Pool;
  } | null>(null);
  const [confirmSheet, setConfirmSheet] = useState<{
    option: PriceOption;
    service: Service;
    country: Country;
    pool: Pool;
  } | null>(null);
  const [, setTick] = useState(0);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  // Poll status every 4 seconds for any order waiting for SMS
  useEffect(() => {
    const waitingOrders = localOrders.filter((o) => o.status === 'waiting');
    if (waitingOrders.length === 0) return;

    let cancelled = false;
    const interval = setInterval(() => {
      waitingOrders.forEach(async (order) => {
        try {
          const provider = order.provider || 'grizzly';
          const providerOrderId = order.providerOrderId || order.id;
          const res = await fetch(
            `/api/v1/numbers/status?provider=${encodeURIComponent(provider)}&providerOrderId=${encodeURIComponent(providerOrderId)}&orderId=${encodeURIComponent(order.id)}`
          );
          if (!res.ok) return;
          const data = await res.json();
          if (cancelled) return;
          if (data.ok && data.status === 'received' && data.otp) {
            setLocalOrders((prev) =>
              prev.map((x) =>
                x.id === order.id
                  ? { ...x, status: 'received', otp: data.otp }
                  : x,
              ),
            );
            setCopyToast(`SMS received for ${order.service}: ${data.otp}`);
          }
        } catch {
          /* ignore poll errors */
        }
      });
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [localOrders]);
  const [cancellingIds, setCancellingIds] = useState<Record<string, boolean>>({});
  const ordersRef = useRef(localOrders);
  ordersRef.current = localOrders;
  const cancellingRef = useRef(cancellingIds);
  cancellingRef.current = cancellingIds;

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let stopped = false;
    const pollOnce = async () => {
      const waiting = ordersRef.current.filter(
        (o) =>
          o.status === 'waiting' &&
          Boolean(o.providerOrderId) &&
          !cancellingRef.current[o.id],
      );
      for (const o of waiting) {
        if (stopped) return;
        try {
          const params = new URLSearchParams({
            provider: (o.provider || 'grizzly').toLowerCase(),
            providerOrderId: String(o.providerOrderId),
            orderId: o.id,
          });
          const res = await fetch(`/api/v1/numbers/status?${params.toString()}`, {
            cache: 'no-store',
          });
          const data = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            otp?: string | null;
            status?: string;
          };
          if (!data.ok) continue;
          if (data.otp) {
            setLocalOrders((prev) =>
              prev.map((x) =>
                x.id === o.id
                  ? { ...x, status: 'completed' as const, otp: String(data.otp) }
                  : x,
              ),
            );
            setCopyToast(`OTP received: ${data.otp}`);
          }
        } catch {
          /* network blip */
        }
      }
    };
    void pollOnce();
    const id = setInterval(() => {
      void pollOnce();
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('verxor-vn-orders', JSON.stringify(localOrders));
    } catch {}
  }, [localOrders]);

  useEffect(() => {
    const t = setInterval(() => setPromoIndex((i) => (i + 1) % PROMO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const allPools = [...SERVER1_POOLS, ...SERVER2_POOLS];
    allPools.forEach((pool) => {
      const key = `verxor-vn-svc-v2-${pool.id}`;
      if (readCache<Service[]>(key, SVC_TTL_MS)) return;
      void fetch(`/api/v1/catalog?mode=services&pool=${encodeURIComponent(pool.id)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) writeCache(key, mapServices(data.services || []));
        })
        .catch(() => {});
    });
  }, []);

  async function requestCancelAndRefund(o: CustomerNumberOrder): Promise<{
    ok: boolean;
    refunded: boolean;
    earlyDenied?: boolean;
    error?: string;
  }> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let token = loadSessionTokens()?.access_token || '';
      try {
        const { getSupabaseBrowser } = await import('../lib/supabase/client');
        const sb = getSupabaseBrowser();
        if (sb) {
          const { data: { session: s } } = await sb.auth.getSession();
          if (s?.access_token) token = s.access_token;
        }
      } catch {}
      if (token) headers.Authorization = `Bearer ${token}`;
      const profile = loadSessionProfile();
      const res = await fetch('/api/v1/numbers/cancel', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          providerOrderId: o.providerOrderId || o.id,
          orderId: o.id,
          priceNgn: o.priceNgn,
          provider: o.provider || 'grizzly',
          userId: profile?.userId || (session as any)?.userId || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        refunded?: boolean;
        earlyDenied?: boolean;
        error?: string;
      };
      if (data.refunded) {
        try {
          window.dispatchEvent(new Event('verxor:balance-refresh'));
        } catch {}
      }
      return {
        ok: Boolean(data.ok),
        refunded: Boolean(data.refunded),
        earlyDenied: Boolean(data.earlyDenied),
        error: data.error,
      };
    } catch (e) {
      return {
        ok: false,
        refunded: false,
        error: e instanceof Error ? e.message : 'Cancel failed',
      };
    }
  }

  useEffect(() => {
    const now = Date.now();
    const expired = localOrders.filter((o) => o.status === 'waiting' && o.expiresAt <= now && !o.refunded);
    if (expired.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const o of expired) {
        if (cancelled) return;
        let result = await requestCancelAndRefund(o);
        for (let i = 0; i < 12 && result.earlyDenied && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, 10_000));
          if (cancelled) return;
          result = await requestCancelAndRefund(o);
        }
        if (cancelled) return;
        if (result.earlyDenied) continue;
        setLocalOrders((prev) =>
          prev.map((x) =>
            x.id === o.id
              ? { ...x, status: 'cancelled' as const, refunded: result.refunded }
              : x,
          ),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [localOrders]);

  const visibleOrders = useMemo(
    () =>
      localOrders
        .filter(
          (o) =>
            o.status === 'waiting' ||
            o.status === 'received' ||
            o.status === 'completed' ||
            o.status === 'cancelled',
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [localOrders],
  );

  const previewOrders = useMemo(() => {
    if (localOrders.length === 0) return [];
    const sorted = [...localOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted.slice(0, 2);
  }, [localOrders]);

  const filteredServices = useMemo(() => {
    let list = liveServices;
    if (category !== 'all') list = list.filter((s) => s.category === category);
    const q = serviceQuery.trim().toLowerCase();
    if (q) list = list.filter((s) => s.name.toLowerCase().includes(q));
    return list;
  }, [liveServices, category, serviceQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: liveServices.length };
    for (const s of liveServices) counts[s.category] = (counts[s.category] || 0) + 1;
    return counts;
  }, [liveServices]);

  const filteredCountries = useMemo(() => {
    const base = liveCountries.length > 0 ? liveCountries : WORLDWIDE_COUNTRIES;
    const q = countryQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => [c.name, c.code, c.dial].some((v) => v.toLowerCase().includes(q)));
  }, [countryQuery, liveCountries]);

  const selectPool = (pool: Pool) => {
    setSelectedPool(pool);
    setSelectedService(null);
    setSelectedCountry(pool.location === 'USA' ? USA_COUNTRY : null);
    setServiceQuery('');
    setCountryQuery('');
    setCategory('all');
    setStep('services');
    setServicesError(null);

    // INSTANT ZERO-WAIT LOAD: Immediately render all services with the pool tier starting price
    const instant = SERVICES.map((s) => ({
      ...s,
      fromNgn: s.fromNgn || pool.fromNgn,
    }));
    setLiveServices(instant);
    setServicesLoading(false);

    // Refresh live prices in background without blocking or showing a loader
    const cacheKey = `verxor-vn-svc-v5-${pool.id}`;
    void (async () => {
      try {
        const res = await fetch(`/api/v1/catalog?mode=services&pool=${encodeURIComponent(pool.id)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && Array.isArray(data.services) && data.services.length > 0) {
          const mapped = mapServices(data.services);
          setLiveServices(mapped);
          writeCache(cacheKey, mapped);
        }
      } catch {
        /* ignore background refresh error */
      }
    })();
  };

  const loadPrices = async (pool: Pool, service: Service, country: Country) => {
    // Instant ready option based on pool tier price so user can buy right away
    const defaultOption: PriceOption = {
      id: `${pool.id}-${service.id}-${country.code}`,
      provider: 'grizzly',
      priceUsd: pool.tier === 'ECO' ? 0.05 : pool.tier === 'STD' ? 0.15 : pool.tier === 'FAST' ? 0.35 : 0.65,
      priceNgn: service.fromNgn || pool.fromNgn,
      stock: 999,
      grizzlyCountry: country.code === 'US' || country.code === '187' ? '187' : country.code,
    };

    setPriceSheet({ open: true, options: [defaultOption], service, country, pool });
    setPricesLoading(true);
    try {
      const url =
        `/api/v1/catalog?mode=prices` +
        `&pool=${encodeURIComponent(pool.id)}` +
        `&service=${encodeURIComponent(service.id)}` +
        `&country=${encodeURIComponent(country.code)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.options) && data.options.length > 0) {
          const options: PriceOption[] = data.options.map((o: any) => ({
            id: o.id || o.optionId,
            provider: o.provider || 'grizzly',
            priceUsd: Number(o.priceUsd) || defaultOption.priceUsd,
            priceNgn: Number(o.priceNgn) || defaultOption.priceNgn,
            stock: Number(o.stock) || 100,
            grizzlyCountry: o.grizzlyCountry || o.countryCode || country.code,
          }));
          setPriceSheet({ open: true, options, service, country, pool });
        }
      }
    } catch {
      // Keeps the defaultOption active so purchase is never blocked
    } finally {
      setPricesLoading(false);
    }
  };

  const selectService = async (service: Service) => {
    if (!selectedPool) return;
    setSelectedService(service);
    if (selectedPool.location === 'USA') {
      void loadPrices(selectedPool, service, USA_COUNTRY);
    } else {
      setCountryQuery('');
      setStep('countries');
      const cacheKey = `verxor-vn-ctr-v2-${selectedPool.id}-${service.id}`;
      const cached = readCache<Country[]>(cacheKey, CTR_TTL_MS);
      if (cached && cached.length > 0) {
        setLiveCountries(cached);
        setCountriesLoading(false);
        return;
      }
      setCountriesLoading(true);
      setLiveCountries([]);
      try {
        const res = await fetch(
          `/api/v1/catalog?mode=countries&pool=${encodeURIComponent(selectedPool.id)}&service=${encodeURIComponent(service.id)}`,
        );
        const data = await res.json();
        if (data.ok && Array.isArray(data.countries) && data.countries.length > 0) {
          const mapped = data.countries.map((c: any) => ({
            code: c.code,
            flag: c.flag || '🌍',
            name: c.name,
            dial: c.dial || '',
          }));
          setLiveCountries(mapped);
          writeCache(cacheKey, mapped);
        } else {
          setLiveCountries(WORLDWIDE_COUNTRIES);
        }
      } catch {
        setLiveCountries(WORLDWIDE_COUNTRIES);
      } finally {
        setCountriesLoading(false);
      }
    }
  };

  const selectCountry = (country: Country) => {
    if (!selectedPool || !selectedService) return;
    setSelectedCountry(country);
    void loadPrices(selectedPool, selectedService, country);
  };

  const openConfirm = (option: PriceOption) => {
    if (!priceSheet) return;
    const price = Number(option.priceNgn) || 0;
    const localBal = Number(session?.balanceNgn ?? balance ?? 0);
    if (price > 0 && localBal < price) {
      setCopyToast(`Insufficient balance. You need ${formatNgn(price)} but have ${formatNgn(localBal)}. Fund your wallet first.`);
      return;
    }
    setConfirmSheet({
      option,
      service: priceSheet.service,
      country: priceSheet.country,
      pool: priceSheet.pool,
    });
  };

  const cancelOrder = async (id: string) => {
    const o = localOrders.find((x) => x.id === id);
    if (!o || cancellingIds[id]) return;
    setCancellingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const maxAttempts = 18;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const result = await requestCancelAndRefund(o);
        if (result.earlyDenied) {
          await new Promise((r) => setTimeout(r, 10_000));
          continue;
        }
        if (!result.ok && !result.refunded) {
          setCopyToast(result.error || 'Cancel failed. Please try again.');
          return;
        }
        setLocalOrders((prev) =>
          prev.map((x) =>
            x.id === id
              ? { ...x, status: 'cancelled' as const, refunded: result.refunded }
              : x,
          ),
        );
        if (result.refunded) {
          setCopyToast(`₦${Number(o.priceNgn).toLocaleString('en-NG')} refunded to your wallet`);
        try { window.dispatchEvent(new Event('verxor:balance-refresh')); } catch {}
        } else {
          setCopyToast('Number cancelled. If balance does not update, refresh the page.');
        }
        return;
      }
      setCopyToast('Still cancelling. Please wait a moment, then tap Cancel again if needed.');
    } finally {
      setCancellingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const buyAgain = (o: CustomerNumberOrder) => {
    const allPools = [...SERVER1_POOLS, ...SERVER2_POOLS];
    const pool =
      allPools.find((p) => p.id === o.poolId) ||
      allPools.find((p) => p.title === o.poolTitle) ||
      null;
    if (!pool) {
      setStep('pools');
      return;
    }
    void selectPool(pool);
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ''));
      setCopyToast(label);
    } catch {}
  };

  const goBack = () => {
    if (step === 'services') setStep('pools');
    else if (step === 'countries') setStep('services');
    else if (step === 'orders' || step === 'inbox') setStep('pools');
    else onBack();
  };

  const promo = PROMO_SLIDES[promoIndex];
  const now = Date.now();

  return (
    <div className="vn-page">
      <div className="vn-topbar">
        <button type="button" className="vn-back" onClick={goBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="vn-topbar-copy">
          <strong>
            {step === 'orders'
              ? 'My Orders'
              : step === 'services'
                ? selectedPool?.title || 'Services'
                : step === 'countries'
                  ? 'Select country'
                  : 'Virtual Numbers (OTP)'}
          </strong>
          <small>Get verified with global numbers</small>
        </div>
        <div className="vn-balance">
          <WalletCards size={14} />
          {formatNgn(balance)}
        </div>
      </div>

      {step === 'pools' && (
        <>
          <div className="vn-info-banner">
            <Info size={16} />
            <span>Pick a route, then a service. Prices update live by tier.</span>
          </div>
          <div className="vn-section">
            <div className="vn-section-head">
              <Database size={14} />
              <strong>Server 1 · Economy & Standard</strong>
            </div>
            <div className="vn-pool-grid">
              {SERVER1_POOLS.map((p) => (
                <PoolCard key={p.id} pool={p} onSelect={() => void selectPool(p)} />
              ))}
            </div>
          </div>
          <div className="vn-section">
            <div className="vn-section-head">
              <Zap size={14} />
              <strong>Server 2 · Fast & Premium</strong>
            </div>
            <div className="vn-pool-grid">
              {SERVER2_POOLS.map((p) => (
                <PoolCard key={p.id} pool={p} onSelect={() => void selectPool(p)} />
              ))}
            </div>
          </div>
          <div className="vn-promo">
            <div className="vn-promo-copy">
              <strong>{promo.title}</strong>
              <p>{promo.subtitle}</p>
              <button type="button" className="vn-promo-cta">{promo.cta}</button>
            </div>
            <div className="vn-promo-dots">
              {PROMO_SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={i === promoIndex ? 'active' : ''}
                  onClick={() => setPromoIndex(i)}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
          {previewOrders.length > 0 && (
            <div className="vn-current-strip">
              <div className="vn-current-strip-head">
                <strong>Recent orders</strong>
                <button type="button" onClick={() => setStep('orders')}>View all</button>
              </div>
              {previewOrders.map((o) => (
                <div key={o.id} className="vn-current-chip">
                  <ServiceLogo id={o.serviceId} name={o.service} />
                  <div>
                    <strong>{o.number || o.service}</strong>
                    <small>{o.service} · {o.country}</small>
                  </div>
                  {o.status === 'waiting' ? (
                    <span className="vn-chip-timer">{formatTimer(Math.max(0, o.expiresAt - now))}</span>
                  ) : o.status === 'received' || o.status === 'completed' ? (
                    <span className="vn-chip-received">Done</span>
                  ) : o.status === 'cancelled' ? (
                    <span className="vn-chip-cancelled">Cancelled</span>
                  ) : (
                    <span className="vn-chip-timer" style={{ color: '#94a3b8' }}>{o.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {step === 'services' && selectedPool && (
        <>
          <div className="vn-search-row">
            <Search size={16} />
            <input type="search" placeholder="Search services..." value={serviceQuery} onChange={(e) => setServiceQuery(e.target.value)} />
          </div>
          <div className="vn-chips">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" className={category === c.id ? 'active' : ''} onClick={() => setCategory(c.id)}>
                {c.label}
                <span className="vn-cat-count">{categoryCounts[c.id] || 0}</span>
              </button>
            ))}
          </div>
          {servicesLoading && <div className="vn-empty">Loading services…</div>}
          {servicesError && <div className="vn-empty">{servicesError}</div>}
          {!servicesLoading && !servicesError && (
            <div className="vn-service-list">
              {filteredServices.map((s) => (
                <button key={s.id} type="button" className="vn-service-row" onClick={() => void selectService(s)}>
                  <ServiceLogo id={s.logoId || s.id} name={s.name} />
                  <div className="vn-service-info" style={{ display: 'flex', flexDirection: 'column', flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.938rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>● Ready</span>
                      <span>·</span>
                      <span>From {formatNgn(s.fromNgn || selectedPool.fromNgn)}</span>
                    </span>
                  </div>
                  <ChevronRight size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                </button>
              ))}
              {filteredServices.length === 0 && <div className="vn-empty">No services match your search.</div>}
            </div>
          )}
        </>
      )}

      {step === 'countries' && selectedPool && selectedService && (
        <>
          <div className="vn-search-row">
            <Search size={16} />
            <input type="search" placeholder="Search countries..." value={countryQuery} onChange={(e) => setCountryQuery(e.target.value)} />
          </div>
          {countriesLoading && <div className="vn-empty">Loading countries…</div>}
          {!countriesLoading && (
            <div className="vn-country-list">
              {filteredCountries.map((c) => (
                <button key={c.code} type="button" className="vn-country-row" onClick={() => selectCountry(c)}>
                  <span className="vn-flag">{c.flag}</span>
                  <span>{c.name}</span>
                  <small>{c.dial}</small>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === 'orders' && (
        <div className="vn-orders">
          <div className="vn-about-banner">
            <Info size={18} color="#f59e0b" />
            <div className="vn-about-text">
              <strong>About SMS delivery</strong>
              <p>Some services may require several attempts</p>
            </div>
            <button type="button" className="vn-about-link" onClick={() => setAboutOpen(true)}>
              See details ›
            </button>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="vn-empty">No orders yet. Buy a number to get started.</div>
          ) : (
            visibleOrders.map((o) => (
              <div key={o.id} className="vn-order-card">
                <div className="vn-order-top">
                  <ServiceLogo id={o.serviceId} name={o.service} />
                  <div className="vn-order-meta">
                    <strong>{o.service}</strong>
                    <small>{o.country} · {o.poolTitle}</small>
                  </div>
                  <span className={`vn-status vn-status-${o.status}`}>{o.status}</span>
                </div>
                {o.number ? (
                  <div className="vn-number-row">
                    <span className="vn-number">{o.number}</span>
                    <button type="button" className="vn-copy-icon" onClick={() => void copyText(o.number, 'Number copied')}>
                      <Copy size={14} />
                    </button>
                  </div>
                ) : null}
                {o.otp ? (
                  <div className="vn-sms-row">
                    <span>OTP</span>
                    <strong>{o.otp}</strong>
                    <button type="button" className="vn-copy-icon" onClick={() => void copyText(o.otp || '', 'OTP copied')}>
                      <Copy size={14} />
                    </button>
                  </div>
                ) : null}
                {o.status === 'waiting' && (
                  <div className="vn-timers-block">
                    <div className="vn-timer-row">
                      <span className="vn-timer-label"><Clock3 size={12} /> Expires</span>
                      <span className="vn-timer-big">{formatTimer(Math.max(0, o.expiresAt - now))}</span>
                    </div>
                    {now < (o.cancelAvailableAt || 0) ? (
                      <div className="vn-timer-row vn-timer-row--lock">
                        <span className="vn-timer-label">Cancel available in</span>
                        <span className="vn-timer-lock">{formatTimer(Math.max(0, (o.cancelAvailableAt || 0) - now))}</span>
                      </div>
                    ) : cancellingIds[o.id] ? (
                      <div className="vn-timer-row vn-timer-row--lock">
                        <span className="vn-timer-label">Cancelling…</span>
                        <span className="vn-timer-lock">…</span>
                      </div>
                    ) : null}
                  </div>
                )}
                {o.status === 'cancelled' && o.refunded !== false && (
                  <div className="vn-refund-note">
                    <span>✓ {formatNgn(o.priceNgn)} refunded to your wallet</span>
                  </div>
                )}
                {o.status === 'cancelled' && o.refunded === false && (
                  <div className="vn-refund-note" style={{ background: '#fff7ed', color: '#c2410c' }}>
                    <span>Cancelled — refund pending. Contact support if balance does not update.</span>
                  </div>
                )}
                <div className="vn-order-actions">
                  {o.status === 'waiting' && now >= (o.cancelAvailableAt || 0) && (
                    <button
                      type="button"
                      className="vn-cancel-btn-bold"
                      disabled={Boolean(cancellingIds[o.id])}
                      onClick={() => void cancelOrder(o.id)}
                    >
                      {cancellingIds[o.id] ? 'Cancelling…' : 'Cancel'}
                    </button>
                  )}
                  {o.status === 'cancelled' && (
                    <>
                      <button type="button" className="vn-refunded-btn" disabled>
                        {o.refunded === false ? 'Refund pending' : '✓ Refunded'}
                      </button>
                      <button type="button" className="vn-buy-again-btn" onClick={() => buyAgain(o)}>
                        <Zap size={14} /> Buy Again
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {priceSheet?.open && (
        <div className="vn-sheet-backdrop" onClick={() => setPriceSheet(null)}>
          <div className="vn-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="vn-sheet-head">
              <strong>{priceSheet.service.name}</strong>
              <button type="button" onClick={() => setPriceSheet(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <p className="vn-sheet-sub">{priceSheet.country.flag} {priceSheet.country.name} · {priceSheet.pool.title}</p>
            {pricesLoading && <div className="vn-empty">Loading prices…</div>}
            {!pricesLoading && priceSheet.options.length === 0 && (
              <div className="vn-empty">No stock for this route right now.</div>
            )}
            <ul className="vn-price-list">
              {priceSheet.options.map((opt) => (
                <li key={opt.id}>
                  <button type="button" className="vn-price-row" onClick={() => openConfirm(opt)}>
                    <strong>{formatNgn(opt.priceNgn)}</strong>
                    <small>{opt.stock} pcs</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {confirmSheet && (
        <div className="vn-sheet-backdrop" onClick={() => setConfirmSheet(null)}>
          <div className="vn-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="vn-sheet-head">
              <strong>Confirm purchase</strong>
              <button type="button" onClick={() => setConfirmSheet(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <p className="vn-sheet-sub">{confirmSheet.service.name} · {confirmSheet.country.name}</p>
            <div className="vn-confirm-price">{formatNgn(confirmSheet.option.priceNgn)}</div>
            <button type="button" className="vn-confirm-btn" disabled={buying} onClick={() => void (async () => {
              if (buying) return;
              setBuying(true);
              try {
                const { option, service, country, pool } = confirmSheet;
                let accessToken = loadSessionTokens()?.access_token || '';
                let userId = loadSessionProfile()?.userId || '';
                try {
                  const { getSupabaseBrowser } = await import('../lib/supabase/client');
                  const sb = getSupabaseBrowser();
                  if (sb) {
                    const { data: { session: s } } = await sb.auth.getSession();
                    if (s?.access_token) accessToken = s.access_token;
                    if (s?.user?.id) userId = s.user.id;
                  }
                } catch {}
                const grizzlyCountry = option.grizzlyCountry || country.code;
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
                const res = await fetch('/api/v1/numbers/buy', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    service: service.id,
                    country: String(grizzlyCountry),
                    maxPriceUsd: option.priceUsd > 0 ? option.priceUsd : 0.5,
                    poolId: pool.id,
                    priceNgn: option.priceNgn,
                    userId: userId || undefined,
                  }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(String(data.error || 'Purchase failed'));
                const tnow = Date.now();
                const order: CustomerNumberOrder = {
                  id: String(data.order?.id || data.order?.providerOrderId || `ord-${tnow}`),
                  number: data.order?.phone || '',
                  service: service.name,
                  serviceId: service.id,
                  country: country.name,
                  poolTitle: pool.title,
                  poolId: pool.id,
                  status: 'waiting',
                  priceNgn: option.priceNgn,
                  expiresAt: tnow + LIFETIME_MS,
                  cancelAvailableAt: tnow + CANCEL_LOCK_MS,
                  createdAt: new Date().toISOString(),
                  provider: 'grizzly',
                  providerOrderId: String(data.order?.providerOrderId || data.order?.id || ''),
                };
                setLocalOrders((prev) => [order, ...prev]);
                setConfirmSheet(null);
                setPriceSheet(null);
                setStep('orders');
                try { window.dispatchEvent(new Event('verxor:balance-refresh')); } catch {}
              } catch (e) {
                setCopyToast(e instanceof Error ? e.message : 'Purchase failed');
              } finally {
                setBuying(false);
              }
            })()}>
              {buying ? 'Buying…' : 'Buy number'}
            </button>
          </div>
        </div>
      )}

      {aboutOpen && (
        <div className="vn-sheet-backdrop" onClick={() => setAboutOpen(false)}>
          <div className="vn-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="vn-sheet-head">
              <strong>If SMS is not received</strong>
              <button type="button" onClick={() => setAboutOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="vn-about-body">
              <p>
                <strong>Full refund.</strong> If the code never arrives, cancel the number after the
                cancel timer ends. The amount is returned to your wallet automatically.
              </p>
              <p>
                <strong>Cancel tip.</strong> Wait for “Cancel” to unlock, then tap Cancel once. You
                do not need to keep retrying — the system finishes the cancel for you.
              </p>
              <p>
                <strong>Delivery tips.</strong> Some apps (WhatsApp, Telegram, etc.) may need more
                than one attempt. Use the number quickly after purchase and request the SMS from
                the app while the order is still Waiting.
              </p>
              <p>
                When the SMS arrives, the code appears here and the order is marked Completed.
              </p>
            </div>
            <button type="button" className="vn-confirm-btn" onClick={() => setAboutOpen(false)}>
              Got it
            </button>
          </div>
        </div>
      )}

      {copyToast && (
        <div className="vn-copy-modal" onClick={() => setCopyToast(null)}>
          <div className="vn-copy-modal-card" onClick={(e) => e.stopPropagation()}>
            <strong>{copyToast}</strong>
            <button type="button" onClick={() => setCopyToast(null)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
