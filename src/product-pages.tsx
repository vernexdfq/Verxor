'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Package,
  Search,
  ShieldCheck,
  Wallet,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import { Card, PrimaryButton } from './components/ui';
import './product-pages.css';

/**
 * Buy Accounts & Logs — Verxor marketplace
 * Catalog is structured for multi-provider APIs (AccsZone / AccsMarket / etc.).
 * Grid = short tags. Modal = 100% raw provider description + format + how-to.
 */

export type AccountProduct = {
  id: string;
  platform: string;
  subtype: string;
  title: string;
  shortTitle: string;
  description: string;
  bullets: string[];
  format: string;
  age: string;
  country: string;
  price: number;
  stock: number;
  sold?: number;
  instant: boolean;
  cookies: boolean;
  emailIncluded: boolean;
  twoFa: boolean;
  tags: string[];
  badge?: 'INSTANT' | 'SOFTREG' | 'AGED' | 'PVA';
};

const PLATFORMS = [
  'All',
  'Facebook',
  'Instagram',
  'TikTok',
  'X / Twitter',
  'Telegram',
  'YouTube',
  'Gmail',
  'Discord',
  'LinkedIn',
  'Threads',
  'Reddit',
  'Snapchat',
] as const;

const PROMO_SLIDES = [
  {
    id: 1,
    title: 'Own a Whitelabel Reseller Panel',
    body: 'Sell accounts & logs under your brand.',
    cta: 'Own a Panel →',
    href: '#child-panel',
  },
  {
    id: 2,
    title: 'Guaranteed Replacement Window',
    body: 'All aged logs verified before delivery.',
    cta: 'Browse Stocks →',
    href: '#',
  },
  {
    id: 3,
    title: 'Need a Custom Digital Marketplace?',
    body: 'Build with Verxor Agency.',
    cta: 'Get Started →',
    href: '#',
  },
];

