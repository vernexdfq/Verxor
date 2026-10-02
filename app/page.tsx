import type { Metadata } from 'next';
import { ArrowRight, ArrowUpRight, Check, Code2, Globe2, Layers3, ShieldCheck, Smartphone, Wallet, Zap } from 'lucide-react';
import { MarketingHeader, MarketingFooter, SectionHeading, ButtonLink, IconTile } from '../src/marketing/components';

export const metadata: Metadata = {
  title: 'Verxor — Your complete digital ecosystem',
  description: 'Explore digital services, virtual numbers, Nigerian airtime and data, and infrastructure for developers and resellers with Verxor.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Verxor — Your complete digital ecosystem',
    description: 'Connect, verify and grow with digital services and platform infrastructure in one place.',
    url: 'https://verxor.com/',
    siteName: 'Verxor',
    type: 'website',
    images: [{ url: '/brand/verxor-logo.svg', width: 256, height: 256, alt: 'Verxor emblem' }],
  },
};

const services = [
  { title: 'Virtual numbers', description: 'Explore numbers for supported SMS verification services, with availability shown before you order.', href: '/services/virtual-numbers', icon: Smartphone, tag: 'VERIFY', tone: 'blue' },
  { title: 'Number rentals', description: 'Keep a number for a selected period where rental inventory and renewal options are available.', href: '/services/number-rentals', icon: Globe2, tag: 'STAY CONNECTED', tone: 'violet' },
  { title: 'Airtime & data', description: 'A wallet-based way to access supported Nigerian airtime and data bundles.', href: '/services/vtu-api', icon: Zap, tag: 'EVERYDAY UTILITY', tone: 'green' },
  { title: 'SMM services', description: 'Browse social media service options and review delivery details before placing an order.', href: '/services/smm', icon: Layers3, tag: 'SOCIAL TOOLS', tone: 'amber' },
  { title: 'eSIM', description: 'Learn about digital SIM profiles and check availability and device compatibility.', href: '/services/esim', icon: Smartphone, tag: 'TRAVEL CONNECTIVITY', tone: 'cyan' },
  { title: 'Proxies', description: 'Understand proxy options and the differences between residential and datacenter IPs.', href: '/services/proxies', icon: Globe2, tag: 'NETWORK TOOLS', tone: 'slate' },
  { title: 'Virtual cards', description: 'Explore virtual card services, eligibility, fees and supported use cases.', href: '/services/virtual-cards', icon: Wallet, tag: 'DIGITAL PAYMENTS', tone: 'pink' },
  { title: 'Gift cards', description: 'Review supported gift-card trading options, rates and transaction terms.', href: '/services/gift-cards', icon: Wallet, tag: 'GIFT CARD TRADING', tone: 'indigo' },
];

const audiences = [
  { title: 'Individuals & consumers', description: 'Access supported digital services from one account and track your orders in one place.', href: '/workspace', label: 'Explore the platform', icon: Smartphone },
  { title: 'Developers & API partners', description: 'Build on a service layer for supported digital products, with documented API access and partner onboarding.', href: '/api-partnership', label: 'Explore API access', icon: Code2 },
  { title: 'Resellers & child-panel owners', description: 'Apply to operate a branded child panel with tenant-aware operations and server-enforced pricing rules.', href: '/child-panels', label: 'Explore reseller panels', icon: Layers3 },
];

const faqs = [
  ['What is Verxor?', 'Verxor is a digital-services platform designed to bring supported consumer services and partner infrastructure together in one ecosystem.'],
  ['Which services can I use today?', 'Service availability depends on the product, current inventory, account eligibility and supported region. Check the relevant service page and the options shown in your account before ordering.'],
  ['Does Verxor offer API access?', 'Eligible developers and businesses can review the API partnership information and apply for access. Approval, supported endpoints, pricing and limits are subject to the applicable plan and terms.'],
  ['Can I run my own branded panel?', 'Businesses can apply for a child panel. Availability, onboarding requirements, fees, domain setup and pricing permissions are confirmed during review.'],
  ['Are the prices and inventory fixed?', 'No. Prices and availability may change. The current quote and order details shown before confirmation govern a specific order.'],
];

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Verxor',
  url: 'https://verxor.com',
  logo: 'https://verxor.com/brand/verxor-logo.svg',
  description: 'A digital-services platform for consumers, developers and reseller partners.',
};
const websiteSchema = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Verxor', url: 'https://verxor.com', inLanguage: 'en' };

