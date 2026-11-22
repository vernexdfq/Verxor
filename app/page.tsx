import type { Metadata } from 'next';
import { MarketingHeader, MarketingFooter } from '../src/marketing/components';
import LandingClient from '../src/marketing/LandingClient';

export const metadata: Metadata = {
  title: 'Verxor — Global Digital Infrastructure for Africa’s Digital Economy',
  description:
    'Use one wallet to access carrier-grade virtual numbers, travel eSIMs, Nigerian VTU services, virtual USD cards, social growth services, and white-label developer APIs.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Verxor — Global Digital Infrastructure for Africa’s Digital Economy',
    description:
      'Fund one seamless wallet to instantly deploy global digital assets and automated everyday utilities. Built with a robust API framework for creators, agencies, and high-volume developers.',
    url: 'https://www.verxor.com/',
    siteName: 'Verxor',
    type: 'website',
    images: [{ url: '/brand/verxor-logo.svg', width: 256, height: 256, alt: 'Verxor emblem' }],
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Verxor',
  url: 'https://www.verxor.com',
  logo: 'https://www.verxor.com/brand/verxor-logo.svg',
  description:
    'Global digital infrastructure for Africa’s digital economy: virtual numbers, eSIM, VTU data, USD cards, SMM marketplace, and developer APIs.',
  telephone: '+2348141620644',
  email: 'support@verxor.com',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Lagos',
    addressCountry: 'NG',
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Verxor',
  url: 'https://www.verxor.com',
  inLanguage: 'en',
};

export default function HomePage() {
  return (
    <div className="vx-landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <MarketingHeader />

      <main>
        <LandingClient />
      </main>

      <MarketingFooter />
    </div>
  );
}
