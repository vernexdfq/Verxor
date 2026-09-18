import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Globe2,
  Search,
  Smartphone,
  WalletCards,
  X,
} from 'lucide-react';
import { Card, PrimaryButton } from './components/ui';
import './virtual-numbers-page.css';

type PoolId =
  | 'usa-economy'
  | 'usa-standard'
  | 'worldwide-economy'
  | 'worldwide-standard'
  | 'usa-fast'
  | 'usa-premium'
  | 'worldwide-fast'
  | 'worldwide-premium';

type Pool = {
  id: PoolId;
  title: string;
  kind: 'VoIP' | 'Non-VoIP';
  location: 'USA' | 'Worldwide';
  fromPrice: number;
  stock: number;
};

type Service = {
  id: string;
  name: string;
  popular?: boolean;
};

type ActiveOrder = {
  id: string;
  service: string;
  poolTitle: string;
  number: string;
  price: number;
  status: 'waiting' | 'received';
  code?: string;
};

const VOIP_POOLS: Pool[] = [
  { id: 'usa-economy', title: 'USA · Economy', kind: 'VoIP', location: 'USA', fromPrice: 1800, stock: 120 },
  { id: 'usa-standard', title: 'USA · Standard', kind: 'VoIP', location: 'USA', fromPrice: 2800, stock: 86 },
  { id: 'worldwide-economy', title: 'Worldwide · Economy', kind: 'VoIP', location: 'Worldwide', fromPrice: 1500, stock: 210 },
  { id: 'worldwide-standard', title: 'Worldwide · Standard', kind: 'VoIP', location: 'Worldwide', fromPrice: 2400, stock: 140 },
];

const NON_VOIP_POOLS: Pool[] = [
  { id: 'usa-fast', title: 'USA · Fast', kind: 'Non-VoIP', location: 'USA', fromPrice: 4500, stock: 42 },
  { id: 'usa-premium', title: 'USA · Premium', kind: 'Non-VoIP', location: 'USA', fromPrice: 6500, stock: 18 },
  { id: 'worldwide-fast', title: 'Worldwide · Fast', kind: 'Non-VoIP', location: 'Worldwide', fromPrice: 4200, stock: 55 },
  { id: 'worldwide-premium', title: 'Worldwide · Premium', kind: 'Non-VoIP', location: 'Worldwide', fromPrice: 7200, stock: 12 },
];

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
];

const money = (n: number) => `₦${n.toLocaleString('en-NG')}`;

function servicePrice(pool: Pool, serviceId: string): number {
  const bump =
    serviceId === 'whatsapp' || serviceId === 'telegram'
      ? 400
      : serviceId === 'google' || serviceId === 'apple'
        ? 250
        : 0;
  return pool.fromPrice + bump;
}

type Step = 'pools' | 'services' | 'order';

