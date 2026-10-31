import type { Metadata } from 'next';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  CreditCard,
  Globe,
  Layers,
  Lock,
  MessageSquare,
  Radio,
  Server,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { MarketingHeader, MarketingFooter } from '../src/marketing/components';

export const metadata: Metadata = {
  title: 'Verxor — Global Digital Infrastructure for Africa’s Digital Economy',
  description:
    'Use one wallet to access virtual numbers, travel eSIMs, Nigerian VTU services, virtual USD cards, social growth services, and developer options.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Verxor — Global Digital Infrastructure for Africa’s Digital Economy',
    description:
      'Explore virtual numbers, eSIM, VTU services, USD cards, social growth, and developer options from one platform.',
    url: 'https://verxor.com/',
    siteName: 'Verxor',
    type: 'website',
    images: [{ url: '/brand/verxor-logo.svg', width: 256, height: 256, alt: 'Verxor emblem' }],
  },
};

const servicePills = [
  { label: '📱 Virtual Numbers & Rentals', href: '#numbers' },
  { label: '💳 USD Virtual Cards', href: '#cards' },
  { label: '⚡ Data & Airtime', href: '#vtu' },
  { label: '🚀 Social Growth & SMM', href: '#smm' },
  { label: '🌍 Global eSIMs', href: '#esim' },
  { label: '🛡️ Residential Proxies', href: '#proxies' },
  { label: '🔄 Gift Card Trading', href: '#giftcards' },
  { label: '💻 White-Label Reseller API', href: '#api' },
];

const numberStages = [
  {
    tier: 'STAGE 01',
    name: 'Instant OTP Activation',
    duration: '10–20 Minutes',
    desc: 'A short-term number for a one-time verification. Availability, supported services, and refund eligibility are shown with the selected activation before you confirm.',
    tag: 'One-Time Code',
  },
  {
    tier: 'STAGE 02',
    name: 'Single-Platform Rental',
    duration: '7 to 90 Days',
    desc: 'Keep one number assigned to a single selected platform for the rental period, so you can receive follow-up verification messages while the rental remains active.',
    tag: 'Dedicated App',
  },
  {
    tier: 'STAGE 03',
    name: 'All-Platform OTP Rental',
    duration: 'Retained Multi-Service',
    desc: 'Use one retained number for supported verification messages from multiple services during the rental period. Service compatibility depends on the number and platform.',
    tag: 'Multi-Service',
  },
  {
    tier: 'STAGE 04',
    name: 'Full Two-Way Mobile Line',
    duration: 'Complete Telephony',
    desc: 'A full two-way line with send-and-receive SMS and voice calling, where those features are available for the selected number.',
    tag: '2-Way SMS & Calls',
  },
];

const vtuPillars = [
  'MTN, Airtel, Glo & 9mobile SME / Corporate Data with 3-second automated delivery',
  'Instant airtime top-up, airtime-to-cash conversion & recharge card printing e-pins',
  'NEPA prepaid electricity meter tokens across all 11 Nigerian electricity DisCos',
  'Cable TV subscriptions (DStv, GOtv, Startimes) with zero customer convenience fees',
  'Instant educational scratch cards and e-pins for WAEC, NECO, and JAMB registration',
  'Clean REST API with automated webhooks designed for VTU portals & child panels',
];

