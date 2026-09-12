import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Gift, Headphones, Instagram, KeyRound, Mail, MessageCircle, Package, Phone, Search, Send, Users } from 'lucide-react';
import { Card, PrimaryButton, SectionHeader } from './components/ui';
import './service-pages.css';

export type ServiceView = 'services' | 'virtual-numbers' | 'rental' | 'boost' | 'boost-orders' | 'accounts' | 'account-orders' | 'number-orders' | 'rewards' | 'affiliate' | 'alerts' | 'settings' | 'feedback' | 'help' | 'privacy';

const catalog = [
  { id: 'virtual-numbers' as const, title: 'Virtual Numbers', eyebrow: 'OTP VERIFICATION', description: 'Choose a country and service, then review available numbers.', icon: Phone },
  { id: 'rental' as const, title: 'Rent a Line', eyebrow: 'DEDICATED LINE', description: 'Choose a private number and the rental period you need.', icon: Clock3 },
  { id: 'boost' as const, title: 'SMM Boost', eyebrow: 'SOCIAL GROWTH', description: 'Browse growth services with clear order tracking.', icon: Instagram },
  { id: 'accounts' as const, title: 'Buy Accounts', eyebrow: 'ACCOUNT INVENTORY', description: 'Review available inventory and delivery information.', icon: Users },
];

const virtualCountries = [
  { flag: '🇺🇸', name: 'United States', code: '+1', type: 'VoIP', note: 'May be restricted by some platforms' },
  { flag: '🇬🇧', name: 'United Kingdom', code: '+44', type: 'Non-VoIP', note: 'Generally more compatible, no guarantee' },
  { flag: '🇨🇦', name: 'Canada', code: '+1', type: 'VoIP', note: 'May be restricted by some platforms' },
  { flag: '🇩🇪', name: 'Germany', code: '+49', type: 'Non-VoIP', note: 'Generally more compatible, no guarantee' },
  { flag: '🇫🇷', name: 'France', code: '+33', type: 'VoIP', note: 'May be restricted by some platforms' },
  { flag: '🇦🇺', name: 'Australia', code: '+61', type: 'VoIP', note: 'May be restricted by some platforms' },
  { flag: '🇮🇳', name: 'India', code: '+91', type: 'VoIP', note: 'May be restricted by some platforms' },
  { flag: '🇳🇱', name: 'Netherlands', code: '+31', type: 'Non-VoIP', note: 'Generally more compatible, no guarantee' },
];

const rentCountries = [
  { flag: '🇺🇸', name: 'United States', code: '+1', type: 'Non-VoIP', note: 'Voice + SMS where supported' },
  { flag: '🇬🇧', name: 'United Kingdom', code: '+44', type: 'Non-VoIP', note: 'Voice + SMS where supported' },
  { flag: '🇨🇦', name: 'Canada', code: '+1', type: 'VoIP', note: 'Voice + SMS where supported' },
  { flag: '🇩🇪', name: 'Germany', code: '+49', type: 'Non-VoIP', note: 'Voice + SMS where supported' },
];

function ServiceLayout({ title, eyebrow, description, onBack, children }: { title: string; eyebrow: string; description?: string; onBack: () => void; children: ReactNode }) {
  return <>
    <button className="back-button" onClick={onBack} aria-label={`Back from ${title}`}><ArrowLeft size={17} /> Back</button>
    <section className="page-intro compact-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p>{description}</p>}</section>
    {children}
  </>;
}

function CountryList({ items, actionLabel, query }: { items: typeof virtualCountries; actionLabel: string; query: string }) {
  const filtered = useMemo(() => items.filter((country) => `${country.name} ${country.code} ${country.type}`.toLowerCase().includes(query.trim().toLowerCase())), [items, query]);
  if (!filtered.length) return <Card className="empty-card compact-empty"><div className="empty-icon"><Search size={18} /></div><strong>No countries found</strong><p>Try another country or number type.</p></Card>;
  return <div className="number-list">{filtered.map((country) => <Card className="number-card" key={country.name}>
    <div className="number-icon" aria-hidden="true">{country.flag}</div>
    <div className="number-info"><strong>{country.name} · {country.code}</strong><small className={country.type === 'Non-VoIP' ? 'type-good' : 'type-warn'}>{country.type} · {country.note}</small></div>
    <button className="small-button">{actionLabel}</button>
  </Card>)}</div>;
}

export function ServicesPage({ open }: { open: (view: ServiceView) => void }) {
  return <><section className="page-intro"><p className="eyebrow">VERXOR SERVICES</p><h1>Services</h1><p>Choose a service to get started.</p></section><div className="service-stack">{catalog.map(({ id, title, eyebrow, description, icon: Icon }) => <button className="product-card" key={id} onClick={() => open(id)}><span className="product-icon"><Icon size={20} /></span><span><em>{eyebrow}</em><strong>{title}</strong><small>{description}</small></span><ArrowRight size={17} /></button>)}</div></>;
}

