import { NextRequest, NextResponse } from 'next/server';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const RETAIL_MULT: Record<string, number> = {
  economy: 5.0,
  standard: 4.0,
  fast: 3.0,
  premium: 2.0,
};

const DEFAULT_RATE = 1380;

const ISO_TO_GRIZZLY: Record<string, string[]> = {
  US: ['187', '12'],
  USA: ['187', '12'],
  GB: ['16'],
  UK: ['16'],
  IN: ['22'],
  ID: ['6'],
  VN: ['10'],
  BR: ['73'],
  UA: ['1'],
  CA: ['36'],
  DE: ['43'],
  NL: ['48'],
  ES: ['56'],
  FR: ['78'],
  IT: ['86'],
  PH: ['4', '117'],
  AU: ['175'],
  TH: ['52'],
  TR: ['62'],
  MX: ['54'],
  CO: ['33'],
  ZA: ['31'],
  NG: ['19'],
  PL: ['15'],
  RO: ['32'],
  SE: ['46'],
  AT: ['50'],
  CZ: ['63'],
  BE: ['82'],
  HU: ['84'],
  GR: ['129'],
  FI: ['141'],
  NO: ['163'],
  MA: ['37'],
  SA: ['53'],
  AE: ['95'],
  BD: ['60'],
  PK: ['66'],
  MY: ['7'],
  KE: ['8'],
  GH: ['38'],
  NZ: ['67'],
  TW: ['55'],
  HK: ['14'],
  IE: ['23'],
  AR: ['39'],
  PE: ['65'],
  EG: ['21'],
  PT: ['114'],
};

const GRIZZLY_TO_ISO: Record<
  string,
  { code: string; name: string; flag: string; dial: string }
