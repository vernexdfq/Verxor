import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  KeyRound,
  Search,
  ShieldAlert,
  Smartphone,
  X,
} from 'lucide-react';
import { Card, PrimaryButton, SectionHeader } from './components/ui';
import './virtual-numbers-page.css';

type Pool = {
  id: string;
  label: string;
  type: 'VoIP' | 'Non-VoIP';
  price: number;
  stock: number;
  note: string;
};

type Country = {
  code: string;
  flag: string;
  name: string;
  dial: string;
  pools: Pool[];
};

type Service = {
  id: string;
  name: string;
  popular?: boolean;
};

type Order = {
  id: string;
  service: string;
  country: string;
  number: string;
  status: 'waiting' | 'received' | 'expired' | 'cancelled';
  price: number;
  code?: string;
  createdAt: string;
};

const SERVICES: Service[] = [
  { id: 'whatsapp', name: 'WhatsApp', popular: true },
  { id: 'telegram', name: 'Telegram', popular: true },
  { id: 'instagram', name: 'Instagram', popular: true },
  { id: 'google', name: 'Google', popular: true },
  { id: 'facebook', name: 'Facebook', popular: true },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'twitter', name: 'X / Twitter' },
  { id: 'discord', name: 'Discord' },
  { id: 'microsoft', name: 'Microsoft' },
  { id: 'amazon', name: 'Amazon' },
  { id: 'apple', name: 'Apple' },
  { id: 'paypal', name: 'PayPal' },
  { id: 'uber', name: 'Uber' },
  { id: 'binance', name: 'Binance' },
  { id: 'other', name: 'Other / Custom' },
];

const COUNTRIES: Country[] = [
  {
    code: 'US',
    flag: '🇺🇸',
    name: 'United States',
    dial: '+1',
    pools: [
      { id: 'us-fast', label: 'Fast', type: 'VoIP', price: 3200, stock: 48, note: 'Quick delivery · may be restricted on strict apps' },
      { id: 'us-standard', label: 'Standard', type: 'VoIP', price: 2800, stock: 120, note: 'Good balance of price and availability' },
      { id: 'us-premium', label: 'Premium', type: 'Non-VoIP', price: 6500, stock: 14, note: 'Higher compatibility · limited stock' },
    ],
  },
  {
    code: 'GB',
    flag: '🇬🇧',
    name: 'United Kingdom',
    dial: '+44',
    pools: [
      { id: 'gb-fast', label: 'Fast', type: 'VoIP', price: 3500, stock: 32, note: 'Quick delivery · may be restricted on strict apps' },
      { id: 'gb-premium', label: 'Premium', type: 'Non-VoIP', price: 7200, stock: 9, note: 'Higher compatibility · limited stock' },
    ],
  },
  {
    code: 'CA',
    flag: '🇨🇦',
    name: 'Canada',
    dial: '+1',
    pools: [
      { id: 'ca-standard', label: 'Standard', type: 'VoIP', price: 3000, stock: 55, note: 'Good availability' },
      { id: 'ca-premium', label: 'Premium', type: 'Non-VoIP', price: 6800, stock: 11, note: 'Higher compatibility' },
    ],
  },
  {
    code: 'DE',
    flag: '🇩🇪',
    name: 'Germany',
    dial: '+49',
    pools: [
      { id: 'de-standard', label: 'Standard', type: 'VoIP', price: 3400, stock: 28, note: 'EU routing' },
      { id: 'de-premium', label: 'Premium', type: 'Non-VoIP', price: 7100, stock: 7, note: 'Higher compatibility' },
    ],
  },
  {
    code: 'NL',
    flag: '🇳🇱',
    name: 'Netherlands',
    dial: '+31',
    pools: [
      { id: 'nl-premium', label: 'Premium', type: 'Non-VoIP', price: 6900, stock: 12, note: 'Generally more compatible' },
    ],
  },
  {
    code: 'AU',
    flag: '🇦🇺',
    name: 'Australia',
    dial: '+61',
    pools: [
      { id: 'au-standard', label: 'Standard', type: 'VoIP', price: 3600, stock: 22, note: 'Good availability' },
    ],
  },
  {
    code: 'IN',
    flag: '🇮🇳',
    name: 'India',
    dial: '+91',
    pools: [
      { id: 'in-standard', label: 'Standard', type: 'VoIP', price: 1800, stock: 90, note: 'Lower cost · may be restricted' },
    ],
  },
  {
    code: 'FR',
    flag: '🇫🇷',
    name: 'France',
    dial: '+33',
    pools: [
      { id: 'fr-standard', label: 'Standard', type: 'VoIP', price: 3300, stock: 18, note: 'EU routing' },
    ],
  },
];

