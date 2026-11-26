'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Cookie,
  FileText,
  Lock,
  Mail,
  Plug,
  RefreshCw,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
} from 'lucide-react';
import './privacy-policy-page.css';

export const PRIVACY_SECTIONS: {
  id: string;
  num: string;
  title: string;
  icon: 'user' | 'settings' | 'shield' | 'cookie' | 'rights' | 'plug' | 'refresh';
  body: string;
}[] = [
  {
    id: 'collect',
    num: '01',
    title: 'Information We Collect',
    icon: 'user',
    body:
      'When you register for an account, we collect your full name, email address, phone number, username, encrypted password, and 4-digit transaction PIN, alongside referral attribution details. As you navigate and transact on Verxor, we maintain operational logs including wallet deposit records, service transaction timestamps, masked payment identifiers, and audit trails. When you apply for a USD virtual card, we additionally collect your Bank Verification Number (BVN), National Identification Number (NIN), date of birth, and selfie/document verification solely to satisfy licensed banking partner regulatory Know Your Customer (KYC) requirements. Temporary SMS payloads, email OTP messages, and telephony metadata are held ephemerally in active memory solely to deliver verification codes to your dashboard or API response.',
  },
  {
    id: 'use',
    num: '02',
    title: 'How We Use Your Information',
    icon: 'settings',
    body:
      'Your information is utilized strictly to fulfill orders across digital services—including virtual verification numbers, dedicated number rentals, global travel eSIMs, VTU airtime and data bundles, electricity and utility bills, cable television subscriptions, exam pins, gaming top-ups, and social growth fulfillment. We also process data to authenticate logins, authorize wallet debits, prevent multi-accounting fraud, combat illicit payment card abuse, credit referral commissions, enforce rate limits, and provide responsive customer support.',
  },
  {
    id: 'protect',
    num: '03',
    title: 'Data Protection & Cryptographic Controls',
    icon: 'shield',
    body:
      'All personal and operational data is encrypted in transit using Transport Layer Security (TLS 1.3) and encrypted at rest utilizing industry-standard AES-256 encryption algorithms. Verxor enforces strict database Row-Level Security (RLS) to ensure customer records are completely isolated. Verxor never stores full credit/debit card numbers (PANs), CVVs, or online banking passwords; all payment processing is handled exclusively by certified PCI-DSS Level 1 compliant financial infrastructure partners. We never sell, monetize, or trade your personal data to external marketing or advertising brokers.',
  },
  {
    id: 'ephemeral',
    num: '04',
    title: 'Ephemeral Verification Data Policy',
    icon: 'refresh',
    body:
      'Incoming SMS verification messages, temporary email codes, and verification session payloads are classified as ephemeral. They are retained in active session storage only for the brief duration required for the customer to receive the code. Once the verification session expires or is closed, the message contents are securely purged. We do not maintain historical archives of private SMS message bodies or email contents.',
  },
  {
    id: 'third',
    num: '05',
    title: 'Third-Party Fulfillment Disclosures',
    icon: 'plug',
    body:
      'To fulfill your requested orders, Verxor interfaces securely with licensed upstream infrastructure providers. We transmit minimal, encrypted technical parameters strictly to: (a) licensed national and international telecommunications carriers to route SMS verification and activate data bundles; (b) authorized banking institutions and licensed payment gateways to process Naira deposits and issue USD virtual cards; (c) certified utility distribution companies (DisCos) to generate electricity tokens and validate smartcards; and (d) digital goods fulfillment platforms to inject game credits and digital vouchers. All fulfillment partners are bound by strict confidentiality and data protection obligations.',
  },
  {
    id: 'cookies',
    num: '06',
    title: 'Cookies & Client Storage',
    icon: 'cookie',
    body:
      'We use essential security cookies and browser local storage solely to maintain your authenticated session, remember your interface preferences (such as dark/light display and currency view), and track referral attribution. We do not deploy third-party advertising tracking cookies or cross-site surveillance scripts. You may disable cookies in your browser settings, though core functionality such as wallet actions and active orders will be restricted.',
  },
  {
    id: 'rights',
    num: '07',
    title: 'Your Rights Under NDPA (2023)',
    icon: 'rights',
    body:
      'In full compliance with the Nigeria Data Protection Act (NDPA) and applicable international standards, you have the right to request access to your personal data, request rectification of inaccurate records, or request account erasure. To exercise your data rights or request account closure, contact our Data Protection Officer at support@verxor.com. Financial accounting and transaction audit records are retained for statutory anti-money laundering compliance periods (typically 5 years) before automated cryptographic disposal.',
  },
];