// Realistic catalog shaped like provider product lines.
// Production: replace with live AccsZone / AccsMarket (or other) catalog API.
const CATALOG: AccountProduct[] = [
  {
    id: 'fb-usa-aged',
    platform: 'Facebook',
    subtype: 'USA Aged',
    title: 'Facebook USA · Aged',
    shortTitle: 'Facebook Aged USA',
    description:
      'Aged Facebook accounts registered from USA IP. Email verified where noted. Suitable for page management and advertising warm-up. Cookies included when marked.',
    bullets: [
      'Registered from USA IP',
      'Email verified (email may or may not be included — see listing)',
      'Partially filled profiles',
      '2FA available on selected lots',
      'Cookies included on Instant lots',
    ],
    format: 'login:password | email:password | 2FA key (when set)',
    age: '2-4 yrs',
    country: 'USA',
    price: 6800,
    stock: 174,
    sold: 890,
    instant: true,
    cookies: true,
    emailIncluded: false,
    twoFa: true,
    tags: ['USA', 'Aged', 'Cookies'],
    badge: 'INSTANT',
  },
  {
    id: 'fb-with-page',
    platform: 'Facebook',
    subtype: 'With Page',
    title: 'Facebook · With Page',
    shortTitle: 'Facebook With Page',
    description:
      'Facebook accounts that include an existing page. Useful when you need ready page structure without creating from a cold profile.',
    bullets: [
      'Account includes at least one page',
      'Email status varies by lot',
      'Cookies on Instant delivery',
      'Recommended: use proxy matching registration region',
    ],
    format: 'login:password:email:email_pass (when provided)',
    age: '1-3 yrs',
    country: 'Mixed',
    price: 9200,
    stock: 48,
    sold: 210,
    instant: true,
    cookies: true,
    emailIncluded: true,
    twoFa: false,
    tags: ['With Page', 'Cookies'],
    badge: 'INSTANT',
  },
  {
    id: 'fb-softreg',
    platform: 'Facebook',
    subtype: 'Softreg',
    title: 'Facebook · Softreg',
    shortTitle: 'Facebook Softreg',
    description:
      'Soft-registered Facebook accounts. Lower age / lighter history. Best for volume testing before upgrading to aged stock.',
    bullets: ['Soft registration batch', 'Lower trust than aged lots', 'Instant delivery when in stock'],
    format: 'login:password',
    age: 'New–6 mo',
    country: 'Mixed',
    price: 3200,
    stock: 320,
    sold: 1200,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['Softreg'],
    badge: 'SOFTREG',
  },
  {
    id: 'ig-aged-2019',
    platform: 'Instagram',
    subtype: 'Aged',
    title: 'Instagram · Aged 2019+',
    shortTitle: 'Instagram Aged',
    description:
      'Aged Instagram accounts with email access on selected lots. Higher trust for organic and automation workflows when used with proper proxies.',
    bullets: [
      'Registration year 2019 or earlier on premium lots',
      'Email access included on marked products',
      'Profile fill level varies',
      'Instant delivery',
    ],
    format: 'username:password:email:email_pass',
    age: '2019+',
    country: 'Mixed',
    price: 4500,
    stock: 86,
    sold: 540,
    instant: true,
    cookies: true,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged', 'Email'],
    badge: 'INSTANT',
  },
  {
    id: 'ig-followers',
    platform: 'Instagram',
    subtype: 'With Followers',
    title: 'Instagram · 1K–5K Followers',
    shortTitle: 'IG 1K–5K',
    description:
      'Instagram accounts in the 1K–5K follower band. Follower quality and engagement are lot-dependent. Review description before bulk orders.',
    bullets: ['Follower range 1,000–5,000', 'Email access on selected SKUs', 'Use residential proxy matching region'],
    format: 'username:password:email',
    age: '1-2 yrs',
    country: 'US',
    price: 8900,
    stock: 22,
    sold: 180,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Followers', 'US'],
    badge: 'INSTANT',
  },
  {
    id: 'ig-pva',
    platform: 'Instagram',
    subtype: 'PVA',
    title: 'Instagram · PVA',
    shortTitle: 'Instagram PVA',
    description:
      'Phone-verified Instagram accounts. Phone number is not retained after delivery unless stated. Ideal for recovery-ready sessions.',
    bullets: ['Phone verified at creation', 'Email status per lot', 'Instant when stock > 0'],
    format: 'username:password',
    age: 'New',
    country: 'Mixed',
    price: 3800,
    stock: 140,
    sold: 980,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['PVA'],
    badge: 'PVA',
  },
  {
    id: 'tt-aged',
    platform: 'TikTok',
    subtype: 'Aged',
    title: 'TikTok · Aged',
    shortTitle: 'TikTok Aged',
    description:
      'Verified older TikTok accounts with higher trust levels and lower verification risk for automation, ads warm-up, and organic growth when used carefully.',
    bullets: [
      'Registration date 2024 or earlier on standard aged lots',
      'Additional email included on many SKUs',
      'Email in set, native where marked',
      'Gender mix; profile often not fully filled',
      'Registered with regional IP (see product line)',
    ],
    format: 'ID:PASS:EMAIL:EMAIL_PASSWORD',
    age: '2024+',
    country: 'Canada / Mixed',
    price: 5200,
    stock: 500,
    sold: 2100,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged', 'Email'],
    badge: 'AGED',
  },
  {
    id: 'tt-softreg',
    platform: 'TikTok',
    subtype: 'Softreg',
    title: 'TikTok · Softreg',
    shortTitle: 'TikTok Softreg',
    description: 'Soft-registered TikTok accounts for volume testing. Lower cost, lower trust than aged lines.',
    bullets: ['Softreg batch', 'Instant delivery', 'Test small quantities first'],
    format: 'ID:PASS',
    age: 'New',
    country: 'Mixed',
    price: 2100,
    stock: 600,
    sold: 3400,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['Softreg'],
    badge: 'SOFTREG',
  },
  {
    id: 'tt-followers',
    platform: 'TikTok',
    subtype: 'With Followers',
    title: 'TikTok · With Followers',
    shortTitle: 'TikTok Followers',
    description: 'TikTok accounts sold with an existing follower base. Follower quality varies by supplier lot.',
    bullets: ['Follower package included', 'Email status per SKU', 'Proxy recommended'],
    format: 'ID:PASS:EMAIL',
    age: 'Mixed',
    country: 'Mixed',
    price: 7500,
    stock: 35,
    sold: 120,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Followers'],
    badge: 'INSTANT',
  },
  {
    id: 'x-pva',
    platform: 'X / Twitter',
    subtype: 'PVA',
    title: 'X (Twitter) · PVA',
    shortTitle: 'X PVA',
    description: 'Phone-verified X accounts. Native registration IP mixed. Email in set on selected lots.',
    bullets: ['Phone verified', 'Email in set on marked products', 'Registered with MIX IP on some lots'],
    format: 'login:password:email',
    age: '2013–New',
    country: 'Mixed',
    price: 3800,
    stock: 95,
    sold: 640,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['PVA'],
    badge: 'PVA',
  },
  {
    id: 'gmail-pva',
    platform: 'Gmail',
    subtype: 'PVA + Recovery',
    title: 'Gmail · PVA + Recovery',
    shortTitle: 'Gmail PVA',
    description: 'Phone-verified Gmail with recovery options on selected inventory. High utility as recovery email for other platforms.',
    bullets: ['Phone verified', 'Recovery path on premium lots', 'Instant delivery'],
    format: 'email:password',
    age: 'New',
    country: 'US',
    price: 1500,
    stock: 210,
    sold: 4500,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['PVA', 'Recovery'],
    badge: 'PVA',
  },
  {
    id: 'tg-aged',
    platform: 'Telegram',
    subtype: 'Aged',
    title: 'Telegram · Aged',
    shortTitle: 'Telegram Aged',
    description: 'Aged Telegram accounts. Session export format depends on supplier. Not all lots include 2FA.',
    bullets: ['Aged sessions', '2FA on selected lots', 'Use official clients carefully'],
    format: 'session / phone:code (per delivery note)',
    age: '1+ yrs',
    country: 'Mixed',
    price: 4100,
    stock: 60,
    sold: 300,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: true,
    tags: ['Aged'],
    badge: 'AGED',
  },
  {
    id: 'discord-aged',
    platform: 'Discord',
    subtype: 'Aged',
    title: 'Discord · Aged',
    shortTitle: 'Discord Aged',
    description: 'Aged Discord accounts for server growth and automation where allowed by Discord ToS.',
    bullets: ['Aged accounts', 'Email verified on many lots', 'Token format on delivery'],
    format: 'email:password:token (when provided)',
    age: '1+ yrs',
    country: 'Mixed',
    price: 2900,
    stock: 110,
    sold: 800,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged'],
    badge: 'AGED',
  },
  {
    id: 'li-basic',
    platform: 'LinkedIn',
    subtype: 'Standard',
    title: 'LinkedIn · Standard',
    shortTitle: 'LinkedIn',
    description: 'LinkedIn accounts for outreach and research workflows. Strict platform risk — use sparingly and with matching proxies.',
    bullets: ['Standard verification level', 'Email included on marked SKUs'],
    format: 'email:password',
    age: 'Mixed',
    country: 'US',
    price: 12000,
    stock: 18,
    sold: 90,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['US'],
    badge: 'INSTANT',
  },
  {
    id: 'yt-aged',
    platform: 'YouTube',
    subtype: 'Aged',
    title: 'YouTube · Aged Channel',
    shortTitle: 'YouTube Aged Channel',
    description: 'Aged YouTube channels / accounts. Monetization status is never guaranteed unless explicitly stated on the SKU.',
    bullets: ['Aged channel', 'Email recovery path when included', 'No monetization promise unless listed'],
    format: 'email:password',
    age: '2+ yrs',
    country: 'Mixed',
    price: 15000,
    stock: 12,
    sold: 40,
    instant: false,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged', 'Channel'],
    badge: 'AGED',
  },
  {
    id: 'threads-basic',
    platform: 'Threads',
    subtype: 'Standard',
    title: 'Threads · Standard',
    shortTitle: 'Threads',
    description: 'Threads accounts linked to Instagram ecosystem where applicable. Stock and format follow provider delivery notes.',
    bullets: ['Standard Threads inventory', 'May require linked Instagram on some lots'],
    format: 'username:password',
    age: 'New',
    country: 'Mixed',
    price: 3500,
    stock: 44,
    sold: 150,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['Standard'],
    badge: 'INSTANT',
  },
  {
    id: 'reddit-aged',
    platform: 'Reddit',
    subtype: 'Aged',
    title: 'Reddit · Aged',
    shortTitle: 'Reddit Aged',
    description: 'Aged Reddit accounts for community participation. Karma and history vary by lot.',
    bullets: ['Aged accounts', 'Karma varies', 'Email on selected lots'],
    format: 'username:password',
    age: '1+ yrs',
    country: 'US',
    price: 2800,
    stock: 70,
    sold: 400,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged'],
    badge: 'AGED',
  },
  {
    id: 'snap-basic',
    platform: 'Snapchat',
    subtype: 'Standard',
    title: 'Snapchat · Standard',
    shortTitle: 'Snapchat',
    description: 'Snapchat accounts for testing and growth experiments. Device fingerprint discipline required.',
    bullets: ['Standard stock', 'Instant when available'],
    format: 'username:password',
    age: 'Mixed',
    country: 'Mixed',
    price: 4200,
    stock: 28,
    sold: 95,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['Standard'],
    badge: 'INSTANT',
  },
];