const money = (n: number) => `₦${n.toLocaleString('en-NG')}`;

type Step = 'browse' | 'country' | 'pools' | 'order';

export function VirtualNumbersPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('browse');
  const [serviceQuery, setServiceQuery] = useState('');
  const [countryQuery, setCountryQuery] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [copied, setCopied] = useState(false);

  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return SERVICES;
    return SERVICES.filter((s) => s.name.toLowerCase().includes(q));
  }, [serviceQuery]);

  const popularServices = SERVICES.filter((s) => s.popular);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [countryQuery]);

  const selectService = (service: Service) => {
    setSelectedService(service);
    setCountryQuery('');
    setStep('country');
  };

  const selectCountry = (country: Country) => {
    setSelectedCountry(country);
    setSelectedPool(null);
    setStep('pools');
  };

  const buyPool = (pool: Pool) => {
    if (!selectedService || !selectedCountry) return;
    setSelectedPool(pool);
    // Demo order — real purchase will hit the provider API + wallet.
    const order: Order = {
      id: `VN-${Date.now().toString(36).toUpperCase()}`,
      service: selectedService.name,
      country: selectedCountry.name,
      number: `${selectedCountry.dial} ${Math.floor(2000000000 + Math.random() * 7000000000)}`,
      status: 'waiting',
      price: pool.price,
      createdAt: new Date().toISOString(),
    };
    setActiveOrder(order);
    setOrders((prev) => [order, ...prev]);
    setStep('order');
  };

  const copyNumber = async () => {
    if (!activeOrder) return;
    try {
      await navigator.clipboard.writeText(activeOrder.number.replace(/\s/g, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const simulateSms = () => {
    if (!activeOrder) return;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const updated: Order = { ...activeOrder, status: 'received', code };
    setActiveOrder(updated);
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const goBrowse = () => {
    setStep('browse');
    setSelectedService(null);
    setSelectedCountry(null);
    setSelectedPool(null);
    setActiveOrder(null);
    setServiceQuery('');
    setCountryQuery('');
  };

  return (
    <div className="vn-page">
      <button className="back-button" onClick={step === 'browse' ? onBack : () => {
        if (step === 'order') goBrowse();
        else if (step === 'pools') setStep('country');
        else if (step === 'country') setStep('browse');
      }}>
        <ArrowLeft size={17} />
        {step === 'browse' ? 'Back' : 'Back'}
      </button>

      {step === 'browse' && (
        <>
          <header className="vn-header">
            <p className="eyebrow">OTP VERIFICATION</p>
            <h1>Virtual Numbers</h1>
            <p>Pick a service, choose a country and pool, then receive the SMS code.</p>
          </header>

          <div className="vn-notice">
            <ShieldAlert size={16} />
            <span>
              VoIP numbers are cheaper but some platforms restrict them. Premium (Non-VoIP) pools usually work better on strict apps. Success is never guaranteed.
            </span>
          </div>

          <div className="vn-search">
            <Search size={17} />
            <input
              value={serviceQuery}
              onChange={(e) => setServiceQuery(e.target.value)}
              placeholder="Search service (WhatsApp, Telegram…)"
              aria-label="Search service"
            />
            {serviceQuery && (
              <button type="button" className="vn-clear" onClick={() => setServiceQuery('')} aria-label="Clear">
                <X size={15} />
              </button>
            )}
          </div>

          {!serviceQuery && (
            <>
              <p className="vn-section-label">Popular</p>
              <div className="vn-chip-row">
                {popularServices.map((s) => (
                  <button key={s.id} type="button" className="vn-chip" onClick={() => selectService(s)}>
                    {s.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="vn-section-label">{serviceQuery ? 'Results' : 'All services'}</p>
          <div className="vn-service-list">
            {filteredServices.map((s) => (
              <button key={s.id} type="button" className="vn-service-row" onClick={() => selectService(s)}>
                <span className="vn-service-icon">
                  <Smartphone size={18} />
                </span>
                <span className="vn-service-copy">
                  <strong>{s.name}</strong>
                  <small>Select country & pool</small>
                </span>
                <ChevronRight size={17} className="vn-chevron" />
              </button>
            ))}
            {!filteredServices.length && (
              <Card className="vn-empty">
                <Search size={18} />
                <strong>No service found</strong>
                <p>Try another name.</p>
              </Card>
            )}
          </div>

          <SectionHeader eyebrow="ORDERS" title="Recent orders" />
          {orders.length === 0 ? (
            <Card className="vn-empty compact">
              <KeyRound size={18} />
              <strong>No numbers yet</strong>
              <p>Your purchased virtual numbers will appear here.</p>
            </Card>
          ) : (
            <div className="vn-order-list">
              {orders.slice(0, 5).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="vn-order-row"
                  onClick={() => {
                    setActiveOrder(o);
                    setStep('order');
                  }}
                >
                  <div>
                    <strong>{o.service}</strong>
                    <small>{o.number} · {o.country}</small>
                  </div>
                  <span className={`vn-status vn-status-${o.status}`}>{o.status}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === 'country' && selectedService && (
        <>
          <header className="vn-header compact">
            <p className="eyebrow">SERVICE</p>
            <h1>{selectedService.name}</h1>
            <p>Choose a country for this verification.</p>
          </header>

          <div className="vn-search">
            <Search size={17} />
            <input
              value={countryQuery}
              onChange={(e) => setCountryQuery(e.target.value)}
              placeholder="Search country"
              aria-label="Search country"
            />
          </div>

          <div className="vn-country-list">
            {filteredCountries.map((c) => {
              const lowest = Math.min(...c.pools.map((p) => p.price));
              return (
                <button key={c.code} type="button" className="vn-country-row" onClick={() => selectCountry(c)}>
                  <span className="vn-flag">{c.flag}</span>
                  <span className="vn-country-copy">
                    <strong>{c.name}</strong>
                    <small>{c.dial} · from {money(lowest)}</small>
                  </span>
                  <ChevronRight size={17} className="vn-chevron" />
                </button>
              );
            })}
            {!filteredCountries.length && (
              <Card className="vn-empty">
                <Search size={18} />
                <strong>No countries found</strong>
                <p>Try another search.</p>
              </Card>
            )}
          </div>
        </>
      )}

      {step === 'pools' && selectedService && selectedCountry && (
        <>
          <header className="vn-header compact">
            <p className="eyebrow">{selectedCountry.flag} {selectedCountry.name}</p>
            <h1>{selectedService.name}</h1>
            <p>Select a pool. Premium usually works better on strict platforms.</p>
          </header>

          <div className="vn-pool-list">
            {selectedCountry.pools.map((pool) => (
              <Card key={pool.id} className="vn-pool-card">
                <div className="vn-pool-top">
                  <div>
                    <strong>{pool.label}</strong>
                    <span className={`vn-type ${pool.type === 'Non-VoIP' ? 'good' : 'warn'}`}>{pool.type}</span>
                  </div>
                  <div className="vn-pool-price">
                    <strong>{money(pool.price)}</strong>
                    <small>{pool.stock} in stock</small>
                  </div>
                </div>
                <p className="vn-pool-note">{pool.note}</p>
                <PrimaryButton
                  disabled={pool.stock < 1}
                  onClick={() => buyPool(pool)}
                >
                  {pool.stock < 1 ? 'Out of stock' : 'Buy number'}
                </PrimaryButton>
              </Card>
            ))}
          </div>
        </>
      )}

      {step === 'order' && activeOrder && (
        <>
          <header className="vn-header compact">
            <p className="eyebrow">ORDER {activeOrder.id}</p>
            <h1>{activeOrder.service}</h1>
            <p>{activeOrder.country}</p>
          </header>

          <Card className="vn-active-card">
            <div className="vn-active-number">
              <span className="vn-active-label">Your number</span>
              <strong>{activeOrder.number}</strong>
              <button type="button" className="vn-copy-btn" onClick={copyNumber}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className={`vn-status-banner vn-status-${activeOrder.status}`}>
              {activeOrder.status === 'waiting' && (
                <>
                  <Clock3 size={16} />
                  <span>Waiting for SMS… Enter this number on {activeOrder.service}.</span>
                </>
              )}
              {activeOrder.status === 'received' && (
                <>
                  <Check size={16} />
                  <span>Code received</span>
                </>
              )}
            </div>

            {activeOrder.status === 'received' && activeOrder.code && (
              <div className="vn-code-box">
                <span>SMS CODE</span>
                <strong>{activeOrder.code}</strong>
              </div>
            )}

            {activeOrder.status === 'waiting' && (
              <button type="button" className="vn-demo-sms" onClick={simulateSms}>
                Simulate SMS (demo)
              </button>
            )}

            <div className="vn-order-meta">
              <div><span>Price</span><strong>{money(activeOrder.price)}</strong></div>
              <div><span>Status</span><strong className="capitalize">{activeOrder.status}</strong></div>
            </div>
          </Card>

          <PrimaryButton onClick={goBrowse}>Buy another number</PrimaryButton>
          <p className="vn-footnote">
            Real delivery will use your wallet and live provider inventory. This screen is the product UI ready for API connection.
          </p>
        </>
      )}
    </div>
  );
}
