import { useState, useId } from 'react';
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  Layers,
  Globe2,
  Wallet,
  Smartphone,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Clock,
  Sparkles,
  Server,
  Zap,
  Code2,
  X,
  MessageCircle,
  AlertCircle,
  Building,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionTokens } from './auth/session-unlock';
import './child-panel-page.css';

export interface ChildPanelPackage {
  id: string;
  name: string;
  category: 'affiliate' | 'standalone' | 'turnkey' | 'mobile';
  badge: string;
  badgeTone?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
  price: number;
  setupFee?: number;
  popular?: boolean;
  tagline: string;
  description: string;
  specs: {
    userDashboards: string;
    adminDashboard: string;
    apiProvider: string;
    cPanelAccess: string;
    hostingDomain: string;
  };
  includedServices: string[];
  exclusions?: string[];
  deliveryTime: string;
}

export const CHILD_PANEL_PACKAGES: ChildPanelPackage[] = [
  // --- AFFILIATE / RESELLER SOFTWARE ---
  {
    id: 'mini-affiliate-1',
    name: 'Mini Affiliate Software 1',
    category: 'affiliate',
    badge: 'VTU STARTER',
    badgeTone: 'blue',
    price: 80000,
    tagline: 'Basic affiliate software for beginners to start reselling core VTU telecom services.',
    description:
      'Turnkey affiliate platform powered by Verxor wholesale infrastructure. Client purchases hosting & domain separately.',
    specs: {
      userDashboards: '1 User Dashboard',
      adminDashboard: 'Standard Admin Dashboard',
      apiProvider: 'Verxor as Provider',
      cPanelAccess: 'No cPanel Access',
      hostingDomain: 'No Hosting & Domain Included',
    },
    includedServices: [
      'Airtime VTU (MTN, Airtel, Glo, 9mobile)',
      'Data Bundles (SME, Corporate, Gifting)',
      'Cable TV Subscriptions (DStv, GOtv, Startimes)',
      'Electricity Bill Payments (All DISCOs)',
      'Automated Wallet Funding for Users',
      'Verxor Wholesale Pricing Rates',
    ],
    exclusions: [
      'No Hosting & Domain (Client provides)',
      'No cPanel access under this tier',
      'No Verxor AI assistant integration',
      'No external third-party API connections',
    ],
    deliveryTime: '24 Hours',
  },
  {
    id: 'mini-affiliate-2',
    name: 'Mini Affiliate Software 2',
    category: 'affiliate',
    badge: 'EXPANDED DIGITAL',
    badgeTone: 'purple',
    price: 100000,
    popular: true,
    tagline: 'Expanded reseller package with virtual phone numbers, OTP verification, and SMM boosting.',
    description:
      'Complete digital telecom and verification portal. Includes everything in Mini 1 plus USA/global virtual numbers and accounts.',
    specs: {
      userDashboards: '3 User Dashboards',
      adminDashboard: 'Advanced Admin Dashboard',
      apiProvider: 'Verxor as Provider',
      cPanelAccess: 'No cPanel Access',
      hostingDomain: 'No Hosting & Domain Included',
    },
    includedServices: [
      'Everything in Mini Affiliate 1',
      'Virtual Numbers (USA, UK & Global SMS verification)',
      'SMM Boosting Services (Followers, likes & growth)',
      'Buy Logs & Aged Accounts Marketplace',
      'Email OTP Verification Engine',
      'Rent for SMS (Dedicated short-term rental)',
      '3 Modern Dashboard Layouts for Users',
    ],
    exclusions: [
      'No Hosting & Domain (Client provides)',
      'No cPanel access under this tier',
    ],
    deliveryTime: '24 to 48 Hours',
  },

  // --- STANDALONE SOFTWARE ---
  {
    id: 'basic-v1',
    name: 'Basic V1 Software',
    category: 'standalone',
    badge: 'STANDALONE STARTER',
    badgeTone: 'blue',
    price: 150000,
    tagline: 'Basic standalone software for beginners with full site control and external API connection options.',
    description:
      'Gives you full access and control over your website with capability to link external API providers for added flexibility.',
    specs: {
      userDashboards: '5 User Dashboards',
      adminDashboard: 'Full Admin Management Portal',
      apiProvider: '5 API Providers + Verxor',
      cPanelAccess: 'No cPanel Access',
      hostingDomain: 'No Hosting & Domain Included',
    },
    includedServices: [
      'Everything in Mini Affiliate 1 & 2',
      'Connect up to 5 External API Providers',
      '5 Integrated Payment Gateways (Monnify, Paystack, Flutterwave)',
      'Full Website & Retail Brand Customization',
      'Custom Retail Margin & Price Rule Engine',
      'Sales Reports & Transaction History Log',
    ],
    exclusions: [
      'No Hosting & Domain (Client provides separately)',
      'No cPanel access under this package',
      'No automatic carrier failover/auto-switching',
    ],
    deliveryTime: '24 to 48 Hours',
  },
  {
    id: 'standard-v1',
    name: 'Standard V1 Software',
    category: 'standalone',
    badge: 'POPULAR STANDALONE',
    badgeTone: 'green',
    price: 200000,
    popular: true,
    tagline: 'Standard standalone software package with full website & cPanel control and multiple API integrations.',
    description:
      'Gives the client full control of the website and cPanel. Supports advanced features, multiple external APIs, and custom software license.',
    specs: {
      userDashboards: 'Unlimited Multi-tier Dashboards',
      adminDashboard: 'Advanced Admin with Staff Roles',
      apiProvider: 'Multiple External APIs + Verxor',
      cPanelAccess: 'Full cPanel Control Included',
      hostingDomain: 'No Hosting & Domain Included',
    },
    includedServices: [
      'Full cPanel Access & Source Installation',
      'Connect Multiple External APIs with Fallback',
      'Full VTU & Digital Telecom Suite',
      'Automated Wallet Funding & Dynamic Accounts',
      'Custom Software License Agreement Included',
      'Unlimited User Accounts & Reseller Pricing Tiers',
      'Complete Database & Backup Control',
    ],
    exclusions: [
      'Client pays separately for hosting & domain',
      'License condition: no unauthorized 3rd-party developer modifications',
    ],
    deliveryTime: '48 Hours',
  },
  {
    id: 'standard-v1-plus',
    name: 'Standard V1 Plus',
    category: 'standalone',
    badge: 'ADVANCED SUITE',
    badgeTone: 'purple',
    price: 250000,
    tagline: 'Standard V1 software with marketing tools, blog CMS, international eSIMs, proxies, and gaming top-up.',
    description:
      'Enhanced standalone platform for established digital brands requiring global eSIMs, proxies, gaming vouchers, and blog CMS.',
    specs: {
      userDashboards: 'Unlimited Multi-tier Dashboards',
      adminDashboard: 'Enterprise Admin Suite',
      apiProvider: 'Multiple External APIs + Verxor',
      cPanelAccess: 'Full cPanel Control Included',
      hostingDomain: 'No Hosting & Domain Included',
    },
    includedServices: [
      'Everything in Standard V1 Software',
      'Blog & Content Management System (SEO Optimized)',
      'Market Management & Digital Asset Marketplace',
      'eSIM International Data Profiles',
      'Residential & Datacenter Proxies Engine',
      'Rent for SMS / Calls Module',
      'Gaming Top-up (Free Fire, PUBG, Steam, Mobile Legends)',
      'Virtual Card Issuance Integration',
    ],
    exclusions: [
      'Client provides hosting & domain',
    ],
    deliveryTime: '48 Hours',
  },
  {
    id: 'standard-v2',
    name: 'Standard V2 Software',
    category: 'standalone',
    badge: 'NEXT-GEN V2',
    badgeTone: 'amber',
    price: 350000,
    tagline: 'Next-generation software featuring 10 dashboard themes, PWA mobile install, automatic price sync, and auto-routing.',
    description:
      'The modern standard for digital utility platforms. Includes automated API price updates, 10 UI themes, and installable PWA.',
    specs: {
      userDashboards: '10 Dynamic Modern UI Themes',
      adminDashboard: 'Next-Gen Analytics & Realtime Control',
      apiProvider: 'Unlimited APIs with Intelligent Routing',
      cPanelAccess: 'Full cPanel Control Included',
      hostingDomain: 'No Hosting & Domain Included',
    },
    includedServices: [
      'Everything in Standard V1 Plus',
      '10 Modern UI Themes (Dark, Light, Glassmorphic, Minimalist)',
      'Progressive Web App (PWA) Mobile Install for Users',
      'Automatic API Price Update & Sync Engine',
      'Multi-Gateway Auto-Routing & Provider Failover',
      'Realtime Transaction Visualizer & Profit Heatmaps',
      'Custom Domain White-Label Branding',
    ],
    exclusions: [
      'Client provides hosting & domain',
    ],
    deliveryTime: '48 to 72 Hours',
  },

  // --- TURNKEY APP SUITES ---
  {
    id: 'v1-premium',
    name: 'V1 Premium Package',
    category: 'turnkey',
    badge: 'TURNKEY ANDROID',
    badgeTone: 'blue',
    price: 500000,
    tagline: 'Standard V1 standalone + Dedicated Android mobile app, Play Store publication, and foreign cloud hosting.',
    description:
      'All-inclusive turnkey bundle: Standard V1 software, dedicated Android app, Google Play upload, foreign cloud hosting, and .com.ng domain.',
    specs: {
      userDashboards: 'Unlimited Multi-tier Dashboards',
      adminDashboard: 'Complete Admin Control',
      apiProvider: 'Multiple APIs + Verxor',
      cPanelAccess: 'Full cPanel Control',
      hostingDomain: '1 Year Free Foreign Hosting + .com.ng Domain',
    },
    includedServices: [
      'Standard V1 Standalone Software',
      'Dedicated Branded Android Mobile App (APK & AAB)',
      'Google Play Store Upload & Review Management',
      'Foreign High-Speed Cloud Hosting (1st Year Included)',
      '.com.ng Custom Domain Name (1st Year Included)',
      'Free SSL Certificate & Cloudflare Edge CDN',
      'Push Notifications Integration for Android',
    ],
    deliveryTime: '3 to 5 Business Days',
  },
  {
    id: 'v2-premium',
    name: 'V2 Premium Package',
    category: 'turnkey',
    badge: 'TURNKEY PRO ANDROID',
    badgeTone: 'amber',
    price: 600000,
    popular: true,
    tagline: 'Standard V2 software + 10 themes, PWA, dedicated Android mobile app, and 1 year free foreign cloud hosting + domain.',
    description:
      'The modern turnkey powerhouse. Combines Standard V2 with dedicated Android app, Google Play publishing, and 1-year premium cloud hosting.',
    specs: {
      userDashboards: '10 Themes + PWA Installable',
      adminDashboard: 'Next-Gen Analytics & Auto-Sync',
      apiProvider: 'Unlimited APIs + Verxor',
      cPanelAccess: 'Full cPanel Control',
      hostingDomain: '1 Year Free Foreign Hosting + .com.ng Domain',
    },
    includedServices: [
      'Standard V2 Standalone Software (10 Themes & Auto-Sync)',
      'Dedicated Branded Android Mobile App (APK & AAB)',
      'Google Play Store Publication & Compliance Support',
      'Foreign High-Speed Cloud Hosting (1st Year Included)',
      '.com.ng Custom Domain Name (1st Year Included)',
      'Automated API Price Sync Engine',
      'Priority Reseller Pipeline & 24/7 Setup Assistance',
    ],
    deliveryTime: '3 to 5 Business Days',
  },
  {
    id: 'v1-premium-plus',
    name: 'V1 Premium Plus',
    category: 'turnkey',
    badge: 'DUAL OS FLAGSHIP',
    badgeTone: 'purple',
    price: 999999,
    tagline: 'Standard V1 with dual native mobile apps for Android and iOS, App Store & Play Store publishing, hosting, and domain.',
    description:
      'Complete cross-platform ecosystem. Includes Standard V1, dedicated Android app, dedicated iOS app, App Store and Play Store uploads, hosting and domain.',
    specs: {
      userDashboards: 'Unlimited Multi-tier Dashboards',
      adminDashboard: 'Full Enterprise Management',
      apiProvider: 'Multiple APIs + Verxor',
      cPanelAccess: 'Full cPanel Control',
      hostingDomain: '1 Year Free Foreign Hosting + .com.ng Domain',
    },
    includedServices: [
      'Standard V1 Standalone Software',
      'Dedicated Android Mobile App (Google Play Store Published)',
      'Dedicated iOS Mobile App (Apple App Store Published)',
      'Foreign High-Speed Cloud Hosting (1st Year Included)',
      '.com.ng Custom Domain (1st Year Included)',
      'Apple Developer & Google Console Publication Assistance',
      'Cross-platform Push Notifications (Firebase / APNs)',
    ],
    deliveryTime: '7 to 10 Business Days',
  },
  {
    id: 'v2-premium-plus',
    name: 'V2 Premium Plus',
    category: 'turnkey',
    badge: 'ULTIMATE ENTERPRISE',
    badgeTone: 'red',
    price: 1099999,
    tagline: 'The absolute flagship suite: Standard V2 + Android & iOS apps published, 10 themes, cloud hosting, and domain.',
    description:
      'The highest tier digital services platform. Everything in Standard V2 with dual published Android and iOS mobile apps, premium cloud hosting, and custom domain.',
    specs: {
      userDashboards: '10 Themes + PWA + Dual Native Apps',
      adminDashboard: 'Next-Gen Enterprise Portal',
      apiProvider: 'Unlimited APIs with Auto-Sync',
      cPanelAccess: 'Full cPanel Control',
      hostingDomain: '1 Year Free Foreign Hosting + .com.ng Domain',
    },
    includedServices: [
      'Standard V2 Next-Gen Software with 10 Themes',
      'Dedicated Android Mobile App (Google Play Published)',
      'Dedicated iOS Mobile App (Apple App Store Published)',
      'Foreign High-Speed Cloud Hosting (1st Year Included)',
      '.com.ng Custom Domain (1st Year Included)',
      'Automatic API Price Sync Engine & Multi-Gateway Routing',
      'Dedicated Senior Engineer for Handover & 1-on-1 Onboarding',
    ],
    deliveryTime: '7 to 10 Business Days',
  },

  // --- MOBILE APPS ---
  {
    id: 'app-android-webviewer',
    name: 'Android WebViewer App',
    category: 'mobile',
    badge: 'MOBILE ADD-ON',
    badgeTone: 'blue',
    price: 100000,
    tagline: 'Fast and lightweight Android WebViewer app packaged for your existing website with push notifications.',
    description:
      'Transform your existing child panel or website into an installable Android app with custom icon and push notifications.',
    specs: {
      userDashboards: 'Adapts to your Web Dashboard',
      adminDashboard: 'Push Notification Control Panel',
      apiProvider: 'Connects to your Website URL',
      cPanelAccess: 'N/A',
      hostingDomain: 'Uses your Existing Domain',
    },
    includedServices: [
      'Custom Android APK & AAB Production Build',
      'Integrated OneSignal / Firebase Push Notifications',
      'Custom App Icon & Splash Screen Branding',
      'Google Play Store Upload & Review Handling',
      'Fast WebKit View Engine with Offline Fallback',
    ],
    deliveryTime: '48 Hours',
  },
  {
    id: 'app-ios-webviewer',
    name: 'iOS WebViewer App',
    category: 'mobile',
    badge: 'MOBILE ADD-ON',
    badgeTone: 'blue',
    price: 150000,
    tagline: 'Optimized iOS WebViewer application packaged for iPhone/iPad with push notifications and status bar integration.',
    description:
      'Bring your web platform to Apple devices with a smooth WebKit iOS wrapper, push notifications, and App Store review support.',
    specs: {
      userDashboards: 'Adapts to your Web Dashboard',
      adminDashboard: 'Push Notification Control Panel',
      apiProvider: 'Connects to your Website URL',
      cPanelAccess: 'N/A',
      hostingDomain: 'Uses your Existing Domain',
    },
    includedServices: [
      'iOS IPA & Xcode Project Package',
      'Apple Push Notification service (APNs) Integration',
      'Safe Area & iPhone Dynamic Island / Notch Optimization',
      'TestFlight Beta Deployment & App Store Submission Support',
      'Custom Launch Screen & App Icons',
    ],
    deliveryTime: '3 to 5 Business Days',
  },
  {
    id: 'app-android-native',
    name: 'Android Native App',
    category: 'mobile',
    badge: 'NATIVE MOBILE',
    badgeTone: 'green',
    price: 300000,
    tagline: 'High-performance native Android application with biometric authentication, offline balance caching, and custom device UI.',
    description:
      'Fully native Android app built with Kotlin/Jetpack Compose. Offers instant touch responsiveness, biometrics, and offline caching.',
    specs: {
      userDashboards: 'Custom Native Mobile UI',
      adminDashboard: 'Realtime App Metrics & Push Hub',
      apiProvider: 'Direct API Integration with Verxor',
      cPanelAccess: 'Full Native Source Code Package',
      hostingDomain: 'Connects to your Cloud API',
    },
    includedServices: [
      '100% Native Android Codebase (Kotlin / Compose)',
      'Biometric Fingerprint & Face Unlock',
      'Instant Push Notifications & Sound Alerts',
      'Offline Balance Caching & Quick Reorder',
      'Google Play Store Compliance & Publishing',
    ],
    deliveryTime: '5 to 7 Business Days',
  },
  {
    id: 'app-ios-native',
    name: 'iOS Native App',
    category: 'mobile',
    badge: 'NATIVE MOBILE',
    badgeTone: 'purple',
    price: 450000,
    tagline: 'Premium Swift/SwiftUI native iOS application with FaceID, smooth micro-animations, and full Apple HIG compliance.',
    description:
      'The gold standard native iPhone app. Built with Swift & SwiftUI with FaceID biometric auth, haptic feedback, and App Store readiness.',
    specs: {
      userDashboards: 'Custom Native iOS UI',
      adminDashboard: 'Realtime App Metrics & Push Hub',
      apiProvider: 'Direct API Integration with Verxor',
      cPanelAccess: 'Full Native Swift Project Package',
      hostingDomain: 'Connects to your Cloud API',
    },
    includedServices: [
      '100% Native Swift & SwiftUI Codebase',
      'FaceID & TouchID Biometric Security',
      'Haptic Feedback & Smooth 120Hz Animations',
      'APNs Push Notifications with Rich Actions',
      'Apple App Store Review Compliance & Submission',
    ],
    deliveryTime: '7 to 10 Business Days',
  },
];

