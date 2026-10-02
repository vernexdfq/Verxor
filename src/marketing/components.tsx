import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, ChevronDown, Menu } from 'lucide-react';

export function ButtonLink({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'light' | 'white' | 'outline-light' }) {
  return <a className={'mk-button mk-button-' + variant} href={href}>{children}</a>;
}

export function IconTile({ icon: Icon, tone = 'blue' }: { icon: LucideIcon; tone?: string }) {
  return <span className={'mk-icon-tile mk-tone-' + tone}><Icon size={20} strokeWidth={1.8} /></span>;
}

export function SectionHeading({ eyebrow, title, description, centered = false }: { eyebrow: string; title: string; description: string; centered?: boolean }) {
  return <div className={'mk-section-heading' + (centered ? ' is-centered' : '')}><span className="mk-section-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}

const navGroups = [
  { label: 'Services', href: '/#services' },
  { label: 'For developers', href: '/api-partnership' },
  { label: 'For resellers', href: '/child-panels' },
];

export function MarketingHeader() {
  return <header className="mk-header"><div className="mk-container mk-nav"><a className="mk-brand" href="/" aria-label="Verxor home"><img src="/brand/verxor-logo.svg" alt="" /><span>Verxor</span></a><nav className="mk-nav-links" aria-label="Main navigation">{navGroups.map(item => <a href={item.href} key={item.label}>{item.label}</a>)}<a href="/workspace">Platform <ChevronDown size={13} /></a></nav><div className="mk-nav-actions"><a className="mk-login-link" href="/workspace">Log in</a><a className="mk-nav-cta" href="/workspace">Get started <ArrowRight size={15} /></a></div><details className="mk-mobile-nav"><summary aria-label="Open navigation"><Menu size={22} /></summary><nav aria-label="Mobile navigation"><a href="/#services">Services</a><a href="/api-partnership">For developers</a><a href="/child-panels">For resellers</a><a href="/workspace">Platform / Log in</a></nav></details></div></header>;
}

export function MarketingFooter() {
  return <footer className="mk-footer"><div className="mk-container"><div className="mk-footer-top"><div className="mk-footer-brand"><a className="mk-brand" href="/"><img src="/brand/verxor-logo.svg" alt="" /><span>Verxor</span></a><p>Your complete digital ecosystem.<br />Connect, verify, grow.</p></div><div className="mk-footer-col"><b>Explore</b><a href="/services/virtual-numbers">Virtual numbers</a><a href="/services/number-rentals">Number rentals</a><a href="/services/vtu-api">Airtime & data API</a><a href="/services/smm">SMM services</a><a href="/services/gift-cards">Gift cards</a></div><div className="mk-footer-col"><b>Build with Verxor</b><a href="/api-partnership">API partnerships</a><a href="/child-panels">Child panels</a><a href="/workspace">Open platform</a></div><div className="mk-footer-col"><b>Information</b><a href="/services/esim">eSIM</a><a href="/services/proxies">Proxies</a><a href="/services/virtual-cards">Virtual cards</a><a href="/#faq">FAQs</a></div></div><div className="mk-footer-bottom"><span>© {new Date().getFullYear()} Verxor. All rights reserved.</span><span>Availability and terms vary by service and region.</span></div></div></footer>;
}
