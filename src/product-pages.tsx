import { useMemo, useState } from 'react';
import { ArrowRight, Check, Clock3, Filter, Package, Search, ShieldCheck, Users, X } from 'lucide-react';
import { Card, PrimaryButton } from './components/ui';
import './product-pages.css';

type RentalNumber = {
  id: string;
  country: string;
  flag: string;
  number: string;
  type: 'Non-VoIP' | 'VoIP';
  region: string;
  price: number;
  features: string[];
};

type AccountProduct = {
  id: string;
  platform: string;
  tag: string;
  title: string;
  subtitle: string;
  age: string;
  country: string;
  price: number;
  stock: number;
  instant: boolean;
  features: string[];
};

// Development catalog only. Production inventory will come from the provider/service layer.
const rentalNumbers: RentalNumber[] = [
  { id: 'r1', country: 'United States', flag: '🇺🇸', number: '+1 (201) 555-0184', type: 'Non-VoIP', region: 'New Jersey', price: 12500, features: ['Voice', 'SMS'] },
  { id: 'r2', country: 'United States', flag: '🇺🇸', number: '+1 (305) 555-0142', type: 'VoIP', region: 'Florida', price: 9800, features: ['Voice', 'SMS'] },
  { id: 'r3', country: 'United Kingdom', flag: '🇬🇧', number: '+44 20 7946 0318', type: 'Non-VoIP', region: 'London', price: 13800, features: ['Voice', 'SMS'] },
  { id: 'r4', country: 'Canada', flag: '🇨🇦', number: '+1 (416) 555-0176', type: 'VoIP', region: 'Ontario', price: 10500, features: ['Voice', 'SMS'] },
];

const accountProducts: AccountProduct[] = [
  { id: 'a1', platform: 'Instagram', tag: 'IG', title: 'Instagram · Aged', subtitle: 'Email access included', age: 'Aged', country: 'Mixed', price: 4500, stock: 42, instant: true, features: ['Email access', 'Aged profile'] },
  { id: 'a2', platform: 'Instagram', tag: 'IG', title: 'Instagram · Followers', subtitle: '1K–5K follower range', age: '1–2 yrs', country: 'US', price: 8900, stock: 15, instant: true, features: ['Followers', 'Email access'] },
  { id: 'a3', platform: 'Facebook', tag: 'FB', title: 'Facebook · Verified', subtitle: 'Aged profile inventory', age: '3 yrs', country: 'USA', price: 6800, stock: 18, instant: true, features: ['Verified', 'Aged'] },
  { id: 'a4', platform: 'Gmail', tag: 'GM', title: 'Gmail · PVA + Recovery', subtitle: 'Phone verified with recovery', age: 'New', country: 'US', price: 1500, stock: 210, instant: true, features: ['PVA', 'Recovery'] },
  { id: 'a5', platform: 'TikTok', tag: 'TT', title: 'TikTok · Aged EU', subtitle: 'Email access included', age: '2 yrs', country: 'EU', price: 5200, stock: 27, instant: true, features: ['Aged', 'Email access'] },
  { id: 'a6', platform: 'X', tag: 'X', title: 'X · PVA', subtitle: 'Phone verified account', age: 'New', country: 'US', price: 3800, stock: 40, instant: true, features: ['PVA', 'Instant delivery'] },
];

const money = (value: number) => `₦${value.toLocaleString('en-NG')}`;