export default function HomePage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
    <MarketingHeader />
    <main>
      <section className="mk-hero">
        <div className="mk-hero-glow" aria-hidden="true" />
        <div className="mk-container mk-hero-grid">
          <div className="mk-hero-copy">
            <div className="mk-eyebrow"><span className="mk-eyebrow-dot" /> YOUR COMPLETE DIGITAL ECOSYSTEM</div>
            <h1>Digital services, <span>beautifully connected.</span></h1>
            <p className="mk-hero-lead">Secure SMS verification, everyday utilities and digital tools—alongside the infrastructure developers and resellers need to build and grow.</p>
            <div className="mk-hero-actions"><ButtonLink href="/workspace" variant="primary">Explore Verxor <ArrowRight size={17} /></ButtonLink><ButtonLink href="#ecosystem" variant="secondary">Discover the ecosystem</ButtonLink></div>
            <div className="mk-proof-row"><span><ShieldCheck size={16} /> Clear order status</span><span><Wallet size={16} /> Wallet-led workflow</span><span><Globe2 size={16} /> Availability by service</span></div>
          </div>
          <div className="mk-hero-art" aria-label="Illustrative preview of the Verxor digital services workspace">
            <div className="mk-orbit mk-orbit-one" /><div className="mk-orbit mk-orbit-two" />
            <div className="mk-preview-window">
              <div className="mk-preview-top"><div className="mk-preview-brand"><img src="/brand/verxor-logo.svg" alt="" /><span>Verxor workspace</span></div><span className="mk-preview-pill">PRODUCT PREVIEW</span></div>
              <div className="mk-preview-welcome"><div><span className="mk-mini-label">YOUR DIGITAL HUB</span><h2>One place to get things moving.</h2></div><div className="mk-preview-avatar">V</div></div>
              <div className="mk-balance-card"><div className="mk-balance-head"><span>Illustrative wallet</span><span className="mk-balance-status"><span /> Overview</span></div><strong>₦128,450<span>.00</span></strong><div className="mk-balance-foot"><span>Sample balance · not live account data</span><span className="mk-balance-mark"><Wallet size={17} /></span></div></div>
              <div className="mk-preview-services"><div><IconTile icon={Smartphone} tone="blue" /><span><b>Virtual numbers</b><small>SMS verification</small></span><ArrowUpRight size={16} /></div><div><IconTile icon={Zap} tone="green" /><span><b>Airtime & data</b><small>Everyday utilities</small></span><ArrowUpRight size={16} /></div><div><IconTile icon={Code2} tone="violet" /><span><b>API platform</b><small>For builders</small></span><ArrowUpRight size={16} /></div></div>
            </div>
            <div className="mk-float-card mk-float-left"><span className="mk-float-icon"><Check size={16} /></span><span><b>Track each order</b><small>Clear status updates</small></span></div>
            <div className="mk-float-card mk-float-right"><span className="mk-float-icon mk-float-blue"><Layers3 size={16} /></span><span><b>Built to connect</b><small>Services & integrations</small></span></div>
          </div>
        </div>
        <div className="mk-container mk-hero-bottom"><span>ONE ECOSYSTEM</span><div /><span>CONSUMERS</span><div /><span>DEVELOPERS</span><div /><span>RESELLERS</span></div>
      </section>
      <section className="mk-section mk-audience-section" id="ecosystem"><div className="mk-container"><SectionHeading eyebrow="MADE FOR DIFFERENT WAYS TO GROW" title="One platform. Three paths forward." description="Whether you need a digital service, want to integrate an API, or plan to run your own branded panel, start with the path that fits you." /><div className="mk-audience-grid">{audiences.map(({ title, description, href, label, icon: Icon }, i) => <article className={'mk-audience-card mk-audience-' + i} key={title}><div className="mk-audience-icon"><Icon size={21} /></div><span className="mk-card-index">0{i + 1} / YOUR PATH</span><h3>{title}</h3><p>{description}</p><a href={href}>{label}<ArrowRight size={16} /></a></article>)}</div></div></section>
      <section className="mk-section mk-services-section" id="services"><div className="mk-container"><SectionHeading eyebrow="EXPLORE THE ECOSYSTEM" title="Useful services, thoughtfully brought together." description="Start with the service you need. Each overview explains the basics, important limitations and where to continue." /><div className="mk-service-grid">{services.map(({ title, description, href, icon: Icon, tag, tone }, i) => <a className={'mk-service-card mk-service-' + tone} href={href} key={title}><div className="mk-service-top"><IconTile icon={Icon} tone={tone} /><span>{tag}</span></div><h3>{title}</h3><p>{description}</p><span className="mk-service-link">Explore service <ArrowUpRight size={16} /></span><span className="mk-service-number">0{i + 1}</span></a>)}</div><p className="mk-disclaimer">Service availability, supported countries, prices and fulfillment times vary by product and current inventory. Confirm the details displayed before placing an order.</p></div></section>
      <section className="mk-platform-band"><div className="mk-container mk-platform-grid"><div className="mk-platform-visual"><div className="mk-platform-card mk-platform-main"><div className="mk-platform-card-top"><img src="/brand/verxor-logo.svg" alt="" /><span>VERXOR PLATFORM</span><span className="mk-platform-live">● Connected</span></div><div className="mk-platform-bars"><span style={{height:'38%'}} /><span style={{height:'56%'}} /><span style={{height:'46%'}} /><span style={{height:'72%'}} /><span style={{height:'62%'}} /><span style={{height:'88%'}} /><span style={{height:'68%'}} /><span style={{height:'100%'}} /><span style={{height:'78%'}} /></div><div className="mk-platform-caption"><span>Designed for clear workflows</span><span>Illustrative UI</span></div></div><div className="mk-platform-chip"><ShieldCheck size={17} /> Tenant-aware architecture</div></div><div className="mk-platform-copy"><span className="mk-section-eyebrow">INFRASTRUCTURE THAT SCALES WITH YOU</span><h2>More than a storefront. A platform to build on.</h2><p>Verxor brings service discovery, wallet-led workflows and partner access into one ecosystem. The public site is your starting point; the details and permissions depend on your account and plan.</p><ul><li><Check size={17} /> Clear separation between consumer and partner journeys</li><li><Check size={17} /> Server-enforced pricing and tenant boundaries</li><li><Check size={17} /> API access subject to approval and plan limits</li></ul><ButtonLink href="/api-partnership" variant="light">Explore API partnerships <ArrowRight size={17} /></ButtonLink></div></div></section>
      <section className="mk-section"><div className="mk-container"><SectionHeading eyebrow="HOW IT WORKS" title="A clearer way to get started." description="The exact steps depend on the service, but the experience follows a simple pattern." centered /><div className="mk-steps-grid"><article><span>01</span><h3>Choose a service</h3><p>Review the service overview, current availability and any requirements that apply.</p></article><article><span>02</span><h3>Review your order</h3><p>Check the displayed price, fulfillment details and applicable terms before confirming.</p></article><article><span>03</span><h3>Track progress</h3><p>Use the order status and relevant account history to follow the outcome.</p></article></div></div></section>
      <section className="mk-section mk-faq-section" id="faq"><div className="mk-container mk-faq-layout"><div><span className="mk-section-eyebrow">GOOD TO KNOW</span><h2>Questions, answered clearly.</h2><p>Learn how the Verxor ecosystem works before you get started.</p><a className="mk-inline-link" href="/workspace">Explore the platform <ArrowRight size={16} /></a></div><div className="mk-faq-list">{faqs.map(([q,a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></div></section>
      <section className="mk-bottom-cta"><div className="mk-container mk-bottom-cta-inner"><div><span className="mk-section-eyebrow">CONNECT. VERIFY. GROW.</span><h2>Find your place in the Verxor ecosystem.</h2><p>Explore the platform, review API access or learn about running a child panel.</p></div><div className="mk-bottom-actions"><ButtonLink href="/workspace" variant="white">Explore Verxor <ArrowRight size={17} /></ButtonLink><ButtonLink href="/child-panels" variant="outline-light">Become a reseller</ButtonLink></div></div></section>
    </main>
    <MarketingFooter />
  </>;
}
