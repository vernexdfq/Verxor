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

const SECTIONS: {
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
      'When you register, we collect your full name, email address, phone number, username, and referral details (who invited you), alongside an encrypted password and PIN. As you use the platform, we store transaction and wallet records, deposit history, order logs, API request metadata, and audit trails. When you apply for a USD virtual card, we additionally collect your Bank Verification Number (BVN), National Identification Number (NIN), date of birth, and selfie/ID verification, solely to satisfy licensed card-issuing regulatory requirements. To display your purchased services, we temporarily hold SMS and email OTP payloads, rental call/text metadata, and eSIM ICCID activation records.',
  },
  {
    id: 'use',
    num: '02',
    title: 'How We Use Your Information',
    icon: 'settings',
    body:
      'Your information helps us process instant orders across virtual numbers and long-term number rentals, eSIMs, airtime and data top-ups, electricity and cable TV payments, exam pins, betting wallet funding, gift card trading, game boosting, email accounts, and virtual cards. We also use it to verify identity, prevent fraud, detect duplicate or abusive accounts, enforce API rate limits, and credit referral rewards to the wallet of the user who invited you. Finally, we use it to send transaction receipts, security alerts, and support responses.',
  },
  {
    id: 'protect',
    num: '03',
    title: 'Data Protection',
    icon: 'shield',
    body:
      'All sensitive data is encrypted in transit and at rest, stored securely, and handled according to best security practices. Verxor never stores your full virtual card number (PAN), CVV, or bank login passwords: sensitive payment processing and card vaulting are handled strictly by PCI-DSS compliant financial infrastructure partners, and we keep only masked card identifiers (last 4 digits) for your dashboard display. We never sell or disclose your personal information, except when legally compelled by a valid court order or fraud investigation.',
  },
  {
    id: 'cookies',
    num: '04',
    title: 'Cookies',
    icon: 'cookie',
    body:
      'Our platform uses cookies and local storage to keep you signed in, remember your preferences, attribute referral sign-ups to the user who invited you, and improve performance. You can disable cookies in your browser settings, though sign-in, wallet actions, and some features may not function properly without them.',
  },
  {
    id: 'rights',
    num: '05',
    title: 'Your Rights',
    icon: 'rights',
    body:
      'Under the Nigeria Data Protection Act (NDPA), you may request access to, correction of, or deletion of your account data at any time by contacting support@verxor.com with your registered email address. Temporary SMS and email OTP contents are purged or securely archived once your session completes. Financial, KYC, and payment audit records are retained for the period required by law (typically 5 years) before deletion.',
  },
  {
    id: 'third',
    num: '06',
    title: 'Third-Party Services',
    icon: 'plug',
    body:
      'We do not sell, rent, or trade your personal data to advertisers or marketers. We share minimal, encrypted technical data strictly with licensed payment processors and banking partners (to process Naira deposits and USD virtual cards), and with telecom, cloud communication, and digital fulfillment providers (strictly to route your requested OTPs, number rentals, eSIMs, and utility top-ups). These providers have their own privacy policies, and we encourage you to review them before use.',
  },
  {
    id: 'updates',
    num: '07',
    title: 'Updates to This Policy',
    icon: 'refresh',
    body:
      'We may update this Privacy Policy from time to time to reflect service improvements or legal requirements. All updates will be published on this page, and continued use of our services implies acceptance of any changes.',
  },
];

function SectionIcon({ kind }: { kind: (typeof SECTIONS)[number]['icon'] }) {
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

export function PrivacyPolicyPage({ onBack }: { onBack: () => void }) {
  const [openId, setOpenId] = useState<string | null>('collect');

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="pp-page">
      <header className="pp-top">
        <button type="button" className="pp-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
          <span>Back</span>
        </button>
      </header>

      <div className="pp-scroll">
        {/* Hero */}
        <section className="pp-hero">
          <span className="pp-hero-badge">
            <span className="pp-hero-dot" aria-hidden />
            Legal document
          </span>
          <h1>
            Privacy <span>Policy</span>
          </h1>
          <p>
            Your trust is our foundation. Here's exactly how we collect, use, and protect your personal
            data.
          </p>
          <div className="pp-hero-meta">
            <span>
              <FileText size={13} strokeWidth={2} />
              Last updated: November 24, 2026
            </span>
            <span>
              <Lock size={13} strokeWidth={2} />
              SSL Encrypted
            </span>
          </div>
        </section>

        {/* Intro */}
        <section className="pp-intro">
          <span className="pp-intro-ico" aria-hidden>
            <Shield size={18} strokeWidth={2.1} />
          </span>
          <p>
            At <strong>Verxor</strong>, your privacy and trust are our top priorities. This policy describes how we
            collect, use, and protect your personal data when you use our{' '}
            <strong>
              Virtual Numbers, Long-Term Number Rentals, eSIMs, VTU services, Betting Wallets, Gift Cards,
              Exam Pins, Boosting Services, Email Accounts, Virtual Cards, or the Referral Program
            </strong>
            , in compliance with the Nigeria Data Protection Act (NDPA).
          </p>
        </section>

        {/* Accordion sections */}
        <div className="pp-sections">
          {SECTIONS.map((s) => {
            const open = openId === s.id;
            return (
              <article key={s.id} className={`pp-card${open ? ' open' : ''}`}>
                <button
                  type="button"
                  className="pp-card-head"
                  onClick={() => toggle(s.id)}
                  aria-expanded={open}
                >
                  <span className="pp-card-ico" aria-hidden>
                    <SectionIcon kind={s.icon} />
                  </span>
                  <span className="pp-card-title">{s.title}</span>
                  <span className="pp-card-num">{s.num}</span>
                  <ChevronDown
                    size={18}
                    strokeWidth={2.2}
                    className={`pp-chevron${open ? ' up' : ''}`}
                    aria-hidden
                  />
                </button>
                {open ? <div className="pp-card-body">{s.body}</div> : null}
              </article>
            );
          })}
        </div>

        {/* Contact */}
        <section className="pp-contact">
          <div className="pp-contact-ico" aria-hidden>
            <Mail size={22} strokeWidth={2} />
          </div>
          <h2>Have Questions?</h2>
          <p>
            If you have concerns about our Privacy Policy or how your data is handled, our support team is here to
            help.
          </p>
          <a className="pp-mail-btn" href="mailto:support@verxor.com">
            <Mail size={16} strokeWidth={2.2} />
            support@verxor.com
          </a>
        </section>
      </div>
    </div>
  );
}
