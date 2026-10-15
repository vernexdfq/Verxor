'use client';

import { useEffect, useMemo, useState } from 'react';
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
  CATEGORIES,
  PROMO_SLIDES,
  LIFETIME_MS,
  CANCEL_LOCK_MS,
  SERVICES,
  formatNgn,
  formatUsd,
  formatTimer,
} from './virtual-numbers-data';
import { ServiceLogo, PoolCard } from './virtual-numbers-components';
import { loadSessionTokens, loadSessionProfile } from './auth/session-unlock';

export type { CustomerNumberOrder };

/* Daily cache — one full refresh per calendar day (local midnight) */
const CTR_TTL_MS = 6 * 60 * 60 * 1000;

function cacheDayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readCache<T>(key: string, ttlMs?: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: number; day?: string; data: T };
    if (!parsed || parsed.data == null) return null;
    if (parsed.day != null && parsed.day !== cacheDayKey()) return null;
    if (ttlMs != null && parsed.ts != null && Date.now() - parsed.ts > ttlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T, dayBound = false) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), day: dayBound ? cacheDayKey() : undefined, data }));
  } catch {
    /* ignore */
  }
}

function mapServices(raw: any[]): Service[] {
  return (raw || []).map((s: any) => ({
    id: s.code || s.id,
    name: s.name,
    category: (s.category || 'other') as ServiceCategory,
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
      return Array.isArray(parsed) ? parsed : [];
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

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('verxor-vn-orders', JSON.stringify(localOrders));
    } catch {
      /* ignore */
    }
  }, [localOrders]);

  useEffect(() => {
    const t = setInterval(() => setPromoIndex((i) => (i + 1) % PROMO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const allPools = [...SERVER1_POOLS, ...SERVER2_POOLS];
    allPools.forEach((pool) => {
      const key = `verxor-vn-svc-v3-${pool.id}`;
      if (readCache<Service[]>(key)) return;
      void fetch(`/api/v1/catalog?mode=services&pool=${encodeURIComponent(pool.id)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) writeCache(key, mapServices(data.services || []), true);
        })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    const now = Date.now();
    const needsUpdate = localOrders.some((o) => o.status === 'waiting' && o.expiresAt <= now);
    if (!needsUpdate) return;
    setLocalOrders((prev) =>
      prev.map((o) =>
        o.status === 'waiting' && o.expiresAt <= Date.now()
          ? { ...o, status: 'cancelled' as const }
          : o,
      ),
    );
  });

  const visibleOrders = useMemo(
    () =>
      localOrders
        .filter((o) => o.status === 'waiting' || o.status === 'received' || o.status === 'completed')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [localOrders],
  );

  const previewOrders = useMemo(() => {
    if (localOrders.length === 0) return [];
    const sorted = [...localOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted.slice(0, 1);
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

  const selectPool = async (pool: Pool) => {
    setSelectedPool(pool);
    setSelectedService(null);
    setSelectedCountry(pool.location === 'USA' ? USA_COUNTRY : null);
    setServiceQuery('');
    setCountryQuery('');
    setCategory('all');
    setStep('services');
    setServicesError(null);
    setServicesLoading(false);

    const cacheKey = `verxor-vn-svc-v3-${pool.id}`;
    const cached = readCache<Service[]>(cacheKey);
    if (cached && cached.length > 0) {
      setLiveServices(cached);
      return;
    }

    setLiveServices(SERVICES);
    try {
      const res = await fetch(`/api/v1/catalog?mode=services&pool=${encodeURIComponent(pool.id)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.reason || 'Failed to load services');
      const mapped = mapServices(data.services || []);
      if (mapped.length > 0) {
        setLiveServices(mapped);
        writeCache(cacheKey, mapped, true);
      }
    } catch (e) {
      if (SERVICES.length === 0) {
        setServicesError(e instanceof Error ? e.message : 'Failed to load services');
      }
    }
  };

  const loadPrices = async (pool: Pool, service: Service, country: Country) => {
    setPricesLoading(true);
    try {
      const url =
        `/api/v1/catalog?mode=prices` +
        `&pool=${encodeURIComponent(pool.id)}` +
        `&service=${encodeURIComponent(service.id)}` +
        `&country=${encodeURIComponent(country.code)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.ok) throw new Error(data.reason || 'Failed to load prices');
      const options: PriceOption[] = (data.options || []).map((o: any) => ({
        id: o.id || o.optionId,
        provider: '',
        priceUsd: Number(o.priceUsd) || 0,
        priceNgn: Number(o.priceNgn) || 0,
        stock: Number(o.stock) || 0,
        grizzlyCountry: o.grizzlyCountry || o.countryCode || undefined,
      }));
      setPriceSheet({ open: true, options, service, country, pool });
    } catch (e) {
      setPriceSheet({ open: true, options: [], service, country, pool });
      setCopyToast(e instanceof Error ? e.message : 'Price load failed');
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
      const cacheKey = `verxor-vn-ctr-v3-${selectedPool.id}-${service.id}`;
      const cached = readCache<Country[]>(cacheKey, CTR_TTL_MS);
      if (cached && cached.length > 0) {
        setLiveCountries(cached);
        setCountriesLoading(false);
        return;
      }
      setLiveCountries(WORLDWIDE_COUNTRIES);
      setCountriesLoading(false);
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
      setCopyToast(
        `Insufficient balance. You need ${formatNgn(price)} but have ${formatNgn(localBal)}. Fund your wallet first.`,
      );
      return;
    }
    setConfirmSheet({
      option,
      service: priceSheet.service,
      country: priceSheet.country,
      pool: priceSheet.pool,
    });
  };

  const pollStatus = (order: CustomerNumberOrder) => {
    if (!order.providerOrderId) return;
    let attempts = 0;
    const maxAttempts = 60;
    const tick = async () => {
      attempts += 1;
      try {
        const res = await fetch(
          `/api/v1/numbers/status?provider=grizzly&providerOrderId=${encodeURIComponent(order.providerOrderId!)}&orderId=${encodeURIComponent(order.id)}`,
        );
        const data = await res.json();
        if (data.ok && data.otp) {
          setLocalOrders((prev) =>
            prev.map((o) =>
              o.id === order.id ? { ...o, status: 'received' as const, otp: String(data.otp) } : o,
            ),
          );
          setInboxOrder((cur) =>
            cur && cur.id === order.id ? { ...cur, status: 'received', otp: String(data.otp) } : cur,
          );
          return;
        }
        if (data.ok && data.status === 'cancelled') {
          setLocalOrders((prev) =>
            prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' as const } : o)),
          );
          return;
        }
      } catch {
        /* keep polling */
      }
      if (attempts < maxAttempts) setTimeout(tick, 5000);
    };
    setTimeout(tick, 3000);
  };

  const confirmPurchase = async () => {
    if (!confirmSheet || buying) return;
    const { option, service, country, pool } = confirmSheet;
    const price = Number(option.priceNgn) || 0;

    const localBal = Number(session?.balanceNgn ?? balance ?? 0);
    if (price > 0 && localBal < price) {
      setCopyToast(
        `Insufficient balance. You need ${formatNgn(price)} but have ${formatNgn(localBal)}. Fund your wallet first.`,
      );
      return;
    }

    setBuying(true);
    try {
      let accessToken = loadSessionTokens()?.access_token || '';
      let userId = loadSessionProfile()?.userId || '';
      try {
        const { getSupabaseBrowser } = await import('../lib/supabase/client');
        const sb = getSupabaseBrowser();
        if (sb) {
          const { data: sess } = await sb.auth.getSession();
          if (sess.session?.access_token) accessToken = sess.session.access_token;
          if (sess.session?.user?.id) userId = sess.session.user.id;
        }
      } catch {
        /* ignore */
      }

      if (price > 0) {
        const balHeaders: Record<string, string> = {};
        if (accessToken) balHeaders.Authorization = `Bearer ${accessToken}`;
        const balQ = userId ? `?userId=${encodeURIComponent(userId)}` : '';
        const balRes = await fetch(`/api/v1/wallet/balance${balQ}`, {
          headers: balHeaders,
          cache: 'no-store',
        }).catch(() => null);
        if (balRes && balRes.ok) {
          const balData = (await balRes.json()) as {
            ok?: boolean;
            balanceNgn?: number;
            userId?: string;
          };
          if (balData.userId) userId = balData.userId;
          const liveBal = Number(balData.balanceNgn) || 0;
          if (liveBal < price) {
            setCopyToast(
              `Insufficient balance. You need ${formatNgn(price)} but have ${formatNgn(liveBal)}. Fund your wallet first.`,
            );
            return;
          }
        } else if (!userId && !accessToken) {
          setCopyToast('Sign in to buy a number.');
          return;
        }
      }

      let grizzlyCountry = option.grizzlyCountry || '';
      if (!grizzlyCountry) {
        if (country.code === 'US' || country.code === 'USA') grizzlyCountry = '12';
        else grizzlyCountry = country.code;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const profile = loadSessionProfile();
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
          email: profile?.email || (profile?.method === 'email' ? profile.contact : undefined),
          phone: profile?.method === 'phone' ? profile.contact : undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        const errMsg = String(data.error || 'Purchase failed');
        if (/insufficient/i.test(errMsg) || res.status === 402) {
          throw new Error(
            `Insufficient balance. You need ${formatNgn(price)}. Fund your wallet first.`,
          );
        }
        throw new Error(errMsg);
      }

      const now = Date.now();
      const order: CustomerNumberOrder = {
        id: String(data.order?.id || data.order?.providerOrderId || `ord-${now}`),
        number: data.order?.phone || '',
        service: service.name,
        serviceId: service.id,
        country: country.name,
        poolTitle: pool.title,
        status: 'waiting',
        priceNgn: option.priceNgn,
        expiresAt: now + LIFETIME_MS,
        cancelAvailableAt: now + CANCEL_LOCK_MS,
        createdAt: new Date().toISOString(),
        provider: 'grizzly',
        providerOrderId: String(data.order?.providerOrderId || data.order?.id || ''),
      };
      setLocalOrders((prev) => [order, ...prev]);
      setConfirmSheet(null);
      setPriceSheet(null);
      setStep('orders');
      pollStatus(order);
    } catch (e) {
      setCopyToast(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  const cancelOrder = (id: string) => {
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' as const } : o)),
    );
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ''));
      setCopyToast(label);
    } catch {
      /* ignore */
    }
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
      <header className="vn-topbar">
        <button type="button" className="vn-back" onClick={goBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="vn-topbar-copy">
          <strong>
            {step === 'services'
              ? 'All services'
              : step === 'countries'
                ? selectedService?.name ?? 'Select country'
                : step === 'orders'
                  ? 'My Orders'
                  : step === 'inbox'
                    ? 'Inbox'
                    : 'Virtual Numbers (OTP)'}
          </strong>
          <small>
            {step === 'services' && selectedPool
              ? selectedPool.title
              : step === 'countries'
                ? 'Select country'
                : step === 'orders'
                  ? 'Waiting & received numbers'
                  : step === 'inbox'
                    ? 'SMS inbox'
                    : 'Get verified with global numbers'}
          </small>
        </div>
        <div className="vn-balance">
          <WalletCards size={14} />
          <span>{formatNgn(balance)}</span>
        </div>
      </header>

      {step === 'pools' && (
        <>
          <div className="vn-info-banner">
            <Info size={16} />
            <span>Pick a route, then a service. Prices update once per day.</span>
          </div>

          <section className="vn-section">
            <div className="vn-section-head">
              <Database size={16} />
              <strong>Server 1 · Economy & Standard</strong>
            </div>
            <div className="vn-pool-grid">
              {SERVER1_POOLS.map((p) => (
                <PoolCard key={p.id} pool={p} onSelect={() => void selectPool(p)} />
              ))}
            </div>
          </section>

          <section className="vn-section">
            <div className="vn-section-head">
              <Zap size={16} />
              <strong>Server 2 · Fast & Premium</strong>
            </div>
            <div className="vn-pool-grid">
              {SERVER2_POOLS.map((p) => (
                <PoolCard key={p.id} pool={p} onSelect={() => void selectPool(p)} />
              ))}
            </div>
          </section>

          {previewOrders.length > 0 && (
            <div className="vn-current-strip">
              <div className="vn-current-strip-head">
                <strong>Latest order</strong>
                <button type="button" onClick={() => setStep('orders')}>
                  View all
                </button>
              </div>
              {previewOrders.map((o) => (
                <div key={o.id} className="vn-current-chip">
                  <ServiceLogo name={o.service} />
                  <div>
                    <strong>{o.number || o.service}</strong>
                    <small>
                      {o.service} · {o.country}
                    </small>
                  </div>
                  {o.status === 'waiting' ? (
                    <span className="vn-chip-timer">{formatTimer(Math.max(0, o.expiresAt - now))}</span>
                  ) : (
                    <span className="vn-chip-received">OTP</span>
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
            <input
              value={serviceQuery}
              onChange={(e) => setServiceQuery(e.target.value)}
              placeholder="Search services"
              aria-label="Search services"
            />
          </div>
          <div className="vn-chips">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={category === c.id ? 'active' : ''}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
                <span className="vn-cat-count">{categoryCounts[c.id] || 0}</span>
              </button>
            ))}
          </div>
          {servicesError && <div className="vn-empty">{servicesError}</div>}
          <div className="vn-service-list">
            {filteredServices.map((s) => (
              <button key={s.id} type="button" className="vn-service-row" onClick={() => void selectService(s)}>
                <ServiceLogo name={s.name} />
                <span>{s.name}</span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'countries' && selectedService && (
        <>
          <div className="vn-search-row">
            <Search size={16} />
            <input
              value={countryQuery}
              onChange={(e) => setCountryQuery(e.target.value)}
              placeholder="Search countries"
              aria-label="Search countries"
            />
          </div>
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
        </>
      )}

      {step === 'orders' && (
        <div className="vn-orders">
          {visibleOrders.length === 0 ? (
            <div className="vn-empty">No active orders</div>
          ) : (
            visibleOrders.map((o) => (
              <div key={o.id} className="vn-order-card">
                <div className="vn-order-top">
                  <ServiceLogo name={o.service} />
                  <div className="vn-order-meta">
                    <strong>{o.service}</strong>
                    <small>
                      {o.country} · {o.poolTitle}
                    </small>
                  </div>
                  <span className={`vn-status vn-status-${o.status}`}>{o.status}</span>
                </div>
                {o.number && (
                  <div className="vn-number-row">
                    <span className="vn-number">{o.number}</span>
                    <button type="button" className="vn-copy-icon" onClick={() => void copyText(o.number, 'Number copied')}>
                      <Copy size={14} />
                    </button>
                  </div>
                )}
                {o.otp && (
                  <div className="vn-sms-row">
                    <span>OTP</span>
                    <strong>{o.otp}</strong>
                    <button type="button" className="vn-copy-icon" onClick={() => void copyText(o.otp!, 'OTP copied')}>
                      <Copy size={14} />
                    </button>
                  </div>
                )}
                {o.status === 'waiting' && (
                  <div className="vn-timers-block">
                    <div className="vn-timer-row">
                      <span className="vn-timer-label">
                        <Clock3 size={12} /> Expires
                      </span>
                      <span className="vn-timer-big">{formatTimer(Math.max(0, o.expiresAt - now))}</span>
                    </div>
                  </div>
                )}
                {o.status === 'waiting' && now >= o.cancelAvailableAt && (
                  <button type="button" className="vn-cancel-btn-bold" onClick={() => cancelOrder(o.id)}>
                    Cancel order
                  </button>
                )}
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
              <button type="button" onClick={() => setPriceSheet(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <p>
              {priceSheet.country.flag} {priceSheet.country.name}
            </p>
            {pricesLoading && <div className="vn-empty">Loading prices…</div>}
            {!pricesLoading && priceSheet.options.length === 0 && (
              <div className="vn-empty">No stock for this route right now.</div>
            )}
            <ul className="vn-price-list">
              {priceSheet.options.map((opt) => (
                <li key={opt.id}>
                  <button type="button" className="vn-price-row" onClick={() => openConfirm(opt)}>
                    <div>
                      <strong>{formatNgn(opt.priceNgn)}</strong>
                      <small>{Number(opt.stock).toLocaleString()} left</small>
                    </div>
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
              <button type="button" onClick={() => setConfirmSheet(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <p className="vn-sheet-sub">
              {confirmSheet.service.name} · {confirmSheet.country.name}
            </p>
            <div className="vn-confirm-price">{formatNgn(confirmSheet.option.priceNgn)}</div>
            <button type="button" className="vn-confirm-btn" disabled={buying} onClick={() => void confirmPurchase()}>
              {buying ? 'Buying…' : 'Buy number'}
            </button>
            <button type="button" onClick={() => setConfirmSheet(null)} style={{ marginTop: 8, width: '100%', height: 40, border: 'none', background: 'transparent', color: '#64748b', fontWeight: 600 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {copyToast && (
        <div className="vn-toast" role="status">
          {copyToast}
        </div>
      )}
    </div>
  );
}
