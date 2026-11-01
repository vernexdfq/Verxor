'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  CreditCard,
  Zap,
  Rocket,
  Globe,
  Globe2,
  Shield,
  ShieldCheck,
  RefreshCw,
  Code2,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Lock,
  Layers,
  Cpu,
  Check,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';

export type ServiceKey =
  | 'numbers'
  | 'cards'
  | 'vtu'
  | 'smm'
  | 'esim'
  | 'proxies'
  | 'giftcards'
  | 'api';

export interface ServiceData {
  id: ServiceKey;
  pillLabel: string;
  pillIcon: React.ElementType;
  badge: string;
  headline: string;
  subhead: string;
  image: string;
  imageAlt: string;
  ctaText: string;
  ctaHref: string;
  secondaryText: string;
  secondaryHref: string;
  features: { title: string; desc: string }[];
  tag: string;
}

export const servicesData: Record<ServiceKey, ServiceData> = {
  numbers: {
    id: 'numbers',
    pillLabel: 'Virtual Numbers & Rentals',
    pillIcon: Smartphone,
    badge: 'Carrier-Grade Non-VoIP',
    headline: 'Carrier-Grade Virtual Numbers for Instant OTP & Dedicated Rentals',
    subhead:
      'Access real, high-delivery mobile numbers originating from tier-1 US and global mobile operators. Instantly receive verification codes for 2,000+ platforms or rent dedicated lines to keep accounts safe.',
    image: '/3d/verxor_virtual_number_3d.png',
    imageAlt: 'Verxor 3D Virtual SIM Card & Numbers',
    ctaText: 'Instant OTP Activations',
    ctaHref: '/services/virtual-numbers',
    secondaryText: 'Long-Term Number Rentals',
    secondaryHref: '/services/number-rentals',
    tag: '100% No-Code Refund Policy',
    features: [
      {
        title: 'Instant One-Time OTP',
        desc: 'Disposable 10–20 minute numbers for WhatsApp, Google, Telegram, and TikTok with automated 100% refund if no code arrives.',
      },
      {
        title: 'Single-Platform Long-Term Rental',
        desc: 'Retain the same phone number for weeks or months dedicated to a single selected app (e.g. WhatsApp Business or Telegram).',
      },
      {
        title: 'All-Platform Multi-Service Line',
        desc: 'One dedicated non-VoIP number to register and catch codes from all major platforms over days or weeks.',
      },
      {
        title: 'Two-Way Voice & SMS Available',
        desc: 'Active lines with in-app 2-way text messaging and voice verification code transcription.',
      },
    ],
  },
  cards: {
    id: 'cards',
    pillLabel: 'USD Virtual Cards',
    pillIcon: CreditCard,
    badge: 'International Payments',
    headline: 'Reliable USD Virtual Cards for Global Subscriptions & Ad Spend',
    subhead:
      'Create high-acceptance virtual USD Visa and Mastercards to pay for international tools, subscriptions, cloud servers, and digital ads without foreign exchange card limits.',
    image: '/3d/verxor_hero_virtual_card.png',
    imageAlt: 'Verxor 3D Virtual USD Card',
    ctaText: 'Get Virtual Card',
    ctaHref: '/services/virtual-cards',
    secondaryText: 'Card Limits & Rates',
    secondaryHref: '/workspace',
    tag: 'Global Merchant Acceptance',
    features: [
      {
        title: 'Accepted Worldwide',
        desc: 'Pay for Netflix, Spotify, Google Workspace, Amazon, Canva, OpenAI ChatGPT, and Meta Ads without card limits.',
      },
      {
        title: 'Fund with Naira Wallet',
        desc: 'Convert your Verxor wallet balance directly into USD card balance at competitive live rates.',
      },
      {
        title: 'Instant In-App Card Controls',
        desc: 'Freeze, unfreeze, check card statements, and view CVV security codes with one tap.',
      },
      {
        title: '3D Secure OTP Protection',
        desc: 'Receive dynamic verification codes directly in your Verxor notifications for secure checkout.',
      },
    ],
  },
  vtu: {
    id: 'vtu',
    pillLabel: 'Data & Airtime VTU',
    pillIcon: Zap,
    badge: 'Nigeria Telco Infrastructure',
    headline: 'Fast Automated VTU Data Bundles, Airtime & Utility Bills',
    subhead:
      'Instant delivery SME & corporate data bundles for MTN, Airtel, Glo, and 9mobile, plus prepaid electricity tokens and zero-downtime cable TV renewals.',
    image: '/3d/verxor_vtu_utilities_3d.png',
    imageAlt: 'Verxor 3D VTU Telecom Utilities',
    ctaText: 'View Data Plans',
    ctaHref: '/services/data',
    secondaryText: 'Connect VTU API',
    secondaryHref: '/services/vtu-api',
    tag: 'Sub-Second Automated Vending',
    features: [
      {
        title: '3-Line Fast Mobile Layout',
        desc: 'OPay-grade mobile plan cards with large data caps, validity duration, and one-tap payment buttons.',
      },
      {
        title: 'Specialized Long-Term Bundles',
        desc: 'Daily, weekly, monthly, 3-months+, and router plans available directly from the live catalog.',
      },
      {
        title: '11 Nigerian Electricity DisCos',
        desc: 'Instant 20-digit prepaid meter tokens generated in seconds with transaction receipts.',
      },
      {
        title: 'Cable TV Subscriptions',
        desc: 'Direct renewals for DStv, GOtv, and StarTimes with instant decoder unfreezing.',
      },
    ],
  },
  smm: {
    id: 'smm',
    pillLabel: 'Social Growth & SMM',
    pillIcon: Rocket,
    badge: 'Direct Upstream SMM',
    headline: 'Scale Social Visibility Across Major Creator & Business Platforms',
    subhead:
      'Accelerate your visibility, followers, likes, and engagement across TikTok, Instagram, YouTube, Facebook, X, and Telegram with direct upstream pipeline routing.',
    image: '/3d/verxor_smm_growth_3d.png',
    imageAlt: 'Verxor 3D Social Growth & SMM Engine',
    ctaText: 'Explore Growth Services',
    ctaHref: '/services/smm',
    secondaryText: 'White-Label SMM API',
    secondaryHref: '/api-partnership',
    tag: '50%–70% Reseller Discounts',
    features: [
      {
        title: 'Direct Upstream Server Queues',
        desc: 'High-throughput fulfillment pipelines engineered for speed, non-drop stability, and fast start times.',
      },
      {
        title: '50% to 70% Reseller Margins',
        desc: 'Certified reseller child panels and developers automatically qualify for wholesale discount rates.',
      },
      {
        title: 'Multi-Platform Coverage',
        desc: 'Comprehensive services for TikTok, Instagram, YouTube, Facebook, Telegram, and X.',
      },
      {
        title: 'Automated API & Webhooks',
        desc: 'Connect child panels or custom software via REST API with automated status synchronization.',
      },
    ],
  },
  esim: {
    id: 'esim',
    pillLabel: 'Global Travel eSIM',
    pillIcon: Globe2,
    badge: 'Worldwide Roaming',
    headline: 'Instant Global Roaming Data in 200+ Countries & Regions',
    subhead:
      'Stay connected worldwide without swapping physical SIM cards or paying exorbitant carrier roaming charges. Scan a QR code to activate instant high-speed data.',
    image: '/3d/verxor_esim_globe_3d.png',
    imageAlt: 'Verxor 3D Global Travel eSIM',
    ctaText: 'Browse eSIM Profiles',
    ctaHref: '/services/esim',
    secondaryText: 'Reseller eSIM Platform',
    secondaryHref: '/api-partnership',
    tag: 'Instant QR Code Activation',
    features: [
      {
        title: '200+ Destinations',
        desc: 'Local, regional, and global data plans across North America, Europe, Asia, Africa, and the Middle East.',
      },
      {
        title: 'Instant QR Activation',
        desc: 'Download your eSIM profile in minutes directly from your dashboard or confirmation email.',
      },
      {
        title: 'Dual SIM Capability',
        desc: 'Keep your primary home number active for calls/WhatsApp while using Verxor eSIM for data.',
      },
      {
        title: 'Developer & Reseller API',
        desc: 'Integrate eSIM data provisioning directly into travel apps and agency booking flows.',
      },
    ],
  },
  proxies: {
    id: 'proxies',
    pillLabel: 'Residential Proxies',
    pillIcon: Shield,
    badge: 'Clean Residential IPs',
    headline: 'High-Anonymity Rotating & Sticky Residential Proxies',
    subhead:
      'Access ethically sourced residential IP pools across 195+ countries. Built for data collection, market research, price monitoring, and brand verification.',
    image: '/3d/verxor_proxy_servers_3d.png',
    imageAlt: 'Verxor 3D Residential Proxies',
    ctaText: 'Deploy Proxies',
    ctaHref: '/services/proxies',
    secondaryText: 'Review Session Specs',
    secondaryHref: '/workspace',
    tag: '99.7% Success Rate',
    features: [
      {
        title: 'Rotating & Sticky Sessions',
        desc: 'Toggle between rotating IP per request or sticky IP sessions lasting up to 30 minutes.',
      },
      {
        title: 'Granular Geo-Targeting',
        desc: 'Target by country, city, state, and ASN with precise routing options.',
      },
      {
        title: 'HTTP & SOCKS5 Protocols',
        desc: 'Compatible with all standard scraping frameworks, automation bots, and browsers.',
      },
      {
        title: 'High Concurrency',
        desc: 'Unlimited simultaneous connection threads with dedicated bandwidth pipelines.',
      },
    ],
  },
  giftcards: {
    id: 'giftcards',
    pillLabel: 'Gift Card Trading',
    pillIcon: RefreshCw,
    badge: 'Instant Cashout',
    headline: 'Trade Digital Gift Cards with Split-Second Wallet Payouts',
    subhead:
      'Exchange unused global gift cards at competitive market rates. Enjoy automated verification and instant credit to your Verxor wallet.',
    image: '/3d/verxor_giftcard_trading_3d.png',
    imageAlt: 'Verxor 3D Gift Card Trading',
    ctaText: 'Trade Gift Cards',
    ctaHref: '/services/gift-cards',
    secondaryText: 'Check Current Rates',
    secondaryHref: '/workspace',
    tag: 'Zero Convenience Deductions',
    features: [
      {
        title: '50+ Supported Brands',
        desc: 'Steam, Apple iTunes, Google Play, Amazon, Razer Gold, Sephora, Nordstrom, and American Express.',
      },
      {
        title: 'Split-Second Settlement',
        desc: 'Fast automated code processing with immediate balance updates upon card confirmation.',
      },
      {
        title: 'Transparent Live Rates',
        desc: 'See the exact Naira settlement amount before submitting your cards.',
      },
      {
        title: 'Audit-Logged History',
        desc: 'Every trade is tracked with status updates and permanent transaction records.',
      },
    ],
  },
  api: {
    id: 'api',
    pillLabel: 'White-Label Reseller API',
    pillIcon: Code2,
    badge: '50%–70% Wholesale Margins',
    headline: 'Build Your Brand on Verxor’s Automated Service Infrastructure',
    subhead:
      'Launch your own branded child panel or connect your existing platform via high-throughput REST API. Enjoy 50% to 70% wholesale discounts while automating fulfillment.',
    image: '/3d/verxor_reseller_api_3d.png',
    imageAlt: 'Verxor 3D White-Label Reseller API',
    ctaText: 'Developer & API Docs',
    ctaHref: '/api-partnership',
    secondaryText: 'Child-Panel Program',
    secondaryHref: '/child-panels',
    tag: 'Sub-Second Webhook Callbacks',
    features: [
      {
        title: '50% to 70% Wholesale Discounts',
        desc: 'Automatic wholesale tier discounts for certified child panels and high-volume API partners.',
      },
      {
        title: 'Turnkey White-Label Panels',
        desc: 'Custom domain mapping, your own branding, and custom retail pricing above wholesale floors.',
      },
      {
        title: 'Unified Single Wallet API',
        desc: 'Query balances, order any service, and receive real-time webhook status updates.',
      },
      {
        title: '24/7 Redundant Infrastructure',
        desc: 'Enterprise-grade server reliability with automated fallback and zero manual intervention.',
      },
    ],
  },
};