function SectionIcon({ kind }: { kind: (typeof PRIVACY_SECTIONS)[number]['icon'] }) {
  const props = { size: 18, strokeWidth: 2.1 } as const;
  switch (kind) {
    case 'user':
      return <User {...props} />;
    case 'settings':
      return <ShieldCheck {...props} />;
    case 'shield':
      return <Shield {...props} />;
    case 'cookie':
      return <Cookie {...props} />;
    case 'rights':
      return <UserCheck {...props} />;
    case 'plug':
      return <Plug {...props} />;
    case 'refresh':
      return <RefreshCw {...props} />;
    default:
      return <FileText {...props} />;
  }
}

export function PrivacyPolicyPage({ onBack }: { onBack?: () => void }) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    collect: true,
    protect: true,
    ephemeral: true,
  });

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    for (const s of PRIVACY_SECTIONS) all[s.id] = true;
    setOpenIds(all);
  };

  const collapseAll = () => {
    setOpenIds({});
  };

  return (
    <div className="pp-page">
      <div className="pp-top">
        {onBack ? (
          <button type="button" className="pp-back" onClick={onBack} aria-label="Go back">
            <ArrowLeft size={16} strokeWidth={2.4} />
            <span>Back</span>
          </button>
        ) : (
          <a href="/" className="pp-back">
            <ArrowLeft size={16} strokeWidth={2.4} />
            <span>Home</span>
          </a>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="pp-back"
            onClick={expandAll}
            style={{ fontSize: 12, minHeight: 34, padding: '0 10px' }}
          >
            Expand all
          </button>
          <button
            type="button"
            className="pp-back"
            onClick={collapseAll}
            style={{ fontSize: 12, minHeight: 34, padding: '0 10px' }}
          >
            Collapse
          </button>
        </div>
      </div>

      <div className="pp-scroll">
        <div className="pp-hero">
          <div className="pp-hero-badge">
            <ShieldCheck size={14} strokeWidth={2.4} />
            <span>NDPA Compliant · Grade-1 Security</span>
          </div>
          <h1 className="pp-hero-title">Privacy Policy</h1>
          <p className="pp-hero-sub">
            How Verxor collects, encrypts, and handles your data across our digital infrastructure, carrier routing,
            and payment systems.
          </p>
          <div className="pp-hero-meta">
            <span className="pp-hero-pill">Updated: November 2026</span>
            <span className="pp-hero-pill">Version 2.3</span>
            <span className="pp-hero-pill">NDPA 2023 Verified</span>
          </div>
        </div>

        {PRIVACY_SECTIONS.map((sec) => {
          const isOpen = Boolean(openIds[sec.id]);
          return (
            <div key={sec.id} className={'pp-card' + (isOpen ? ' is-open' : '')}>
              <button
                type="button"
                className="pp-card-header"
                onClick={() => toggle(sec.id)}
                aria-expanded={isOpen}
              >
                <span className="pp-icon-wrap">
                  <SectionIcon kind={sec.icon} />
                </span>
                <span className="pp-header-text">
                  <span className="pp-sec-num">{sec.num}</span>
                  <span className="pp-sec-title">{sec.title}</span>
                </span>
                <ChevronDown size={18} strokeWidth={2.2} className="pp-chevron" />
              </button>
              {isOpen ? (
                <div className="pp-card-body">
                  <p>{sec.body}</p>
                </div>
              ) : null}
            </div>
          );
        })}

        <div className="pp-contact-box">
          <strong>Data Protection Officer</strong>
          <span>
            Verxor Digital Infrastructure · Lagos, Nigeria. For privacy inquiries, access requests, or regulatory
            filings, reach us directly at <a href="mailto:support@verxor.com">support@verxor.com</a>.
          </span>
        </div>
      </div>
    </div>
  );
}
