'use client';

import { useState } from 'react';
import { ArrowRight, Check, Globe2, Menu, ShieldCheck, X, Zap } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { HomePage, FundPage, HistoryPage, ProfilePage } from './pages';
import { ServicePage, ServicesPage, type ServiceView } from './service-pages';
import { RentalPage } from './rental-page';
import { AccountsPage } from './product-pages';
import { BoostPage } from './boost-page';
import { VirtualNumbersPage } from './virtual-numbers-page';
import { AdminPage } from './admin-page';
import type { Page } from './types';

const PROFILE_SUBVIEWS: ServiceView[] = [
  'settings',
  'security',
  'notifications-prefs',
  'feedback',
  'help',
  'privacy',
  'community',
  'edit-profile',
  'referral',
  'child-panel',
  'api-keys',
  'support-center',
];

const SESSION_USER = { name: 'Destiny' };

const services = [
  { title: 'Virtual Numbers', label: 'Instant OTP', description: 'Fast verification numbers for supported services.' },
  { title: 'Rent a Line', label: 'Dedicated rentals', description: 'Keep a private number for a selected rental period.' },
  { title: 'SMM Boost', label: 'Social & music growth', description: 'Order growth services with clear delivery tracking.' },
  { title: 'Buy Accounts', label: 'Premium accounts', description: 'Browse available inventory and delivery information.' },
];
const countries = [
  ['🇺🇸', 'United States'],
  ['🇬🇧', 'United Kingdom'],
  ['🇨🇦', 'Canada'],
  ['🇫🇷', 'France'],
  ['🇩🇪', 'Germany'],
  ['🇪🇸', 'Spain'],
  ['🇮🇹', 'Italy'],
  ['🇳🇱', 'Netherlands'],
  ['🇦🇺', 'Australia'],
  ['🇮🇳', 'India'],
  ['🇿🇦', 'South Africa'],
  ['🇧🇷', 'Brazil'],
];
const faqs = [
  [
    'What is the difference between a Virtual Number and Rent a Line?',
    'Virtual Numbers are designed for OTP verification. Rental numbers are dedicated to you for a selected period and can support voice and SMS where available.',
  ],
  [
    'Which countries and services are supported?',
    'Coverage and service availability change with live inventory. Select a country and service inside your account to see what is currently available.',
  ],
  [
    'How do I fund my wallet?',
    'Open Fund after signing in and use the payment method available for your account and region. Your balance updates after payment confirmation.',
  ],
  [
    'What happens if a verification is unsuccessful?',
    'Eligibility for replacement or refund depends on the selected service and its current fulfillment rules. The order status will show the applicable outcome.',
  ],
];

