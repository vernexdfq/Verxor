import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Zap,
  Globe2,
  Shield,
  RefreshCw,
  Rocket,
  Code2,
} from 'lucide-react';
import { MarketingHeader, MarketingFooter, ButtonLink } from '../../../src/marketing/components';
import { servicePages } from '../../../src/marketing/data';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return servicePages.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = servicePages.find((item) => item.slug === slug);
  if (!service) return { title: 'Service not found | Verxor' };
  const canonical = '/services/' + service.slug;
  return {
    title: service.title + ' | Verxor',
    description: service.description,
    alternates: { canonical },
    openGraph: {
      title: service.title + ' | Verxor',
      description: service.description,
      url: 'https://www.verxor.com' + canonical,
      siteName: 'Verxor',
      type: 'website',
      images: [{ url: '/brand/verxor-logo.svg', width: 256, height: 256, alt: 'Verxor' }],
    },
  };
}

const serviceVisualMap: Record<
  string,
  { image: string; tag: string; availability: string; pricing: string; fulfillment: string }
> = {
  'virtual-numbers': {
    image: '/3d/verxor_virtual_number_3d.png',
    tag: '100% No-Code Refund Policy',
    availability: 'Tier-1 US Non-VoIP SIMs',
    pricing: 'Live transparent rates',
    fulfillment: 'Instant 10–20m window',
  },
  'number-rentals': {
    image: '/3d/verxor_virtual_number_3d.png',
    tag: 'Dedicated Line Retention',
    availability: '7 to 90 days multi-service',
    pricing: 'Discounted rental blocks',
    fulfillment: 'Dedicated number assigned',
  },
  'virtual-cards': {
    image: '/3d/verxor_hero_virtual_card.png',
    tag: 'Global Visa / Mastercard',
    availability: 'International online checkouts',
    pricing: 'Direct Naira-to-USD conversion',
    fulfillment: 'Instant provisioning with 3DS',
  },
  data: {
    image: '/3d/verxor_vtu_utilities_3d.png',
    tag: 'MTN · Glo · Airtel · 9mobile',
    availability: 'SME, Corporate & Gifting data',
    pricing: 'Wholesale reseller pricing',
    fulfillment: 'Automated sub-second vending',
  },
  airtime: {
    image: '/3d/verxor_vtu_utilities_3d.png',
    tag: 'Automated Telco Vending',
    availability: 'All Nigerian telecom networks',
    pricing: 'Up to 3% wallet cashback',
    fulfillment: 'Instant line top-up',
  },
  electricity: {
    image: '/3d/verxor_vtu_utilities_3d.png',
    tag: '11 Nigerian DisCos Supported',
    availability: 'Prepaid and postpaid meters',
    pricing: 'Zero convenience surcharges',
    fulfillment: 'Instant 20-digit meter token',
  },
  'cable-tv': {
    image: '/3d/verxor_vtu_utilities_3d.png',
    tag: 'DStv · GOtv · StarTimes',
    availability: 'All bouquets and packages',
    pricing: 'Direct official billing rates',
    fulfillment: 'Instant decoder unfreezing',
  },
  'exam-pin': {
    image: '/3d/verxor_vtu_utilities_3d.png',
    tag: 'WAEC · NECO · JAMB e-PINs',
    availability: 'Official educational scratch cards',
    pricing: 'Discounted candidate rates',
    fulfillment: 'Instant serial & PIN display',
  },
  'bet-funding': {
    image: '/3d/verxor_vtu_utilities_3d.png',
    tag: 'Top Sports Betting Wallets',
    availability: 'Bet9ja, SportyBet, 1xBet & more',
    pricing: 'Zero funding fees',
    fulfillment: 'Instant user ID wallet credit',
  },
  'vtu-api': {
    image: '/3d/verxor_vtu_utilities_3d.png',
    tag: 'REST API & Webhooks',
    availability: 'High-throughput telecom gateway',
    pricing: 'Tiered wholesale volume rates',
    fulfillment: 'JSON response & webhook push',
  },
  smm: {
    image: '/3d/verxor_smm_growth_3d.png',
    tag: '50%–70% Reseller Discounts',
    availability: 'TikTok, Instagram, YouTube, X',
    pricing: 'Wholesale tier discounts',
    fulfillment: 'Direct upstream queue dispatch',
  },
  'accounts-logs': {
    image: '/3d/verxor_smm_growth_3d.png',
    tag: 'Verified Digital Delivery',
    availability: 'Creator growth assets',
    pricing: 'Catalog-listed pricing',
    fulfillment: 'Secure in-dashboard access',
  },
  esim: {
    image: '/3d/verxor_esim_globe_3d.png',
    tag: '200+ Countries & Regions',
    availability: 'Local, regional & global plans',
    pricing: 'Pay in Naira or USD',
    fulfillment: 'Instant QR code installation',
  },
  proxies: {
    image: '/3d/verxor_proxy_servers_3d.png',
    tag: '99.7% Success Rate',
    availability: '195+ countries residential IPs',
    pricing: 'Pay per GB or port block',
    fulfillment: 'Instant credential credentials',
  },
  'gift-cards': {
    image: '/3d/verxor_giftcard_trading_3d.png',
    tag: '50+ Global Brands',
    availability: 'Steam, Apple, Google, Amazon',
    pricing: 'Top market exchange rates',
    fulfillment: 'Split-second wallet cashout',
  },
};

