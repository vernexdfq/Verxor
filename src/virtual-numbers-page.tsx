import { useMemo, useState } from 'react';
import { ArrowLeft, Bell, ChevronRight, Globe2, Search, Smartphone, WalletCards, X } from 'lucide-react';
import { Card } from './components/ui';
import './virtual-numbers-page.css';
import './virtual-numbers-refinements.css';

type PoolId =
  | 'usa-s1'
  | 'usa-s2'
  | 'worldwide-s1'
  | 'worldwide-s2';

type Pool = {
  id: PoolId;
  title: string;
  server: 1 | 2;
  location: 'USA' | 'Worldwide';
  hint: string;
};

type Country = {
  code: string;
  flag: string;
  name: string;
  dial: string;
};

export type CustomerNumberOrder = {
  id: string;
  number: string;
  service: string;
  poolTitle: string;
  status: 'waiting' | 'received' | 'completed' | 'cancelled';
  otp?: string;
  createdAt: string;
};

type Service = {
  id: string;
  name: string;
};

/** Server 1 = lower cost / volume. Server 2 = higher cost / better success rates. No VoIP claims on OTP. */
const SERVER1_POOLS: Pool[] = [
  { id: 'usa-s1', title: 'USA · Server 1', server: 1, location: 'USA', hint: 'Economy routes' },
  { id: 'worldwide-s1', title: 'Worldwide · Server 1', server: 1, location: 'Worldwide', hint: 'Economy routes' },
];

const SERVER2_POOLS: Pool[] = [
  { id: 'usa-s2', title: 'USA · Server 2', server: 2, location: 'USA', hint: 'Higher success routes' },
  { id: 'worldwide-s2', title: 'Worldwide · Server 2', server: 2, location: 'Worldwide', hint: 'Higher success routes' },
];

const WORLDWIDE_COUNTRIES: Country[] = [
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dial: '+44' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', dial: '+1' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', dial: '+49' },
  { code: 'FR', flag: '🇫🇷', name: 'France', dial: '+33' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands', dial: '+31' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', dial: '+61' },
  { code: 'IN', flag: '🇮🇳', name: 'India', dial: '+91' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain', dial: '+34' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy', dial: '+39' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil', dial: '+55' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa', dial: '+27' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria', dial: '+234' },
];

const USA_COUNTRY: Country = { code: 'US', flag: '🇺🇸', name: 'United States', dial: '+1' };

const SERVICES: Service[] = [
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'google', name: 'Google' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'twitter', name: 'X / Twitter' },
  { id: 'discord', name: 'Discord' },
  { id: 'microsoft', name: 'Microsoft' },
  { id: 'amazon', name: 'Amazon' },
  { id: 'apple', name: 'Apple' },
  { id: 'paypal', name: 'PayPal' },
];

type Step = 'pools' | 'country' | 'services';