function Landing({ enter, openAdmin }: { enter: () => void; openAdmin: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-nav">
          <a href="#top" className="wordmark">
            <span className="wordmark-mark">V</span>
            <span>
              Verxor<span className="wordmark-dot">.</span>com
            </span>
          </a>
          <nav className="desktop-links">
            <a href="#services">Services</a>
            <a href="#coverage">Coverage</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="landing-actions">
            <button type="button" className="login-link" onClick={enter}>
              Log in
            </button>
            <button type="button" className="landing-cta compact" onClick={enter}>
              Get started
            </button>
            <button type="button" className="menu-button" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-menu">
            <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
            <a href="#coverage" onClick={() => setMenuOpen(false)}>Coverage</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
            <button type="button" className="landing-cta" onClick={enter}>
              Get started <ArrowRight size={17} />
            </button>
          </nav>
        )}
      </header>
      <main id="top">
        <section className="landing-hero">
          <div className="hero-copy-wrap">
            <div className="status-pill">
              <span className="status-dot" /> Global coverage
            </div>
            <h1>
              Your second number <span>anywhere in the world.</span>
            </h1>
            <p>
              Verify accounts, rent dedicated numbers, grow your social presence and manage your digital services from one
              reliable platform.
            </p>
            <div className="hero-actions">
              <button type="button" className="landing-cta" onClick={enter}>
                Get a number now <ArrowRight size={18} />
              </button>
              <a href="#services" className="text-link">
                Explore services
              </a>
            </div>
            <div className="hero-trust">
              <span>
                <ShieldCheck size={15} /> Secure checkout
              </span>
              <span>
                <Zap size={15} /> Fast delivery
              </span>
              <span>
                <Globe2 size={15} /> Global coverage
              </span>
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-panel-head">
              <div>
                <small>VERXOR</small>
                <strong>Digital services</strong>
              </div>
              <span className="live-chip">LIVE</span>
            </div>
            <div className="hero-balance">
              <span>Wallet balance</span>
              <strong>0.00</strong>
            </div>
            <div className="hero-service-grid">
              {services.map((item) => (
                <div key={item.title} className="hero-service-card">
                  <span className="hero-service-icon">
                    {item.title.startsWith('Virtual') ? '#' : item.title.startsWith('Rent') ? '◉' : item.title.startsWith('SMM') ? '↑' : 'A'}
                  </span>
                  <strong>
                    {item.title === 'Virtual Numbers'
                      ? 'OTP numbers'
                      : item.title === 'Rent a Line'
                        ? 'Rent a line'
                        : item.title === 'SMM Boost'
                          ? 'SMM boost'
                          : 'Buy accounts'}
                  </strong>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="landing-section">
          <div className="section-head">
            <p className="eyebrow">SERVICES</p>
            <h2>Everything you need in one place</h2>
          </div>
          <div className="service-grid">
            {services.map((item) => (
              <article key={item.title} className="service-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </section>

        <section id="coverage" className="landing-section muted">
          <div className="section-head">
            <p className="eyebrow">COVERAGE</p>
            <h2>Numbers across major markets</h2>
          </div>
          <div className="country-grid">
            {countries.map(([flag, name]) => (
              <div key={name} className="country-chip">
                <span>{flag}</span>
                <strong>{name}</strong>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="landing-section">
          <div className="section-head">
            <p className="eyebrow">PRICING</p>
            <h2>Pay only for what you use</h2>
            <p>Transparent wallet-based pricing. Fund once, use across numbers, rentals, boosts and more.</p>
          </div>
          <div className="pricing-row">
            <div className="price-card">
              <Check size={18} />
              <strong>Wallet first</strong>
              <p>One balance for every service.</p>
            </div>
            <div className="price-card">
              <Check size={18} />
              <strong>Live inventory</strong>
              <p>See available stock before you buy.</p>
            </div>
            <div className="price-card">
              <Check size={18} />
              <strong>Clear status</strong>
              <p>Track each order from payment to delivery.</p>
            </div>
          </div>
        </section>

        <section id="faq" className="landing-section muted">
          <div className="section-head">
            <p className="eyebrow">FAQ</p>
            <h2>Common questions</h2>
          </div>
          <div className="faq-list">
            {faqs.map(([q, a]) => (
              <details key={q} className="faq-item">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-cta-band">
          <h2>Ready when you are</h2>
          <p>Create an account, fund your wallet, and start ordering in minutes.</p>
          <button type="button" className="landing-cta" onClick={enter}>
            Get started <ArrowRight size={18} />
          </button>
          <button type="button" className="text-link admin-entry" onClick={openAdmin}>
            Panel admin
          </button>
        </section>
      </main>
    </div>
  );
}

export function VerxorApp() {
  const [view, setView] = useState<'landing' | 'app' | 'admin'>('landing');
  const [page, setPage] = useState<Page>('home');
  const [service, setService] = useState<ServiceView | null>(null);
  const [dark, setDark] = useState(false);

  const closeService = () => setService(null);

  if (view === 'admin') {
    return (
      <div className={dark ? 'app dark' : 'app'}>
        <AdminPage onBack={() => setView('landing')} />
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <div className={dark ? 'app dark' : 'app'}>
        <Landing enter={() => setView('app')} openAdmin={() => setView('admin')} />
      </div>
    );
  }

  const deepService = service !== null;

  const content =
    service === 'services' ? (
      <ServicesPage open={setService} onBack={() => { setService(null); setPage('home'); }} />
    ) : service === 'rental' ? (
      <RentalPage onBack={closeService} onOpenEsim={() => setService('esim')} />
    ) : service === 'virtual-numbers' ? (
      <VirtualNumbersPage onBack={closeService} onOpenNotifications={() => setService('alerts')} />
    ) : service === 'accounts' ? (
      <AccountsPage onBack={closeService} />
    ) : service === 'boost' ? (
      <BoostPage onBack={closeService} />
    ) : service ? (
      <ServicePage view={service} onBack={closeService} />
    ) : page === 'history' ? (
      <HistoryPage />
    ) : page === 'services' ? (
      <ServicesPage open={setService} onBack={() => { setService(null); setPage('home'); }} />
    ) : (
      {
        home: <HomePage go={setPage} openService={setService} />,
        fund: <FundPage />,
        services: <ServicesPage open={setService} onBack={() => { setService(null); setPage('home'); }} />,
        profile: <ProfilePage openService={setService} />,
      }[page]
    );

  return (
    <AppShell
      dark={dark}
      page={page}
      deepService={deepService}
      userName={SESSION_USER.name}
      onNavigate={(next) => {
        setService(null);
        setPage(next);
      }}
      onToggleTheme={() => setDark((v) => !v)}
      onOpenService={(next) => setService(next)}
      onLogout={() => {
        setService(null);
        setPage('home');
        setView('landing');
      }}
    >
      {content}
    </AppShell>
  );
}