export default async function ServiceLandingPage({ params }: Props) {
  const { slug } = await params;
  const service = servicePages.find((item) => item.slug === slug);
  if (!service) notFound();

  const visual = serviceVisualMap[slug] || {
    image: '/3d/verxor_virtual_number_3d.png',
    tag: 'Verified Service Pipeline',
    availability: 'Active across global pools',
    pricing: 'Transparent live rates',
    fulfillment: 'Instant automated processing',
  };

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.description,
    provider: { '@type': 'Organization', name: 'Verxor', url: 'https://www.verxor.com' },
    url: 'https://www.verxor.com/services/' + service.slug,
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: service.faqs.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <MarketingHeader />

      <main className="mk-service-page">
        {/* SUBPAGE HERO */}
        <section className="mk-service-hero">
          <div className="mk-container mk-service-hero-grid">
            <div className="mk-service-hero-copy">
              {/* Breadcrumb */}
              <div className="mk-breadcrumb">
                <a href="/">Home</a>
                <span>/</span>
                <a href="/#all-services">Catalog</a>
                <span>/</span>
                <span className="mk-breadcrumb-active">{service.shortTitle}</span>
              </div>

              {/* Eyebrow badge */}
              <div className="mk-subpage-badge">
                <ShieldCheck size={14} className="mk-subpage-badge-icon" />
                <span>{service.eyebrow}</span>
              </div>

              {/* Title */}
              <h1 className="mk-subpage-title">{service.title}</h1>

              {/* Intro */}
              <p className="mk-subpage-intro">{service.intro}</p>

              {/* Action buttons */}
              <div className="mk-hero-actions">
                <ButtonLink href="/dashboard" variant="primary">
                  Explore in Verxor <ArrowRight size={16} />
                </ButtonLink>
                <ButtonLink href="/api-partnership" variant="secondary">
                  API &amp; Partner Access
                </ButtonLink>
              </div>

              {/* Service assurance chips */}
              <div className="mk-service-assurance">
                <span>
                  <ShieldCheck size={15} /> Clear &amp; transparent terms
                </span>
                <span>
                  <Clock3 size={15} /> Real-time status visibility
                </span>
              </div>
            </div>

            {/* Right: 3D Art & Specs Card */}
            <div className="mk-service-art">
              <div className="mk-service-art-halo" />
              <div className="mk-service-art-card">
                <div className="mk-art-img-wrap">
                  <img src={visual.image} alt={service.shortTitle} className="mk-art-3d-img" />
                  <div className="mk-art-chip">
                    <span className="mk-chip-dot" />
                    <span>{visual.tag}</span>
                  </div>
                </div>

                <div className="mk-art-meta">
                  <span className="mk-mini-label">VERXOR SPECIFICATION</span>
                  <h2>{service.shortTitle}</h2>
                  <p>{service.description}</p>
                </div>

                <div className="mk-art-divider" />

                <div className="mk-art-specs">
                  <div className="mk-art-row">
                    <span>Availability</span>
                    <b>{visual.availability}</b>
                  </div>
                  <div className="mk-art-row">
                    <span>Pricing</span>
                    <b>{visual.pricing}</b>
                  </div>
                  <div className="mk-art-row">
                    <span>Fulfillment</span>
                    <b>{visual.fulfillment}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: WHAT TO KNOW */}
        <section className="mk-section">
          <div className="mk-container">
            <div className="mk-section-heading">
              <span className="mk-section-eyebrow">WHAT TO KNOW</span>
              <h2>Make an informed, confident choice.</h2>
              <p>Understand the key technical details and delivery standards before you place an order.</p>
            </div>

            <div className="mk-benefit-grid">
              {service.benefits.map((benefit, i) => (
                <article key={benefit.title} className="mk-benefit-card">
                  <span className="mk-benefit-index">0{i + 1}</span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION: HOW IT WORKS */}
        <section className="mk-service-process">
          <div className="mk-container mk-service-process-grid">
            <div>
              <span className="mk-section-eyebrow">HOW IT WORKS</span>
              <h2>Three simple steps to deploy.</h2>
              <p>Automated from wallet checkout to final delivery in your secure Verxor dashboard.</p>
            </div>

            <div className="mk-process-list">
              {service.steps.map((step, i) => (
                <article key={step.title} className="mk-process-card">
                  <span className="mk-process-index">{i + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION: SERVICE FAQ */}
        <section className="mk-section mk-service-faq">
          <div className="mk-container mk-faq-layout">
            <div>
              <span className="mk-section-eyebrow">FREQUENT QUESTIONS</span>
              <h2>Before you proceed.</h2>
              <p>Important answers and usage details about {service.shortTitle.toLowerCase()}.</p>
            </div>

            <div className="mk-faq-list">
              {service.faqs.map(([q, a]) => (
                <details key={q} className="mk-faq-details">
                  <summary>
                    <span>{q}</span>
                    <span className="mk-faq-symbol">+</span>
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* NOTE BAND */}
        <section className="mk-note-band">
          <div className="mk-container">
            <CircleHelp size={20} className="mk-note-icon" />
            <p>{service.note}</p>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="mk-service-bottom">
          <div className="mk-container">
            <div>
              <h2>Ready to deploy {service.shortTitle.toLowerCase()}?</h2>
              <p>Access live inventory, real-time rates, and instant automated delivery from your Verxor wallet.</p>
            </div>
            <ButtonLink href="/dashboard" variant="white">
              Launch Workspace <ArrowRight size={16} />
            </ButtonLink>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
