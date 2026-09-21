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

export const metadata: Metadata = {
  title: 'Verxor — Your complete digital ecosystem',
  description:
    'Verxor — Virtual numbers, dedicated rentals and digital services in one platform.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A1F44',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