> = {
  '0': { code: 'RU', name: 'Russia', flag: '🇷🇺', dial: '+7' },
  '1': { code: 'UA', name: 'Ukraine', flag: '🇺🇦', dial: '+380' },
  '2': { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', dial: '+7' },
  '3': { code: 'CN', name: 'China', flag: '🇨🇳', dial: '+86' },
  '4': { code: 'PH', name: 'Philippines', flag: '🇵🇭', dial: '+63' },
  '6': { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dial: '+62' },
  '7': { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dial: '+60' },
  '8': { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '+254' },
  '9': { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', dial: '+255' },
  '10': { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dial: '+84' },
  '12': { code: 'US', name: 'United States (Virtual)', flag: '🇺🇸', dial: '+1' },
  '13': { code: 'IL', name: 'Israel', flag: '🇮🇱', dial: '+972' },
  '14': { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', dial: '+852' },
  '15': { code: 'PL', name: 'Poland', flag: '🇵🇱', dial: '+48' },
  '16': { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44' },
  '19': { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '+234' },
  '21': { code: 'EG', name: 'Egypt', flag: '🇪🇬', dial: '+20' },
  '22': { code: 'IN', name: 'India', flag: '🇮🇳', dial: '+91' },
  '23': { code: 'IE', name: 'Ireland', flag: '🇮🇪', dial: '+353' },
  '31': { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dial: '+27' },
  '32': { code: 'RO', name: 'Romania', flag: '🇷🇴', dial: '+40' },
  '33': { code: 'CO', name: 'Colombia', flag: '🇨🇴', dial: '+57' },
  '36': { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1' },
  '37': { code: 'MA', name: 'Morocco', flag: '🇲🇦', dial: '+212' },
  '38': { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '+233' },
  '39': { code: 'AR', name: 'Argentina', flag: '🇦🇷', dial: '+54' },
  '43': { code: 'DE', name: 'Germany', flag: '🇩🇪', dial: '+49' },
  '46': { code: 'SE', name: 'Sweden', flag: '🇸🇪', dial: '+46' },
  '48': { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dial: '+31' },
  '50': { code: 'AT', name: 'Austria', flag: '🇦🇹', dial: '+43' },
  '52': { code: 'TH', name: 'Thailand', flag: '🇹🇭', dial: '+66' },
  '53': { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dial: '+966' },
  '54': { code: 'MX', name: 'Mexico', flag: '🇲🇽', dial: '+52' },
  '55': { code: 'TW', name: 'Taiwan', flag: '🇹🇼', dial: '+886' },
  '56': { code: 'ES', name: 'Spain', flag: '🇪🇸', dial: '+34' },
  '60': { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dial: '+880' },
  '62': { code: 'TR', name: 'Turkey', flag: '🇹🇷', dial: '+90' },
  '63': { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', dial: '+420' },
  '65': { code: 'PE', name: 'Peru', flag: '🇵🇪', dial: '+51' },
  '66': { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dial: '+92' },
  '67': { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dial: '+64' },
  '73': { code: 'BR', name: 'Brazil', flag: '🇧🇷', dial: '+55' },
  '78': { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33' },
  '82': { code: 'BE', name: 'Belgium', flag: '🇧🇪', dial: '+32' },
  '84': { code: 'HU', name: 'Hungary', flag: '🇭🇺', dial: '+36' },
  '86': { code: 'IT', name: 'Italy', flag: '🇮🇹', dial: '+39' },
  '95': { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial: '+971' },
  '114': { code: 'PT', name: 'Portugal', flag: '🇵🇹', dial: '+351' },
  '117': { code: 'PH', name: 'Philippines', flag: '🇵🇭', dial: '+63' },
  '129': { code: 'GR', name: 'Greece', flag: '🇬🇷', dial: '+30' },
  '141': { code: 'FI', name: 'Finland', flag: '🇫🇮', dial: '+358' },
  '163': { code: 'NO', name: 'Norway', flag: '🇳🇴', dial: '+47' },
  '175': { code: 'AU', name: 'Australia', flag: '🇦🇺', dial: '+61' },
  '187': { code: 'US', name: 'United States', flag: '🇺🇸', dial: '+1' },
};

const SERVICE_META: Record<string, { category: string; logoId?: string }> = {
  wa: { category: 'messaging', logoId: 'whatsapp' },
  tg: { category: 'messaging', logoId: 'telegram' },
  ds: { category: 'messaging', logoId: 'discord' },
  si: { category: 'messaging', logoId: 'signal' },
  vi: { category: 'messaging', logoId: 'viber' },
  im: { category: 'messaging', logoId: 'imo' },
  wb: { category: 'messaging', logoId: 'wechat' },
  me: { category: 'messaging', logoId: 'line' },
  ka: { category: 'messaging', logoId: 'kakaotalk' },
  sk: { category: 'messaging', logoId: 'skype' },
  zm: { category: 'messaging', logoId: 'zoom' },
  ic: { category: 'messaging', logoId: 'icq' },
  ig: { category: 'social', logoId: 'instagram' },
  lf: { category: 'social', logoId: 'tiktok' },
  fb: { category: 'social', logoId: 'facebook' },
  tw: { category: 'social', logoId: 'twitter' },
  sn: { category: 'social', logoId: 'snapchat' },
  lk: { category: 'social', logoId: 'linkedin' },
  rd: { category: 'social', logoId: 'reddit' },
  pi: { category: 'social', logoId: 'pinterest' },
  vk: { category: 'social', logoId: 'vkontakte' },
  ok: { category: 'social', logoId: 'odnoklassniki' },
  tu: { category: 'social', logoId: 'tumblr' },
  th: { category: 'social', logoId: 'threads' },
  st: { category: 'gaming', logoId: 'steam' },
  ro: { category: 'gaming', logoId: 'roblox' },
  blz: { category: 'gaming', logoId: 'battlenet' },
  pg: { category: 'gaming', logoId: 'pubg' },
  ep: { category: 'gaming', logoId: 'epicgames' },
  ri: { category: 'gaming', logoId: 'riotgames' },
  ps: { category: 'gaming', logoId: 'playstation' },
  xb: { category: 'gaming', logoId: 'xbox' },
  ea: { category: 'gaming', logoId: 'ea' },
  ubi: { category: 'gaming', logoId: 'ubisoft' },
  fc: { category: 'gaming', logoId: 'faceit' },
  eft: { category: 'gaming', logoId: 'tarkov' },
  am: { category: 'shopping', logoId: 'amazon' },
  eb: { category: 'shopping', logoId: 'ebay' },
  al: { category: 'shopping', logoId: 'aliexpress' },
  ab: { category: 'shopping', logoId: 'alibaba' },
  sh: { category: 'shopping', logoId: 'shopee' },
  lz: { category: 'shopping', logoId: 'lazada' },
  wm: { category: 'shopping', logoId: 'walmart' },
  ni: { category: 'shopping', logoId: 'nike' },
  shn: { category: 'shopping', logoId: 'shein' },
  tm: { category: 'shopping', logoId: 'temu' },
  ets: { category: 'shopping', logoId: 'etsy' },
  pm: { category: 'finance', logoId: 'paypal' },
  gp: { category: 'finance', logoId: 'googlepay' },
  ws: { category: 'finance', logoId: 'wise' },
  rv: { category: 'finance', logoId: 'revolut' },
  py: { category: 'finance', logoId: 'payoneer' },
  sq: { category: 'finance', logoId: 'cashapp' },
  str: { category: 'finance', logoId: 'stripe' },
  bn: { category: 'finance', logoId: 'binance' },
  cb: { category: 'finance', logoId: 'coinbase' },
  by: { category: 'finance', logoId: 'bybit' },
  okx: { category: 'finance', logoId: 'okx' },
  bg: { category: 'finance', logoId: 'bitget' },
  ku: { category: 'finance', logoId: 'kucoin' },
  oi: { category: 'dating', logoId: 'tinder' },
  bl: { category: 'dating', logoId: 'badoo' },
  bu: { category: 'dating', logoId: 'bumble' },
  hp: { category: 'dating', logoId: 'hinge' },
  ja: { category: 'dating', logoId: 'pure' },
  gr: { category: 'dating', logoId: 'grindr' },
  okc: { category: 'dating', logoId: 'okcupid' },
  ue: { category: 'food', logoId: 'ubereats' },
  dd: { category: 'food', logoId: 'doordash' },
  grb: { category: 'food', logoId: 'grubhub' },
  fp: { category: 'food', logoId: 'foodpanda' },
  bf: { category: 'food', logoId: 'boltfood' },
  dl: { category: 'food', logoId: 'deliveroo' },
  go: { category: 'ai', logoId: 'google' },
  mm: { category: 'ai', logoId: 'microsoft' },
  ap: { category: 'ai', logoId: 'apple' },
  oa: { category: 'ai', logoId: 'openai' },
  an: { category: 'ai', logoId: 'anthropic' },
  nf: { category: 'ai', logoId: 'netflix' },
  sp: { category: 'ai', logoId: 'spotify' },
  dz: { category: 'ai', logoId: 'deezer' },
  yh: { category: 'ai', logoId: 'yahoo' },
  pr: { category: 'ai', logoId: 'proton' },
  ao: { category: 'ai', logoId: 'aol' },
  ya: { category: 'ai', logoId: 'yandex' },
  nav: { category: 'ai', logoId: 'naver' },
  bai: { category: 'ai', logoId: 'baidu' },
  ub: { category: 'other', logoId: 'uber' },
  bt: { category: 'other', logoId: 'bolt' },
  ly: { category: 'other', logoId: 'lyft' },
  gb: { category: 'other', logoId: 'grab' },
  b365: { category: 'other', logoId: 'bet365' },
  '1x': { category: 'other', logoId: '1xbet' },
  sb: { category: 'other', logoId: 'sportybet' },
  b9j: { category: 'other', logoId: 'bet9ja' },
  abn: { category: 'other', logoId: 'airbnb' },
  bk: { category: 'other', logoId: 'booking' },
  cv: { category: 'other', logoId: 'canva' },
  cp: { category: 'other', logoId: 'capcut' },
  ot: { category: 'other' },
};
const MASTER_SERVICES_FALLBACK: Array<{
  id: string;
  code: string;
  name: string;
  display_name: string;
  is_popular: boolean;
}> = [
  // Messaging
  { id: 'wa', code: 'wa', name: 'WhatsApp', display_name: 'WhatsApp', is_popular: true },
  { id: 'tg', code: 'tg', name: 'Telegram', display_name: 'Telegram', is_popular: true },
  { id: 'ds', code: 'ds', name: 'Discord', display_name: 'Discord', is_popular: true },
  { id: 'si', code: 'si', name: 'Signal', display_name: 'Signal', is_popular: false },
  { id: 'vi', code: 'vi', name: 'Viber', display_name: 'Viber', is_popular: false },
  { id: 'im', code: 'im', name: 'Imo', display_name: 'Imo', is_popular: false },
  { id: 'wb', code: 'wb', name: 'WeChat', display_name: 'WeChat', is_popular: false },
  { id: 'me', code: 'me', name: 'LINE', display_name: 'LINE', is_popular: false },
  { id: 'ka', code: 'ka', name: 'KakaoTalk', display_name: 'KakaoTalk', is_popular: false },
  { id: 'sk', code: 'sk', name: 'Skype', display_name: 'Skype', is_popular: false },
  { id: 'zm', code: 'zm', name: 'Zoom', display_name: 'Zoom', is_popular: false },
  { id: 'ic', code: 'ic', name: 'ICQ', display_name: 'ICQ', is_popular: false },

  // Social
  { id: 'ig', code: 'ig', name: 'Instagram', display_name: 'Instagram + Threads', is_popular: true },
  { id: 'lf', code: 'lf', name: 'TikTok', display_name: 'TikTok', is_popular: true },
  { id: 'fb', code: 'fb', name: 'Facebook', display_name: 'Facebook', is_popular: true },
  { id: 'tw', code: 'tw', name: 'Twitter', display_name: 'X (Twitter)', is_popular: true },
  { id: 'sn', code: 'sn', name: 'Snapchat', display_name: 'Snapchat', is_popular: true },
  { id: 'lk', code: 'lk', name: 'LinkedIn', display_name: 'LinkedIn', is_popular: true },
  { id: 'rd', code: 'rd', name: 'Reddit', display_name: 'Reddit', is_popular: true },
  { id: 'pi', code: 'pi', name: 'Pinterest', display_name: 'Pinterest', is_popular: false },
  { id: 'vk', code: 'vk', name: 'VKontakte', display_name: 'VKontakte', is_popular: false },
  { id: 'ok', code: 'ok', name: 'Odnoklassniki', display_name: 'Odnoklassniki', is_popular: false },
  { id: 'tu', code: 'tu', name: 'Tumblr', display_name: 'Tumblr', is_popular: false },
  { id: 'th', code: 'th', name: 'Threads', display_name: 'Threads', is_popular: false },

  // Gaming
  { id: 'st', code: 'st', name: 'Steam', display_name: 'Steam', is_popular: true },
  { id: 'ro', code: 'ro', name: 'Roblox', display_name: 'Roblox', is_popular: true },
  { id: 'blz', code: 'blz', name: 'Blizzard', display_name: 'Blizzard / Battle.net', is_popular: true },
  { id: 'pg', code: 'pg', name: 'PUBG', display_name: 'PUBG Mobile', is_popular: false },
  { id: 'ep', code: 'ep', name: 'Epic Games', display_name: 'Epic Games', is_popular: false },
  { id: 'ri', code: 'ri', name: 'Riot Games', display_name: 'Riot Games / Valorant', is_popular: false },
  { id: 'ps', code: 'ps', name: 'PlayStation', display_name: 'PlayStation Network', is_popular: false },
  { id: 'xb', code: 'xb', name: 'Xbox', display_name: 'Xbox', is_popular: false },
  { id: 'ea', code: 'ea', name: 'EA', display_name: 'EA / Origin', is_popular: false },
  { id: 'ubi', code: 'ubi', name: 'Ubisoft', display_name: 'Ubisoft', is_popular: false },
  { id: 'fc', code: 'fc', name: 'Faceit', display_name: 'Faceit', is_popular: false },
  { id: 'eft', code: 'eft', name: 'Tarkov', display_name: 'Escape from Tarkov', is_popular: false },

  // Shopping
  { id: 'am', code: 'am', name: 'Amazon', display_name: 'Amazon', is_popular: true },
  { id: 'eb', code: 'eb', name: 'eBay', display_name: 'eBay', is_popular: false },
  { id: 'al', code: 'al', name: 'AliExpress', display_name: 'AliExpress', is_popular: true },
  { id: 'ab', code: 'ab', name: 'Alibaba', display_name: 'Alibaba', is_popular: false },
  { id: 'sh', code: 'sh', name: 'Shopee', display_name: 'Shopee', is_popular: false },
  { id: 'lz', code: 'lz', name: 'Lazada', display_name: 'Lazada', is_popular: false },
  { id: 'wm', code: 'wm', name: 'Walmart', display_name: 'Walmart', is_popular: false },
  { id: 'ni', code: 'ni', name: 'Nike', display_name: 'Nike', is_popular: false },
  { id: 'shn', code: 'shn', name: 'SHEIN', display_name: 'SHEIN', is_popular: false },
  { id: 'tm', code: 'tm', name: 'Temu', display_name: 'Temu', is_popular: false },
  { id: 'ets', code: 'ets', name: 'Etsy', display_name: 'Etsy', is_popular: false },

  // Finance
  { id: 'pm', code: 'pm', name: 'PayPal', display_name: 'PayPal', is_popular: true },
  { id: 'gp', code: 'gp', name: 'Google Pay', display_name: 'Google Pay', is_popular: false },
  { id: 'ws', code: 'ws', name: 'Wise', display_name: 'Wise', is_popular: true },
  { id: 'rv', code: 'rv', name: 'Revolut', display_name: 'Revolut', is_popular: false },
  { id: 'py', code: 'py', name: 'Payoneer', display_name: 'Payoneer', is_popular: false },
  { id: 'sq', code: 'sq', name: 'Cash App', display_name: 'Cash App', is_popular: true },
  { id: 'str', code: 'str', name: 'Stripe', display_name: 'Stripe', is_popular: false },
  { id: 'bn', code: 'bn', name: 'Binance', display_name: 'Binance', is_popular: true },
  { id: 'cb', code: 'cb', name: 'Coinbase', display_name: 'Coinbase', is_popular: false },
  { id: 'by', code: 'by', name: 'Bybit', display_name: 'Bybit', is_popular: false },
  { id: 'okx', code: 'okx', name: 'OKX', display_name: 'OKX', is_popular: false },
  { id: 'bg', code: 'bg', name: 'Bitget', display_name: 'Bitget', is_popular: false },
  { id: 'ku', code: 'ku', name: 'KuCoin', display_name: 'KuCoin', is_popular: false },

  // Dating
  { id: 'oi', code: 'oi', name: 'Tinder', display_name: 'Tinder', is_popular: true },
  { id: 'bl', code: 'bl', name: 'Badoo', display_name: 'Badoo', is_popular: false },
  { id: 'bu', code: 'bu', name: 'Bumble', display_name: 'Bumble', is_popular: true },
  { id: 'hp', code: 'hp', name: 'Hinge', display_name: 'Hinge', is_popular: false },
  { id: 'ja', code: 'ja', name: 'Pure', display_name: 'Pure', is_popular: false },
  { id: 'gr', code: 'gr', name: 'Grindr', display_name: 'Grindr', is_popular: false },
  { id: 'okc', code: 'okc', name: 'OkCupid', display_name: 'OkCupid', is_popular: false },

  // Food
  { id: 'ue', code: 'ue', name: 'Uber Eats', display_name: 'Uber Eats', is_popular: true },
  { id: 'dd', code: 'dd', name: 'DoorDash', display_name: 'DoorDash', is_popular: true },
  { id: 'grb', code: 'grb', name: 'Grubhub', display_name: 'Grubhub', is_popular: false },
  { id: 'fp', code: 'fp', name: 'Foodpanda', display_name: 'Foodpanda', is_popular: false },
  { id: 'bf', code: 'bf', name: 'Bolt Food', display_name: 'Bolt Food', is_popular: false },
  { id: 'dl', code: 'dl', name: 'Deliveroo', display_name: 'Deliveroo', is_popular: false },

  // AI & Tech
  { id: 'go', code: 'go', name: 'Google', display_name: 'Google, Gmail, YouTube', is_popular: true },
  { id: 'mm', code: 'mm', name: 'Microsoft', display_name: 'Microsoft + Outlook', is_popular: true },
  { id: 'ap', code: 'ap', name: 'Apple', display_name: 'Apple / iCloud', is_popular: true },
  { id: 'oa', code: 'oa', name: 'OpenAI', display_name: 'OpenAI / ChatGPT', is_popular: true },
  { id: 'an', code: 'an', name: 'Claude', display_name: 'Claude / Anthropic', is_popular: true },
  { id: 'nf', code: 'nf', name: 'Netflix', display_name: 'Netflix', is_popular: true },
  { id: 'sp', code: 'sp', name: 'Spotify', display_name: 'Spotify', is_popular: true },
  { id: 'dz', code: 'dz', name: 'Deezer', display_name: 'Deezer', is_popular: false },
  { id: 'yh', code: 'yh', name: 'Yahoo', display_name: 'Yahoo', is_popular: false },
  { id: 'pr', code: 'pr', name: 'ProtonMail', display_name: 'ProtonMail', is_popular: false },
  { id: 'ao', code: 'ao', name: 'AOL', display_name: 'AOL', is_popular: false },
  { id: 'ya', code: 'ya', name: 'Yandex', display_name: 'Yandex', is_popular: false },
  { id: 'nav', code: 'nav', name: 'Naver', display_name: 'Naver', is_popular: false },
  { id: 'bai', code: 'bai', name: 'Baidu', display_name: 'Baidu', is_popular: false },

  // Other
  { id: 'ub', code: 'ub', name: 'Uber', display_name: 'Uber', is_popular: true },
  { id: 'bt', code: 'bt', name: 'Bolt', display_name: 'Bolt', is_popular: true },
  { id: 'ly', code: 'ly', name: 'Lyft', display_name: 'Lyft', is_popular: false },
  { id: 'gb', code: 'gb', name: 'Grab', display_name: 'Grab', is_popular: false },
  { id: 'b365', code: 'b365', name: 'Bet365', display_name: 'Bet365', is_popular: false },
  { id: '1x', code: '1x', name: '1xBet', display_name: '1xBet', is_popular: false },
  { id: 'sb', code: 'sb', name: 'SportyBet', display_name: 'SportyBet', is_popular: false },
  { id: 'b9j', code: 'b9j', name: 'Bet9ja', display_name: 'Bet9ja', is_popular: false },
  { id: 'abn', code: 'abn', name: 'Airbnb', display_name: 'Airbnb', is_popular: false },
  { id: 'bk', code: 'bk', name: 'Booking.com', display_name: 'Booking.com', is_popular: false },
  { id: 'cv', code: 'cv', name: 'Canva', display_name: 'Canva', is_popular: false },
  { id: 'cp', code: 'cp', name: 'CapCut', display_name: 'CapCut', is_popular: false },
  { id: 'ot', code: 'ot', name: 'Other', display_name: 'Any Other Service', is_popular: false },
];

type PricingSettings = {
  base_naira_rate?: number;
  retail_economy?: number;
  retail_standard?: number;
  retail_fast?: number;
  retail_premium?: number;
};

async function loadSettings(): Promise<{ rate: number; mult: Record<string, number> }> {
  try {
    const rows = (await sbSelect('vn_pricing_settings', 'select=*&limit=1')) as PricingSettings[];
    const s = rows?.[0];
    if (!s) return { rate: DEFAULT_RATE, mult: RETAIL_MULT };
    return {
      rate: Number(s.base_naira_rate) || DEFAULT_RATE,
      mult: {
        economy: Number(s.retail_economy) || RETAIL_MULT.economy,
        standard: Number(s.retail_standard) || RETAIL_MULT.standard,
        fast: Number(s.retail_fast) || RETAIL_MULT.fast,
        premium: Number(s.retail_premium) || RETAIL_MULT.premium,
      },
    };
  } catch {
    return { rate: DEFAULT_RATE, mult: RETAIL_MULT };
  }
}

function sellNgn(costUsd: number, tier: string, rate: number, mult: Record<string, number>) {
  const m = mult[tier] ?? 2;
  return Math.ceil(costUsd * rate * m);
}

function poolTier(poolId: string): string {
  if (poolId.includes('economy')) return 'economy';
  if (poolId.includes('standard')) return 'standard';
  if (poolId.includes('fast')) return 'fast';
  return 'premium';
}

function poolRegion(poolId: string): 'usa' | 'worldwide' {
  return poolId.startsWith('usa') ? 'usa' : 'worldwide';
}

async function loadAllPrices(tier: string | null) {
  const all: Array<{ service_id: string; country_id: string; cost_usd: number; stock: number }> =
    [];
  const pageSize = 1000;
  for (let offset = 0; offset < 200000; offset += pageSize) {
    let q = `select=service_id,country_id,cost_usd,stock&is_available=eq.true&order=id.asc&limit=${pageSize}&offset=${offset}`;
    if (tier) q += `&tier=eq.${tier}`;
    const rows = (await sbSelect('vn_price_options', q)) as Array<{
      service_id: string;
      country_id: string;
      cost_usd: number;
      stock: number;
    }>;
    if (!rows || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

async function loadAllServices() {
  const all: Array<{
    id: string;
    code: string;
    name: string;
    display_name: string;
    is_popular: boolean;
  }> = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 20000; offset += pageSize) {
    const rows = (await sbSelect(
      'vn_services',
      `select=id,code,name,display_name,is_popular&is_active=eq.true&order=code.asc&limit=${pageSize}&offset=${offset}`,
    )) as Array<{
      id: string;
      code: string;
      name: string;
      display_name: string;
      is_popular: boolean;
    }>;
    if (!rows || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

export async function GET(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: 'Database not configured' }, { status: 503 });
  }

  const mode = (req.nextUrl.searchParams.get('mode') || 'services').toLowerCase();
  const poolId = (req.nextUrl.searchParams.get('pool') || '').toLowerCase();
  const serviceCode = (req.nextUrl.searchParams.get('service') || '').toLowerCase();
  const countryParam = (req.nextUrl.searchParams.get('country') || '').toUpperCase();
  const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();

  try {
    const { rate, mult } = await loadSettings();

    if (mode === 'services') {
      const tier = poolId ? poolTier(poolId) : 'economy';
      const region = poolId ? poolRegion(poolId) : null;

      // Pool base cost fallback for instant sub-50ms response
      const defaultTierCost: Record<string, number> = {
        economy: 0.05,
        standard: 0.15,
        fast: 0.35,
        premium: 0.65,
      };
      const fallbackCost = defaultTierCost[tier] ?? 0.15;

      // Use fast master services list so catalog responds in < 30ms instead of 30s
      let list = MASTER_SERVICES_FALLBACK.map((s) => {
        const meta = SERVICE_META[s.code] || { category: 'other' };
        return {
          id: s.code,
          code: s.code,
          name: s.display_name || s.name,
          category: meta.category,
          logoId: meta.logoId || s.code,
          isPopular: Boolean(s.is_popular),
          fromNgn: sellNgn(fallbackCost, tier, rate, mult),
          fromUsd: fallbackCost,
        };
      });

      list.sort((a, b) => {
        if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      if (q) {
        list = list.filter(
          (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
        );
      }

      const res = NextResponse.json({
        ok: true,
        mode: 'services',
        pool: poolId || null,
        tier,
        region,
        count: list.length,
        rate,
        services: list,
      });
      res.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
      return res;
    }

    if (mode === 'countries') {
      if (!serviceCode || !poolId) {
        return NextResponse.json({ ok: false, reason: 'service and pool required' }, { status: 400 });
      }
      const tier = poolTier(poolId);
      const region = poolRegion(poolId);
      const svcRows = (await sbSelect(
        'vn_services',
        `code=eq.${encodeURIComponent(serviceCode)}&select=id,code,name&limit=1`,
      )) as Array<{ id: string; code: string; name: string }>;
      const svc = svcRows?.[0];
      if (!svc) return NextResponse.json({ ok: true, countries: [], count: 0 });

      const prices = (await sbSelect(
        'vn_price_options',
        `service_id=eq.${svc.id}&is_available=eq.true&select=country_id,cost_usd,stock,tier&limit=20000`,
      )) as Array<{ country_id: string; cost_usd: number; stock: number; tier: string }>;

      const countries = (await sbSelect(
        'vn_countries',
        'select=id,code,display_name,is_virtual&is_active=eq.true&limit=500',
      )) as Array<{ id: string; code: string; display_name: string; is_virtual: boolean }>;
      const byId = new Map(countries.map((c) => [c.id, c]));
      const usaCodes = new Set(['187', '12']);
      const seen = new Map<
        string,
        {
          code: string;
          name: string;
          flag: string;
          dial: string;
          fromNgn: number;
          stock: number;
          grizzlyCode: string;
        }
      >();
      for (const p of prices || []) {
        const c = byId.get(p.country_id);
        if (!c) continue;
        if (region === 'usa' && !usaCodes.has(c.code)) continue;
        if (region === 'worldwide' && usaCodes.has(c.code)) continue;
        const meta = GRIZZLY_TO_ISO[c.code] || {
          code: c.code,
          name: c.display_name,
          flag: '🌍',
          dial: '',
        };
        const key = meta.code + (c.code === '12' ? '-v' : '');
        const rowTier = p.tier || tier;
        const ngn = sellNgn(Number(p.cost_usd), rowTier, rate, mult);
        const prev = seen.get(key);
        if (!prev || ngn < prev.fromNgn) {
          seen.set(key, {
            code: meta.code,
            name: meta.name,
            flag: meta.flag,
            dial: meta.dial,
            fromNgn: ngn,
            stock: Number(p.stock) || 0,
            grizzlyCode: c.code,
          });
        }
      }
      const list = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
      const res = NextResponse.json({
        ok: true,
        mode: 'countries',
        service: serviceCode,
        pool: poolId,
        count: list.length,
        countries: list,
      });
      res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
      return res;
    }

    if (mode === 'prices') {
      if (!serviceCode || !poolId) {
        return NextResponse.json({ ok: false, reason: 'service and pool required' }, { status: 400 });
      }
      const tier = poolTier(poolId);
      const region = poolRegion(poolId);
      const svcRows = (await sbSelect(
        'vn_services',
        `code=eq.${encodeURIComponent(serviceCode)}&select=id,code,name,display_name&limit=1`,
      )) as Array<{ id: string; code: string; name: string; display_name: string }>;
      const svc = svcRows?.[0];
      if (!svc) return NextResponse.json({ ok: true, options: [], count: 0 });
      let grizzlyCountryCodes: string[] = [];
      if (region === 'usa' || countryParam === 'US' || countryParam === 'USA')
        grizzlyCountryCodes = ['187', '12'];
      else if (countryParam && ISO_TO_GRIZZLY[countryParam])
        grizzlyCountryCodes = ISO_TO_GRIZZLY[countryParam];
      else if (countryParam) grizzlyCountryCodes = [countryParam];
      const countries = (await sbSelect(
        'vn_countries',
        'select=id,code,display_name&is_active=eq.true&limit=500',
      )) as Array<{ id: string; code: string; display_name: string }>;
      const countryById = new Map(countries.map((c) => [c.id, c]));
      const countryIds = countries
        .filter((c) => grizzlyCountryCodes.includes(c.code))
        .map((c) => c.id);
      if (countryIds.length === 0) return NextResponse.json({ ok: true, options: [], count: 0 });

      let prices = (await sbSelect(
        'vn_price_options',
        `service_id=eq.${svc.id}&tier=eq.${tier}&is_available=eq.true&select=id,country_id,cost_usd,stock,tier&order=cost_usd.asc&limit=1000`,
      )) as Array<{ id: string; country_id: string; cost_usd: number; stock: number; tier: string }>;
      const idSet = new Set(countryIds);
      let filtered = (prices || []).filter((p) => idSet.has(p.country_id));
      if (filtered.length === 0) {
        prices = (await sbSelect(
          'vn_price_options',
          `service_id=eq.${svc.id}&is_available=eq.true&select=id,country_id,cost_usd,stock,tier&order=cost_usd.asc&limit=1000`,
        )) as Array<{ id: string; country_id: string; cost_usd: number; stock: number; tier: string }>;
        filtered = (prices || []).filter((p) => idSet.has(p.country_id));
      }
      const options = filtered
        .map((p, i) => {
          const cost = Number(p.cost_usd);
          const c = countryById.get(p.country_id);
          const t = p.tier || tier;
          return {
            id: p.id || `opt-${i}`,
            label: `Option ${i + 1}`,
            priceUsd: Math.round(cost * 100) / 100,
            priceNgn: sellNgn(cost, t, rate, mult),
            stock: Number(p.stock) || 0,
            optionId: p.id,
            grizzlyCountry: c?.code || grizzlyCountryCodes[0] || '',
          };
        })
        .filter((o) => o.stock >= 0);
      const byNgn = new Map<number, (typeof options)[0]>();
      for (const o of options) {
        const prev = byNgn.get(o.priceNgn);
        if (!prev || o.stock > prev.stock) byNgn.set(o.priceNgn, o);
      }
      const unique = Array.from(byNgn.values()).sort((a, b) => a.priceNgn - b.priceNgn);
      const res = NextResponse.json({
        ok: true,
        mode: 'prices',
        service: { code: svc.code, name: svc.display_name || svc.name },
        pool: poolId,
        tier,
        country: countryParam || (region === 'usa' ? 'US' : null),
        count: unique.length,
        options: unique.map((o, i) => ({ ...o, label: `Route ${i + 1}`, provider: '' })),
      });
      res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      return res;
    }

    if (mode === 'pools') {
      const prices = await loadAllPrices(null);
      const countries = (await sbSelect('vn_countries', 'select=id,code&limit=500')) as Array<{
        id: string;
        code: string;
      }>;
      const codeById = new Map(countries.map((c) => [c.id, c.code]));
      const usaCodes = new Set(['187', '12']);
      const mins: Record<string, number> = {};
      for (const p of prices) {
        const code = codeById.get(p.country_id);
        if (!code) continue;
        const region = usaCodes.has(code) ? 'usa' : 'worldwide';
        const cost = Number(p.cost_usd);
        for (const t of ['economy', 'standard', 'fast', 'premium'] as const) {
          const pool = `${region}-${t}`;
          const inBand =
            (t === 'economy' && cost < 0.5) ||
            (t === 'standard' && cost >= 0.5 && cost <= 1.0) ||
            (t === 'fast' && cost > 1.0 && cost <= 2.0) ||
            (t === 'premium' && cost > 2.0);
          if (inBand && (!mins[pool] || cost < mins[pool])) mins[pool] = cost;
        }
      }
      const poolIds = [
        'usa-economy',
        'usa-standard',
        'worldwide-economy',
        'worldwide-standard',
        'usa-fast',
        'usa-premium',
        'worldwide-fast',
        'worldwide-premium',
      ];
      const pools = poolIds.map((id) => {
        const t = poolTier(id);
        const cost = mins[id];
        return {
          id,
          fromNgn: cost != null ? sellNgn(cost, t, rate, mult) : null,
          fromUsd: cost != null ? Math.round(cost * 100) / 100 : null,
          live: cost != null,
        };
      });
      return NextResponse.json({ ok: true, mode: 'pools', rate, pools });
    }

    return NextResponse.json(
      { ok: false, reason: 'Unknown mode. Use services | countries | prices | pools' },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : 'Catalog failed' },
      { status: 500 },
    );
  }
}
