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
  formatNgn,
  formatUsd,
  formatTimer,
} from './virtual-numbers-data';
import { ServiceLogo, CountryFlag, PoolCard } from './virtual-numbers-components';

export type { CustomerNumberOrder };

/* ── Cache helpers (localStorage + TTL) ───────────────────────────────────── */
const SVC_TTL_MS = 30 * 60 * 1000; // 30 min
const CTR_TTL_MS = 15 * 60 * 1000; // 15 min

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
  } catch {
    /* quota / private mode */
  }
}

function mapServices(raw: any[]): Service[] {
  return (raw || []).map((s: any) => ({
    id: s.code || s.id,
    name: s.name,
    logoId: s.logoId || s.code || s.id,
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

  /* Prefetch all pools on mount so first click is instant */
  useEffect(() => {
    const allPools = [...SERVER1_POOLS, ...SERVER2_POOLS];
    allPools.forEach((pool) => {
      const key = `verxor-vn-svc-v2-${pool.id}`;
      if (readCache<Service[]>(key, SVC_TTL_MS)) return; // already warm
      void fetch(`/api/v1/catalog?mode=services&pool=${encodeURIComponent(pool.id)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) writeCache(key, mapServices(data.services || []));
        })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    const now = Date.now();
    const hasExpired = localOrders.some((o) => o.status === 'waiting' && o.expiresAt <= now);
    if (!hasExpired) return;
    setLocalOrders((prev) => prev.filter((o) => !(o.status === 'waiting' && o.expiresAt <= Date.now())));
  });

  const visibleOrders = useMemo(
    () =>
      localOrders
        .filter((o) => o.status === 'waiting' || o.status === 'received' || o.status === 'completed')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [localOrders],
  );

  /* Always show the latest order (any status) so "View all" is permanently available */
  const previewOrders = useMemo(
    () => visibleOrders.slice(0, 1),
    [visibleOrders],
  );

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
    return base.filter((c) =>
      [c.name, c.code, c.dial].some((v) => v.toLowerCase().includes(q)),
    );
  }, [countryQuery, liveCountries]);

  /* ── Cache-first pool open (no flash) ──────────────────────────────────── */
  const selectPool = async (pool: Pool) => {
    setSelectedPool(pool);
    setSelectedService(null);
    setSelectedCountry(pool.location === 'USA' ? USA_COUNTRY : null);
    setServiceQuery('');
    setCountryQuery('');
    setCategory('all');
    setStep('services');
    setServicesError(null);

    const cacheKey = `verxor-vn-svc-v2-${pool.id}`;
    const cached = readCache<Service[]>(cacheKey, SVC_TTL_MS);

    if (cached && cached.length > 0) {
      // Instant: show cache, never clear the list
      setLiveServices(cached);
      setServicesLoading(false);
      // Quiet background refresh
      void (async () => {
        try {
          const res = await fetch(`/api/v1/catalog?mode=services&pool=${encodeURIComponent(pool.id)}`);
          const data = await res.json();
          if (data.ok) {
            const mapped = mapServices(data.services || []);
            setLiveServices(mapped);
            writeCache(cacheKey, mapped);
          }
        } catch {
          /* keep cache */
        }
      })();
      return;
    }

    // Cold miss: show soft loading only if list is empty
    setServicesLoading(true);
    try {
      const res = await fetch(`/api/v1/catalog?mode=services&pool=${encodeURIComponent(pool.id)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.reason || 'Failed to load services');
      const mapped = mapServices(data.services || []);
      setLiveServices(mapped);
      writeCache(cacheKey, mapped);
    } catch (e) {
      setServicesError(e instanceof Error ? e.message : 'Failed to load services');
    } finally {
      setServicesLoading(false);
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

      const cacheKey = `verxor-vn-ctr-v2-${selectedPool.id}-${service.id}`;
      const cached = readCache<Country[]>(cacheKey, CTR_TTL_MS);
      if (cached && cached.length > 0) {
        setLiveCountries(cached);
        setCountriesLoading(false);
        // background refresh
        void (async () => {
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
            }
          } catch {
            /* keep cache */
          }
        })();
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
    setBuying(true);
    const { option, service, country, pool } = confirmSheet;
    try {
      let grizzlyCountry = option.grizzlyCountry || '';
      if (!grizzlyCountry) {
        if (country.code === 'US' || country.code === 'USA') grizzlyCountry = '12';
        else grizzlyCountry = country.code;
      }
      const res = await fetch('/api/v1/numbers/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: service.id,
          country: String(grizzlyCountry),
          maxPriceUsd: option.priceUsd > 0 ? option.priceUsd : 0.5,
          poolId: pool.id,
          priceNgn: option.priceNgn,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Purchase failed');

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
    setLocalOrders((prev) => prev.filter((o) => o.id !== id));
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
        <button type="button" className="vn-balance" aria-label="Wallet balance">
          <WalletCards size={14} />
          <span>{formatNgn(balance)}</span>
        </button>
      </header>

      {step === 'pools' && (
        <>
          <div className="vn-info-banner">
            <Info size={16} />
            <span>Pick a route, then a service. Prices update live by tier.</span>
          </div>

          <section className="vn-section">
            <div className="vn-section-head">
              <Database size={16} />
              <strong>Server 1 · Economy & Standard</strong>
            </div>
            <div className="vn-pool-grid">
              {SERVER1_POOLS.map((p) => (
                <PoolCard key={p.id} pool={p} onSelect={selectPool} />
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
                <PoolCard key={p.id} pool={p} onSelect={selectPool} />
              ))}
            </div>
          </section>

          <div className="vn-promo">
            <div className="vn-promo-copy">
              <strong>{promo.title}</strong>
              <p>{promo.subtitle}</p>
              <button type="button" className="vn-promo-cta">
                {promo.cta}
              </button>
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

          {/* Permanent current-orders strip — always visible when any order exists */}
          {previewOrders.length > 0 && (
            <div className="vn-current-strip">
              <div className="vn-current-strip-head">
                <strong>Current orders</strong>
                <button type="button" onClick={() => setStep('orders')}>
                  View all
                </button>
              </div>
              {previewOrders.map((o) => {
                const isWaiting = o.status === 'waiting';
                const isReceived = o.status === 'received';
                return (
                  <div key={o.id} className="vn-current-chip" onClick={() => setStep('orders')}>
                    <ServiceLogo id={o.serviceId} />
                    <div>
                      <strong>{o.service}</strong>
                      <small>{o.number}</small>
                    </div>
                    {isWaiting ? (
                      <span className="vn-chip-timer">{formatTimer(o.expiresAt - now)}</span>
                    ) : isReceived ? (
                      <span className="vn-chip-received">Received</span>
                    ) : (
                      <span className="vn-chip-received">Done</span>
                    )}
                  </div>
                );
              })}
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
          <div className="vn-service-list">
            {/* Soft loading: only show when list is still empty */}
            {servicesLoading && liveServices.length === 0 && (
              <div className="vn-empty">Loading services…</div>
            )}
            {servicesError && !servicesLoading && liveServices.length === 0 && (
              <div className="vn-empty">{servicesError}</div>
            )}
            {!servicesLoading && !servicesError && filteredServices.length === 0 && liveServices.length === 0 && (
              <div className="vn-empty">No services in this tier yet. Try another pool.</div>
            )}
            {filteredServices.map((s) => (
              <button key={s.id} type="button" className="vn-service-row" onClick={() => selectService(s)}>
                <ServiceLogo id={s.logoId || s.id} compact />
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
            />
          </div>
          <div className="vn-country-list">
            {countriesLoading && liveCountries.length === 0 && (
              <div className="vn-empty">Loading countries…</div>
            )}
            {!countriesLoading && filteredCountries.length === 0 && (
              <div className="vn-empty">No countries for this service in this tier.</div>
            )}
            {filteredCountries.map((c) => (
              <button key={c.code} type="button" className="vn-country-row" onClick={() => selectCountry(c)}>
                <span className="vn-flag"><CountryFlag code={c.code} flag={c.flag} /></span>
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
          <div className="vn-about-banner">
            <div className="vn-about-text">
              <strong>About SMS delivery</strong>
              <p>
                Codes usually arrive within 1–3 minutes. If nothing arrives after the lock period you can
                cancel. The number is auto-released when the lifetime timer ends.
              </p>
            </div>
            <button type="button" className="vn-about-link" onClick={() => setAboutOpen(true)}>
              See details
            </button>
          </div>

          {visibleOrders.length === 0 && (
            <div className="vn-empty">No orders yet. Buy a number to get started.</div>
          )}

          {visibleOrders.map((order) => {
            const isWaiting = order.status === 'waiting';
            const lockLeft = order.cancelAvailableAt - now;
            const canCancel = isWaiting && lockLeft <= 0;
            const lifetimeLeft = order.expiresAt - now;

            return (
              <div key={order.id} className="vn-order-card">
                <div className="vn-order-top">
                  <ServiceLogo id={order.serviceId} />
                  <div className="vn-order-meta">
                    <strong>{order.service}</strong>
                    <small>
                      {order.country} · {order.poolTitle}
                    </small>
                  </div>
                  <span className={`vn-status vn-status-${order.status}`}>
                    {isWaiting ? 'Waiting' : order.status === 'received' ? 'Received' : 'Completed'}
                  </span>
                </div>

                <div className="vn-number-row">
                  <strong className="vn-number">{order.number}</strong>
                  <button
                    type="button"
                    className="vn-copy-icon"
                    onClick={() => copyText(order.number, 'Number copied')}
                    aria-label="Copy number"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                {order.otp && (
                  <div className="vn-sms-row">
                    <span>SMS code</span>
                    <strong>{order.otp}</strong>
                    <button
                      type="button"
                      className="vn-copy-icon"
                      onClick={() => copyText(order.otp!, 'Code copied')}
                      aria-label="Copy code"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}

                {isWaiting && (
                  <div className="vn-timers-block">
                    <div className="vn-timer-row">
                      <span className="vn-timer-label">
                        <Clock3 size={14} /> Lifetime
                      </span>
                      <span className="vn-timer-big">{formatTimer(lifetimeLeft)}</span>
                    </div>
                    <div className="vn-timer-row">
                      <span className="vn-timer-label">Cancel available in</span>
                      <span className="vn-timer-small">{formatTimer(lockLeft)}</span>
                    </div>
                  </div>
                )}

                <div className="vn-order-actions">
                  {order.status === 'received' && (
                    <button type="button" className="vn-inbox-btn" onClick={() => { setInboxOrder(order); setStep('inbox'); }}>
                      Open inbox
                    </button>
                  )}
                  {canCancel && (
                    <button type="button" className="vn-cancel-btn-bold" onClick={() => cancelOrder(order.id)}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {step === 'inbox' && inboxOrder && (
        <div className="vn-inbox">
          <div className="vn-order-card">
            <div className="vn-order-top">
              <ServiceLogo id={inboxOrder.serviceId} />
              <div className="vn-order-meta">
                <strong>{inboxOrder.service}</strong>
                <small>{inboxOrder.number}</small>
              </div>
            </div>
            {inboxOrder.otp ? (
              <div className="vn-sms-row">
                <span>SMS code</span>
                <strong>{inboxOrder.otp}</strong>
                <button type="button" className="vn-copy-icon" onClick={() => copyText(inboxOrder.otp!, 'Code copied')}>
                  <Copy size={14} />
                </button>
              </div>
            ) : (
              <div className="vn-empty">Waiting for SMS…</div>
            )}
          </div>
        </div>
      )}

      {priceSheet?.open && (
        <div className="vn-sheet-backdrop" onClick={() => setPriceSheet(null)}>
          <div className="vn-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="vn-sheet-head">
              <strong>
                {priceSheet.service.name} · {priceSheet.country.name}
              </strong>
              <button type="button" onClick={() => setPriceSheet(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="vn-sheet-sub">{priceSheet.pool.title}</p>
            {pricesLoading && <div className="vn-empty">Loading prices…</div>}
            {!pricesLoading && priceSheet.options.length === 0 && (
              <div className="vn-empty">No routes in this tier right now.</div>
            )}
            <div className="vn-price-list">
              {priceSheet.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="vn-price-row"
                  onClick={() => openConfirm(opt)}
                >
                  <div>
                    <strong>{formatNgn(opt.priceNgn)}</strong>
                    <small>{opt.stock > 0 ? `${opt.stock.toLocaleString()} available` : 'In stock'}</small>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirmSheet && (
        <div className="vn-sheet-backdrop" onClick={() => !buying && setConfirmSheet(null)}>
          <div className="vn-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="vn-sheet-head">
              <strong>Confirm purchase</strong>
              <button type="button" onClick={() => !buying && setConfirmSheet(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p>
              {confirmSheet.service.name} · {confirmSheet.country.name}
              <br />
              {confirmSheet.pool.title}
            </p>
            <p className="vn-confirm-price">{formatNgn(confirmSheet.option.priceNgn)}</p>
            <button type="button" className="vn-confirm-buy" onClick={confirmPurchase} disabled={buying}>
              {buying ? 'Buying…' : 'Buy number'}
            </button>
          </div>
        </div>
      )}

      {aboutOpen && (
        <div className="vn-sheet-backdrop" onClick={() => setAboutOpen(false)}>
          <div className="vn-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="vn-sheet-head">
              <strong>About SMS delivery</strong>
              <button type="button" onClick={() => setAboutOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="vn-about-body">
              <p>
                After you buy a number, keep the app open or return to My Orders. Most codes arrive in 1–3
                minutes. You can cancel after the lock period if no SMS arrives. Unused numbers are released
                automatically when the lifetime timer ends.
              </p>
            </div>
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