export function VirtualNumbersPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('pools');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [serviceQuery, setServiceQuery] = useState('');
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return SERVICES;
    return SERVICES.filter((s) => s.name.toLowerCase().includes(q));
  }, [serviceQuery]);

  const selectPool = (pool: Pool) => {
    setSelectedPool(pool);
    setServiceQuery('');
    setStep('services');
  };

  const buyService = (service: Service) => {
    if (!selectedPool) return;
    const price = servicePrice(selectedPool, service.id);
    const dial = selectedPool.location === 'USA' ? '+1' : '+44';
    const next: ActiveOrder = {
      id: `VN-${Date.now().toString(36).toUpperCase()}`,
      service: service.name,
      poolTitle: selectedPool.title,
      number: `${dial} ${Math.floor(2000000000 + Math.random() * 7000000000)}`,
      price,
      status: 'waiting',
    };
    setOrder(next);
    setStep('order');
  };

  const copyNumber = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.number.replace(/\s/g, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const simulateSms = () => {
    if (!order) return;
    setOrder({
      ...order,
      status: 'received',
      code: String(Math.floor(100000 + Math.random() * 900000)),
    });
  };

  const goPools = () => {
    setStep('pools');
    setSelectedPool(null);
    setOrder(null);
    setServiceQuery('');
  };

  const handleBack = () => {
    if (step === 'pools') onBack();
    else if (step === 'services') goPools();
    else if (step === 'order') {
      setOrder(null);
      setStep('services');
    }
  };

  return (
    <div className="vn-page">
      <header className="vn-topbar">
        <button type="button" className="vn-back" onClick={handleBack} aria-label="Back">
          <ArrowLeft size={19} aria-hidden="true" />
        </button>
        <h1>Virtual Numbers</h1>
        <div className="vn-top-actions">
          <button type="button" className="vn-wallet-pill" aria-label="Wallet balance">
            <WalletCards size={15} aria-hidden="true" />
            <span>$0.00</span>
          </button>
          <button type="button" className="vn-notification" aria-label="Notifications">
            <Bell size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {step === 'pools' && (
        <>
          <section className="vn-intro">
            <h2>Virtual Numbers</h2>
            <p>Choose a number based on compatibility, speed and price.</p>
          </section>

          <section className="vn-pool-grid" aria-label="Number pools">
            <div className="vn-pool-column">
              <span className="vn-type-tag">VoIP</span>
              <div className="vn-pool-list">
                {VOIP_POOLS.map((pool) => (
                  <PoolCard key={pool.id} pool={pool} onSelect={selectPool} />
                ))}
              </div>
            </div>

            <div className="vn-pool-column">
              <span className="vn-type-tag">Non-VoIP</span>
              <div className="vn-pool-list">
                {NON_VOIP_POOLS.map((pool) => (
                  <PoolCard key={pool.id} pool={pool} onSelect={selectPool} />
                ))}
              </div>
            </div>
          </section>

          <p className="vn-hint">
            VoIP is cheaper but some apps restrict it. Non-VoIP usually works better on strict platforms. Success is never guaranteed.
          </p>
        </>
      )}

      {step === 'services' && selectedPool && (
        <>
          <section className="vn-intro compact">
            <p className="vn-eyebrow">{selectedPool.kind} · {selectedPool.title}</p>
            <h2>Choose a service</h2>
            <p>From {money(selectedPool.fromPrice)} · {selectedPool.stock} numbers available in this pool</p>
          </section>

          <div className="vn-search-wrap">
            <div className="vn-search">
              <Search size={17} aria-hidden="true" />
              <input
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
                placeholder="Search WhatsApp, Telegram…"
                aria-label="Search service"
              />
              {serviceQuery ? (
                <button type="button" className="vn-clear" onClick={() => setServiceQuery('')} aria-label="Clear search">
                  <X size={15} />
                </button>
              ) : null}
            </div>
          </div>

          {!serviceQuery && (
            <div className="vn-popular">
              <span className="vn-section-label">Popular</span>
              <div className="vn-chips">
                {SERVICES.filter((s) => s.popular).map((s) => (
                  <button key={s.id} type="button" className="vn-chip" onClick={() => buyService(s)}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="vn-service-section">
            <span className="vn-section-label">{serviceQuery ? 'Results' : 'All services'}</span>
            <div className="vn-service-list">
              {filteredServices.map((service) => {
                const price = servicePrice(selectedPool, service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    className="vn-service-row"
                    onClick={() => buyService(service)}
                  >
                    <span className="vn-service-icon">
                      <Smartphone size={18} aria-hidden="true" />
                    </span>
                    <span className="vn-service-copy">
                      <strong>{service.name}</strong>
                      <small>{selectedPool.stock > 0 ? `${selectedPool.stock}+ in pool` : 'Limited'}</small>
                    </span>
                    <span className="vn-service-price">
                      <strong>{money(price)}</strong>
                      <ChevronRight size={16} aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
              {!filteredServices.length && (
                <Card className="vn-empty">
                  <Search size={18} />
                  <strong>No service found</strong>
                  <p>Try another name.</p>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {step === 'order' && order && (
        <>
          <section className="vn-intro compact">
            <p className="vn-eyebrow">ORDER {order.id}</p>
            <h2>{order.service}</h2>
            <p>{order.poolTitle}</p>
          </section>

          <div className="vn-order-wrap">
            <Card className="vn-order-card">
              <span className="vn-order-label">Your number</span>
              <strong className="vn-order-number">{order.number}</strong>
              <button type="button" className="vn-copy" onClick={copyNumber}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy number'}
              </button>

              <div className={`vn-status-banner ${order.status}`}>
                {order.status === 'waiting' ? (
                  <>
                    <Clock3 size={16} />
                    <span>Waiting for SMS… Enter this number on {order.service}.</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Code received</span>
                  </>
                )}
              </div>

              {order.status === 'received' && order.code && (
                <div className="vn-code-box">
                  <span>SMS CODE</span>
                  <strong>{order.code}</strong>
                </div>
              )}

              {order.status === 'waiting' && (
                <button type="button" className="vn-demo-sms" onClick={simulateSms}>
                  Simulate SMS (demo)
                </button>
              )}

              <div className="vn-order-meta">
                <div>
                  <span>Price</span>
                  <strong>{money(order.price)}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong className="capitalize">{order.status}</strong>
                </div>
              </div>
            </Card>

            <PrimaryButton onClick={goPools}>Buy another number</PrimaryButton>
            <p className="vn-footnote">
              Demo UI only. Live buy will debit wallet and request a number from the provider API.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function PoolCard({ pool, onSelect }: { pool: Pool; onSelect: (pool: Pool) => void }) {
  return (
    <button
      type="button"
      className="vn-pool-choice"
      onClick={() => onSelect(pool)}
      aria-label={`Select ${pool.title}, from ${money(pool.fromPrice)}`}
    >
      <span className="vn-pool-icon" aria-hidden="true">
        {pool.location === 'USA' ? <span className="vn-flag">🇺🇸</span> : <Globe2 size={18} />}
      </span>
      <span className="vn-pool-copy">
        <strong>{pool.title}</strong>
        <small>
          From {money(pool.fromPrice)} · {pool.stock} left
        </small>
      </span>
      <ChevronRight className="vn-pool-chevron" size={16} aria-hidden="true" />
    </button>
  );
}