export const serviceCatalogCards = [
  {
    title: 'Virtual Numbers & Rentals',
    image: '/3d/verxor_virtual_number_3d.png',
    imageAlt: '3D virtual numbers and SMS illustration',
    desc: 'US non-VoIP carrier lines for instant OTP and dedicated long-term multi-platform rentals.',
    icon: Smartphone,
    href: '/services/virtual-numbers',
    badge: 'Carrier-Grade Non-VoIP',
  },
  {
    title: 'USD Virtual Cards',
    image: '/3d/verxor_hero_virtual_card.png',
    imageAlt: '3D virtual USD card illustration',
    desc: 'High-acceptance Visa and Mastercard for international subscriptions, OpenAI, and ads.',
    icon: CreditCard,
    href: '/services/virtual-cards',
    badge: 'Visa / Mastercard',
  },
  {
    title: 'VTU Data & Airtime',
    image: '/3d/verxor_vtu_utilities_3d.png',
    imageAlt: '3D VTU and utilities illustration',
    desc: 'Automated Nigerian SME/corporate data bundles, airtime, NEPA electricity, and cable TV.',
    icon: Zap,
    href: '/services/data',
    badge: 'Sub-Second Vending',
  },
  {
    title: 'Social Growth & SMM',
    image: '/3d/verxor_smm_growth_3d.png',
    imageAlt: '3D social growth illustration',
    desc: 'Direct upstream server queues for TikTok, Instagram, YouTube, and X with 50%–70% reseller margins.',
    icon: Rocket,
    href: '/services/smm',
    badge: '50%–70% Reseller Rates',
  },
  {
    title: 'Global Travel eSIM',
    image: '/3d/verxor_esim_globe_3d.png',
    imageAlt: '3D travel eSIM illustration',
    desc: 'Instant QR code roaming data profiles covering 200+ countries with no physical SIM swaps.',
    icon: Globe2,
    href: '/services/esim',
    badge: '200+ Destinations',
  },
  {
    title: 'Residential Proxies',
    image: '/3d/verxor_proxy_servers_3d.png',
    imageAlt: '3D residential proxies illustration',
    desc: 'Ethically sourced rotating and sticky residential IPs across 195+ countries with 99.7% success.',
    icon: Shield,
    href: '/services/proxies',
    badge: '99.7% Success Rate',
  },
  {
    title: 'Gift Card Trading',
    image: '/3d/verxor_giftcard_trading_3d.png',
    imageAlt: '3D gift card trading illustration',
    desc: 'Fast automated gift card liquidation for 50+ global brands with split-second wallet payouts.',
    icon: RefreshCw,
    href: '/services/gift-cards',
    badge: 'Split-Second Settlement',
  },
  {
    title: 'White-Label Reseller API',
    image: '/3d/verxor_reseller_api_3d.png',
    imageAlt: '3D reseller API illustration',
    desc: 'High-throughput REST API and turnkey white-label child panels for agencies and developers.',
    icon: Code2,
    href: '/api-partnership',
    badge: 'Turnkey Infrastructure',
  },
];

