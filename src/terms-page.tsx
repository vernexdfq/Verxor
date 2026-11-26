'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  Lock,
  Mail,
  Scale,
  Shield,
  ShieldAlert,
  Smartphone,
  Wallet,
  Globe2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import './terms-page.css';

export const TERMS_SECTIONS: {
  id: string;
  num: string;
  title: string;
  icon: 'scale' | 'lock' | 'wallet' | 'phone' | 'mail' | 'zap' | 'globe' | 'shield' | 'refresh';
  body: string;
}[] = [
  {
    id: 'acceptance',
    num: '01',
    title: 'Acceptance of Terms & Account Integrity',
    icon: 'scale',
    body:
      'By registering, accessing, or utilizing any service provided by Verxor, you enter into a legally binding agreement with Verxor Digital Infrastructure. You must be at least 18 years of age or possess legal capacity under your applicable jurisdiction. You agree to provide accurate registration information and maintain the strict confidentiality of your login password, 4-digit transaction PIN, and API credentials. You are solely responsible for all activities, debits, and orders conducted through your account.',
  },
  {
    id: 'wallet',
    num: '02',
    title: 'Digital Wallet, Funding & Anti-Fraud Policy',
    icon: 'wallet',
    body:
      'Verxor operates a prepaid digital wallet system. Funds deposited via bank transfers, approved payment processors, or automated virtual account gateways are credited to your active wallet balance. Verxor enforces strict Anti-Money Laundering (AML) and Counter-Financing of Terrorism (CFT) protocols. Fraudulent deposits, unauthorized payment card usage, stolen funds, and card-testing activities are strictly prohibited. Any account associated with disputed deposits, fraudulent funding, or unauthorized chargebacks will be permanently terminated, with remaining balances frozen and reported to relevant regulatory and law enforcement authorities. Wallet balances are non-transferable outside approved identity verification workflows.',
  },
  {
    id: 'numbers',
    num: '03',
    title: 'Verification Numbers & SMS Rental Policies',
    icon: 'phone',
    body:
      'Virtual numbers and dedicated rental lines are provided strictly for lawful account activation and standard telephony verification. Prohibited uses include harassment, automated spamming, fraud, mass bot generation, or evading statutory restrictions. Delivery terms: virtual numbers are routed via licensed telecommunications networks. If no SMS verification code is received within the active session window (typically 15 to 20 minutes), the reservation automatically cancels and the deducted amount is immediately refunded to your wallet. Once an SMS code has been successfully delivered, or a dedicated rental duration has commenced, the transaction is final and non-refundable. Numbers remain carrier-controlled assets.',
  },
  {
    id: 'email-otp',
    num: '04',
    title: 'Ephemeral Email OTP Routing',
    icon: 'mail',
    body:
      'Temporary email addresses and verification inboxes are provided solely for rapid one-time password (OTP) verification. Email payloads and verification codes are ephemeral and automatically purged following session conclusion. Users may not use temporary email routing for malicious spam, unauthorized mass communications, or deceitful impersonation. Mailboxes do not provide permanent message retention.',
  },
  {
    id: 'telecom-vtu',
    num: '05',
    title: 'Telecommunications & Utility Bill Payments',
    icon: 'zap',
    body:
      'Airtime, data bundles, electricity token generation, cable television subscriptions, and educational scratch cards are routed through licensed national telecom operators and certified utility distribution companies (DisCos). Users are strictly responsible for confirming the accuracy of recipient phone numbers, meter numbers, smartcard numbers, and product tiers prior to confirmation. Transactions completed to user-specified numbers or meters cannot be reversed or refunded. In the event of upstream network downtime, transactions undergo reconciliation within standard operator settlement windows before resolution.',
  },
  {
    id: 'gaming-digital',
    num: '06',
    title: 'Gaming Top-Ups & Digital Vouchers',
    icon: 'refresh',
    body:
      'Electronic game credits, player UID top-ups, and digital gift card vouchers are fulfilled electronically. Delivery of digital redemption codes and direct game server balance injections is immediate upon confirmation. Because digital codes and direct account top-ups cannot be recalled once issued or redeemed, all completed digital transactions are irreversible and non-refundable.',
  },
  {
    id: 'social-growth',
    num: '07',
    title: 'Social Media Growth & Marketing Fulfillment',
    icon: 'globe',
    body:
      'Social growth, engagement metrics, and audience promotion services are fulfilled via automated delivery networks. All campaigns are subject to the independent operating policies, terms of service, and algorithmic updates of third-party social media platforms. Verxor does not control third-party platform algorithms and disclaims liability for external account restrictions or metric drops caused by platform updates. Refill guarantees apply exclusively to service tiers explicitly designated with refill coverage for their stated duration.',
  },
  {
    id: 'child-panels-api',
    num: '08',
    title: 'Reseller Child Panels & Developer API Governance',
    icon: 'shield',
    body:
      'Operators of white-label child panels and developer API partners operate as independent commercial entities. Resellers are solely responsible for setting their retail prices, providing first-line support to their customers, and ensuring their users comply with all applicable legal requirements. Verxor disclaims direct liability to end-users of child panels. API consumers must securely store their API keys and respect rate limits; abusive or destabilizing API requests will result in immediate credential revocation.',
  },
  {
    id: 'liability',
    num: '09',
    title: 'Limitation of Liability & Carrier Disclaimers',
    icon: 'lock',
    body:
      'Verxor services are provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. Verxor does not warrant that services will be completely uninterrupted or error-free during upstream telecom maintenance or force majeure events. To the maximum extent permitted by applicable law, Verxor’s aggregate liability for any claim arising out of or related to these Terms shall not exceed the total fees paid by you to Verxor in the thirty (30) days preceding the event giving rise to liability.',
  },
  {
    id: 'governing-law',
    num: '10',
    title: 'Governing Law & Dispute Resolution',
    icon: 'scale',
    body:
      'These Terms shall be governed by, and construed in accordance with, the laws of the Federal Republic of Nigeria. In the event of any disagreement or dispute, the parties agree to first attempt informal resolution in good faith by contacting support@verxor.com. Any unresolved dispute shall be submitted to the exclusive jurisdiction of the competent courts sitting in Lagos State, Nigeria.',
  },
];

