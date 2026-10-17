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

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
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

  async function requestCancelAndRefund(o: CustomerNumberOrder) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = loadSessionTokens()?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
      const profile = loadSessionProfile();
      await fetch('/api/v1/numbers/cancel', {
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
    } catch {}
  }

  useEffect(() => {
    const now = Date.now();
    const expired = localOrders.filter((o) => o.status === 'waiting' && o.expiresAt <= now);
    if (expired.length === 0) return;
    for (const o of expired) void requestCancelAndRefund(o);
    setLocalOrders((prev) =>
      prev.map((o) =>
        o.status === 'waiting' && o.expiresAt <= Date.now()
          ? { ...o, status: 'cancelled' as const }
          : o,
      ),
    );
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
      setLiveServices(cached);
      setServicesLoading(false);
      void (async () => {
        try {
          const res = await fetch(`/api/v1/catalog?mode=services&pool=${encodeURIComponent(pool.id)}`);
          const data = await res.json();
          if (data.ok) {
            const mapped = mapServices(data.services || []);
            setLiveServices(mapped);
            writeCache(cacheKey, mapped);
          }
        } catch {}
      })();
      return;
    }
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

  const cancelOrder = (id: string) => {
    const o = localOrders.find((x) => x.id === id);
    if (o) void requestCancelAndRefund(o);
    setLocalOrders((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: 'cancelled' as const } : x)),
    );
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
                  <span>{s.name}</span>
                  <ChevronRight size={16} />
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
                    ) : null}
                  </div>
                )}
                {o.status === 'cancelled' && (
                  <div className="vn-refund-note">
                    <span>✓ {formatNgn(o.priceNgn)} refunded to your wallet</span>
                  </div>
                )}
                <div className="vn-order-actions">
                  {o.status === 'waiting' && now >= (o.cancelAvailableAt || 0) && (
                    <button type="button" className="vn-cancel-btn-bold" onClick={() => cancelOrder(o.id)}>Cancel</button>
                  )}
                  {o.status === 'cancelled' && (
                    <>
                      <button type="button" className="vn-refunded-btn" disabled>✓ Refunded</button>
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
