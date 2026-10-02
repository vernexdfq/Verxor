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

export const metadata: Metadata = {
  metadataBase: new URL('https://verxor.com'),
  title: { default: 'Verxor — Your complete digital ecosystem', template: '%s | Verxor' },
  description: 'Verxor brings supported digital services, virtual numbers, everyday utilities and partner infrastructure into one ecosystem.',
  applicationName: 'Verxor',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/brand/verxor-logo.svg', type: 'image/svg+xml' }],
    shortcut: '/brand/verxor-logo.svg',
    apple: '/brand/verxor-logo.svg',
  },
  openGraph: {
    title: 'Verxor — Your complete digital ecosystem',
    description: 'Connect, verify and grow with Verxor.',
    url: 'https://verxor.com',
    siteName: 'Verxor',
    type: 'website',
    images: [{ url: '/brand/verxor-logo.svg', width: 256, height: 256, alt: 'Verxor emblem' }],
  },
  twitter: {
    card: 'summary',
    title: 'Verxor — Your complete digital ecosystem',
    description: 'Connect, verify and grow with Verxor.',
    images: ['/brand/verxor-logo.svg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2563EB',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