function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export function ChildPanelPurchasePage({
  onBack,
  session,
}: {
  onBack: () => void;
  session?: AuthSession | null;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'affiliate' | 'standalone' | 'turnkey' | 'mobile'>('all');
  const [selectedPkg, setSelectedPkg] = useState<ChildPanelPackage | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  // Order form state
  const [brandName, setBrandName] = useState('');
  const [domain, setDomain] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState(session?.email || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<{
    reference: string;
    packageName: string;
    amount: number;
    whatsapp: string;
    paymentMode: 'wallet' | 'bank_transfer';
  } | null>(null);

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const brandNameId = useId();
  const domainId = useId();
  const whatsappId = useId();
  const emailId = useId();
  const notesId = useId();

  const balanceNgn = session?.balanceNgn ?? 0;

  const filteredPackages = CHILD_PANEL_PACKAGES.filter((p) => {
    if (activeTab === 'all') return true;
    return p.category === activeTab;
  });

  const handleOpenOrder = (pkg: ChildPanelPackage) => {
    setSelectedPkg(pkg);
    setOrderError(null);
    setOrderSuccess(null);
    setOrderModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setOrderModalOpen(false);
  };

  const handleSubmitOrder = async (paymentMode: 'wallet' | 'bank_transfer') => {
    if (!selectedPkg) return;
    if (!brandName.trim()) {
      setOrderError('Please provide your Website / Brand Name.');
      return;
    }
    if (!whatsapp.trim()) {
      setOrderError('Please provide your WhatsApp phone number for onboarding & delivery.');
      return;
    }

    setSubmitting(true);
    setOrderError(null);

    try {
      let accessToken = '';
      try {
        const tokens = loadSessionTokens();
        if (tokens?.access_token) {
          accessToken = tokens.access_token;
        } else {
          const { getSupabaseBrowser } = await import('../lib/supabase/client');
          const sb = getSupabaseBrowser();
          if (sb) {
            const { data } = await sb.auth.getSession();
            if (data?.session?.access_token) {
              accessToken = data.session.access_token;
            }
          }
        }
      } catch {
        // proceed
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch('/api/v1/child-panel/order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          packageId: selectedPkg.id,
          packageName: selectedPkg.name,
          price: selectedPkg.price,
          brandName: brandName.trim(),
          domain: domain.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          notes: notes.trim(),
          paymentMode,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_BALANCE') {
          setOrderError(
            `Insufficient wallet balance. You have ${formatNaira(balanceNgn)}, but ${formatNaira(selectedPkg.price)} is required. Fund your wallet or pay via bank transfer.`,
          );
        } else {
          setOrderError(data.error || 'Failed to submit order. Please try again or chat with support.');
        }
        setSubmitting(false);
        return;
      }

      // Order created successfully
      if (paymentMode === 'wallet') {
        window.dispatchEvent(new CustomEvent('verxor:balance-refresh'));
      }

      setOrderSuccess({
        reference: data.reference || `VX-CP-${Math.floor(100000 + Math.random() * 900000)}`,
        packageName: selectedPkg.name,
        amount: selectedPkg.price,
        whatsapp: whatsapp.trim(),
        paymentMode,
      });
    } catch {
      setOrderError('Network error while processing your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cp-page">
      {/* TOP HEADER */}
      <header className="cp-topbar">
        <button className="cp-back-btn" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <div className="cp-topbar-title">
          <p className="cp-eyebrow">WHITE-LABEL &amp; SOFTWARE</p>
          <h1>Child Panel &amp; Software</h1>
        </div>
        <div className="cp-balance-pill" title="Your current wallet balance">
          <Wallet size={14} />
          <span>{formatNaira(balanceNgn)}</span>
        </div>
      </header>

      {/* HERO BANNER & VALUE HIGHLIGHTS */}
      <section className="cp-hero">
        <div className="cp-hero-badge">
          <Layers size={14} />
          <span>OWN A RESELLER TELECOM &amp; DIGITAL AGENCY</span>
        </div>
        <h2 className="cp-hero-heading">Launch your branded portal with Verxor backend infrastructure.</h2>
        <p className="cp-hero-sub">
          Offer VTU data, airtime, USA &amp; global virtual phone numbers, SMM boosting, eSIMs, and email OTP verification
          under your own brand name and custom domain. Keep 100% of your retail profit margins.
        </p>

        {/* METRICS ROW (inspired by Fleexa & Vicom) */}
        <div className="cp-metrics-grid">
          <div className="cp-metric-card">
            <span className="cp-metric-val">₦0</span>
            <span className="cp-metric-label">Hardware &amp; Inventory Cost</span>
          </div>
          <div className="cp-metric-card">
            <span className="cp-metric-val">100%</span>
            <span className="cp-metric-label">Margin Retention</span>
          </div>
          <div className="cp-metric-card">
            <span className="cp-metric-val">40%–70%</span>
            <span className="cp-metric-label">Wholesale Margin Discount</span>
          </div>
          <div className="cp-metric-card">
            <span className="cp-metric-val">&lt; 48h</span>
            <span className="cp-metric-label">Fast Deployment &amp; Delivery</span>
          </div>
        </div>
      </section>

      {/* CATEGORY SELECTOR TABS */}
      <section className="cp-nav-section">
        <div className="cp-tabs-container">
          <button
            className={`cp-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Packages ({CHILD_PANEL_PACKAGES.length})
          </button>
          <button
            className={`cp-tab-btn ${activeTab === 'affiliate' ? 'active' : ''}`}
            onClick={() => setActiveTab('affiliate')}
          >
            Affiliate / Mini (2)
          </button>
          <button
            className={`cp-tab-btn ${activeTab === 'standalone' ? 'active' : ''}`}
            onClick={() => setActiveTab('standalone')}
          >
            Standalone V1 &amp; V2 (4)
          </button>
          <button
            className={`cp-tab-btn ${activeTab === 'turnkey' ? 'active' : ''}`}
            onClick={() => setActiveTab('turnkey')}
          >
            Turnkey App Suites (4)
          </button>
          <button
            className={`cp-tab-btn ${activeTab === 'mobile' ? 'active' : ''}`}
            onClick={() => setActiveTab('mobile')}
          >
            Mobile Apps (4)
          </button>
        </div>
      </section>

      {/* PACKAGE CARDS GRID */}
      <section className="cp-packages-section">
        <div className="cp-cards-grid">
          {filteredPackages.map((pkg) => (
            <article key={pkg.id} className={`cp-card ${pkg.popular ? 'popular' : ''}`}>
              {pkg.popular && <span className="cp-popular-tag">MOST POPULAR</span>}
              <div className="cp-card-header">
                <span className={`cp-tier-badge tone-${pkg.badgeTone || 'blue'}`}>{pkg.badge}</span>
                <h3 className="cp-card-title">{pkg.name}</h3>
                <p className="cp-card-tagline">{pkg.tagline}</p>
              </div>

              <div className="cp-price-box">
                <div className="cp-price-val">
                  {formatNaira(pkg.price)}
                  <small>/ one-time</small>
                </div>
                <div className="cp-delivery-badge">
                  <Clock size={12} />
                  <span>Deployment: {pkg.deliveryTime}</span>
                </div>
              </div>

              {/* Core Specs Grid */}
              <div className="cp-specs-list">
                <div className="cp-spec-row">
                  <span className="cp-spec-name">Dashboards</span>
                  <span className="cp-spec-val">{pkg.specs.userDashboards}</span>
                </div>
                <div className="cp-spec-row">
                  <span className="cp-spec-name">Admin Portal</span>
                  <span className="cp-spec-val">{pkg.specs.adminDashboard}</span>
                </div>
                <div className="cp-spec-row">
                  <span className="cp-spec-name">API Provider</span>
                  <span className="cp-spec-val">{pkg.specs.apiProvider}</span>
                </div>
                <div className="cp-spec-row">
                  <span className="cp-spec-name">cPanel Access</span>
                  <span className="cp-spec-val">{pkg.specs.cPanelAccess}</span>
                </div>
                <div className="cp-spec-row">
                  <span className="cp-spec-name">Hosting &amp; Domain</span>
                  <span className="cp-spec-val">{pkg.specs.hostingDomain}</span>
                </div>
              </div>

              {/* Included Services Checklist */}
              <div className="cp-services-checklist">
                <p className="cp-list-heading">Included Services &amp; Modules:</p>
                <ul>
                  {pkg.includedServices.map((srv, idx) => (
                    <li key={idx} className="cp-check-item">
                      <Check size={14} className="check-icon" />
                      <span>{srv}</span>
                    </li>
                  ))}
                  {pkg.exclusions?.map((exc, idx) => (
                    <li key={`exc-${idx}`} className="cp-exclusion-item">
                      <span className="cross-icon">•</span>
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                className="cp-order-cta"
                onClick={() => handleOpenOrder(pkg)}
              >
                <span>Order Package</span>
                <ChevronRight size={16} />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS (Fleexa & Vicom inspired) */}
      <section className="cp-how-it-works">
        <div className="cp-section-header">
          <p className="cp-eyebrow">STEP-BY-STEP DEPLOYMENT</p>
          <h2>How Child Panel Deployment Works</h2>
          <p className="cp-section-sub">
            From package selection to live customer purchases, we streamline everything so you can focus on marketing.
          </p>
        </div>

        <div className="cp-steps-grid">
          <div className="cp-step-card">
            <span className="cp-step-num">01</span>
            <Building size={20} className="cp-step-icon" />
            <h4>Choose Your Tier</h4>
            <p>Pick the affiliate or standalone package that matches your operational needs and budget.</p>
          </div>
          <div className="cp-step-card">
            <span className="cp-step-num">02</span>
            <Globe2 size={20} className="cp-step-icon" />
            <h4>Submit Brand &amp; Domain</h4>
            <p>Provide your brand name, domain/subdomain, and WhatsApp contact for engineering setup.</p>
          </div>
          <div className="cp-step-card">
            <span className="cp-step-num">03</span>
            <Server size={20} className="cp-step-icon" />
            <h4>Automated Setup &amp; API Sync</h4>
            <p>We configure your repository, connect wholesale APIs, provision SSL, and complete testing.</p>
          </div>
          <div className="cp-step-card">
            <span className="cp-step-num">04</span>
            <Zap size={20} className="cp-step-icon" />
            <h4>Launch &amp; Retain 100% Margins</h4>
            <p>Your users purchase at your custom retail prices while orders fulfill via Verxor wholesale rates.</p>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="cp-faq-section">
        <div className="cp-section-header">
          <p className="cp-eyebrow">COMMON QUESTIONS</p>
          <h2>Reseller &amp; Software FAQ</h2>
        </div>

        <div className="cp-faq-list">
          {[
            {
              q: 'How do I make money with a Child Panel?',
              a: 'You receive 40% to 70% wholesale discount rates from Verxor. You set your own custom retail prices on your website (for data bundles, airtime, virtual phone numbers, SMM, etc.). When your customers pay you, you keep 100% of the markup profit, while the base wholesale cost is deducted from your Verxor wallet.',
            },
            {
              q: 'What is the difference between Affiliate (Mini) and Standalone Software?',
              a: 'Mini Affiliate Software (₦80,000 / ₦100,000) is a fully managed turn-key solution exclusively connected to Verxor APIs without cPanel access. Standalone Software (₦150k to ₦350k) gives you full website control, cPanel access, multiple API routing options, and multi-tier pricing rules.',
            },
            {
              q: 'How long does setup take after placing an order?',
              a: 'Standard Mini and Standalone web panels are deployed within 24 to 48 hours. Turnkey packages that include Google Play Store and Apple App Store mobile app publications take 3 to 7 business days depending on store review times.',
            },
            {
              q: 'Can I connect other providers to my panel?',
              a: 'Yes! From Basic V1 Software upwards, you can connect external API providers alongside Verxor for automated fallback and custom routing.',
            },
            {
              q: 'How do I fund my wholesale operational wallet?',
              a: 'You can fund your Verxor wallet anytime via automatic bank transfer, Monnify, Paystack, or crypto. All API and panel fulfillments deduct from your wholesale wallet in real time.',
            },
          ].map((item, i) => (
            <div key={i} className={`cp-faq-item ${expandedFaq === i ? 'open' : ''}`}>
              <button
                type="button"
                className="cp-faq-question"
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              >
                <span>{item.q}</span>
                <ChevronRight size={16} className="faq-chevron" />
              </button>
              {expandedFaq === i && <div className="cp-faq-answer">{item.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* WHATSAPP SUPPORT BANNER */}
      <section className="cp-support-cta">
        <div className="cp-support-box">
          <MessageCircle size={28} className="cp-wa-icon" />
          <div className="cp-support-text">
            <h4>Have specific custom requirements?</h4>
            <p>Chat directly with our senior software engineers to plan custom integrations or bulk agency deployments.</p>
          </div>
          <a
            href="https://wa.me/2348141620644?text=Hello%20Verxor%20Team%2C%20I%20want%20to%20discuss%20Child%20Panel%20and%20Software%20deployment"
            target="_blank"
            rel="noreferrer"
            className="cp-wa-btn"
          >
            <span>WhatsApp Support</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </section>

      {/* INTERACTIVE ORDER CHECKOUT MODAL */}
      {orderModalOpen && selectedPkg && (
        <div className="cp-modal-backdrop" onClick={handleCloseModal}>
          <div className="cp-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <div>
                <span className={`cp-tier-badge tone-${selectedPkg.badgeTone || 'blue'}`}>
                  {selectedPkg.badge}
                </span>
                <h3 className="cp-modal-title">{selectedPkg.name}</h3>
                <p className="cp-modal-sub">{selectedPkg.tagline}</p>
              </div>
              <button type="button" className="cp-modal-close" onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>

            {orderSuccess ? (
              <div className="cp-modal-success">
                <div className="cp-success-icon-wrap">
                  <Check size={32} className="cp-success-icon" />
                </div>
                <h3>Order Submitted Successfully!</h3>
                <p className="cp-success-ref">
                  Reference: <strong>{orderSuccess.reference}</strong>
                </p>
                <p className="cp-success-desc">
                  Your order for <strong>{orderSuccess.packageName}</strong> ({formatNaira(orderSuccess.amount)}) has been
                  recorded. Our deployment engineers are preparing your repository and credentials.
                </p>

                <div className="cp-success-timeline">
                  <Clock size={16} />
                  <span>Estimated Deployment Time: {selectedPkg.deliveryTime}</span>
                </div>

                <div className="cp-success-actions">
                  <a
                    href={`https://wa.me/2348141620644?text=Hello%20Verxor%2C%20I%20just%20ordered%20${encodeURIComponent(orderSuccess.packageName)}%20(Ref%3A%20${orderSuccess.reference})`}
                    target="_blank"
                    rel="noreferrer"
                    className="cp-modal-btn primary"
                  >
                    <MessageCircle size={16} />
                    <span>Connect on WhatsApp for Handover</span>
                  </a>
                  <button type="button" className="cp-modal-btn outline" onClick={handleCloseModal}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="cp-order-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitOrder('wallet');
                }}
              >
                <div className="cp-order-pricing-summary">
                  <div className="cp-summary-row">
                    <span>Package Price:</span>
                    <strong>{formatNaira(selectedPkg.price)}</strong>
                  </div>
                  <div className="cp-summary-row">
                    <span>Your Wallet Balance:</span>
                    <strong className={balanceNgn >= selectedPkg.price ? 'text-green' : 'text-amber'}>
                      {formatNaira(balanceNgn)}
                    </strong>
                  </div>
                </div>

                {orderError && (
                  <div className="cp-order-error">
                    <AlertCircle size={16} />
                    <span>{orderError}</span>
                  </div>
                )}

                <div className="cp-form-group">
                  <label htmlFor={brandNameId}>Website / Brand Name *</label>
                  <input
                    id={brandNameId}
                    type="text"
                    required
                    placeholder="e.g. PrimeVTU Telecom"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="cp-input"
                  />
                  <small>The name that will appear on your customer portal and invoices.</small>
                </div>

                <div className="cp-form-group">
                  <label htmlFor={domainId}>Desired Domain or Subdomain</label>
                  <input
                    id={domainId}
                    type="text"
                    placeholder="e.g. primevtu.com or primevtu.verxor.link"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="cp-input"
                  />
                  <small>Leave blank if you want us to suggest a domain or use a free subdomain.</small>
                </div>

                <div className="cp-form-group">
                  <label htmlFor={whatsappId}>WhatsApp Phone Number *</label>
                  <input
                    id={whatsappId}
                    type="tel"
                    required
                    placeholder="e.g. 08141620644"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="cp-input"
                  />
                  <small>Our deployment engineer will message you here for assets and repo access.</small>
                </div>

                <div className="cp-form-group">
                  <label htmlFor={emailId}>Admin Contact Email</label>
                  <input
                    id={emailId}
                    type="email"
                    placeholder="e.g. admin@primevtu.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="cp-input"
                  />
                </div>

                <div className="cp-form-group">
                  <label htmlFor={notesId}>Special Notes or Color Preferences (Optional)</label>
                  <textarea
                    id={notesId}
                    rows={2}
                    placeholder="e.g. Primary blue color theme, focus on Virtual Numbers and MTN SME data"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="cp-textarea"
                  />
                </div>

                <div className="cp-modal-actions">
                  {balanceNgn >= selectedPkg.price ? (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="cp-modal-btn primary"
                    >
                      <Wallet size={16} />
                      <span>{submitting ? 'Processing Order...' : `Pay ${formatNaira(selectedPkg.price)} from Wallet`}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="cp-modal-btn primary fund-highlight"
                        onClick={() => {
                          window.location.href = '/dashboard/fund';
                        }}
                      >
                        <Wallet size={16} />
                        <span>Fund Wallet to Pay ({formatNaira(selectedPkg.price - balanceNgn)} short)</span>
                      </button>

                      <button
                        type="button"
                        disabled={submitting}
                        className="cp-modal-btn secondary"
                        onClick={() => handleSubmitOrder('bank_transfer')}
                      >
                        <Building size={16} />
                        <span>Submit &amp; Pay via Bank Transfer</span>
                      </button>
                    </>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
