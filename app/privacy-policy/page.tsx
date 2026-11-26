import type { Metadata } from 'next';
import { MarketingHeader, MarketingFooter } from '../../src/marketing/components';
import { PrivacyPolicyPage } from '../../src/privacy-policy-page';

export const metadata: Metadata = {
  title: 'Privacy Policy | Verxor Digital Infrastructure',
  description:
    'Learn how Verxor protects, encrypts, and handles your data under the Nigeria Data Protection Act (NDPA 2023) across our digital telephony, VTU, and payments infrastructure.',
  alternates: { canonical: '/privacy-policy' },
  openGraph: {
    title: 'Privacy Policy | Verxor',
    description:
      'Data security, ephemeral OTP policies, encryption standards, and user rights at Verxor.',
    url: 'https://www.verxor.com/privacy-policy',
    siteName: 'Verxor',
    type: 'website',
    images: [{ url: '/brand/verxor-logo-512.png', width: 512, height: 512, alt: 'Verxor' }],
  },
};

export default function PrivacyRoute() {
  return (
    <>
      <MarketingHeader />
      <main style={{ minHeight: '80vh', padding: '24px 0 60px' }}>
        <div className="mk-container" style={{ maxWidth: 880 }}>
          <PrivacyPolicyPage />
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