const money = (value: number) => `₦${value.toLocaleString('en-NG')}`;

const WALLET_BALANCE = 7570;

/** Official-style brand mark (inline SVG, brand colors) */
function BrandLogo({ platform, size = 36 }: { platform: string; size?: number }) {
  const s = size;
  const common = { width: s, height: s, viewBox: '0 0 40 40', fill: 'none' as const };
  switch (platform) {
    case 'Facebook':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#1877F2" />
          <path
            d="M26.5 21.2h-3.4v12.3h-5.1V21.2h-2.4v-4.3h2.4v-2.6c0-2.4 1.1-6.1 6.1-6.1h4.5v4.4h-3.3c-.5 0-1.3.3-1.3 1.4v2.9h4.7l-.6 4.3z"
            fill="#fff"
          />
        </svg>
      );
    case 'Instagram':
      return (
        <svg {...common} aria-hidden>
          <defs>
            <linearGradient id="igGrad" x1="0" y1="40" x2="40" y2="0">
              <stop stopColor="#F58529" />
              <stop offset="0.5" stopColor="#DD2A7B" />
              <stop offset="1" stopColor="#8134AF" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill="url(#igGrad)" />
          <rect x="11" y="11" width="18" height="18" rx="5" stroke="#fff" strokeWidth="2" />
          <circle cx="20" cy="20" r="4.5" stroke="#fff" strokeWidth="2" />
          <circle cx="25.5" cy="14.5" r="1.5" fill="#fff" />
        </svg>
      );
    case 'TikTok':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#010101" />
          <path
            d="M27.2 14.2c-1.4-.9-2.4-2.3-2.7-4h-3.3v14.2c0 1.8-1.5 3.3-3.3 3.3s-3.3-1.5-3.3-3.3 1.5-3.3 3.3-3.3c.3 0 .7.1 1 .2v-3.4c-.3 0-.7-.1-1-.1-3.7 0-6.7 3-6.7 6.7s3 6.7 6.7 6.7 6.7-3 6.7-6.7V18c1.5 1.1 3.3 1.7 5.2 1.7v-3.4c-1.1 0-2.1-.4-3-.9z"
            fill="#fff"
          />
        </svg>
      );
    case 'X / Twitter':
    case 'X':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0F1419" />
          <path
            d="M11.5 11.5h4.2l4.4 6.1 5-6.1h4.4l-7 8.3 7.4 8.7h-4.2l-4.8-6.6-5.4 6.6h-4.4l7.3-8.7-6.9-8.3z"
            fill="#fff"
          />
        </svg>
      );
    case 'YouTube':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#FF0000" />
          <path d="M16 13.5v13l11-6.5-11-6.5z" fill="#fff" />
        </svg>
      );
    case 'Telegram':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#2AABEE" />
          <path
            d="M29.5 12.2L9.8 19.5c-1.3.5-1.3 1.2-.2 1.5l5 1.6 2 6c.2.6.4.8 1 .8.6 0 .9-.3 1.2-.6l3-2.9 5.5 4.1c1 .6 1.7.3 2-.9l3.6-17c.4-1.5-.5-2.2-1.6-1.7z"
            fill="#fff"
          />
        </svg>
      );
    case 'Gmail':
    case 'Google':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#fff" stroke="#E2E8F0" />
          <path d="M10 14l10 7.5L30 14v12H10V14z" fill="#EA4335" />
          <path d="M10 14l10 7.5L10 26V14z" fill="#FBBC05" />
          <path d="M30 14l-10 7.5L30 26V14z" fill="#34A853" />
          <path d="M10 14h20v2.5L20 23.5 10 16.5V14z" fill="#4285F4" />
        </svg>
      );
    case 'Discord':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#5865F2" />
          <path
            d="M14.5 15c1.8-.8 3.4-1.2 5.5-1.2s3.7.4 5.5 1.2c.3 1.1.5 2.6.5 4.2 0 1.6-.2 3.1-.5 4.2-1.8.8-3.4 1.2-5.5 1.2s-3.7-.4-5.5-1.2c-.3-1.1-.5-2.6-.5-4.2 0-1.6.2-3.1.5-4.2zm2.3 5.8c.7 0 1.2-.6 1.2-1.3s-.5-1.3-1.2-1.3-1.2.6-1.2 1.3.5 1.3 1.2 1.3zm6.4 0c.7 0 1.2-.6 1.2-1.3s-.5-1.3-1.2-1.3-1.2.6-1.2 1.3.5 1.3 1.2 1.3z"
            fill="#fff"
          />
        </svg>
      );
    case 'LinkedIn':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0A66C2" />
          <path
            d="M12 17h4v11h-4V17zm2-6.5c1.3 0 2.3 1 2.3 2.3S15.3 15 14 15s-2.3-1-2.3-2.2S12.7 10.5 14 10.5zM18.5 17h3.8v1.5h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V28h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V28h-4V17z"
            fill="#fff"
          />
        </svg>
      );
    case 'Reddit':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#FF4500" />
          <circle cx="20" cy="22" r="8" fill="#fff" />
          <circle cx="16.5" cy="21" r="1.4" fill="#FF4500" />
          <circle cx="23.5" cy="21" r="1.4" fill="#FF4500" />
          <path d="M16.5 25c1.2 1 5.8 1 7 0" stroke="#FF4500" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'Threads':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#000" />
          <path
            d="M24.5 18.2c-.3-1.8-1.6-3-3.8-3.2-2.6-.2-4.5 1.4-4.7 4.1-.1 1.7.6 3 1.9 3.7 1 .5 2.1.6 3.2.4v-2.1c-.6.2-1.3.2-1.9 0-.8-.3-1.2-1-1.1-1.9.1-1.3 1.1-2.1 2.4-2 1 .1 1.6.6 1.8 1.5.1.5.1 1.1.1 1.7 0 2.6-.6 4.8-2.8 5.9-1.8.9-4.1.7-5.7-.5-1.4-1.1-2.1-2.9-2-5 .1-2.4 1.1-4.3 2.9-5.5 1.9-1.3 4.2-1.8 6.6-1.5 2.6.3 4.5 1.5 5.5 3.6.5 1.1.7 2.3.7 3.6h-2.9c0-.9-.1-1.7-.2-2.3z"
            fill="#fff"
          />
        </svg>
      );
    case 'Snapchat':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#FFFC00" />
          <path
            d="M20 10c-3.5 0-6 2.2-6 5.6 0 1.4.3 2.5.3 2.5s-.9.4-1.5.9c-.8.6-1.3 1.4-.4 2.1.7.5 1.7-.1 2.4.4.5.3.6 1.2 1.4 1.6.7.3 1.5-.2 2.3.1.6.2 1 1 1.5 1 0 0 .5-.8 1.5-1 .8-.3 1.6.2 2.3-.1.8-.4.9-1.3 1.4-1.6.7-.5 1.7.1 2.4-.4.9-.7.4-1.5-.4-2.1-.6-.5-1.5-.9-1.5-.9s.3-1.1.3-2.5C26 12.2 23.5 10 20 10z"
            fill="#000"
          />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#64748B" />
          <text x="20" y="25" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">
            •
          </text>
        </svg>
      );
  }
}