const faqsBySection = [
  {
    category: 'Virtual Numbers & SMS Rentals',
    items: [
      {
        q: 'For services that verify by call instead of text, how does it work?',
        a: 'For services that verify by voice call rather than SMS, our carrier telemetry captures the call audio and automatically extracts the spoken verification code from the audio transcript straight into your Verxor dashboard.',
      },
      {
        q: 'Where are your numbers from?',
        a: 'Number origin, supported services, and capabilities vary by listing. Check the details shown for a number before placing an order; third-party platforms may restrict or reject virtual numbers.',
      },
      {
        q: 'When do you get new numbers?',
        a: 'We restock our number pools continuously throughout each day. If a specific service happens to be temporarily out of stock, check back shortly as lines are continually replenished. We are constantly expanding our fleet to provide the highest availability.',
      },
      {
        q: 'How long do your short-term / temporary numbers last?',
        a: 'One-time activations are for a single verification session. For continued access, choose a rental and review its available duration and supported services before checkout.',
      },
      {
        q: 'What can I use your numbers for?',
        a: 'Supported services are listed in the number catalog. Availability depends on the selected number and the platform’s own verification rules; a platform may reject a virtual number.',
      },
      {
        q: 'I live internationally, can I still use your numbers?',
        a: 'You can use Verxor from supported locations with an internet connection. Number origins and delivery options depend on the listing you select.',
      },
      {
        q: 'What happens if I do not receive an OTP code on an instant activation?',
        a: 'Refund eligibility and timing depend on the activation status and the terms shown when you order. If a code does not arrive, follow the in-app order support steps.',
      },
    ],
  },
  {
    category: 'VTU Data & Utility Bills',
    items: [
      {
        q: 'How fast do airtime, data, and bill tokens deliver?',
        a: 'Airtime, data, and bill-payment orders are processed automatically. Delivery time can vary by network, service, and provider response; check the order status in your account.',
      },
      {
        q: 'What happens if a telco or DisCo network is down during my recharge?',
        a: 'If an upstream carrier or utility disco experiences a temporary outage and fails to confirm delivery, the transaction fails gracefully and your wallet balance is reversed immediately.',
      },
      {
        q: 'Can I connect my VTU website or mobile app to Verxor?',
        a: 'API access is available for selected services. Check the developer documentation and your account dashboard for current endpoints, authentication, and event support.',
      },
      {
        q: 'Do you offer discounted wholesale rates for volume data resellers?',
        a: 'Yes, our platform provides dedicated wholesale reseller pricing tiers across all Nigerian telecom networks so you can vend data and airtime with healthy profit margins.',
      },
    ],
  },
  {
    category: 'Virtual USD Cards',
    items: [
      {
        q: 'Which merchants accept Verxor virtual USD cards?',
        a: 'Acceptance depends on the merchant, card network, and card configuration. Review the card details and any usage restrictions before making a payment.',
      },
      {
        q: 'How do I fund my virtual dollar card?',
        a: 'Funding options, exchange rates, and fees are displayed in the card flow before confirmation. Review the applicable terms in your account.',
      },
      {
        q: 'What happens if a card payment is refunded or fails?',
        a: 'Merchant refunds, declined-payment fees, and 3D Secure support depend on the card terms and transaction. Check the card details in your account or contact support for help with a transaction.',
      },
    ],
  },
  {
    category: 'Global Travel eSIM',
    items: [
      {
        q: 'How do I activate my eSIM after purchase?',
        a: 'After purchase, the setup instructions and activation details are provided for your plan. Your device must support eSIM, and installation time can vary.',
      },
      {
        q: 'Can I keep my normal WhatsApp number while using the travel eSIM?',
        a: 'Many eSIM-compatible phones support using a travel eSIM alongside a primary SIM. Check your device compatibility and plan coverage before purchase.',
      },
      {
        q: 'How does the Developer & Reseller eSIM platform work?',
        a: 'Developer and reseller eSIM options are available for eligible partners. Contact us for current coverage, integration requirements, and commercial terms.',
      },
    ],
  },
  {
    category: 'Social Growth & SMM',
    items: [
      {
        q: 'What social growth services are available?',
        a: 'Verxor offers social growth services for individual users and businesses. Available services and their terms are shown in the catalog; use them in line with the relevant social platform’s rules.',
      },
      {
        q: 'What discounts do Resellers and API users receive?',
        a: 'Reseller and API access is available for selected services. Pricing, eligibility, and integration details are provided in the partnership information and account dashboard.',
      },
      {
        q: 'How fast do SMM engagement orders start?',
        a: 'Start times and service terms vary by catalog item. Review the estimated timing and any refill or cancellation terms shown before ordering.',
      },
      {
        q: 'How does Verxor ensure safety when buying an established account or channel?',
        a: 'Verxor does not offer account credentials or access transfers through this service. Social growth products are subject to the terms shown in the catalog and the relevant platform rules.',
      },
      {
        q: 'Can I integrate Verxor’s SMM catalog into my own child panel?',
        a: 'API availability and supported actions vary by service. Review the current documentation for catalog, balance, order, and status endpoints.',
      },
    ],
  },
  {
    category: 'Residential Proxies & Gift Cards',
    items: [
      {
        q: 'What is the difference between rotating and sticky proxies?',
        a: 'Rotating sessions can change IP addresses between requests, while sticky sessions retain an address for a configured period. Available behavior and session limits depend on the selected proxy plan.',
      },
      {
        q: 'How long does gift card verification take?',
        a: 'Available gift card brands, rates, review steps, and expected settlement timing are shown in the gift card flow before you submit.',
      },
    ],
  },
];

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Verxor',
  url: 'https://verxor.com',
  logo: 'https://verxor.com/brand/verxor-logo.svg',
  description:
    'Global digital infrastructure for Africa’s digital economy: virtual numbers, eSIM, VTU data, USD cards, SMM marketplace, and developer APIs.',
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Verxor',
  url: 'https://verxor.com',
  inLanguage: 'en',
};