export function ServicePage({ view, onBack }: { view: Exclude<ServiceView, 'services'>; onBack: () => void }) {
  const [virtualQuery, setVirtualQuery] = useState('');
  const [rentQuery, setRentQuery] = useState('');

  if (view === 'virtual-numbers') return <ServiceLayout title="Virtual Numbers" eyebrow="OTP VERIFICATION" description="Choose a country and review the number type before you buy." onBack={onBack}>
    <div className="info-banner warn"><strong>Before you buy:</strong> VoIP numbers can be cheaper, but some services may restrict them. Non-VoIP numbers may be more compatible. Third-party verification is never guaranteed.</div>
    <div className="search-box"><Search size={18} /><input value={virtualQuery} onChange={(event) => setVirtualQuery(event.target.value)} placeholder="Search country or number type" aria-label="Search country or number type" /></div>
    <CountryList items={virtualCountries} actionLabel="View" query={virtualQuery} />
    <SectionHeader eyebrow="ORDERS" title="Recent orders" action={<button className="text-button">View all</button>} />
    <Card className="empty-card compact-empty"><div className="empty-icon"><KeyRound size={18} /></div><strong>No numbers yet</strong><p>Your purchased virtual numbers will appear here.</p></Card>
  </ServiceLayout>;

  if (view === 'rental') return <ServiceLayout title="Rent a Line" eyebrow="DEDICATED LINE" description="Choose a country, number type and rental period. Voice + SMS where supported." onBack={onBack}>
    <div className="info-banner warn"><strong>Compatibility notice:</strong> Number compatibility depends on the service you use. VoIP numbers may work with platforms that restrict VoIP, but they can be identified or restricted at any time. Continued access is not guaranteed.</div>
    <div className="search-box"><Search size={18} /><input value={rentQuery} onChange={(event) => setRentQuery(event.target.value)} placeholder="Search country or number type" aria-label="Search rental countries" /></div>
    <CountryList items={rentCountries} actionLabel="Select" query={rentQuery} />
    <SectionHeader eyebrow="CURRENT" title="Active rentals" />
    <Card className="empty-card compact-empty"><div className="empty-icon"><Clock3 size={18} /></div><strong>No active rentals</strong><p>Your rented lines will appear here once you start one.</p></Card>
  </ServiceLayout>;

  if (view === 'boost') return <ServiceLayout title="SMM Boost" eyebrow="SOCIAL GROWTH" description="Choose a service, review delivery terms and place your order." onBack={onBack}><div className="search-box"><Search size={18} /><input placeholder="Search services" aria-label="Search services" /></div><div className="option-list">{['Instagram engagement', 'TikTok views', 'YouTube views', 'Music streams'].map((name) => <Card className="service-line" key={name}><div><em>AVAILABLE</em><strong>{name}</strong><small>Delivery status shown on every order</small></div><span className="price-tag">View</span></Card>)}</div></ServiceLayout>;

  if (view === 'accounts') return <ServiceLayout title="Buy Accounts" eyebrow="ACCOUNT INVENTORY" description="Browse current inventory and review delivery information." onBack={onBack}><div className="option-list">{['Social account · Standard', 'Creator account · Premium', 'Business account · Premium'].map((name) => <Card className="service-line" key={name}><div><em>AVAILABLE</em><strong>{name}</strong><small>Delivery details shown before payment</small></div><span className="price-tag">View</span></Card>)}</div></ServiceLayout>;

  if (view === 'number-orders') return <ServiceLayout title="Number orders" eyebrow="ORDERS" description="Keep track of your verification number activity." onBack={onBack}><EmptyOrders icon={<KeyRound size={18} />} title="No number orders" text="Your completed and active verification orders will appear here." /></ServiceLayout>;
  if (view === 'boost-orders') return <ServiceLayout title="Boost orders" eyebrow="ORDERS" description="Track delivery and status for your growth orders." onBack={onBack}><EmptyOrders icon={<Package size={18} />} title="No boost orders" text="Orders you place will appear here with their current status." /></ServiceLayout>;
  if (view === 'account-orders') return <ServiceLayout title="Account orders" eyebrow="ORDERS" description="Review your account purchase history." onBack={onBack}><EmptyOrders icon={<Users size={18} />} title="No account orders" text="Your account purchases will appear here." /></ServiceLayout>;
  if (view === 'rewards') return <ServiceLayout title="Rewards" eyebrow="REWARDS" description="See your earned rewards and available benefits." onBack={onBack}><Card className="reward-card"><Gift size={22} /><div><small>Total rewards</small><strong>₦0.00</strong></div></Card><Card className="info-card"><CheckCircle2 size={18} /><div><strong>Rewards</strong><p>Eligible rewards will be reflected here automatically.</p></div></Card></ServiceLayout>;
  if (view === 'affiliate') return <ServiceLayout title="Affiliate" eyebrow="REFERRALS" description="Share your referral link and track eligible rewards." onBack={onBack}><Card className="referral-card"><small>Your referral link</small><strong>verxor.com/ref/your-link</strong><button className="copy-button">Copy link</button></Card></ServiceLayout>;
  if (view === 'alerts') return <ServiceLayout title="Notifications" eyebrow="ACCOUNT" description="Important account and order updates appear here." onBack={onBack}><EmptyOrders icon={<MessageCircle size={18} />} title="You're all caught up" text="New security, payment and order updates will appear here." /></ServiceLayout>;
  if (view === 'settings') return <ServiceLayout title="Security" eyebrow="ACCOUNT SECURITY" description="Keep your account protected." onBack={onBack}><Card className="settings-list">{[['Password', 'Update your password'], ['PIN', 'Manage your transaction PIN'], ['Sessions', 'Review active sessions']].map(([a, b]) => <div className="setting-row" key={a}><div><strong>{a}</strong><small>{b}</small></div><ArrowRight size={17} /></div>)}</Card></ServiceLayout>;

  if (view === 'feedback') return <ServiceLayout title="Contact Support" eyebrow="SUPPORT" description="Get help fast through the channels below." onBack={onBack}>
    <div className="support-channels">
      <a href="https://t.me/VerxorOfficial" target="_blank" rel="noopener noreferrer" className="support-channel"><span className="support-channel-icon telegram"><Send size={17} /></span><div><strong>Telegram Support</strong><small>Fastest response for order issues</small></div><ArrowRight size={17} /></a>
      <a href="https://wa.me/2348141620644" target="_blank" rel="noopener noreferrer" className="support-channel"><span className="support-channel-icon whatsapp"><MessageCircle size={17} /></span><div><strong>WhatsApp Support</strong><small>Chat with us directly</small></div><ArrowRight size={17} /></a>
      <a href="mailto:support@verxor.com" className="support-channel"><span className="support-channel-icon email"><Mail size={17} /></span><div><strong>Email Support</strong><small>For detailed or account issues</small></div><ArrowRight size={17} /></a>
    </div>
    <SectionHeader eyebrow="SELF SERVICE" title="Quick answers" />
    <Card className="legal-card"><h3>How do I fund my wallet?</h3><p>Go to Fund, enter the amount and complete payment. Your balance updates after confirmation.</p><h3>Virtual Number vs Rent a Line</h3><p>Virtual Numbers are for one-time OTP verification. Rent a Line gives you a dedicated number for a selected period with Voice + SMS where available.</p><h3>Number not receiving SMS?</h3><p>Some platforms restrict certain number types. Check the type label before buying and contact support with your order ID if the order rules allow a replacement or refund.</p></Card>
  </ServiceLayout>;

  if (view === 'help') return <ServiceLayout title="Help Center" eyebrow="SUPPORT" description="Guides and answers for using Verxor." onBack={onBack}><Card className="legal-card"><h3>Getting started</h3><p>Fund your wallet, choose a service, select a country or product and confirm your order. Activity appears in History.</p><h3>Understanding number types</h3><p><strong>VoIP</strong> numbers are internet-based and may be restricted by some platforms. <strong>Non-VoIP</strong> numbers can be more compatible with strict services, but no third-party service is guaranteed.</p><h3>Account security</h3><p>Keep your password and PIN private. Contact support if you notice activity you do not recognize.</p><h3>Need faster help?</h3><p>Use Telegram or WhatsApp from Contact Support for the quickest response.</p></Card></ServiceLayout>;

  if (view === 'privacy') return <ServiceLayout title="Privacy Policy" eyebrow="LEGAL" description="How we handle your information." onBack={onBack}><Card className="legal-card"><h3>Information We Collect</h3><p>We collect account details, payment information and usage data needed to provide our services.</p><h3>How We Use Information</h3><p>To deliver services, process payments, improve the platform and communicate important updates.</p><h3>Data Protection</h3><p>We use appropriate security measures to protect your data. We do not sell personal information.</p><h3>Contact</h3><p>For privacy questions, reach us at support@verxor.com.</p></Card></ServiceLayout>;

  return <ServiceLayout title="Coming soon" eyebrow="SERVICE" onBack={onBack}><Card className="empty-card"><strong>This section is not ready yet.</strong><p>Please check back later.</p></Card></ServiceLayout>;
}

function EmptyOrders({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <Card className="empty-card page-empty"><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{text}</p></Card>; }