function badgeClass(badge?: string) {
  if (badge === 'INSTANT') return 'badge-instant';
  if (badge === 'SOFTREG') return 'badge-softreg';
  if (badge === 'AGED') return 'badge-aged';
  if (badge === 'PVA') return 'badge-pva';
  return 'badge-instant';
}

function platformKey(p: string) {
  if (p === 'X / Twitter') return 'X / Twitter';
  return p;
}

export function AccountsPage({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<string>('All');
  const [selected, setSelected] = useState<AccountProduct | null>(null);
  const [slide, setSlide] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % PROMO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((p) => {
      if (p.stock <= 0) return false;
      const plat = platformKey(p.platform);
      if (platform !== 'All') {
        if (platform === 'X / Twitter' && plat !== 'X / Twitter' && p.platform !== 'X') return false;
        if (platform !== 'X / Twitter' && p.platform !== platform) return false;
      }
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.platform.toLowerCase().includes(q) ||
        p.subtype.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, platform]);

  const activePromo = PROMO_SLIDES[slide];

  return (
    <div className="accounts-page">
      {/* Header */}
      <header className="accounts-header">
        <button type="button" className="accounts-back-link" onClick={onBack} aria-label="Back to Services">
          <ArrowLeft size={18} />
          <span>Services</span>
        </button>
        <div className="accounts-header-center">
          <h1>Buy Accounts &amp; Logs</h1>
          <p>Instant delivery &amp; aged logs</p>
        </div>
        <div className="accounts-wallet-badge" aria-label="Wallet balance">
          <Wallet size={14} />
          <span>{money(WALLET_BALANCE)}</span>
        </div>
      </header>

      {/* Search */}
      <div className="accounts-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search platform, country, or account type..."
          aria-label="Search accounts"
        />
        {query && (
          <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Single-line filter pills */}
      <div className="accounts-chips" role="tablist" aria-label="Platforms">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={platform === p}
            className={platform === p ? 'chip active' : 'chip'}
            onClick={() => setPlatform(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="accounts-meta-row">
        <strong>
          {filtered.length} listing{filtered.length === 1 ? '' : 's'}
        </strong>
        <span className="live-dot">
          <i /> In stock only
        </span>
      </div>

      {/* Promo carousel */}
      <div className="accounts-promo">
        <div className="promo-slide">
          <div className="promo-copy">
            <strong>{activePromo.title}</strong>
            <p>{activePromo.body}</p>
            <button type="button" className="promo-cta">
              {activePromo.cta}
            </button>
          </div>
          <div className="promo-art" aria-hidden>
            <div className="promo-stack" />
          </div>
        </div>
        <div className="promo-dots" role="tablist" aria-label="Promo slides">
          {PROMO_SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={i === slide ? 'dot active' : 'dot'}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="accounts-grid">
        {filtered.map((p) => (
          <article key={p.id} className="account-card-sq">
            <div className="card-sq-top">
              <span className="card-logo-wrap">
                <BrandLogo platform={p.platform} size={36} />
              </span>
              <span className={badgeClass(p.badge || (p.instant ? 'INSTANT' : 'AGED'))}>
                {p.badge || (p.instant ? 'INSTANT' : 'AGED')}
              </span>
            </div>
            <strong className="card-sq-title">{p.shortTitle}</strong>
            <span className="card-sq-sub">
              {p.age} · {p.country}
              {p.tags[0] ? ` · ${p.tags[0]}` : ''}
            </span>
            <div className="card-sq-stock">
              <i className="stock-dot" /> {p.stock} in stock
            </div>
            <div className="card-sq-bottom">
              <strong>{money(p.price)}</strong>
              <button type="button" onClick={() => setSelected(p)}>
                Buy →
              </button>
            </div>
          </article>
        ))}
      </div>

      {!filtered.length && (
        <Card className="accounts-empty">
          <Package size={22} />
          <strong>No accounts match</strong>
          <p>Try another platform or clear search.</p>
        </Card>
      )}

      {selected && (
        <AccountDetail
          product={selected}
          wallet={WALLET_BALANCE}
          onClose={() => setSelected(null)}
          onCheckoutBlocked={(msg) => setToast(msg)}
        />
      )}

      {toast && (
        <div className="accounts-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function AccountDetail({
  product,
  wallet,
  onClose,
  onCheckoutBlocked,
}: {
  product: AccountProduct;
  wallet: number;
  onClose: () => void;
  onCheckoutBlocked: (msg: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const total = product.price * qty;
  const maxQty = Math.min(product.stock, 50);

  function tryCheckout() {
    if (qty > product.stock) {
      onCheckoutBlocked('Not enough stock for this quantity.');
      return;
    }
    if (total > wallet) {
      onCheckoutBlocked('Insufficient wallet balance. Fund your wallet first.');
      return;
    }
    onCheckoutBlocked(
      'Checkout stays disabled until wallet + provider (AccsZone / AccsMarket) layer are connected.',
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="account-detail-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <div className="detail-sheet-head">
          <div className="detail-head-main">
            <BrandLogo platform={product.platform} size={40} />
            <div>
              <span className="accounts-eyebrow">{product.platform}</span>
              <h2 id="detail-title">{product.title}</h2>
              <small>
                {product.age} · {product.country}
                {product.sold != null ? ` · ${product.sold} sold` : ''}
              </small>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Full provider description — uncut */}
        <p className="detail-lead">{product.description}</p>

        <ul className="detail-bullets">
          {product.bullets.map((b) => (
            <li key={b}>
              <Check size={14} /> {b}
            </li>
          ))}
        </ul>

        <div className="detail-flags">
          {product.instant && <span>Instant</span>}
          {product.cookies && <span>Cookies</span>}
          {product.emailIncluded && <span>Email</span>}
          {product.twoFa && <span>2FA</span>}
        </div>

        <div className="detail-block">
          <strong>Account format</strong>
          <code>{product.format}</code>
        </div>

        <div className="detail-block">
          <strong>How to use</strong>
          <ol>
            <li>Purchase only what you need for a first test (e.g. 1–10 units).</li>
            <li>Open credentials only after delivery is confirmed in History.</li>
            <li>Use a proxy matching the registration region when possible.</li>
            <li>Change password and secure recovery after first successful login.</li>
          </ol>
        </div>

        <div className="detail-qty-row">
          <span>Quantity</span>
          <div className="qty-stepper">
            <button
              type="button"
              aria-label="Decrease"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              <Minus size={14} />
            </button>
            <strong>{qty}</strong>
            <button
              type="button"
              aria-label="Increase"
              disabled={qty >= maxQty}
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="detail-price-row">
          <div>
            <span>Total</span>
            <small>
              {money(product.price)} × {qty} · {product.stock} available
            </small>
          </div>
          <strong>{money(total)}</strong>
        </div>

        <PrimaryButton onClick={tryCheckout}>
          <ShieldCheck size={17} /> Continue to checkout
        </PrimaryButton>

        <p className="detail-footnote">
          Credentials are never shown in the catalog. Delivery happens only after a successful wallet
          debit and provider confirmation. Descriptions above come from the supplier listing.
        </p>
      </section>
    </div>
  );
}

export function EmptyOrderState({ kind }: { kind: 'accounts' | 'rentals' }) {
  return (
    <Card className="product-empty order-empty">
      <div>
        <Package size={20} />
      </div>
      <strong>No {kind} yet</strong>
      <p>
        Your {kind === 'accounts' ? 'account purchases' : 'active rentals'} will appear here after you
        place an order.
      </p>
    </Card>
  );
}