export default function HomePage() {
  return (
    <div className="vx-landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />

      <MarketingHeader />

      <main>
        {/* HERO SECTION */}
        <section className="vx-hero">
          <div className="vx-hero-bg-glow" aria-hidden="true" />
          <div className="vx-container vx-hero-content">
            <div className="vx-status-pill">
              <span className="vx-status-dot" />
              <span>GLOBAL DIGITAL SERVICES · ONE WALLET EXPERIENCE</span>
            </div>

            <h1 className="vx-hero-title">
              Global Digital Infrastructure for <span>Africa’s Digital Economy.</span>
            </h1>

            <p className="vx-hero-sub">
              Use one wallet to access digital services and everyday utilities. Built with developer options for creators,
              agencies, and businesses.
            </p>

            {/* INTERACTIVE SERVICE PILLS */}
            <div className="vx-hero-pills" aria-label="Quick jump to digital services">
              {servicePills.map((pill) => (
                <a key={pill.label} href={pill.href} className="vx-hero-pill">
                  {pill.label}
                </a>
              ))}
            </div>

            {/* HERO CTAS */}
            <div className="vx-hero-actions">
              <a href="/workspace" className="vx-btn vx-btn-primary">
                Launch Workspace <ArrowRight size={17} />
              </a>
              <a href="/api-partnership" className="vx-btn vx-btn-secondary">
                Developer & Reseller API <ChevronRight size={17} />
              </a>
            </div>

            {/* TRUST METRICS STRIP */}
            <div className="vx-metrics-strip">
              <div className="vx-metric-item"><strong>One</strong><span>Wallet experience</span></div>
              <div className="vx-metric-item"><strong>Global</strong><span>Digital services</span></div>
              <div className="vx-metric-item"><strong>API</strong><span>For builders</span></div>
              <div className="vx-metric-item"><strong>Clear</strong><span>Before you confirm</span></div>
            </div>

            {/* HERO 3D FEATURE CARD */}
            <div className="vx-hero-showcase">
              <div className="vx-showcase-grid">
                <div className="vx-showcase-copy">
                  <div className="vx-badge">FINTECH & VIRTUAL CARD LAYER</div>
                  <h2>Borderless Payments Direct From Your Wallet.</h2>
                  <p>
                    Explore virtual USD card options for online purchases and subscriptions. Card availability, features,
                    fees, and terms are presented before you apply.
                  </p>
                  <ul className="vx-feature-checklist">
                    <li>
                      <CheckCircle2 size={16} /> Funding options shown in your account
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> For eligible online purchases and subscriptions
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> Card controls available in your account
                    </li>
                  </ul>
                  <a href="/services/virtual-cards" className="vx-link-btn">
                    Explore Virtual Cards <ArrowUpRight size={16} />
                  </a>
                </div>
                <div className="vx-showcase-visual">
                  <img
                    src="/3d/verxor_hero_virtual_card.png"
                    alt="Verxor 3D Virtual Dollar Card"
                    className="vx-3d-img"
                    loading="eager"
                  />
                  <div className="vx-visual-floating-tag">
                    <Sparkles size={14} />
                    <span>3DS OTP in Live Dashboard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICE 1: VIRTUAL NUMBERS & RENTALS */}
        <section id="numbers" className="vx-section vx-section-alt">
          <div className="vx-container">
            <div className="vx-section-header">
              <span className="vx-eyebrow">TELECOM & VERIFICATION LAYER</span>
              <h2>Virtual Numbers for One-Time Verification & Rentals</h2>
              <p>
                Choose from available virtual number activations and rentals. Review supported services, rental duration, and number capabilities before placing an order.
              </p>
            </div>

            <div className="vx-showcase-grid">
              <div className="vx-showcase-visual">
                <img
                  src="/3d/verxor_virtual_number_3d.png"
                  alt="Verxor 3D Virtual SIM Card"
                  className="vx-3d-img"
                  loading="lazy"
                />
                <div className="vx-visual-floating-tag">
                  <Radio size={14} />
                  <span>Number options for different needs</span>
                </div>
              </div>

              <div className="vx-showcase-copy">
                <div className="vx-badge">FOUR TELEPHONY STAGES</div>
                <h3>Choose the exact level of access your workflow requires:</h3>

                <div className="vx-stages-grid">
                  {numberStages.map((stage) => (
                    <div key={stage.name} className="vx-stage-card">
                      <div className="vx-stage-head">
                        <span className="vx-stage-tier">{stage.tier}</span>
                        <span className="vx-stage-tag">{stage.tag}</span>
                      </div>
                      <h4>{stage.name}</h4>
                      <p>{stage.desc}</p>
                      <small>Duration: {stage.duration}</small>
                    </div>
                  ))}
                </div>

                <div className="vx-action-group">
                  <a href="/services/virtual-numbers" className="vx-btn vx-btn-primary">
                    Instant OTP Activations <ArrowRight size={16} />
                  </a>
                  <a href="/services/number-rentals" className="vx-btn vx-btn-secondary">
                    Long-Term Number Rentals <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICE 2: AUTOMATED VTU & UTILITIES */}
        <section id="vtu" className="vx-section">
          <div className="vx-container">
            <div className="vx-section-header">
              <span className="vx-eyebrow">NIGERIA UTILITY INFRASTRUCTURE</span>
              <h2>VTU Data & Everyday Utilities for Nigeria</h2>
              <p>
                Delivering stable, fast, and fully automated airtime, data, NEPA, TV subscriptions, bulk SMS, airtime to
                cash, and exam PIN services. Everything you need, all in one place.
              </p>
            </div>

            <div className="vx-showcase-grid is-reversed">
              <div className="vx-showcase-copy">
                <div className="vx-quote-box">
                  <p>
                    &ldquo;Verxor helps vendors, resellers, developers and businesses sell data, airtime, cable TV,
                    electricity, exam pins and other digital services from one simple wallet-powered platform. Built for
                    people searching for the best affordable API provider in Nigeria for VTU websites, data resale,
                    airtime vending and automated bills payment.&rdquo;
                  </p>
                </div>

                <ul className="vx-feature-checklist">
                  {vtuPillars.map((pillar) => (
                    <li key={pillar}>
                      <Zap size={16} className="vx-icon-accent" /> {pillar}
                    </li>
                  ))}
                </ul>

                <div className="vx-action-group">
                  <a href="/services/vtu-api" className="vx-btn vx-btn-primary">
                    Connect VTU API <ArrowRight size={16} />
                  </a>
                  <a href="/services/data" className="vx-btn vx-btn-secondary">
                    View Data Plans (OPay-Style) <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>

              <div className="vx-showcase-visual">
                <img
                  src="/3d/verxor_vtu_utilities_3d.png"
                  alt="Verxor 3D VTU Telecom Utilities"
                  className="vx-3d-img"
                  loading="lazy"
                />
                <div className="vx-visual-floating-tag">
                  <Cpu size={14} />
                  <span>Automated order processing</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICE 3: USD VIRTUAL CARDS */}
        <section id="cards" className="vx-section vx-section-alt">
          <div className="vx-container">
            <div className="vx-section-header">
              <span className="vx-eyebrow">GLOBAL PAYMENTS & FINTECH</span>
              <h2>USD Virtual Cards for Online Payments</h2>
              <p>
                Explore virtual USD card options for online shopping, subscriptions, and international purchases. Availability, funding, and card terms are shown in your account before you proceed.
              </p>
            </div>

            <div className="vx-showcase-grid">
              <div className="vx-showcase-visual">
                <img
                  src="/3d/verxor_hero_virtual_card.png"
                  alt="Verxor Virtual Dollar Card"
                  className="vx-3d-img"
                  loading="lazy"
                />
                <div className="vx-visual-floating-tag">
                  <CreditCard size={14} />
                  <span>Card network shown before application</span>
                </div>
              </div>

              <div className="vx-showcase-copy">
                <div className="vx-badge">VIRTUAL USD CARD</div>
                <h3>Engineered for builders, digital nomads, and creators:</h3>

                <ul className="vx-feature-checklist">
                  <li>
                    <CheckCircle2 size={16} /> Accepted on Apple, Google Play, Netflix, Spotify, Amazon, OpenAI, Meta Ads & AWS
                  </li>
                  <li>
                    <CheckCircle2 size={16} /> Card security and verification features, where supported, are shown in the card flow
                  </li>
                  <li>
                    <CheckCircle2 size={16} /> Available card controls are managed from your account dashboard
                  </li>
                  <li>
                    <CheckCircle2 size={16} /> Review card fees and applicable currency conversion terms before funding
                  </li>
                </ul>

                <a href="/services/virtual-cards" className="vx-btn vx-btn-primary">
                  Issue Virtual Dollar Card <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICE 4: GLOBAL TRAVEL ESIM */}
        <section id="esim" className="vx-section">
          <div className="vx-container">
            <div className="vx-section-header">
              <span className="vx-eyebrow">INTERNATIONAL CONNECTIVITY</span>
              <h2>Global Travel eSIMs for Supported Destinations</h2>
              <p>
                Get mobile data for travel without swapping physical SIM cards. Check device compatibility, coverage, plan allowance, and activation instructions before purchase.
              </p>
            </div>

            <div className="vx-showcase-grid is-reversed">
              <div className="vx-showcase-copy">
                <div className="vx-badge">CONSUMER ROAMING BUNDLES</div>
                <h3>Travel Connected Anywhere on Earth</h3>
                <ul className="vx-feature-checklist">
                  <li>
                    <CheckCircle2 size={16} /> Setup and activation instructions are provided for the selected plan
                  </li>
                  <li>
                    <CheckCircle2 size={16} /> Review available data bundles and destination coverage in the plan catalog
                  </li>
                  <li>
                    <CheckCircle2 size={16} /> Keep your original WhatsApp number active while using Verxor for local data
                  </li>
                </ul>

                <div className="vx-reseller-box">
                  <div className="vx-reseller-tag">JUST FOR DEVELOPERS & BRANDS</div>
                  <h4>eSIM Reseller Platform — Sell Global eSIM Data Under Your Brand</h4>
                  <p>
                    Reseller options for travel brands, apps, and developers. Contact us for current destination coverage, integration requirements, and commercial terms.
                  </p>
                  <a href="/api-partnership" className="vx-link-btn">
                    Explore B2B eSIM API <ArrowUpRight size={16} />
                  </a>
                </div>

                <a href="/services/esim" className="vx-btn vx-btn-primary">
                  Browse Travel eSIM Plans <ArrowRight size={16} />
                </a>
              </div>

              <div className="vx-showcase-visual">
                <img
                  src="/3d/verxor_esim_globe_3d.png"
                  alt="Verxor 3D Global eSIM Globe"
                  className="vx-3d-img"
                  loading="lazy"
                />
                <div className="vx-visual-floating-tag">
                  <Globe size={14} />
                  <span>Global eSIM coverage</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICE 5: SMM ENGINE & ASSET MARKETPLACE */}
        <section id="smm" className="vx-section vx-section-alt">
          <div className="vx-container">
            <div className="vx-section-header">
              <span className="vx-eyebrow">GROWTH ENGINE & ASSET MARKETPLACE</span>
              <h2>Social Growth Services for Creators & Businesses</h2>
              <p>
                Explore social media marketing services for selected platforms, with options for creators, businesses, and eligible resellers. Review service specifications and platform rules before ordering.
              </p>
            </div>

            <div className="vx-showcase-grid">
              <div className="vx-showcase-visual">
                <img
                  src="/3d/verxor_smm_growth_3d.png"
                  alt="Verxor 3D SMM Growth Engine"
                  className="vx-3d-img"
                  loading="lazy"
                />
                <div className="vx-visual-floating-tag">
                  <TrendingUp size={14} />
                  <span>Reseller & API options</span>
                </div>
              </div>

              <div className="vx-showcase-copy">
                <div className="vx-badge">SOCIAL MEDIA MARKETING</div>
                <h3>Choose services that fit your goals</h3>

                <div className="vx-market-chips">
                  <span>Instagram growth</span>
                  <span>YouTube promotion</span>
                  <span>TikTok growth</span>
                  <span>Facebook services</span>
                  <span>Telegram services</span>
                  <span>Platform-specific options</span>
                </div>

                <ul className="vx-feature-checklist">
                  <li>
                    <CheckCircle2 size={16} /> Service options across selected social platforms
                  </li>
                  <li>
                    <CheckCircle2 size={16} /> Catalog details show service requirements, quantities, and terms
                  </li>
                  <li>
                    <CheckCircle2 size={16} /> Automated REST endpoints compatible with standard SMM child panel protocols
                  </li>
                  <li>
                    <CheckCircle2 size={16} /> Partner pricing for eligible reseller and API services
                  </li>
                </ul>

                <div className="vx-action-group">
                  <a href="/services/smm" className="vx-btn vx-btn-primary">
                    Launch SMM Engine <ArrowRight size={16} />
                  </a>
                  <a href="/child-panels" className="vx-btn vx-btn-secondary">
                    Run Branded Child Panel <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICE 6 & 7: PROXIES & GIFT CARDS (DUAL GRID) */}
        <section id="proxies" className="vx-section">
          <div className="vx-container">
            <div className="vx-grid-dual">
              {/* PROXIES */}
              <div className="vx-dual-card">
                <div className="vx-dual-visual">
                  <img
                    src="/3d/verxor_proxy_servers_3d.png"
                    alt="Verxor 3D Residential Proxies"
                    className="vx-dual-img"
                    loading="lazy"
                  />
                </div>
                <div className="vx-dual-body">
                  <span className="vx-eyebrow">AUTOMATION & DATA INFRASTRUCTURE</span>
                  <h3>Residential & Datacenter Proxies</h3>
                  <p>
                    Explore proxy options for legitimate research, connectivity, and testing workflows. Coverage, session behavior, and technical specifications vary by plan and are shown before purchase.
                  </p>
                  <ul className="vx-feature-checklist">
                    <li>
                      <CheckCircle2 size={16} /> Rotating and sticky sessions (up to 30 mins)
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> HTTP and SOCKS5 with user:pass authentication
                    </li>
                  </ul>
                  <a href="/services/proxies" className="vx-btn vx-btn-secondary">
                    Configure Proxies <ArrowRight size={16} />
                  </a>
                </div>
              </div>

              {/* GIFT CARDS */}
              <div id="giftcards" className="vx-dual-card">
                <div className="vx-dual-visual">
                  <img
                    src="/3d/verxor_giftcard_trading_3d.png"
                    alt="Verxor 3D Gift Card Trading"
                    className="vx-dual-img"
                    loading="lazy"
                  />
                </div>
                <div className="vx-dual-body">
                  <span className="vx-eyebrow">LIQUIDITY & VALUE EXCHANGE</span>
                  <h3>Gift Card Trading with Rates Shown Before You Submit</h3>
                  <p>
                    Exchange supported gift cards and review the quoted rate and verification steps before submitting. Settlement timing depends on card type and review results.
                  </p>
                  <ul className="vx-feature-checklist">
                    <li>
                      <CheckCircle2 size={16} /> Available brands and accepted card types are listed in the trading flow
                    </li>
                    <li>
                      <CheckCircle2 size={16} /> Review current rates and settlement estimates before submitting
                    </li>
                  </ul>
                  <a href="/services/gift-cards" className="vx-btn vx-btn-secondary">
                    Trade Gift Cards <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICE 8: DEVELOPER API & RESELLER INFRASTRUCTURE */}
        <section id="api" className="vx-section vx-section-alt">
          <div className="vx-container">
            <div className="vx-showcase-grid">
              <div className="vx-showcase-copy">
                <span className="vx-eyebrow">UNIFIED DEVELOPER GATEWAY</span>
                <h2>Single-Wallet API Infrastructure for Builders & Resellers</h2>
                <p>
                  Integrate selected Verxor services into your application using the available developer tools. Check the documentation for current coverage, endpoints, and integration requirements.
                </p>

                <ul className="vx-feature-checklist">
                  <li>
                    <CheckCircle2 size={16} /> API documentation and supported integration features
                  </li>
                  <li>
                    <CheckCircle2 size={16} /> Status updates and event callbacks for supported services
                  </li>
                  <li>
                    <CheckCircle2 size={16} /> White-label and reseller options for eligible partners
                  </li>
                  <li>
                    <CheckCircle2 size={16} /> Partnership pricing and support details shared during onboarding
                  </li>
                </ul>

                <div className="vx-action-group">
                  <a href="/api-partnership" className="vx-btn vx-btn-primary">
                    Explore API Documentation <ArrowRight size={16} />
                  </a>
                  <a href="/child-panels" className="vx-btn vx-btn-secondary">
                    Apply for Reseller Panel <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>

              <div className="vx-showcase-visual">
                <img
                  src="/3d/verxor_reseller_api_3d.png"
                  alt="Verxor 3D Developer Reseller API"
                  className="vx-3d-img"
                  loading="lazy"
                />
                <div className="vx-visual-floating-tag">
                  <Code2 size={14} />
                  <span>REST API & Webhooks</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPREHENSIVE FAQS */}
        <section id="faq" className="vx-section">
          <div className="vx-container">
            <div className="vx-section-header">
              <span className="vx-eyebrow">TRANSPARENT ANSWERS</span>
              <h2>Frequently Asked Questions</h2>
              <p>
                Everything you need to know about our virtual numbers, VTU infrastructure, USD cards, eSIM, SMM engine,
                and developer APIs.
              </p>
            </div>

            <div className="vx-faq-groups">
              {faqsBySection.map((group) => (
                <div key={group.category} className="vx-faq-group">
                  <h3 className="vx-faq-group-title">{group.category}</h3>
                  <div className="vx-faq-list">
                    {group.items.map((item) => (
                      <details key={item.q} className="vx-faq-item">
                        <summary className="vx-faq-summary">
                          <span>{item.q}</span>
                          <span className="vx-faq-toggle" aria-hidden="true">
                            +
                          </span>
                        </summary>
                        <p className="vx-faq-answer">{item.a}</p>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM ACTION BANNER */}
        <section className="vx-bottom-banner">
          <div className="vx-container vx-bottom-content">
            <div className="vx-badge vx-badge-light">READY TO BUILD?</div>
            <h2>Launch Your Digital Infrastructure on Verxor Today.</h2>
            <p>
              Bring your digital service workflows together with Verxor. Explore available products for individuals, businesses, developers, and resellers.
            </p>
            <div className="vx-hero-actions">
              <a href="/workspace" className="vx-btn vx-btn-white">
                Launch Free Workspace <ArrowRight size={17} />
              </a>
              <a href="/api-partnership" className="vx-btn vx-btn-outline-white">
                Partner & Reseller API <ChevronRight size={17} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
