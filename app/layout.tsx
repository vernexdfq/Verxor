import type { Metadata, Viewport } from 'next';
import '../src/styles.css';
import '../src/landing.css';
import '../src/app-overrides.css';
import '../src/community-refinements.css';
import '../src/fund-page.css';
import '../src/service-pages.css';
import '../src/virtual-numbers-page.css';
import '../src/virtual-numbers-refinements.css';
import '../src/rental-page.css';
import '../src/product-pages.css';
import '../src/admin-page.css';
import '../src/marketing/marketing.css';
import '../src/marketing/hero-polish.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://verxor.com'),
  title: {
    default: 'Verxor — Virtual Numbers, eSIM, VTU, Proxies & Digital Services',
    template: '%s | Verxor',
  },
  description:
    'Buy virtual numbers for SMS verification, eSIM data, Nigerian airtime & data, exam pins, electricity tokens, cable TV, bet funding, proxies, gift cards and virtual USD cards. Partner VTU API and child panels available.',
  applicationName: 'Verxor',
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: 'https://verxor.com',
  },
  icons: {
    icon: [{ url: '/brand/verxor-logo.svg', type: 'image/svg+xml' }],
    shortcut: '/brand/verxor-logo.svg',
    apple: '/brand/verxor-logo.svg',
  },
  openGraph: {
    title: 'Verxor — Virtual Numbers, eSIM, VTU & Digital Services',
    description:
      'Instant virtual numbers, eSIM, airtime, data, bill payments, proxies, gift cards and virtual dollar cards in one wallet.',
    url: 'https://verxor.com',
    siteName: 'Verxor',
    type: 'website',
    images: [
      {
        url: '/brand/verxor-logo.svg',
        width: 256,
        height: 256,
        alt: 'Verxor',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Verxor — Virtual Numbers, eSIM, VTU & Digital Services',
    description:
      'Instant virtual numbers, eSIM, airtime, data, bill payments, proxies, gift cards and virtual dollar cards.',
    images: ['/brand/verxor-logo.svg'],
  },
  keywords: [
    'virtual numbers',
    'SMS verification',
    'eSIM',
    'VTU API',
    'airtime',
    'mobile data Nigeria',
    'exam pin',
    'electricity token',
    'cable TV subscription',
    'bet wallet funding',
    'proxies',
    'gift cards',
    'virtual dollar card',
    'SMM',
    'number rental',
    'Verxor',
  ],
};

/** Fintech PWA: fixed scale — no pinch-zoom distortion on mobile */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#2563EB',
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Verxor',
  url: 'https://verxor.com',
  logo: 'https://verxor.com/brand/verxor-logo.svg',
  description:
    'Digital services platform offering virtual numbers, eSIMs, VTU (airtime, data, bills), proxies, gift cards, virtual cards, SMM and partner API access.',
  sameAs: [],
  makesOffer: [
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Virtual Numbers for SMS Verification', url: 'https://verxor.com/services/virtual-numbers' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Number Rentals', url: 'https://verxor.com/services/number-rentals' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Boost Account (SMM)', url: 'https://verxor.com/services/smm' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Accounts & Logs', url: 'https://verxor.com/services/accounts-logs' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Proxies', url: 'https://verxor.com/services/proxies' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'eSIM Data Profiles', url: 'https://verxor.com/services/esim' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Gift Card Trading', url: 'https://verxor.com/services/gift-cards' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Virtual Dollar Cards', url: 'https://verxor.com/services/virtual-cards' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Airtime Top-up', url: 'https://verxor.com/services/airtime' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Mobile Data Bundles', url: 'https://verxor.com/services/data' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Exam Pins', url: 'https://verxor.com/services/exam-pin' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Electricity Bill & Token', url: 'https://verxor.com/services/electricity' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Bet Wallet Funding', url: 'https://verxor.com/services/bet-funding' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Cable TV Subscription', url: 'https://verxor.com/services/cable-tv' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'VTU API', url: 'https://verxor.com/services/vtu-api' } },
  ],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Verxor',
  url: 'https://verxor.com',
  description:
    'Verxor digital services: virtual numbers, eSIM, VTU, proxies, gift cards and more.',
  publisher: { '@type': 'Organization', name: 'Verxor', url: 'https://verxor.com' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
