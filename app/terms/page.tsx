import type { Metadata } from 'next';
import { MarketingHeader, MarketingFooter } from '../../src/marketing/components';
import { TermsOfServicePage } from '../../src/terms-page';

export const metadata: Metadata = {
  title: 'Terms of Service | Verxor Digital Infrastructure',
  description:
    'Read the official Terms of Service, Acceptable Use Policy, wallet terms, and refund rules governing Verxor digital telephony, eSIM, VTU, and developer APIs.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of Service | Verxor',
    description:
      'Official User Agreement, Acceptable Use Standards, and Service-Level Guarantees for Verxor.',
    url: 'https://www.verxor.com/terms',
    siteName: 'Verxor',
    type: 'website',
    images: [{ url: '/brand/verxor-logo-512.png', width: 512, height: 512, alt: 'Verxor' }],
  },
};

export default function TermsRoute() {
  return (
    <>
      <MarketingHeader />
      <main style={{ minHeight: '80vh', padding: '24px 0 60px' }}>
        <div className="mk-container" style={{ maxWidth: 880 }}>
          <TermsOfServicePage />
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
