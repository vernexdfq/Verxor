/** Shared types + static catalog for Virtual Numbers (OTP) page. */

export type ServiceCategory =
  | 'all'
  | 'messaging'
  | 'social'
  | 'gaming'
  | 'shopping'
  | 'finance'
  | 'dating'
  | 'food'
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
  { id: 'messaging', label: 'Messaging' },
  { id: 'social', label: 'Social' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'finance', label: 'Finance' },
  { id: 'dating', label: 'Dating' },
  { id: 'food', label: 'Food & Delivery' },
  { id: 'ai', label: 'AI & Tech' },
  { id: 'other', label: 'Other' },
];

/** Static service list used only as offline fallback / admin labels. Live catalog comes from API. */
export const SERVICES: Service[] = [
  // Messaging
  { id: 'wa', name: 'WhatsApp', category: 'messaging', logoId: 'whatsapp', isPopular: true },
  { id: 'tg', name: 'Telegram', category: 'messaging', logoId: 'telegram', isPopular: true },
  { id: 'ds', name: 'Discord', category: 'messaging', logoId: 'discord', isPopular: true },
  { id: 'si', name: 'Signal', category: 'messaging', logoId: 'signal' },
  { id: 'vi', name: 'Viber', category: 'messaging', logoId: 'viber' },
  { id: 'im', name: 'Imo', category: 'messaging', logoId: 'imo' },
  { id: 'wb', name: 'WeChat', category: 'messaging', logoId: 'wechat' },
  { id: 'me', name: 'LINE', category: 'messaging', logoId: 'line' },
  { id: 'ka', name: 'KakaoTalk', category: 'messaging', logoId: 'kakaotalk' },
  { id: 'sk', name: 'Skype', category: 'messaging', logoId: 'skype' },
  { id: 'zm', name: 'Zoom', category: 'messaging', logoId: 'zoom' },
  { id: 'ic', name: 'ICQ', category: 'messaging', logoId: 'icq' },

  // Social
  { id: 'ig', name: 'Instagram + Threads', category: 'social', logoId: 'instagram', isPopular: true },
  { id: 'lf', name: 'TikTok', category: 'social', logoId: 'tiktok', isPopular: true },
  { id: 'fb', name: 'Facebook', category: 'social', logoId: 'facebook', isPopular: true },
  { id: 'tw', name: 'X (Twitter)', category: 'social', logoId: 'twitter', isPopular: true },
  { id: 'sn', name: 'Snapchat', category: 'social', logoId: 'snapchat', isPopular: true },
  { id: 'lk', name: 'LinkedIn', category: 'social', logoId: 'linkedin', isPopular: true },
  { id: 'rd', name: 'Reddit', category: 'social', logoId: 'reddit', isPopular: true },
  { id: 'pi', name: 'Pinterest', category: 'social', logoId: 'pinterest' },
  { id: 'vk', name: 'VKontakte', category: 'social', logoId: 'vkontakte' },
  { id: 'ok', name: 'Odnoklassniki', category: 'social', logoId: 'odnoklassniki' },
  { id: 'tu', name: 'Tumblr', category: 'social', logoId: 'tumblr' },
  { id: 'th', name: 'Threads', category: 'social', logoId: 'threads' },
  { id: 'ks', name: 'Kuaishou', category: 'social', logoId: 'kuaishou' },
  { id: 'wb_s', name: 'Weibo', category: 'social', logoId: 'weibo' },

  // Gaming
  { id: 'st', name: 'Steam', category: 'gaming', logoId: 'steam', isPopular: true },
  { id: 'ro', name: 'Roblox', category: 'gaming', logoId: 'roblox', isPopular: true },
  { id: 'blz', name: 'Blizzard / Battle.net', category: 'gaming', logoId: 'battlenet', isPopular: true },
  { id: 'pg', name: 'PUBG Mobile', category: 'gaming', logoId: 'pubg' },
  { id: 'ep', name: 'Epic Games', category: 'gaming', logoId: 'epicgames' },
  { id: 'ri', name: 'Riot Games / Valorant', category: 'gaming', logoId: 'riotgames' },
  { id: 'ps', name: 'PlayStation Network', category: 'gaming', logoId: 'playstation' },
  { id: 'xb', name: 'Xbox', category: 'gaming', logoId: 'xbox' },
  { id: 'ea', name: 'EA / Origin', category: 'gaming', logoId: 'ea' },
  { id: 'ubi', name: 'Ubisoft', category: 'gaming', logoId: 'ubisoft' },
  { id: 'fc', name: 'Faceit', category: 'gaming', logoId: 'faceit' },
  { id: 'eft', name: 'Escape from Tarkov', category: 'gaming', logoId: 'tarkov' },
  { id: 'sc', name: 'Supercell / Clash', category: 'gaming', logoId: 'supercell' },
  { id: 'gar', name: 'Garena / Free Fire', category: 'gaming', logoId: 'garena' },

  // Shopping & Marketplaces
  { id: 'am', name: 'Amazon', category: 'shopping', logoId: 'amazon', isPopular: true },
  { id: 'eb', name: 'eBay', category: 'shopping', logoId: 'ebay' },
  { id: 'al', name: 'AliExpress', category: 'shopping', logoId: 'aliexpress', isPopular: true },
  { id: 'ab', name: 'Alibaba', category: 'shopping', logoId: 'alibaba' },
  { id: 'sh', name: 'Shopee', category: 'shopping', logoId: 'shopee' },
  { id: 'lz', name: 'Lazada', category: 'shopping', logoId: 'lazada' },
  { id: 'wm', name: 'Walmart', category: 'shopping', logoId: 'walmart' },
  { id: 'ni', name: 'Nike', category: 'shopping', logoId: 'nike' },
  { id: 'shn', name: 'SHEIN', category: 'shopping', logoId: 'shein' },
  { id: 'tm', name: 'Temu', category: 'shopping', logoId: 'temu' },
  { id: 'ets', name: 'Etsy', category: 'shopping', logoId: 'etsy' },
  { id: 'asos', name: 'ASOS', category: 'shopping', logoId: 'asos' },
  { id: 'tb', name: 'Taobao', category: 'shopping', logoId: 'taobao' },

  // Finance & Payments
  { id: 'pm', name: 'PayPal', category: 'finance', logoId: 'paypal', isPopular: true },
  { id: 'gp', name: 'Google Pay', category: 'finance', logoId: 'googlepay' },
  { id: 'ap_pay', name: 'Apple Pay', category: 'finance', logoId: 'applepay' },
  { id: 'ws', name: 'Wise', category: 'finance', logoId: 'wise', isPopular: true },
  { id: 'rv', name: 'Revolut', category: 'finance', logoId: 'revolut' },
  { id: 'py', name: 'Payoneer', category: 'finance', logoId: 'payoneer' },
  { id: 'sq', name: 'Cash App', category: 'finance', logoId: 'cashapp', isPopular: true },
  { id: 'str', name: 'Stripe', category: 'finance', logoId: 'stripe' },
  { id: 'skr', name: 'Skrill', category: 'finance', logoId: 'skrill' },
  { id: 'bn', name: 'Binance', category: 'finance', logoId: 'binance', isPopular: true },
  { id: 'cb', name: 'Coinbase', category: 'finance', logoId: 'coinbase' },
  { id: 'by', name: 'Bybit', category: 'finance', logoId: 'bybit' },
  { id: 'okx', name: 'OKX', category: 'finance', logoId: 'okx' },
  { id: 'bg', name: 'Bitget', category: 'finance', logoId: 'bitget' },
  { id: 'ku', name: 'KuCoin', category: 'finance', logoId: 'kucoin' },

  // Dating
  { id: 'oi', name: 'Tinder', category: 'dating', logoId: 'tinder', isPopular: true },
  { id: 'bl', name: 'Badoo', category: 'dating', logoId: 'badoo' },
  { id: 'bu', name: 'Bumble', category: 'dating', logoId: 'bumble', isPopular: true },
  { id: 'hp', name: 'Hinge', category: 'dating', logoId: 'hinge' },
  { id: 'ja', name: 'Pure', category: 'dating', logoId: 'pure' },
  { id: 'gr', name: 'Grindr', category: 'dating', logoId: 'grindr' },
  { id: 'okc', name: 'OkCupid', category: 'dating', logoId: 'okcupid' },
  { id: 'zoo', name: 'Zoosk', category: 'dating', logoId: 'zoosk' },
  { id: 'pof', name: 'Plenty of Fish', category: 'dating', logoId: 'pof' },

  // Food & Delivery
  { id: 'ue', name: 'Uber Eats', category: 'food', logoId: 'ubereats', isPopular: true },
  { id: 'dd', name: 'DoorDash', category: 'food', logoId: 'doordash', isPopular: true },
  { id: 'grb', name: 'Grubhub', category: 'food', logoId: 'grubhub' },
  { id: 'fp', name: 'Foodpanda', category: 'food', logoId: 'foodpanda' },
  { id: 'bf', name: 'Bolt Food', category: 'food', logoId: 'boltfood' },
  { id: 'dl', name: 'Deliveroo', category: 'food', logoId: 'deliveroo' },
  { id: 'wlt', name: 'Wolt', category: 'food', logoId: 'wolt' },
  { id: 'je', name: 'Just Eat', category: 'food', logoId: 'justeat' },
  { id: 'zom', name: 'Zomato', category: 'food', logoId: 'zomato' },
  { id: 'swg', name: 'Swiggy', category: 'food', logoId: 'swiggy' },

  // AI & Tech
  { id: 'go', name: 'Google, Gmail, YouTube', category: 'ai', logoId: 'google', isPopular: true },
  { id: 'mm', name: 'Microsoft + Outlook', category: 'ai', logoId: 'microsoft', isPopular: true },
  { id: 'ap', name: 'Apple / iCloud', category: 'ai', logoId: 'apple', isPopular: true },
  { id: 'oa', name: 'OpenAI / ChatGPT', category: 'ai', logoId: 'openai', isPopular: true },
  { id: 'an', name: 'Claude / Anthropic', category: 'ai', logoId: 'anthropic', isPopular: true },
  { id: 'nf', name: 'Netflix', category: 'ai', logoId: 'netflix', isPopular: true },
  { id: 'sp', name: 'Spotify', category: 'ai', logoId: 'spotify', isPopular: true },
  { id: 'dz', name: 'Deezer', category: 'ai', logoId: 'deezer' },
  { id: 'yh', name: 'Yahoo', category: 'ai', logoId: 'yahoo' },
  { id: 'pr', name: 'ProtonMail', category: 'ai', logoId: 'proton' },
  { id: 'ao', name: 'AOL', category: 'ai', logoId: 'aol' },
  { id: 'ya', name: 'Yandex', category: 'ai', logoId: 'yandex' },
  { id: 'nav', name: 'Naver', category: 'ai', logoId: 'naver' },
  { id: 'bai', name: 'Baidu', category: 'ai', logoId: 'baidu' },

  // Other & Rides & Betting
  { id: 'ub', name: 'Uber', category: 'other', logoId: 'uber', isPopular: true },
  { id: 'bt', name: 'Bolt', category: 'other', logoId: 'bolt', isPopular: true },
  { id: 'ly', name: 'Lyft', category: 'other', logoId: 'lyft' },
  { id: 'gb', name: 'Grab', category: 'other', logoId: 'grab' },
  { id: 'idr', name: 'inDrive', category: 'other', logoId: 'indrive' },
  { id: 'b365', name: 'Bet365', category: 'other', logoId: 'bet365' },
  { id: '1x', name: '1xBet', category: 'other', logoId: '1xbet' },
  { id: 'sb', name: 'SportyBet', category: 'other', logoId: 'sportybet' },
  { id: 'b9j', name: 'Bet9ja', category: 'other', logoId: 'bet9ja' },
  { id: 'stk', name: 'Stake', category: 'other', logoId: 'stake' },
  { id: 'abn', name: 'Airbnb', category: 'other', logoId: 'airbnb' },
  { id: 'bk', name: 'Booking.com', category: 'other', logoId: 'booking' },
  { id: 'cv', name: 'Canva', category: 'other', logoId: 'canva' },
  { id: 'cp', name: 'CapCut', category: 'other', logoId: 'capcut' },
  { id: 'ot', name: 'Any Other Service', category: 'other', logoId: 'other' },
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