export const landingFaqs = [
  {
    q: 'How does the No Code, No Charge guarantee work for virtual numbers?',
    a: 'If you purchase an instant verification number and no SMS verification code arrives within the allotted countdown window (usually 10 to 20 minutes), your Verxor wallet is automatically refunded 100% of the cost. There is zero risk.',
    category: 'numbers',
  },
  {
    q: 'Where do your virtual numbers originate from?',
    a: 'Our numbers originate directly from major tier-1 telecommunication carriers (primarily US physical non-VoIP SIMs). They are compatible with sensitive platforms including WhatsApp, Google, Telegram, TikTok, Instagram, and over 2,000 other online services.',
    category: 'numbers',
  },
  {
    q: 'What is the difference between an Instant OTP and a Long-Term Rental?',
    a: 'An Instant OTP number is a disposable line meant for receiving a single verification code within 10–20 minutes. A Dedicated Long-Term Rental lets you keep the exact same number for days, weeks, or months—ideal if you need ongoing access to WhatsApp Business or multi-factor logins.',
    category: 'numbers',
  },
  {
    q: 'How fast do VTU data bundles, airtime, and electricity tokens deliver?',
    a: 'Airtime, SME data bundles, and electricity tokens are delivered automatically within sub-seconds. Your 20-digit prepaid electricity meter token appears immediately on your screen and in your audit-logged transaction receipt.',
    category: 'vtu',
  },
  {
    q: 'Which merchants accept Verxor virtual USD cards?',
    a: 'Verxor virtual USD Visa and Mastercards are accepted on millions of global platforms including Netflix, Spotify, Google Workspace, Amazon, Apple Music, Canva, OpenAI ChatGPT, Meta (Facebook/Instagram) Ads, and AWS.',
    category: 'cards',
  },
  {
    q: 'How do I fund my virtual dollar card?',
    a: 'Funding is instant from your main Verxor balance. Deposit Naira into your dedicated virtual account via bank transfer, and convert your wallet funds directly into USD card balance at competitive live exchange rates.',
    category: 'cards',
  },
  {
    q: 'How does the 50% to 70% wholesale discount work for developers and resellers?',
    a: 'Certified white-label reseller panels, high-volume agencies, and developers integrating via our unified REST API automatically qualify for 50% to 70% wholesale discounts off retail catalog rates. You set your own custom retail prices above Verxor wholesale floors, keeping 100% of the profit margin.',
    category: 'api',
  },
  {
    q: 'Can I connect my own website or mobile app to Verxor’s API?',
    a: 'Yes. Verxor provides clean, RESTful endpoints with bearer-token authentication, idempotency support, and real-time webhook status callbacks for virtual numbers, VTU data, eSIM, cards, and SMM fulfillment.',
    category: 'api',
  },
  {
    q: 'How does global eSIM activation work?',
    a: 'Once you select an eSIM destination and complete checkout, a unique QR code is generated instantly. Scan it with your eSIM-compatible smartphone to install the cellular profile. You can keep your physical home SIM active for calls while using Verxor for international high-speed roaming data.',
    category: 'esim',
  },
];