export function VirtualNumbersPage({
  onBack,
  onOpenNotifications,
  orders = [],
}: {
  onBack: () => void;
  onOpenNotifications: () => void;
  orders?: CustomerNumberOrder[];
}) {
  const [step, setStep] = useState<Step>('pools');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countryQuery, setCountryQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return WORLDWIDE_COUNTRIES;
    return WORLDWIDE_COUNTRIES.filter((country) =>
      [country.name, country.code, country.dial].some((value) => value.toLowerCase().includes(q)),
    );
  }, [countryQuery]);

  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return SERVICES;
    return SERVICES.filter((service) => service.name.toLowerCase().includes(q));
  }, [serviceQuery]);

  const selectPool = (pool: Pool) => {
    setSelectedPool(pool);
    setCountryQuery('');
    setServiceQuery('');
    if (pool.location === 'USA') {
      setSelectedCountry(USA_COUNTRY);
      setStep('services');
    } else {
      setSelectedCountry(null);
      setStep('country');
    }
  };

  const handleBack = () => {
    if (step === 'pools') return onBack();
    if (step === 'country') {
      setSelectedPool(null);
      setStep('pools');
      return;
    }
    if (selectedPool?.location === 'Worldwide') {
      setSelectedCountry(null);
      setStep('country');
      return;
    }
    setSelectedPool(null);
    setSelectedCountry(null);
    setStep('pools');
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
          <button type="button" className="vn-notification" aria-label="Notifications" onClick={onOpenNotifications}>
            <Bell size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {step === 'pools' && (
        <>
          <section className="vn-intro">
            <h2>Virtual Numbers</h2>
            <p>Server 1 is lower cost. Server 2 is higher cost with better receive rates.</p>
          </section>

          <section className="vn-pool-grid" aria-label="Number servers">
            <div className="vn-pool-column">
              <span className="vn-type-tag">Server 1</span>
              <div className="vn-pool-list">
                {SERVER1_POOLS.map((pool) => (
                  <PoolCard key={pool.id} pool={pool} onSelect={selectPool} />
                ))}
              </div>
            </div>
            <div className="vn-pool-column">
              <span className="vn-type-tag">Server 2</span>
              <div className="vn-pool-list">
                {SERVER2_POOLS.map((pool) => (
                  <PoolCard key={pool.id} pool={pool} onSelect={selectPool} />
                ))}
              </div>
            </div>
          </section>

          <section className="vn-orders-section" aria-labelledby="vn-orders-title">
            <div className="vn-orders-head">
              <div>
                <span className="vn-section-label">YOUR ACTIVITY</span>
                <h3 id="vn-orders-title">Your numbers & orders</h3>
              </div>
              <span>{orders.length}</span>
            </div>

            {orders.length === 0 ? (
              <Card className="vn-orders-empty">
                <span className="vn-orders-empty-icon">
                  <Smartphone size={18} />
                </span>
                <div>
                  <strong>No numbers purchased yet</strong>
                  <p>Purchased numbers, OTP status and order details will appear here.</p>
                </div>
              </Card>
            ) : (
              <div className="vn-order-list">
                {orders.map((order) => (
                  <article className="vn-order-row" key={order.id}>
                    <div className="vn-order-number">
                      <strong>{order.number}</strong>
                      <small>
                        {order.service} · {order.poolTitle}
                      </small>
                      <span>
                        {order.createdAt} · {order.id}
                      </span>
                    </div>
                    <div className="vn-order-status">
                      <span className={`vn-status-pill ${order.status}`}>
                        {order.status === 'received' ? 'OTP received' : order.status}
                      </span>
                      {order.otp && <strong>OTP {order.otp}</strong>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {step === 'country' && selectedPool && (
        <>
          <section className="vn-intro compact">
            <p className="vn-eyebrow">
              Server {selectedPool.server} · {selectedPool.title}
            </p>
            <h2>Choose a country</h2>
            <p>Select the country for this server.</p>
          </section>
          <div className="vn-search-wrap">
            <div className="vn-search">
              <Search size={17} aria-hidden="true" />
              <input
                value={countryQuery}
                onChange={(event) => setCountryQuery(event.target.value)}
                placeholder="Search country"
                aria-label="Search country"
              />
              {countryQuery && (
                <button type="button" className="vn-clear" onClick={() => setCountryQuery('')} aria-label="Clear search">
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
          <div className="vn-service-section">
            <span className="vn-section-label">{countryQuery ? 'Results' : 'Countries'}</span>
            <div className="vn-service-list">
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  className="vn-service-row"
                  onClick={() => {
                    setSelectedCountry(country);
                    setServiceQuery('');
                    setStep('services');
                  }}
                >
                  <span className="vn-service-icon vn-flag-icon" aria-hidden="true">
                    {country.flag}
                  </span>
                  <span className="vn-service-copy">
                    <strong>{country.name}</strong>
                    <small>{country.dial}</small>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              ))}
              {!filteredCountries.length && (
                <Card className="vn-empty">
                  <Search size={18} />
                  <strong>No country found</strong>
                  <p>Try another search.</p>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {step === 'services' && selectedPool && selectedCountry && (
        <>
          <section className="vn-intro compact">
            <p className="vn-eyebrow">
              Server {selectedPool.server} · {selectedPool.title} · {selectedCountry.flag} {selectedCountry.name}
            </p>
            <h2>Choose a service</h2>
            <p>Available services will use live provider inventory and Verxor pricing.</p>
          </section>

          <div className="vn-search-wrap">
            <div className="vn-search">
              <Search size={17} aria-hidden="true" />
              <input
                value={serviceQuery}
                onChange={(event) => setServiceQuery(event.target.value)}
                placeholder="Search service"
                aria-label="Search service"
              />
              {serviceQuery && (
                <button type="button" className="vn-clear" onClick={() => setServiceQuery('')} aria-label="Clear search">
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="vn-service-section">
            <span className="vn-section-label">{serviceQuery ? 'Results' : 'Services'}</span>
            <div className="vn-service-list">
              {filteredServices.map((service) => (
                <button key={service.id} type="button" className="vn-service-row vn-service-row-disabled" disabled>
                  <span className="vn-service-icon">
                    <Smartphone size={18} aria-hidden="true" />
                  </span>
                  <span className="vn-service-copy">
                    <strong>{service.name}</strong>
                    <small>Live provider availability coming next</small>
                  </span>
                  <span className="vn-service-price">Unavailable</span>
                </button>
              ))}
            </div>
            <Card className="vn-provider-note">
              <strong>Live inventory is not connected yet</strong>
              <p>
                Provider adapters supply the real catalog. Backend assigns Server 1 / Server 2 by cost bands and success
                routing. Numbers above your max cost are filtered out.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function PoolCard({ pool, onSelect }: { pool: Pool; onSelect: (pool: Pool) => void }) {
  return (
    <button type="button" className="vn-pool-choice" onClick={() => onSelect(pool)} aria-label={`Select ${pool.title}`}>
      <span className="vn-pool-icon" aria-hidden="true">
        {pool.location === 'USA' ? <span className="vn-flag">🇺🇸</span> : <Globe2 size={18} />}
      </span>
      <span className="vn-pool-copy">
        <strong>{pool.title}</strong>
        <small>{pool.hint}</small>
      </span>
      <ChevronRight className="vn-pool-chevron" size={16} aria-hidden="true" />
    </button>
  );
}
