/**
 * Virtual Numbers - shared types, catalog data, and pure helpers
 */
export type PoolId =
  | 'usa-economy'
  | 'usa-standard'
  | 'usa-fast'
  | 'usa-premium'
  | 'worldwide-economy'
  | 'worldwide-standard'
  | 'worldwide-fast'
  | 'worldwide-premium';

export type Tier = 'ECO' | 'STD' | 'FAST' | 'PREMIUM';
export type Location = 'USA' | 'Worldwide';

export type Pool = {
  id: PoolId;
  title: string;
  server: 1 | 2;
  location: Location;
  hint: string;
  tier: Tier;
  fromNgn: number;
};

export type Country = { code: string; flag: string; name: string; dial: string };

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
};

export type PriceOption = {
  id: string;
  provider: string;
  priceUsd: number;
  priceNgn: number;
  stock: number;
};

export type CustomerNumberOrder = {
  id: string;
  number: string;
  service: string;
  serviceId: string;
  country: string;
  poolTitle: string;
  status: 'waiting' | 'received' | 'completed' | 'cancelled';
  otp?: string;
  priceNgn: number;
  /** Big lifetime timer — auto-cancels when it hits 0 */
  expiresAt: number;
  /** Small lock timer — Cancel becomes available after this */
  cancelAvailableAt: number;
  createdAt: string;
};

/** Single unified page steps. No separate 'activations'. */
export type Step = 'pools' | 'services' | 'countries' | 'orders' | 'inbox';

export const SERVER1_POOLS: Pool[] = [
  { id: 'usa-economy', title: 'USA · Economy', server: 1, location: 'USA', hint: 'Low cost (VoIP/Non-VoIP mix)', tier: 'ECO', fromNgn: 150 },
  { id: 'usa-standard', title: 'USA · Standard', server: 1, location: 'USA', hint: 'Reliable speed for standard apps', tier: 'STD', fromNgn: 380 },
  { id: 'worldwide-economy', title: 'Worldwide · Economy', server: 1, location: 'Worldwide', hint: 'Global coverage (VoIP/Non-VoIP mix)', tier: 'ECO', fromNgn: 280 },
  { id: 'worldwide-standard', title: 'Worldwide · Standard', server: 1, location: 'Worldwide', hint: 'Standard global delivery', tier: 'STD', fromNgn: 450 },
];

export const SERVER2_POOLS: Pool[] = [
  { id: 'usa-fast', title: 'USA · Fast', server: 2, location: 'USA', hint: 'High OTP success (Non-VoIP)', tier: 'FAST', fromNgn: 620 },
  { id: 'usa-premium', title: 'USA · Premium', server: 2, location: 'USA', hint: 'Maximum reliability & instant delivery', tier: 'PREMIUM', fromNgn: 990 },
  { id: 'worldwide-fast', title: 'Worldwide · Fast', server: 2, location: 'Worldwide', hint: 'Fast global delivery', tier: 'FAST', fromNgn: 750 },
  { id: 'worldwide-premium', title: 'Worldwide · Premium', server: 2, location: 'Worldwide', hint: 'Premium routes & highest success', tier: 'PREMIUM', fromNgn: 1100 },
];

export const USA_COUNTRY: Country = { code: 'US', flag: '🇺🇸', name: 'United States', dial: '+1' };

export const WORLDWIDE_COUNTRIES: Country[] = [
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dial: '+44' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', dial: '+1' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', dial: '+49' },
  { code: 'FR', flag: '🇫🇷', name: 'France', dial: '+33' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands', dial: '+31' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', dial: '+61' },
  { code: 'IN', flag: '🇮🇳', name: 'India', dial: '+91' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain', dial: '+34' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy', dial: '+39' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil', dial: '+55' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa', dial: '+27' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria', dial: '+234' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines', dial: '+63' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia', dial: '+62' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand', dial: '+66' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan', dial: '+81' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea', dial: '+82' },
  { code: 'TR', flag: '🇹🇷', name: 'Turkey', dial: '+90' },
  { code: 'PL', flag: '🇵🇱', name: 'Poland', dial: '+48' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', dial: '+351' },
];

export const CATEGORIES: { id: ServiceCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'messengers', label: 'Messengers' },
  { id: 'social', label: 'Social media' },
  { id: 'dating', label: 'Dating' },
  { id: 'games', label: 'Games' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'payments', label: 'Payment systems' },
  { id: 'food', label: 'Food' },
  { id: 'shops', label: 'Shops' },
  { id: 'betting', label: 'Betting' },
  { id: 'taxi', label: 'Taxi' },
  { id: 'other', label: 'Other' },
];

