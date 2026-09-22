'use client';

import { useState } from 'react';
import { ArrowRight, Check, Globe2, Menu, ShieldCheck, X, Zap } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { HomePage, FundPage, NumbersPage, ProfilePage } from './pages';
import { ServicePage, ServicesPage, type ServiceView } from './service-pages';
import { RentalPage } from './rental-page';
import { AccountsPage } from './product-pages';
import { VirtualNumbersPage } from './virtual-numbers-page';
import { ActivityLogsPage } from './activity-logs';
import { AdminPage } from './admin-page';
import type { Page } from './types';

/** Sub-views opened from Profile — Back must return to Profile, not Services. */
const PROFILE_SUBVIEWS: ServiceView[] = [
  'settings',
  'security',
  'notifications-prefs',
  'feedback',
  'help',
  'privacy',
  'community',
];

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
            <button
              type="button"
              className="menu-button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-menu">
            <a href="#services" onClick={() => setMenuOpen(false)}>
              Services
            </a>
            <a href="#coverage" onClick={() => setMenuOpen(false)}>
              Coverage
            </a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>
              Pricing
            </a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>
              FAQ
            </a>
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
              Verify accounts, rent dedicated numbers, grow your social presence and manage your digital services from
              one reliable platform.
            </p>
            <div className="hero-actions">
              <button type="button" className="landing-cta" onClick={enter}>
                Get a number now <ArrowRight size={18} />
              </button>
              <a className="secondary-link" href="#services">
                Explore services
              </a>
            </div>
            <div className="trust-row">
              <span>
                <ShieldCheck size={16} /> Secure checkout
              </span>
              <span>
                <Zap size={16} /> Fast delivery
              </span>
              <span>
                <Globe2 size={16} /> Global coverage
              </span>
            </div>
          </div>
          <div className="hero-preview">
            <div className="preview-header">
              <div>
                <span>VERXOR</span>
                <strong>Digital services</strong>
              </div>
              <span className="preview-status">LIVE</span>
            </div>
            <div className="preview-balance">
              <small>Wallet balance</small>
              <strong>0.00</strong>
            </div>
            <div className="preview-grid">
              <div>
                <span className="preview-icon blue">#</span>
                <strong>OTP numbers</strong>
                <small>Instant verification</small>
              </div>
              <div>
                <span className="preview-icon navy">◉</span>
                <strong>Rent a line</strong>
                <small>Dedicated numbers</small>
              </div>
              <div>
                <span className="preview-icon blue">↗</span>
                <strong>Social growth</strong>
                <small>Track every order</small>
              </div>
              <div>
                <span className="preview-icon navy">✓</span>
                <strong>Accounts</strong>
                <small>Ready when you are</small>
              </div>
            </div>
          </div>
        </section>
        <section className="stats-strip">
          <div>
            <strong>50+</strong>
            <span>Countries</span>
          </div>
          <div>
            <strong>200K+</strong>
            <span>Numbers delivered</span>
          </div>
          <div>
            <strong>24/7</strong>
            <span>Platform access</span>
          </div>
          <div>
            <strong>Live</strong>
            <span>Inventory updates</span>
          </div>
        </section>
        <section id="services" className="landing-section">
          <div className="section-intro">
            <span>Services</span>
            <h2>One toolkit. Every essential service.</h2>
            <p>
              Everything is organized around a simple wallet-first experience, so you can find what you need without
              navigating a maze.
            </p>
          </div>
          <div className="service-grid">
            {services.map((service, i) => (
              <button type="button" className="service-card" key={service.title} onClick={enter}>
                <div className={`service-number n${i + 1}`}>0{i + 1}</div>
                <div>
                  <span className="service-label">{service.label}</span>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <span className="service-link">
                    Open service <ArrowRight size={15} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
        <section id="coverage" className="coverage-section">
          <div className="landing-section coverage-inner">
            <div className="section-intro">
              <span>Coverage</span>
              <h2>Global numbers, clearly presented.</h2>
              <p>Browse supported markets and check current availability inside your account.</p>
            </div>
            <div className="country-grid">
              {countries.map(([flag, name]) => (
                <button type="button" key={name} onClick={enter}>
                  <span>{flag}</span>
                  <strong>{name}</strong>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          </div>
        </section>
        <section id="pricing" className="landing-section">
          <div className="pricing-panel">
            <div>
              <span>Simple funding</span>
              <h2>Pay only for what you use.</h2>
              <p>Fund your wallet, choose a service and keep every payment and order visible in one activity trail.</p>
            </div>
            <div className="pricing-points">
              {['Wallet-first payments', 'Clear service pricing', 'Fast automated delivery', 'Referral rewards'].map(
                (item) => (
                  <div key={item}>
                    <Check size={17} />
                    {item}
                  </div>
                ),
              )}
            </div>
            <button type="button" className="landing-cta" onClick={enter}>
              Create a free account <ArrowRight size={18} />
            </button>
          </div>
        </section>
        <section id="faq" className="landing-section faq-section">
          <div className="section-intro centered">
            <span>Support</span>
            <h2>Questions, answered.</h2>
          </div>
          <div className="faq-list">
            {faqs.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="footer-brand">
          <span className="wordmark-mark">V</span>
          <strong>Verxor.com</strong>
        </div>
        <div className="footer-meta">
          <span>© {new Date().getFullYear()} Verxor.com — Your complete digital ecosystem</span>
          <button type="button" className="footer-ops" onClick={openAdmin} title="Platform operator">
            Ops
          </button>
        </div>
      </footer>
    </div>
  );
}

export function VerxorApp() {
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<'landing' | 'app' | 'admin'>('landing');
  const [page, setPage] = useState<Page>('home');
  const [service, setService] = useState<ServiceView | null>(null);

  const closeService = () => {
    if (service && PROFILE_SUBVIEWS.includes(service)) {
      setService(null);
      setPage('profile');
      return;
    }
    setService(null);
  };

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

  const deepService = service === 'rental' || service === 'virtual-numbers' || service === 'alerts';

  const content =
    service === 'services' ? (
      <ServicesPage open={setService} />
    ) : service === 'rental' ? (
      <RentalPage onBack={closeService} />
    ) : service === 'virtual-numbers' ? (
      <VirtualNumbersPage onBack={closeService} onOpenNotifications={() => setService('alerts')} />
    ) : service === 'accounts' ? (
      <AccountsPage onBack={closeService} />
    ) : service ? (
      <ServicePage view={service} onBack={closeService} />
    ) : page === 'history' ? (
      <ActivityLogsPage />
    ) : (
      {
        home: <HomePage go={setPage} openService={setService} />,
        fund: <FundPage />,
        numbers: <NumbersPage openService={setService} />,
        profile: <ProfilePage openService={setService} />,
      }[page]
    );

  return (
    <AppShell
      dark={dark}
      page={page}
      deepService={deepService}
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