export default function LandingClient() {
  const [activeService, setActiveService] = useState<ServiceKey>('numbers');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [faqFilter, setFaqFilter] = useState<string>('all');

  const current = servicesData[activeService];

  const filteredFaqs =
    faqFilter === 'all'
      ? landingFaqs
      : landingFaqs.filter(
          (f) =>
            f.category === faqFilter ||
            (faqFilter === 'numbers' && f.category === 'numbers') ||
            (faqFilter === 'vtu' && f.category === 'vtu') ||
            (faqFilter === 'cards' && f.category === 'cards') ||
            (faqFilter === 'esim' && (f.category === 'esim' || f.category === 'proxies')) ||
            (faqFilter === 'api' && f.category === 'api')
        );

  return (
    <>
      {/* HERO SECTION */}
      <section className="vx-hero">
        <div className="vx-hero-bg-glow" aria-hidden="true" />
        <div className="vx-container vx-hero-content">
          {/* Top Status Pill */}
          <div className="vx-status-pill">
            <ShieldCheck size={14} className="vx-status-icon" strokeWidth={2.5} />
            <span className="vx-status-main">Official Verxor Digital Platform</span>
            <span className="vx-status-divider">|</span>
            <span className="vx-status-accent">Global Digital Infrastructure</span>
          </div>

          {/* Main Headline */}
          <h1 className="vx-hero-title">
            Global Digital <span className="vx-text-accent">Infrastructure</span>
            <br className="vx-br-desktop" />
            {' for '}
            <span className="vx-text-accent">Africa’s Digital Economy.</span>
          </h1>

          {/* Sub-headline */}
          <p className="vx-hero-sub">
            Fund one seamless wallet to instantly deploy global digital assets and automated everyday utilities.
            Built with a robust API framework for creators, agencies, and high-volume developers.
          </p>

          {/* Action Buttons */}
          <div className="vx-hero-actions">
            <a href="/workspace" className="vx-btn vx-btn-primary">
              Launch Workspace <ArrowRight size={16} />
            </a>
            <a href="#services-hub" className="vx-btn vx-btn-secondary">
              Browse Interactive Services <ChevronDown size={16} />
            </a>
          </div>

          {/* Trust Badges: Clean 2x2 grid on mobile, horizontal row on desktop */}
          <div className="vx-trust-grid">
            <span className="vx-trust-badge">
              <Zap size={13} className="vx-trust-icon" strokeWidth={2.4} />
              <span className="vx-trust-label">Instant SMS Delivery</span>
            </span>
            <span className="vx-trust-badge">
              <Globe2 size={13} className="vx-trust-icon" strokeWidth={2.4} />
              <span className="vx-trust-label">200+ Global Regions</span>
            </span>
            <span className="vx-trust-badge">
              <Lock size={13} className="vx-trust-icon" strokeWidth={2.4} />
              <span className="vx-trust-label">Bank-Grade Security</span>
            </span>
            <span className="vx-trust-badge">
              <RefreshCw size={13} className="vx-trust-icon" strokeWidth={2.4} />
              <span className="vx-trust-label">No Code, No Charge</span>
            </span>
          </div>

          {/* INTERACTIVE SERVICE PILLS STRIP */}
          <div id="services-hub" className="vx-services-hub-trigger">
            <p className="vx-hub-eyebrow">Explore Services With Live 3D Previews</p>
            <h2 className="vx-hub-title">Tap Any Service Below</h2>

            {/* Structured 2-column grid on mobile, 4-column grid on sm+ */}
            <div className="vx-hub-grid">
              {(Object.keys(servicesData) as ServiceKey[]).map((key) => {
                const s = servicesData[key];
                const Icon = s.pillIcon;
                const isActive = activeService === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveService(key)}
                    className={`vx-hub-tab ${isActive ? 'is-active' : ''}`}
                  >
                    <Icon size={14} className={`vx-tab-icon ${isActive ? 'is-active' : ''}`} />
                    <span className="vx-tab-label">{s.pillLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* INTERACTIVE 3D SHOWCASE CARD */}
          <div className="vx-showcase-box">
            <div className="vx-showcase-split">
              {/* Left Column: Deep Specs & Features */}
              <div className="vx-showcase-info">
                <div className="vx-badge-row">
                  <span className="vx-badge-pill">{current.badge}</span>
                  <span className="vx-badge-tag">{current.tag}</span>
                </div>

                <h3 className="vx-showcase-headline">{current.headline}</h3>
                <p className="vx-showcase-subhead">{current.subhead}</p>

                {/* Bullet Features */}
                <div className="vx-features-list">
                  {current.features.map((feat) => (
                    <div key={feat.title} className="vx-feature-row">
                      <CheckCircle2 size={16} className="vx-feature-check" />
                      <div>
                        <strong className="vx-feature-title">{feat.title}</strong>
                        <p className="vx-feature-desc">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="vx-showcase-actions">
                  <a href={current.ctaHref} className="vx-btn vx-btn-primary">
                    {current.ctaText} <ArrowRight size={15} />
                  </a>
                  <a href={current.secondaryHref} className="vx-btn vx-btn-secondary">
                    {current.secondaryText} <ArrowUpRight size={15} />
                  </a>
                </div>
              </div>

              {/* Right Column: 3D Render Display */}
              <div className="vx-showcase-visual-pane">
                <div className="vx-visual-card">
                  <div className="vx-visual-halo" />
                  <img
                    src={current.image}
                    alt={current.imageAlt}
                    className="vx-visual-img"
                    loading="lazy"
                  />
                  <div className="vx-visual-chip">
                    <span className="vx-chip-pulse" />
                    <span>{current.tag}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ALL CAPABILITIES CATALOG GRID */}
      <section id="all-services" className="vx-section vx-section-alt">
        <div className="vx-container">
          <div className="vx-section-header">
            <span className="vx-eyebrow">COMPLETE SERVICE CATALOG</span>
            <h2>Built For Africa’s High-Volume Digital Economy</h2>
            <p>
              Every service is directly tied to your unified Verxor wallet with sub-second order fulfillment,
              transparent ledger history, and automated webhook callbacks.
            </p>
          </div>

          <div className="vx-catalog-grid">
            {serviceCatalogCards.map((card) => {
              const Icon = card.icon;
              return (
                <a key={card.title} href={card.href} className="vx-catalog-card">
                  <div className="vx-catalog-top">
                    <div className="vx-catalog-icon-wrap">
                      <Icon size={16} className="vx-catalog-icon" />
                    </div>
                    <span className="vx-catalog-badge">{card.badge}</span>
                  </div>

                  <div className="vx-catalog-img-wrap">
                    <img
                      src={card.image}
                      alt={card.imageAlt}
                      className="vx-catalog-img"
                      loading="lazy"
                    />
                  </div>

                  <h3 className="vx-catalog-title">{card.title}</h3>
                  <p className="vx-catalog-desc">{card.desc}</p>

                  <div className="vx-catalog-footer">
                    <span>Explore Service</span>
                    <ArrowRight size={13} />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE VERXOR / TRUST PILLARS */}
      <section id="trust" className="vx-section">
        <div className="vx-container">
          <div className="vx-section-header">
            <span className="vx-eyebrow">ENTERPRISE GRADE ARCHITECTURE</span>
            <h2>Why Builders, Resellers & Agencies Choose Verxor</h2>
            <p>
              Engineered with carrier-grade pipelines, instant wallet settlement, and wholesale margins that scale with your volume.
            </p>
          </div>

          <div className="vx-pillars-grid">
            <div className="vx-pillar-card">
              <div className="vx-pillar-index">01</div>
              <div className="vx-pillar-icon-box">
                <Cpu size={20} className="vx-pillar-icon" />
              </div>
              <h3 className="vx-pillar-title">Direct Upstream Pipelines</h3>
              <p className="vx-pillar-desc">
                Zero middleman delays. Our virtual numbers, VTU data, and SMM servers connect directly to tier-1
                telco routes and upstream carrier gateways for maximum delivery success.
              </p>
            </div>

            <div className="vx-pillar-card">
              <div className="vx-pillar-index">02</div>
              <div className="vx-pillar-icon-box">
                <Zap size={20} className="vx-pillar-icon" />
              </div>
              <h3 className="vx-pillar-title">Unified Single Wallet</h3>
              <p className="vx-pillar-desc">
                Deposit once via dedicated automated virtual bank accounts in Naira, and spend seamlessly across
                global numbers, international USD cards, eSIM data, and local bills.
              </p>
            </div>

            <div className="vx-pillar-card">
              <div className="vx-pillar-index">03</div>
              <div className="vx-pillar-icon-box">
                <Code2 size={20} className="vx-pillar-icon" />
              </div>
              <h3 className="vx-pillar-title">Developer & Reseller First</h3>
              <p className="vx-pillar-desc">
                High-throughput REST API with automated webhooks, custom child-panel branding, and 50% to 70%
                wholesale discounts for certified partners and volume vendors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (3 SIMPLE STEPS) */}
      <section id="how-it-works" className="vx-section vx-section-alt">
        <div className="vx-container">
          <div className="vx-section-header">
            <span className="vx-eyebrow">SIMPLE 3-STEP WORKFLOW</span>
            <h2>How Verxor Works</h2>
            <p>From wallet deposit to active digital service in seconds.</p>
          </div>

          <div className="vx-steps-grid">
            <div className="vx-step-card">
              <div className="vx-step-badge">STEP 01</div>
              <h3 className="vx-step-title">Fund Your Single Wallet</h3>
              <p className="vx-step-desc">
                Create your free account to generate a permanent dedicated virtual bank account number. Transfer Naira
                from any Nigerian banking app or USSD for instant automated credit.
              </p>
            </div>

            <div className="vx-step-card">
              <div className="vx-step-badge">STEP 02</div>
              <h3 className="vx-step-title">Choose Service or API Key</h3>
              <p className="vx-step-desc">
                Browse our catalog of virtual numbers, USD cards, data bundles, eSIMs, or grab your live REST API
                token to automate orders directly from your custom software.
              </p>
            </div>

            <div className="vx-step-card">
              <div className="vx-step-badge">STEP 03</div>
              <h3 className="vx-step-title">Instant Automated Deployment</h3>
              <p className="vx-step-desc">
                Receive SMS codes on your live dashboard, vend data tokens in sub-seconds, or deploy international
                virtual cards backed by automated webhook status notifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="vx-section">
        <div className="vx-container">
          <div className="vx-section-header">
            <span className="vx-eyebrow">GOT QUESTIONS?</span>
            <h2>Frequently Asked Questions</h2>
            <p>Everything you need to know about our services, guarantees, and developer integrations.</p>
          </div>

          {/* FAQ Filter Tabs */}
          <div className="vx-faq-filter-strip">
            {[
              { id: 'all', label: 'All FAQs' },
              { id: 'numbers', label: 'Virtual Numbers' },
              { id: 'vtu', label: 'VTU & Utilities' },
              { id: 'cards', label: 'USD Cards' },
              { id: 'esim', label: 'eSIM & Proxies' },
              { id: 'api', label: 'Resellers & API' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFaqFilter(tab.id)}
                className={`vx-faq-tab ${faqFilter === tab.id ? 'is-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* FAQ Accordion List */}
          <div className="vx-faq-list">
            {filteredFaqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.q} className={`vx-faq-item ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="vx-faq-question-btn"
                  >
                    <span className="vx-faq-question-text">{faq.q}</span>
                    <span className={`vx-faq-toggle-icon ${isOpen ? 'is-open' : ''}`}>
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="vx-faq-answer-pane">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HIGH IMPACT BOTTOM CTA */}
      <section className="vx-cta-banner">
        <div className="vx-cta-glow" />
        <div className="vx-container vx-cta-inner">
          <div className="vx-status-pill vx-status-pill-dark">
            <Sparkles size={14} className="vx-status-icon" />
            <span>INSTANT PLATFORM ACCESS · 24/7 AUTOMATED DEPLOYMENT</span>
          </div>

          <h2 className="vx-cta-title">
            Start Building on Verxor Today
          </h2>

          <p className="vx-cta-sub">
            Join thousands of African creators, agencies, and developers deploying global digital infrastructure,
            carrier-grade virtual numbers, and automated utilities through one unified wallet.
          </p>

          <div className="vx-cta-actions">
            <a href="/workspace" className="vx-btn vx-btn-primary">
              Launch Platform Free <ArrowRight size={16} />
            </a>
            <a href="/api-partnership" className="vx-btn vx-btn-secondary vx-btn-white-surface">
              Developer & Reseller API <ChevronRight size={16} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
