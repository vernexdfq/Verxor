'use client';

import { useState } from 'react';
import { ArrowLeft, ChevronDown, HelpCircle } from 'lucide-react';
import './faq-page.css';

type FaqItem = { q: string; a: string };
type FaqSection = { id: string; title: string; items: FaqItem[] };

const SECTIONS: FaqSection[] = [
  {
    id: 'about',
    title: 'About Verxor',
    items: [
      {
        q: 'What is Verxor?',
        a: 'Verxor is a digital-services platform that brings multiple digital products and infrastructure services together in one account. Depending on eligibility, users can access virtual numbers, number rentals, digital accounts, social media services, eSIMs, proxies, gift-card trading, virtual cards, and selected Nigerian VTU services.',
      },
      {
        q: 'Is Verxor only for Nigerian users?',
        a: 'No. Verxor is designed as a global platform. Some services are available internationally, while certain services (such as Nigerian VTU and bill payments) are restricted to eligible Nigerian accounts.',
      },
      {
        q: 'Can I use Verxor when I travel outside my country?',
        a: 'Yes, where the services attached to your account remain available. Your physical location while travelling does not automatically remove services your account is eligible to use. For example, an eligible Nigerian user can travel abroad and continue accessing eligible Nigerian services through the same account.',
      },
      {
        q: 'Do I need a separate Verxor account for each country?',
        a: 'No. The goal is one Verxor account. Service and currency availability can still depend on your account’s market eligibility.',
      },
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts & registration',
    items: [
      {
        q: 'How do I create a Verxor account?',
        a: 'Create an account on the Verxor website and complete the required registration steps (name, phone or email, password, and PIN).',
      },
      {
        q: 'Why can two users see different services?',
        a: 'Verxor supports multiple markets and service categories. Some services are only available to accounts that meet specific market, currency, verification, or inventory requirements.',
      },
      {
        q: 'Will my current location determine whether I can use Nigerian services?',
        a: 'Not necessarily. For eligible accounts, access is tied to the account’s supported market rather than only the country from which you are connecting.',
      },
    ],
  },
  {
    id: 'services',
    title: 'Services',
    items: [
      {
        q: 'What services does Verxor offer?',
        a: 'The catalog is designed to include global digital services and selected regional services — for example virtual numbers, rentals, boost/SMM, digital accounts, eSIM, proxies, gift cards, virtual cards, airtime, data, electricity, TV/cable, exam PINs, and other products enabled on the platform. Only services currently available in your dashboard should be treated as active.',
      },
      {
        q: 'Are all services available worldwide?',
        a: 'No. Some services are global; others are restricted to particular countries, currencies, providers, or account types.',
      },
      {
        q: 'Why does Verxor show a service I cannot purchase?',
        a: 'A service may appear in the broader catalog even when it is temporarily unavailable for your account or out of stock. The service page will show the relevant availability message.',
      },
    ],
  },
  {
    id: 'vtu',
    title: 'Nigerian services & VTU',
    items: [
      {
        q: 'Does Verxor provide Nigerian VTU services?',
        a: 'Yes. Eligible users can access supported digital products such as airtime, data, electricity, TV/cable, and other VTU services when those products are enabled.',
      },
      {
        q: 'Are Nigerian VTU services available to every account?',
        a: 'No. Nigerian VTU services are intended for eligible Nigerian accounts. International accounts may see these services locked or marked as not available.',
      },
      {
        q: 'Can a Nigerian user travel abroad and still buy Nigerian data?',
        a: 'Yes, provided the account remains eligible for Nigerian services. You do not need a second account simply because you are travelling.',
      },
      {
        q: 'Are VTU purchases refundable?',
        a: 'Refund eligibility depends on the specific service and transaction status. Completed third-party transactions may follow different rules from failed or reversed ones.',
      },
    ],
  },
  {
    id: 'wallet',
    title: 'Wallet & payments',
    items: [
      {
        q: 'How does the Verxor wallet work?',
        a: 'Verxor uses a wallet-based system for supported services. You fund your wallet, and eligible purchases are deducted from the available balance.',
      },
      {
        q: 'What currency does Verxor use?',
        a: 'Currency depends on your account market. Nigerian users typically see NGN; international accounts may use USD or another supported currency.',
      },
      {
        q: 'Can a failed order return money to my wallet?',
        a: 'Where the transaction qualifies for an automatic refund or reversal under the service rules, the applicable amount can be returned to your wallet.',
      },
      {
        q: 'Is Verxor a bank?',
        a: 'No. Verxor is a digital-services platform. A Verxor wallet should not be treated as a bank account.',
      },
    ],
  },
  {
    id: 'numbers',
    title: 'Virtual numbers & OTP',
    items: [
      {
        q: 'What are Verxor virtual numbers?',
        a: 'Virtual numbers are numbers provided through Verxor for supported digital communication and verification use cases. Availability depends on country, provider, and service.',
      },
      {
        q: 'Does every virtual number support every platform?',
        a: 'No. Third-party platforms set their own rules and may reject certain numbers.',
      },
      {
        q: 'Does Verxor guarantee OTP delivery?',
        a: 'No. OTP delivery can depend on the upstream provider, destination platform, network conditions, and number availability.',
      },
      {
        q: 'What happens if I do not receive an OTP?',
        a: 'Check the order status and available actions. If the transaction qualifies for cancellation, refund, or reversal under the service rules, that process will apply.',
      },
      {
        q: 'What is the difference between buying an OTP number and renting a number?',
        a: 'An OTP purchase is generally for a specific verification transaction. A rental provides access to a number for a defined period according to the selected product.',
      },
    ],
  },
  {
    id: 'api',
    title: 'API & child panels',
    items: [
      {
        q: 'Does Verxor offer an API?',
        a: 'Yes. Approved developers, businesses, resellers, and child-panel operators can integrate supported Verxor services through the Verxor API.',
      },
      {
        q: 'Does an API partner get Verxor’s provider APIs?',
        a: 'No. Partners integrate with the Verxor API only. Upstream provider credentials and routing stay inside Verxor’s infrastructure.',
      },
      {
        q: 'Are API prices the same as retail prices?',
        a: 'Not necessarily. API and partner pricing can differ from direct retail pricing because they serve different business models. Verxor publishes applicable API or partner prices rather than a generic percentage discount claim.',
      },
      {
        q: 'What is a Verxor child panel?',
        a: 'A child panel is a separately branded digital-services storefront powered by Verxor’s infrastructure. Resellers can operate under their own brand while Verxor handles fulfillment.',
      },
      {
        q: 'Can child-panel operators set their own retail prices?',
        a: 'Yes, subject to Verxor’s pricing-floor rules. The platform enforces the minimum permitted price server-side.',
      },
      {
        q: 'Does Verxor reveal upstream provider cost?',
        a: 'No. Provider wholesale costs and internal routing information are confidential platform infrastructure and are not exposed to end users or child panels.',
      },
    ],
  },
  {
    id: 'orders',
    title: 'Orders, refunds & support',
    items: [
      {
        q: 'Where can I see my orders?',
        a: 'Orders and transaction history are available in the History section of the app and in service-specific order views where provided.',
      },
      {
        q: 'Does Verxor offer refunds?',
        a: 'Refund eligibility depends on the service and transaction circumstances. Digital products, completed transactions, and third-party services can have different conditions.',
      },
      {
        q: 'What happens when a provider fails to fulfill an order?',
        a: 'If the transaction qualifies under the applicable service policy, Verxor can process a refund or reversal to the wallet or original funding method as appropriate.',
      },
      {
        q: 'How do I contact Verxor support?',
        a: 'Use official channels from the Support Center in your account (email support@verxor.com and any linked WhatsApp or Telegram channels). When reporting an order issue, include the transaction reference — never share passwords, PIN, or private API keys.',
      },
      {
        q: 'Can a service become temporarily unavailable?',
        a: 'Yes. Services can be unavailable due to provider inventory, maintenance, technical issues, or other operational conditions.',
      },
    ],
  },
];

export function FaqPage({ onBack }: { onBack: () => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="faq-page">
      <header className="faq-header">
        <button type="button" className="faq-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.25} />
          <span>Back</span>
        </button>
        <h1 className="faq-title">FAQs</h1>
        <span className="faq-header-spacer" aria-hidden />
      </header>

      <div className="faq-scroll">
        <section className="faq-hero">
          <span className="faq-hero-badge">
            <HelpCircle size={13} strokeWidth={2.4} />
            Help center
          </span>
          <h2>Frequently asked questions</h2>
          <p>Quick answers about Verxor services, accounts, wallets, API partners, and support.</p>
        </section>

        {SECTIONS.map((section) => (
          <section key={section.id} className="faq-section">
            <h3 className="faq-section-title">{section.title}</h3>
            <div className="faq-list">
              {section.items.map((item, idx) => {
                const key = `${section.id}-${idx}`;
                const open = openKey === key;
                return (
                  <div key={key} className={`faq-item ${open ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="faq-q"
                      aria-expanded={open}
                      onClick={() => setOpenKey(open ? null : key)}
                    >
                      <span>{item.q}</span>
                      <ChevronDown size={18} strokeWidth={2.2} className="faq-chevron" />
                    </button>
                    {open ? <div className="faq-a">{item.a}</div> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="faq-footer">
          <p>
            Still need help?{' '}
            <a href="mailto:support@verxor.com">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
}
