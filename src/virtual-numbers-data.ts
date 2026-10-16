export type ServiceCategory =
  | 'all'
  | 'messengers'
  | 'social'
  | 'dating'
  | 'games'
  | 'marketplace'
  | 'payments'
  | 'food'
  | 'shops'
  | 'betting'
  | 'taxi'
  | 'other';

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  logoId?: string;
};

export type Country = {
  code: string;
  flag: string;
  name: string;
  dial: string;
};

export type PoolTier = 'ECO' | 'STD' | 'FAST' | 'PREMIUM';

export type Pool = {
  id: string;
  title: string;
  hint: string;
  fromNgn: number;
  tier: PoolTier;
  location: 'USA' | 'Worldwide';
};

export type PriceOption = {
  id: string;
  provider: string;
  priceUsd: number;
  priceNgn: number;
  stock: number;
  grizzlyCountry?: string;
};

export type Step = 'pools' | 'services' | 'countries' | 'orders' | 'inbox';

export type CustomerNumberOrder = {
  id: string;
  number: string;
  service: string;
  serviceId: string;
  country: string;
  poolTitle: string;
  status: 'waiting' | 'received' | 'completed' | 'cancelled';
  priceNgn: number;
  expiresAt: number;
  cancelAvailableAt: number;
  createdAt: string;
  provider: string;
  providerOrderId?: string;
  otp?: string;
};

export const LIFETIME_MS = 20 * 60 * 1000;
export const CANCEL_LOCK_MS = 2 * 60 * 1000;

export const SERVER1_POOLS: Pool[] = [
  {
    id: 'usa-economy',
    title: 'USA · Economy',
    hint: 'Low cost (VoIP/Non-VoIP mix)',
    fromNgn: 150,
    tier: 'ECO',
    location: 'USA',
  },
  {
    id: 'usa-standard',
    title: 'USA · Standard',
    hint: 'Reliable speed for standard apps',
    fromNgn: 380,
    tier: 'STD',
    location: 'USA',
  },
  {
    id: 'worldwide-economy',
    title: 'Worldwide · Economy',
    hint: 'Global coverage (VoIP/Non-VoIP mix)',
    fromNgn: 280,
    tier: 'ECO',
    location: 'Worldwide',
  },
  {
    id: 'worldwide-standard',
    title: 'Worldwide · Standard',
    hint: 'Standard global delivery',
    fromNgn: 450,
    tier: 'STD',
    location: 'Worldwide',
  },
];

export const SERVER2_POOLS: Pool[] = [
  {
    id: 'usa-fast',
    title: 'USA · Fast',
    hint: 'High OTP success (Non-VoIP)',
    fromNgn: 620,
    tier: 'FAST',
    location: 'USA',
  },
  {
    id: 'usa-premium',
    title: 'USA · Premium',
    hint: 'Maximum reliability & instant delivery',
    fromNgn: 990,
    tier: 'PREMIUM',
    location: 'USA',
  },
  {
    id: 'worldwide-fast',
    title: 'Worldwide · Fast',
    hint: 'Fast global delivery',
    fromNgn: 750,
    tier: 'FAST',
    location: 'Worldwide',
  },
  {
    id: 'worldwide-premium',
    title: 'Worldwide · Premium',
    hint: 'Premium routes & highest success',
    fromNgn: 1100,
    tier: 'PREMIUM',
    location: 'Worldwide',
  },
];

export const USA_COUNTRY: Country = {
  code: 'US',
  flag: '🇺🇸',
  name: 'United States',
  dial: '+1',
};

export const WORLDWIDE_COUNTRIES: Country[] = [
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dial: '+44' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', dial: '+1' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', dial: '+49' },
  { code: 'FR', flag: '🇫🇷', name: 'France', dial: '+33' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands', dial: '+31' },
  { code: 'PL', flag: '🇵🇱', name: 'Poland', dial: '+48' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain', dial: '+34' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy', dial: '+39' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia', dial: '+62' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines', dial: '+63' },
  { code: 'IN', flag: '🇮🇳', name: 'India', dial: '+91' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria', dial: '+234' },
  { code: 'KE', flag: '🇰🇪', name: 'Kenya', dial: '+254' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa', dial: '+27' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil', dial: '+55' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico', dial: '+52' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', dial: '+61' },
  { code: 'TR', flag: '🇹🇷', name: 'Turkey', dial: '+90' },
  { code: 'UA', flag: '🇺🇦', name: 'Ukraine', dial: '+380' },
  { code: 'RU', flag: '🇷🇺', name: 'Russia', dial: '+7' },
];

export const CATEGORIES: { id: ServiceCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'messengers', label: 'Messengers' },
  { id: 'social', label: 'Social media' },
  { id: 'dating', label: 'Dating' },
  { id: 'games', label: 'Games' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'payments', label: 'Payments' },
  { id: 'food', label: 'Food' },
  { id: 'shops', label: 'Shops' },
  { id: 'betting', label: 'Betting' },
  { id: 'taxi', label: 'Taxi' },
  { id: 'other', label: 'Other' },
];

export const PROMO_SLIDES = [
  {
    id: 'whitelabel',
    title: 'Own a Whitelabel Reseller Panel',
    subtitle: 'Powered by Verxor — sell numbers under your brand.',
    cta: 'Own a Panel →',
  },
  {
    id: 'otp60',
    title: 'Receive OTPs in 60 Seconds',
    subtitle: 'Instant verification for all your social media & app accounts!',
    cta: 'Verify Now →',
  },
  {
    id: 'custom',
    title: 'Do you need a custom website or mobile app?',
    subtitle: 'Get a website today!',
    cta: 'Get Started →',
  },
];

export function formatNgn(value: number) {
  const n = Number(value) || 0;
  return `₦${n.toLocaleString('en-NG')}`;
}

export function formatUsd(value: number) {
  const n = Number(value) || 0;
  return `$${n.toFixed(2)}`;
}

export function formatTimer(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