function SectionIcon({ kind }: { kind: (typeof TERMS_SECTIONS)[number]['icon'] }) {
  const props = { size: 18, strokeWidth: 2.1 } as const;
  switch (kind) {
    case 'scale':
      return <Scale {...props} />;
    case 'lock':
      return <Lock {...props} />;
    case 'wallet':
      return <Wallet {...props} />;
    case 'phone':
      return <Smartphone {...props} />;
    case 'mail':
      return <Mail {...props} />;
    case 'zap':
      return <Zap {...props} />;
    case 'globe':
      return <Globe2 {...props} />;
    case 'shield':
      return <Shield {...props} />;
    case 'refresh':
      return <RefreshCw {...props} />;
    default:
      return <FileText {...props} />;
  }
}

export function TermsOfServicePage({ onBack }: { onBack?: () => void }) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    acceptance: true,
    wallet: true,
    numbers: true,
  });

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    for (const s of TERMS_SECTIONS) all[s.id] = true;
    setOpenIds(all);
  };

  const collapseAll = () => {
    setOpenIds({});
  };

  return (
    <div className="tos-page">
      <div className="tos-top">
        {onBack ? (
          <button type="button" className="tos-back" onClick={onBack} aria-label="Go back">
            <ArrowLeft size={16} strokeWidth={2.4} />
            <span>Back</span>
          </button>
        ) : (
          <a href="/" className="tos-back">
            <ArrowLeft size={16} strokeWidth={2.4} />
            <span>Home</span>
          </a>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="tos-back"
            onClick={expandAll}
            style={{ fontSize: 12, minHeight: 34, padding: '0 10px' }}
          >
            Expand all
          </button>
          <button
            type="button"
            className="tos-back"
            onClick={collapseAll}
            style={{ fontSize: 12, minHeight: 34, padding: '0 10px' }}
          >
            Collapse
          </button>
        </div>
      </div>

      <div className="tos-scroll">
        <div className="tos-hero">
          <div className="tos-hero-badge">
            <Scale size={14} strokeWidth={2.4} />
            <span>Official User Agreement</span>
          </div>
          <h1 className="tos-hero-title">Terms of Service</h1>
          <p className="tos-hero-sub">
            The legal terms, service-level guarantees, acceptable use standards, and refund policies governing your
            use of Verxor Digital Infrastructure.
          </p>
          <div className="tos-hero-meta">
            <span className="tos-hero-pill">Effective: November 2026</span>
            <span className="tos-hero-pill">Version 2.4</span>
            <span className="tos-hero-pill">Applies to All Services</span>
          </div>
        </div>

        {TERMS_SECTIONS.map((sec) => {
          const isOpen = Boolean(openIds[sec.id]);
          return (
            <div key={sec.id} className={'tos-card' + (isOpen ? ' is-open' : '')}>
              <button
                type="button"
                className="tos-card-header"
                onClick={() => toggle(sec.id)}
                aria-expanded={isOpen}
              >
                <span className="tos-icon-wrap">
                  <SectionIcon kind={sec.icon} />
                </span>
                <span className="tos-header-text">
                  <span className="tos-sec-num">{sec.num}</span>
                  <span className="tos-sec-title">{sec.title}</span>
                </span>
                <ChevronDown size={18} strokeWidth={2.2} className="tos-chevron" />
              </button>
              {isOpen ? (
                <div className="tos-card-body">
                  <p>{sec.body}</p>
                </div>
              ) : null}
            </div>
          );
        })}

        <div className="tos-contact-box">
          <strong>Questions or Compliance Inquiries?</strong>
          <span>
            If you have questions regarding these Terms or need assistance with your account, please reach our
            compliance and legal team at <a href="mailto:support@verxor.com">support@verxor.com</a>.
          </span>
        </div>
      </div>
    </div>
  );
}
