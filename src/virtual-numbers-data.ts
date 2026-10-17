/** Shared types + static catalog for Virtual Numbers (OTP) page. */

export type ServiceCategory =
  | 'all'
  | 'social'
  | 'messaging'
  | 'shopping'
  | 'finance'
  | 'ai'
  | 'other';

export type Pool = {
  id: string;
  title: string;
  server: 1 | 2;
  location: 'USA' | 'Worldwide';
  hint: string;
  tier: 'ECO' | 'STD' | 'FAST' | 'PREMIUM';
  fromNgn: number;
};

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

export type PriceOption = {
  id: string;
  provider: string;
  priceUsd: number;
  priceNgn: number;
  stock: number;
  /** Grizzly numeric country code for buy API (e.g. "12", "16") — never shown in UI */
  grizzlyCountry?: string;
};

export type CustomerNumberOrder = {
  id: string;
  number: string;
  service: string;
  serviceId: string;
  country: string;
  poolTitle: string;
  /** Pool id for Buy Again navigation */
  poolId?: string;
  status: 'waiting' | 'received' | 'completed' | 'cancelled';
  otp?: string;
  priceNgn: number;
  /** Big lifetime timer — auto-cancels when it hits 0 */
  expiresAt: number;
  /** Small lock timer — Cancel becomes available after this */
  cancelAvailableAt: number;
  createdAt: string;
  provider?: string;
  providerOrderId?: string;
  /** True when wallet credit succeeded on cancel/expiry */
  refunded?: boolean;
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
  { code: 'MX', flag: '🇲🇽', name: 'Mexico', dial: '+52' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina', dial: '+54' },
  { code: 'PL', flag: '🇵🇱', name: 'Poland', dial: '+48' },
  { code: 'SE', flag: '🇸🇪', name: 'Sweden', dial: '+46' },
  { code: 'NO', flag: '🇳🇴', name: 'Norway', dial: '+47' },
  { code: 'DK', flag: '🇩🇰', name: 'Denmark', dial: '+45' },
  { code: 'FI', flag: '🇫🇮', name: 'Finland', dial: '+358' },
  { code: 'IE', flag: '🇮🇪', name: 'Ireland', dial: '+353' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', dial: '+351' },
  { code: 'AT', flag: '🇦🇹', name: 'Austria', dial: '+43' },
  { code: 'CH', flag: '🇨🇭', name: 'Switzerland', dial: '+41' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgium', dial: '+32' },
  { code: 'CZ', flag: '🇨🇿', name: 'Czechia', dial: '+420' },
  { code: 'RO', flag: '🇷🇴', name: 'Romania', dial: '+40' },
  { code: 'HU', flag: '🇭🇺', name: 'Hungary', dial: '+36' },
  { code: 'GR', flag: '🇬🇷', name: 'Greece', dial: '+30' },
  { code: 'UA', flag: '🇺🇦', name: 'Ukraine', dial: '+380' },
  { code: 'RU', flag: '🇷🇺', name: 'Russia', dial: '+7' },
  { code: 'IL', flag: '🇮🇱', name: 'Israel', dial: '+972' },
  { code: 'AE', flag: '🇦🇪', name: 'United Arab Emirates', dial: '+971' },
  { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia', dial: '+966' },
  { code: 'EG', flag: '🇪🇬', name: 'Egypt', dial: '+20' },
  { code: 'KE', flag: '🇰🇪', name: 'Kenya', dial: '+254' },
  { code: 'GH', flag: '🇬🇭', name: 'Ghana', dial: '+233' },
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia', dial: '+60' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore', dial: '+65' },
  { code: 'VN', flag: '🇻🇳', name: 'Vietnam', dial: '+84' },
  { code: 'PK', flag: '🇵🇰', name: 'Pakistan', dial: '+92' },
  { code: 'BD', flag: '🇧🇩', name: 'Bangladesh', dial: '+880' },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand', dial: '+64' },
  { code: 'CL', flag: '🇨🇱', name: 'Chile', dial: '+56' },
  { code: 'CO', flag: '🇨🇴', name: 'Colombia', dial: '+57' },
  { code: 'PE', flag: '🇵🇪', name: 'Peru', dial: '+51' },
];

export const CATEGORIES: { id: ServiceCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'social', label: 'Social' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'finance', label: 'Finance' },
  { id: 'ai', label: 'AI' },
  { id: 'other', label: 'Other' },
];

/** Static service list used only as offline fallback / admin labels. Live catalog comes from API. */
export const SERVICES: Service[] = [
  { id: 'wa', name: 'WhatsApp', category: 'messaging', logoId: 'whatsapp' },
  { id: 'tg', name: 'Telegram', category: 'messaging', logoId: 'telegram' },
  { id: 'fb', name: 'Facebook', category: 'social', logoId: 'facebook' },
  { id: 'ig', name: 'Instagram', category: 'social', logoId: 'instagram' },
  { id: 'tw', name: 'Twitter / X', category: 'social', logoId: 'x' },
  { id: 'go', name: 'Google', category: 'other', logoId: 'google' },
  { id: 'ds', name: 'Discord', category: 'messaging', logoId: 'discord' },
  { id: 'vi', name: 'Viber', category: 'messaging', logoId: 'viber' },
  { id: 'am', name: 'Amazon', category: 'shopping', logoId: 'amazon' },
  { id: 'mm', name: 'Microsoft', category: 'other', logoId: 'microsoft' },
  { id: 'oi', name: 'OpenAI / ChatGPT', category: 'ai', logoId: 'openai' },
  { id: 'lf', name: 'Claude', category: 'ai', logoId: 'anthropic' },
  { id: 'tk', name: 'TikTok', category: 'social', logoId: 'tiktok' },
  { id: 'sn', name: 'Snapchat', category: 'social', logoId: 'snapchat' },
  { id: 'lf2', name: 'LinkedIn', category: 'social', logoId: 'linkedin' },
  { id: 'ub', name: 'Uber', category: 'other', logoId: 'uber' },
  { id: 'nf', name: 'Netflix', category: 'other', logoId: 'netflix' },
  { id: 'ap', name: 'Apple', category: 'other', logoId: 'apple' },
  { id: 'py', name: 'PayPal', category: 'finance', logoId: 'paypal' },
  { id: 'bc', name: 'Binance', category: 'finance', logoId: 'binance' },
  { id: 'ew', name: 'eBay', category: 'shopping', logoId: 'ebay' },
  { id: 'ot', name: 'Other / Any', category: 'other', logoId: 'other' },
];

export const PROMO_SLIDES = [
  { id: 'p1', title: 'Receive OTPs in 60 Seconds', subtitle: 'Fast routes for WhatsApp, Telegram & more', cta: 'Browse numbers' },
  { id: 'p2', title: 'Do you need a custom website or mobile app?', subtitle: 'Get a website today!', cta: 'Get Started →' },
  { id: 'p3', title: 'Economy to Premium', subtitle: 'Pick the route that matches your success rate needs', cta: 'View pools' },
];

/** Big lifetime for a waiting number (~20 min like Grizzly). */
export const LIFETIME_MS = 20 * 60 * 1000;
/** UI lock before Cancel appears (4 min). Auto-retry covers any remaining lock quietly. */
export const CANCEL_LOCK_MS = 4 * 60 * 1000;

export function mockPrices(pool: Pool, _serviceId: string, _countryCode: string): PriceOption[] {
  const base = pool.fromNgn;
  return [
    { id: `${pool.id}-a`, provider: 'grizzly', priceUsd: base / 1600, priceNgn: base, stock: 12 },
    { id: `${pool.id}-b`, provider: 'grizzly', priceUsd: (base + 40) / 1600, priceNgn: base + 40, stock: 8 },
    { id: `${pool.id}-c`, provider: 'grizzly', priceUsd: (base + 90) / 1600, priceNgn: base + 90, stock: 3 },
  ];
}

export function formatNgn(n: number) {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

export function formatUsd(n: number) {
  return `$${n.toFixed(2)}`;
}

export function formatTimer(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