export const SERVICES: Service[] = [
  { id: 'whatsapp', name: 'WhatsApp', category: 'messengers' },
  { id: 'telegram', name: 'Telegram', category: 'messengers' },
  { id: 'signal', name: 'Signal', category: 'messengers' },
  { id: 'discord', name: 'Discord', category: 'messengers' },
  { id: 'imo', name: 'Imo', category: 'messengers' },
  { id: 'viber', name: 'Viber', category: 'messengers' },
  { id: 'wechat', name: 'WeChat', category: 'messengers' },
  { id: 'line', name: 'LINE', category: 'messengers' },
  { id: 'facebook', name: 'Facebook', category: 'social' },
  { id: 'instagram', name: 'Instagram + Threads', category: 'social' },
  { id: 'tiktok', name: 'TikTok', category: 'social' },
  { id: 'twitter', name: 'X (Twitter)', category: 'social' },
  { id: 'snapchat', name: 'Snapchat', category: 'social' },
  { id: 'linkedin', name: 'LinkedIn', category: 'social' },
  { id: 'tinder', name: 'Tinder', category: 'dating' },
  { id: 'badoo', name: 'Badoo', category: 'dating' },
  { id: 'bumble', name: 'Bumble', category: 'dating' },
  { id: 'steam', name: 'Steam', category: 'games' },
  { id: 'pubg', name: 'PUBG Mobile', category: 'games' },
  { id: 'roblox', name: 'Roblox', category: 'games' },
  { id: 'amazon', name: 'Amazon', category: 'marketplace' },
  { id: 'ebay', name: 'eBay', category: 'marketplace' },
  { id: 'alibaba', name: 'Alibaba', category: 'marketplace' },
  { id: 'paypal', name: 'PayPal', category: 'payments' },
  { id: 'googlepay', name: 'Google Pay', category: 'payments' },
  { id: 'wise', name: 'Wise', category: 'payments' },
  { id: 'ubereats', name: 'Uber Eats', category: 'food' },
  { id: 'doordash', name: 'DoorDash', category: 'food' },
  { id: 'walmart', name: 'Walmart', category: 'shops' },
  { id: 'nike', name: 'Nike', category: 'shops' },
  { id: 'bet365', name: 'Bet365', category: 'betting' },
  { id: '1xbet', name: '1xBet', category: 'betting' },
  { id: 'uber', name: 'Uber', category: 'taxi' },
  { id: 'bolt', name: 'Bolt', category: 'taxi' },
  { id: 'google', name: 'Google / Gmail / YouTube', category: 'other' },
  { id: 'microsoft', name: 'Microsoft / Outlook', category: 'other' },
  { id: 'apple', name: 'Apple', category: 'other' },
  { id: 'netflix', name: 'Netflix', category: 'other' },
  { id: 'spotify', name: 'Spotify', category: 'other' },
  { id: 'openai', name: 'OpenAI / ChatGPT', category: 'other' },
];

export const PROMO_SLIDES = [
  { id: 'otp', title: 'Receive OTPs in 60 Seconds', subtitle: 'Instant verification for all your social media & app accounts!', cta: 'Verify Now →' },
  { id: 'web', title: 'Do you need a custom website or mobile app?', subtitle: 'Get a website today!', cta: 'Get Started →' },
  { id: 'panel', title: 'Own a Whitelabel Reseller Panel', subtitle: 'Powered by Verxor — sell numbers under your brand.', cta: 'Own a Panel →' },
];

/** Big lifetime ≈ 20 min; small cancel-lock ≈ 4 min 30 s */
export const LIFETIME_MS = 20 * 60 * 1000;
export const CANCEL_LOCK_MS = 4 * 60 * 1000 + 30 * 1000;

export function mockPrices(pool: Pool, _serviceId: string, _countryCode: string): PriceOption[] {
  const all: PriceOption[] = [
    { id: 'p1', provider: 'Grizzly', priceUsd: 0.15, priceNgn: 150, stock: 37417 },
    { id: 'p2', provider: '5sim', priceUsd: 0.32, priceNgn: 280, stock: 91044 },
    { id: 'p3', provider: 'SMSBower', priceUsd: 0.44, priceNgn: 380, stock: 8652 },
    { id: 'p4', provider: 'PVAPins', priceUsd: 0.65, priceNgn: 450, stock: 12400 },
    { id: 'p5', provider: 'Grizzly', priceUsd: 0.9, priceNgn: 620, stock: 8300 },
    { id: 'p6', provider: '5sim', priceUsd: 1.2, priceNgn: 750, stock: 4100 },
    { id: 'p7', provider: 'SMSBower', priceUsd: 1.8, priceNgn: 990, stock: 2200 },
    { id: 'p8', provider: 'PVAPins', priceUsd: 2.5, priceNgn: 1100, stock: 980 },
    { id: 'p9', provider: 'Grizzly', priceUsd: 3.2, priceNgn: 1400, stock: 410 },
  ];
  return all.filter((p) => {
    if (pool.tier === 'ECO') return p.priceUsd < 0.5;
    if (pool.tier === 'STD') return p.priceUsd >= 0.5 && p.priceUsd < 1;
    if (pool.tier === 'FAST') return p.priceUsd >= 1 && p.priceUsd < 2;
    return p.priceUsd >= 2;
  });
}

export function formatNgn(n: number) {
  return `₦${n.toLocaleString('en-NG')}`;
}

export function formatUsd(n: number) {
  return `$${n.toFixed(2)}`;
}

export function formatTimer(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
