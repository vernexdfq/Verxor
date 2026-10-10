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
  SERVICES,
  PROMO_SLIDES,
  mockPrices,
  formatNgn,
  formatUsd,
  formatTimer,
} from './virtual-numbers-data';
import { ServiceLogo, PoolCard } from './virtual-numbers-components';

export type { CustomerNumberOrder };

export function VirtualNumbersPage({
  onBack,
  onOpenNotifications: _onOpenNotifications,
  orders: externalOrders = [],
}: {
  onBack: () => void;
  onOpenNotifications: () => void;
  orders?: CustomerNumberOrder[];
}) {
  const [step, setStep] = useState<Step>('pools');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [category, setCategory] = useState<ServiceCategory>('all');
  const [serviceQuery, setServiceQuery] = useState('');
  const [countryQuery, setCountryQuery] = useState('');
  const [promoIndex, setPromoIndex] = useState(0);
  const [balance] = useState(7570);
  const [localOrders, setLocalOrders] = useState<CustomerNumberOrder[]>(externalOrders);
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

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPromoIndex((i) => (i + 1) % PROMO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const activeOrders = useMemo(
    () => localOrders.filter((o) => o.status === 'waiting' || o.status === 'received'),
    [localOrders],
  );
  const pastOrders = useMemo(
    () => localOrders.filter((o) => o.status === 'completed' || o.status === 'cancelled' || o.status === 'received'),
    [localOrders],
  );

  const filteredServices = useMemo(() => {
    let list = SERVICES;
    if (category !== 'all') list = list.filter((s) => s.category === category);
    const q = serviceQuery.trim().toLowerCase();
    if (q) list = list.filter((s) => s.name.toLowerCase().includes(q));
    return list;
  }, [category, serviceQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SERVICES.length };
    for (const s of SERVICES) counts[s.category] = (counts[s.category] || 0) + 1;
    return counts;
  }, []);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return WORLDWIDE_COUNTRIES;
    return WORLDWIDE_COUNTRIES.filter((c) =>
      [c.name, c.code, c.dial].some((v) => v.toLowerCase().includes(q)),
    );
  }, [countryQuery]);

  const selectPool = (pool: Pool) => {
    setSelectedPool(pool);
    setSelectedService(null);
    setSelectedCountry(pool.location === 'USA' ? USA_COUNTRY : null);
    setServiceQuery('');
    setCountryQuery('');
    setCategory('all');
    setStep('services');
  };

  const selectService = (service: Service) => {
    if (!selectedPool) return;
    setSelectedService(service);
    if (selectedPool.location === 'USA') {
      const options = mockPrices(selectedPool, service.id, 'US');
      setPriceSheet({ open: true, options, service, country: USA_COUNTRY, pool: selectedPool });
    } else {
      setCountryQuery('');
      setStep('countries');
    }
  };

  const selectCountry = (country: Country) => {
    if (!selectedPool || !selectedService) return;
    setSelectedCountry(country);
    const options = mockPrices(selectedPool, selectedService.id, country.code);
    setPriceSheet({ open: true, options, service: selectedService, country, pool: selectedPool });
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

  const confirmPurchase = () => {
    if (!confirmSheet) return;
    const { option, service, country, pool } = confirmSheet;
    const order: CustomerNumberOrder = {
      id: `ord-${Date.now()}`,
      number:
        country.dial +
        ' ' +
        String(Math.floor(100000000 + Math.random() * 899999999)).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'),
      service: service.name,
      serviceId: service.id,
      country: country.name,
      poolTitle: pool.title,
      status: 'waiting',
      priceNgn: option.priceNgn,
      expiresAt: Date.now() + 20 * 60 * 1000,
      createdAt: new Date().toISOString(),
    };
    setLocalOrders((prev) => [order, ...prev]);
    setConfirmSheet(null);
    setPriceSheet(null);
    setStep('activations');

    const orderId = order.id;
    setTimeout(() => {
      const demoOtp = String(Math.floor(100000 + Math.random() * 900000));
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'received' as const, otp: demoOtp } : o)),
      );
      setInboxOrder((cur) => (cur && cur.id === orderId ? { ...cur, status: 'received', otp: demoOtp } : cur));
    }, 8000);
  };

  const cancelOrder = (id: string) => {
    setLocalOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' as const } : o)));
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
    else if (step === 'activations' || step === 'orders' || step === 'inbox') setStep('pools');
    else onBack();
  };

  const promo = PROMO_SLIDES[promoIndex];

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
                : step === 'activations'
                  ? 'Current activations'
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
                : step === 'activations'
                  ? 'Waiting for SMS'
                  : step === 'orders'
                    ? 'Purchase history'
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

          {activeOrders.length > 0 && (
            <div className="vn-current-strip">
              <div className="vn-current-strip-head">
                <strong>Current orders</strong>
                <button type="button" onClick={() => setStep('activations')}>View all</button>
              </div>
              {activeOrders.slice(0, 2).map((o) => (
                <div key={o.id} className="vn-current-chip">
                  <ServiceLogo id={o.serviceId} />
                  <div>
                    <strong>{o.service}</strong>
                    <small>{o.number}</small>
                  </div>
                  <span className="vn-chip-timer">{formatTimer(o.expiresAt - Date.now())}</span>
                </div>
              ))}
            </div>
          )}

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

          <div className="vn-footer-links">
            <button type="button" onClick={() => setStep('orders')}>My Orders</button>
            <button type="button" onClick={() => setStep('activations')}>Current activations</button>
          </div>
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
            {filteredServices.map((s) => (
              <button key={s.id} type="button" className="vn-service-row" onClick={() => selectService(s)}>
                <ServiceLogo id={s.id} />
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

      {(step === 'activations' || step === 'orders') && (
        <div className="vn-orders">
          <div className="vn-orders-tabs">
            <button type="button" className={step === 'activations' ? 'active' : ''} onClick={() => setStep('activations')}>
              Active
            </button>
            <button type="button" className={step === 'orders' ? 'active' : ''} onClick={() => setStep('orders')}>
              History
            </button>
          </div>
          {(step === 'activations' ? activeOrders : pastOrders).length === 0 && (
            <div className="vn-empty">No orders yet. Buy a number to get started.</div>
          )}
          {(step === 'activations' ? activeOrders : pastOrders).map((order) => (
            <div key={order.id} className="vn-order-card">
              <div className="vn-order-top">
                <ServiceLogo id={order.serviceId} />
                <div className="vn-order-meta">
                  <strong>{order.service}</strong>
                  <small>{order.country} · {order.poolTitle}</small>
                </div>
                <span className={`vn-status vn-status-${order.status}`}>
                  {order.status === 'waiting' ? 'Waiting' : order.status === 'received' ? 'Received' : order.status}
                </span>
              </div>
              <div className="vn-number-row">
                <strong className="vn-number">{order.number}</strong>
                <button type="button" className="vn-copy-icon" onClick={() => copyText(order.number, 'Number copied')} aria-label="Copy number">
                  <Copy size={14} />
                </button>
              </div>
              {order.otp && (
                <div className="vn-sms-row">
                  <span>SMS code</span>
                  <strong>{order.otp}</strong>
                  <button type="button" className="vn-copy-icon" onClick={() => copyText(order.otp!, 'Code copied')} aria-label="Copy code">
                    <Copy size={14} />
                  </button>
                </div>
              )}
              {order.status === 'waiting' && (
                <div className="vn-order-actions">
                  <span className="vn-timer"><Clock3 size={14} /> {formatTimer(order.expiresAt - Date.now())}</span>
                  <button type="button" className="vn-cancel-btn" onClick={() => cancelOrder(order.id)}>Cancel</button>
                  <button type="button" className="vn-inbox-btn" onClick={() => { setInboxOrder(order); setStep('inbox'); }}>Open inbox</button>
                </div>
              )}
              {order.status === 'received' && (
                <div className="vn-order-actions">
                  <button type="button" className="vn-inbox-btn" onClick={() => { setInboxOrder(order); setStep('inbox'); }}>Open inbox</button>
                </div>
              )}
            </div>
          ))}
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
              <div className="vn-waiting">
                <Radio size={18} />
                <span>Waiting for SMS… {formatTimer(inboxOrder.expiresAt - Date.now())}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {priceSheet?.open && (
        <div className="vn-sheet-backdrop" onClick={() => setPriceSheet(null)}>
          <div className="vn-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="vn-sheet-head">
              <strong>{priceSheet.service.name}</strong>
              <button type="button" onClick={() => setPriceSheet(null)}><X size={18} /></button>
            </div>
            <p className="vn-sheet-sub">{priceSheet.country.flag} {priceSheet.country.name} · {priceSheet.pool.title}</p>
            <div className="vn-price-options">
              {priceSheet.options.map((opt) => (
                <button key={opt.id} type="button" className="vn-price-option" onClick={() => openConfirm(opt)}>
                  <span>{opt.provider}</span>
                  <strong>{formatNgn(opt.priceNgn)}</strong>
                  <small>{formatUsd(opt.priceUsd)} · {opt.stock.toLocaleString()} left</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirmSheet && (
        <div className="vn-sheet-backdrop" onClick={() => setConfirmSheet(null)}>
          <div className="vn-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="vn-sheet-head">
              <strong>Confirm purchase</strong>
              <button type="button" onClick={() => setConfirmSheet(null)}><X size={18} /></button>
            </div>
            <p>Buy {confirmSheet.service.name} number for {confirmSheet.country.name}?</p>
            <p className="vn-confirm-price">{formatNgn(confirmSheet.option.priceNgn)}</p>
            <button type="button" className="vn-confirm-btn" onClick={confirmPurchase}>Confirm &amp; Buy</button>
          </div>
        </div>
      )}

      {copyToast && (
        <div className="vn-copy-modal">
          <div className="vn-copy-modal-card">
            <strong>{copyToast}</strong>
            <button type="button" onClick={() => setCopyToast(null)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
