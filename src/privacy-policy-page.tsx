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
      'We may collect personal details such as your full name, email address, phone number, payment information, and usage data when you create an account or use our services. Additional verification details may be requested for security and compliance purposes.',
  },
  {
    id: 'use',
    num: '02',
    title: 'How We Use Your Information',
    icon: 'settings',
    body:
      'Your information helps us process transactions, verify identity (KYC), deliver digital services, improve user experience, and enhance platform security. We may also use anonymized data for service optimization and analytics.',
  },
  {
    id: 'protect',
    num: '03',
    title: 'Data Protection',
    icon: 'shield',
    body:
      'All sensitive data is encrypted, stored securely, and handled according to best security practices. Verxor never sells or discloses your personal information to third parties, except when required by law or for completing secure transactions.',
  },
  {
    id: 'cookies',
    num: '04',
    title: 'Cookies',
    icon: 'cookie',
    body:
      'Our platform uses cookies to remember your preferences and improve performance. You can choose to disable cookies in your browser settings, though some features may not function properly without them.',
  },
  {
    id: 'rights',
    num: '05',
    title: 'Your Rights',
    icon: 'rights',
    body:
      'You have the right to access, modify, or delete your personal data at any time. For data deletion or account closure, please reach out to our support team with your registered email address.',
  },
  {
    id: 'third',
    num: '06',
    title: 'Third-Party Services',
    icon: 'plug',
    body:
      'Verxor integrates with third-party APIs and payment gateways to deliver our services (such as airtime, data, eSIM activation, virtual numbers, and betting wallets). These providers have their own privacy policies, and we encourage you to review them before use.',
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
              Last updated: October 3, 2026
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
            <strong>Virtual Numbers, eSIMs, VTU services, Betting Wallets, or Boosting Services</strong>.
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
