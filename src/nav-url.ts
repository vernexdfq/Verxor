import type { Page } from './types';
import type { ServiceView } from './service-pages';

/** All in-app service views (everything in ServiceView except 'services'). */
export const SERVICE_VIEWS: ReadonlyArray<Exclude<ServiceView, 'services'>> = [
  'virtual-numbers',
  'rental',
  'sms-calls',
  'boost',
  'boost-orders',
  'accounts',
  'account-orders',
  'number-orders',
  'rewards',
  'affiliate',
  'alerts',
  'settings',
  'security',
  'notifications-prefs',
  'community',
  'feedback',
  'help',
  'faq',
  'privacy',
  'edit-profile',
  'referral',
  'child-panel',
  'api-keys',
  'support-center',
  'data',
  'airtime',
  'esim',
  'proxies',
  'tv-cable',
  'electricity',
  'exam-pin',
  'virtual-card',
  'gift-card',
  'bet-wallet',
  'email-otp',
  'email-orders',
  'telegram-premium',
];

export function serviceSlug(view: Exclude<ServiceView, 'services'>): string {
  return view === 'virtual-numbers' ? 'virtualnumber' : view;
}

export function serviceViewFromSlug(slug: string): Exclude<ServiceView, 'services'> | null {
  for (const view of SERVICE_VIEWS) {
    if (serviceSlug(view) === slug) return view;
  }
  return null;
}

export function pageUrl(page: Page): string {
  if (page === 'home') return '/dashboard';
  if (page === 'history') return '/history';
  if (page === 'profile') return '/profile';
  if (page === 'services') return '/services';
  if (page === 'fund') return '/dashboard/fund';
  return '/dashboard';
}

export function navUrl(page: Page, service: ServiceView | null): string {
  if (service && service !== 'services') return `/dashboard/${serviceSlug(service)}`;
  return pageUrl(page);
}

export function stateFromPath(pathname: string): { page: Page; service: ServiceView | null } {
  const clean = pathname.split('?')[0].replace(/\/+$/, '');
  if (clean === '/history') return { page: 'history', service: null };
  if (clean === '/profile') return { page: 'profile', service: null };
  if (clean === '/services') return { page: 'services', service: null };
  if (clean === '/dashboard/fund') return { page: 'fund', service: null };
  const m = /^\/dashboard\/([a-z0-9-]+)$/.exec(clean);
  if (m) {
    const view = serviceViewFromSlug(m[1]);
    if (view) return { page: 'home', service: view };
  }
  return { page: 'home', service: null };
}
