import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, ChevronDown, Menu } from 'lucide-react';

export function ButtonLink({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'light' | 'white' | 'outline-light';
}) {
  return <a className={'mk-button mk-button-' + variant} href={href}>{children}</a>;
}

export function IconTile({ icon: Icon, tone = 'blue' }: { icon: LucideIcon; tone?: string }) {
  return (
    <span className={'mk-icon-tile mk-tone-' + tone}>
      <Icon size={20} strokeWidth={1.8} />
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={'mk-section-heading' + (centered ? ' is-centered' : '')}>
      <span className="mk-section-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

const navGroups = [
  { label: 'Services Hub', href: '/#services-hub' },
  { label: 'Catalog', href: '/#all-services' },
  { label: 'Why Verxor', href: '/#trust' },
  { label: 'Developer API', href: '/api-partnership' },
  { label: 'Child Panels', href: '/child-panels' },
  { label: 'FAQs', href: '/#faq' },
];

export function MarketingHeader() {
  return (
    <>
      {/* Top Live Operational Bar */}
      <div className="mk-top-ticker">
        <div className="mk-container">
          <span className="mk-ticker-content">
            <span className="mk-ping-dot">
              <span className="mk-ping-wave" />
              <span className="mk-ping-core" />
            </span>
            <strong className="mk-ticker-bold">Live &amp; Operational:</strong> Fast automated virtual numbers, telecom pipelines &amp; developer APIs.
          </span>
        </div>
      </div>

      {/* Main Sticky Header */}
      <header className="mk-header">
        <div className="mk-container mk-nav">
          <a className="mk-brand" href="/" aria-label="Verxor home">
            <img src="/brand/verxor-logo.svg" alt="Verxor logo" width={38} height={38} />
            <div className="mk-brand-text">
              <span className="mk-brand-title">Verxor</span>
              <span className="mk-brand-sub">DIGITAL INFRASTRUCTURE</span>
            </div>
          </a>

          <nav className="mk-nav-links" aria-label="Main navigation">
            {navGroups.map((item) => (
              <a href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mk-nav-actions">
            <a className="mk-login-link" href="/workspace">
              Log in
            </a>
            <a className="mk-nav-cta" href="/workspace">
              Get Started <ArrowRight size={14} />
            </a>
          </div>

          <details className="mk-mobile-nav">
            <summary aria-label="Open navigation">
              <Menu size={22} />
            </summary>
            <nav aria-label="Mobile navigation">
              <a href="/#services-hub">Services Hub</a>
              <a href="/#all-services">Catalog</a>
              <a href="/#trust">Why Verxor</a>
              <a href="/api-partnership">For Developers (API)</a>
              <a href="/child-panels">For Resellers (Child Panels)</a>
              <a href="/#faq">FAQs</a>
              <a href="/workspace" className="mk-mobile-cta">
                Launch Workspace →
              </a>
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-container">
        <div className="mk-footer-top">
          {/* Col 1: Brand */}
          <div className="mk-footer-brand">
            <a className="mk-brand" href="/">
              <img src="/brand/verxor-logo.svg" alt="Verxor" width={36} height={36} />
              <div className="mk-brand-text">
                <span className="mk-brand-title">Verxor</span>
                <span className="mk-brand-sub">DIGITAL INFRASTRUCTURE</span>
              </div>
            </a>
            <p>
              Global digital infrastructure for Africa’s digital economy. Instant virtual numbers, eSIM, VTU data,
              USD cards, and developer APIs in one wallet.
            </p>
            <div className="mk-footer-status">
              <span className="mk-ping-dot">
                <span className="mk-ping-wave" />
                <span className="mk-ping-core" />
              </span>
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Col 2: Services */}
          <div className="mk-footer-col">
            <b>Digital Telephony</b>
            <a href="/services/virtual-numbers">Virtual Numbers</a>
            <a href="/services/number-rentals">Dedicated Rentals</a>
            <a href="/services/esim">Global Travel eSIM</a>
            <a href="/services/proxies">Residential Proxies</a>
          </div>

          {/* Col 3: Utilities */}
          <div className="mk-footer-col">
            <b>Utilities &amp; Cards</b>
            <a href="/services/data">Data &amp; Airtime VTU</a>
            <a href="/services/virtual-cards">USD Virtual Cards</a>
            <a href="/services/smm">Social Growth &amp; SMM</a>
            <a href="/services/gift-cards">Gift Card Trading</a>
          </div>

          {/* Col 4: Platform & Support */}
          <div className="mk-footer-col">
            <b>Developers &amp; Legal</b>
            <a href="/api-partnership">API Partnerships</a>
            <a href="/child-panels">Child Panels</a>
            <a href="/workspace">Launch Workspace</a>
            <a href="/privacy-policy">Privacy Policy</a>
          </div>
        </div>

        <div className="mk-footer-bottom">
          <span>&copy; {new Date().getFullYear()} Verxor. All rights reserved.</span>
          <span>Official Verxor Digital Platform &middot; Lagos, Nigeria &middot; Global Operations</span>
        </div>
      </div>
    </footer>
  );
}