export function RentalPage({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'All' | 'Non-VoIP' | 'VoIP'>('All');
  const [selected, setSelected] = useState<RentalNumber | null>(null);
  const filtered = useMemo(
    () => rentalNumbers.filter((n) => (`${n.country} ${n.region} ${n.number} ${n.type}`).toLowerCase().includes(query.toLowerCase()) && (type === 'All' || n.type === type)),
    [query, type],
  );

  return (
    <div className="product-page">
      <button className="back-button" onClick={onBack}><ArrowRight size={16} className="back-arrow" /> Back to services</button>

      <header className="product-heading">
        <span className="eyebrow">DEDICATED LINE</span>
        <h1>Rent a Line</h1>
        <p>Keep a dedicated number for the period you need, with Voice + SMS where supported.</p>
      </header>

      <div className="product-notice">
        <ShieldCheck size={17} />
        <div>
          <strong>Compatibility is shown before checkout</strong>
          <span>Number type and supported features are displayed for each listing. Compatibility with third-party services can vary and is not guaranteed.</span>
        </div>
      </div>

      <div className="product-toolbar">
        <label className="product-search">
          <Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search country, region or number" />
        </label>
        <div className="segmented" role="group" aria-label="Number type">
          {(['All', 'Non-VoIP', 'VoIP'] as const).map((option) => (
            <button key={option} className={type === option ? 'active' : ''} onClick={() => setType(option)}>{option}</button>
          ))}
        </div>
      </div>

      <div className="inventory-head">
        <div><span className="eyebrow">PREVIEW INVENTORY</span><strong>{filtered.length} numbers</strong></div>
        <span className="catalog-badge">Development catalog</span>
      </div>

      <div className="inventory-list">
        {filtered.map((n) => (
          <Card className="inventory-card" key={n.id}>
            <div className="inventory-main">
              <div className="country-mark">{n.flag}</div>
              <div className="inventory-copy">
                <strong>{n.number}</strong>
                <span>{n.country} · {n.region}</span>
                <div className="tag-row">
                  <em className={n.type === 'Non-VoIP' ? 'good' : 'warn'}>{n.type}</em>
                  {n.features.map((feature) => <em key={feature}>{feature}</em>)}
                </div>
              </div>
            </div>
            <div className="inventory-side">
              <strong>{money(n.price)}</strong>
              <small>per month</small>
              <button onClick={() => setSelected(n)}>Review</button>
            </div>
          </Card>
        ))}
      </div>

      {!filtered.length && <Card className="product-empty"><div><Search size={20} /></div><strong>No numbers match your search</strong><p>Try another country, region or number type.</p></Card>}
      {selected && <RentalSheet number={selected} close={() => setSelected(null)} />}
    </div>
  );
}

function RentalSheet({ number, close }: { number: RentalNumber; close: () => void }) {
  const [plan, setPlan] = useState('1 Month');
  const multiplier = plan === '1 Week' ? 0.35 : plan === '1 Year' ? 10 : 1;
  const total = Math.ceil(number.price * multiplier);

  return (
    <div className="sheet-backdrop" onClick={close}>
      <section className="product-sheet" onClick={(e) => e.stopPropagation()} aria-modal="true" role="dialog">
        <div className="sheet-top">
          <div><span className="eyebrow">RENTAL DETAILS</span><h2>{number.number}</h2></div>
          <button onClick={close} aria-label="Close"><X size={19} /></button>
        </div>
        <div className="sheet-number"><span>{number.flag}</span><div><strong>{number.country}</strong><small>{number.region} · {number.type}</small></div></div>
        <div className="sheet-section">
          <span className="field-label">Rental period</span>
          <div className="plan-grid">
            {['1 Week', '1 Month', '1 Year'].map((period) => (
              <button className={plan === period ? 'selected' : ''} key={period} onClick={() => setPlan(period)}>
                <span>{period}</span>{period === '1 Month' && <em>Popular</em>}
              </button>
            ))}
          </div>
        </div>
        <div className="sheet-summary"><span>Total</span><strong>{money(total)}</strong></div>
        <PrimaryButton onClick={() => alert('Checkout is intentionally disabled until the Verxor wallet and provider service layer are connected.') }><Check size={17} /> Continue</PrimaryButton>
        <p className="sheet-footnote">The final flow will re-check availability, wallet balance and provider provisioning on the server before charging.</p>
      </section>
    </div>
  );
}

export function AccountsPage({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<AccountProduct | null>(null);
  const categories = ['All', 'Instagram', 'Facebook', 'TikTok', 'X', 'Telegram', 'WhatsApp', 'Gmail', 'YouTube', 'Discord', 'LinkedIn', 'Spotify', 'Netflix', 'ChatGPT', 'Other'];
  const filtered = useMemo(
    () => accountProducts.filter((p) => (category === 'All' || p.platform === category) && `${p.platform} ${p.title} ${p.subtitle} ${p.country}`.toLowerCase().includes(query.toLowerCase())),
    [category, query],
  );

  return (
    <div className="product-page">
      <button className="back-button" onClick={onBack}><ArrowRight size={16} className="back-arrow" /> Back to services</button>
      <header className="product-heading">
        <span className="eyebrow">ACCOUNT INVENTORY</span>
        <h1>Buy Accounts</h1>
        <p>Review available inventory, what is included and delivery terms before checkout.</p>
      </header>
      <div className="account-disclaimer"><ShieldCheck size={17} /><span>Catalog availability and delivery terms are shown before purchase. Use purchased accounts only in ways permitted by the relevant platform's rules.</span></div>
      <label className="product-search full"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search accounts or platforms" /></label>
      <div className="category-scroll">{categories.map((c) => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div>
      <div className="inventory-head"><div><span className="eyebrow">PREVIEW INVENTORY</span><strong>{filtered.length} products</strong></div><span className="inventory-note"><Filter size={14} /> Development catalog</span></div>
      <div className="account-grid">
        {filtered.map((p) => (
          <Card className="account-card" key={p.id}>
            <div className="account-card-top"><span className="account-logo">{p.tag}</span><span className={p.instant ? 'delivery instant' : 'delivery'}>{p.instant ? 'Instant' : 'Manual'}</span></div>
            <div className="account-card-copy"><span>{p.platform}</span><strong>{p.title}</strong><small>{p.subtitle}</small></div>
            <div className="account-meta"><span>{p.age} · {p.country}</span><span>{p.stock} in stock</span></div>
            <div className="account-card-bottom"><strong>{money(p.price)}</strong><button onClick={() => setSelected(p)}>Review <ArrowRight size={14} /></button></div>
          </Card>
        ))}
      </div>
      {!filtered.length && <Card className="product-empty"><div><Package size={20} /></div><strong>No accounts found</strong><p>Try another platform or search term.</p></Card>}
      {selected && <AccountSheet product={selected} close={() => setSelected(null)} />}
    </div>
  );
}

function AccountSheet({ product, close }: { product: AccountProduct; close: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={close}>
      <section className="product-sheet" onClick={(e) => e.stopPropagation()} aria-modal="true" role="dialog">
        <div className="sheet-top"><div><span className="eyebrow">PRODUCT DETAILS</span><h2>{product.title}</h2></div><button onClick={close} aria-label="Close"><X size={19} /></button></div>
        <div className="account-detail-head"><span className="account-logo large">{product.tag}</span><div><strong>{product.platform}</strong><small>{product.age} · {product.country}</small></div></div>
        <div className="detail-features">{product.features.map((feature) => <span key={feature}><Check size={14} /> {feature}</span>)}</div>
        <div className="sheet-summary"><div><span>Price</span><small>{product.stock} available</small></div><strong>{money(product.price)}</strong></div>
        <PrimaryButton onClick={() => alert('Checkout is intentionally disabled until the Verxor wallet and provider service layer are connected.')}><Users size={17} /> Continue to checkout</PrimaryButton>
        <p className="sheet-footnote">Credentials are never shown in the catalog. They should only become available after a successful server-confirmed purchase and delivery.</p>
      </section>
    </div>
  );
}

export function EmptyOrderState({ kind }: { kind: 'accounts' | 'rentals' }) {
  return <Card className="product-empty order-empty"><div>{kind === 'accounts' ? <Users size={20} /> : <Clock3 size={20} />}</div><strong>No {kind} yet</strong><p>Your {kind === 'accounts' ? 'account purchases' : 'active rentals'} will appear here after you place an order.</p></Card>;
}
