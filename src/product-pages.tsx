'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  FolderOpen,
  Package,
  Search,
  ShieldCheck,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import { Card, PrimaryButton } from './components/ui';
import './product-pages.css';
import type { AuthSession } from './auth/AuthFlow';
import type { AccountProduct } from './accounts-types';
import { DescriptionBody } from './accounts-description';
import { MyLogsPage } from './MyLogsPage';
import { loadSessionTokens } from './auth/session-unlock';

/**
 * Buy Accounts & Logs — Verxor marketplace
 * All platforms load live AccsZone stock, cached briefly in localStorage.
 */

export type { AccountProduct } from './accounts-types';

const PLATFORMS = [
  'All',
  'Facebook',
  'Instagram',
  'TikTok',
  'X / Twitter',
  'Telegram',
  'Gmail',
  'YouTube',
  'Threads',
  'WhatsApp',
  'Mobile Proxies',
  'Google Voice',
  'Odnoklassniki',
  'LinkedIn',
  'Reddit',
  'Indeed',
  'Truth Social',
  'AI Accounts',
  'Google Ads',
  'Bluesky',
  'Snapchat',
  'Discord',
  'Twitch',
  'Trustpilot',
  'Quora',
  'Dating Apps',
  'Grindr',
  'eHarmony',
  'Badoo',
  'Gaming',
  'Premium Subscriptions',
  'Mastercard',
  'Apple',
  'E-Commerce',
  'Spotify',
  'VPN',
  'Netflix',
  'Pinterest',
  'Yahoo',
  'CapCut',
  'Phone & Messaging',
  'Roblox',
  'GitHub',
  'Outlook',
] as const;

/** Platforms with live AccsZone checkout. Chips above match this list 1:1. */
const LIVE_PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'X / Twitter', 'Telegram', 'Gmail', 'YouTube', 'Threads', 'WhatsApp', 'Mobile Proxies', 'Google Voice', 'Odnoklassniki', 'LinkedIn', 'Reddit', 'Indeed', 'Truth Social', 'AI Accounts', 'Google Ads', 'Bluesky', 'Snapchat', 'Discord', 'Twitch', 'Trustpilot', 'Quora', 'Dating Apps', 'Grindr', 'eHarmony', 'Badoo', 'Gaming', 'Premium Subscriptions', 'Mastercard', 'Apple', 'E-Commerce', 'Spotify', 'VPN', 'Netflix', 'Pinterest', 'Yahoo', 'CapCut', 'Phone & Messaging', 'Roblox', 'GitHub', 'Outlook'] as const;
const LIVE_PLATFORM_SET = new Set<string>(LIVE_PLATFORMS);

/** Live stock cache is considered fresh for 15 minutes. */
const CAT_CACHE_TTL_MS = 15 * 60 * 1000;

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

const money = (value: number) => `₦${value.toLocaleString('en-NG')}`;

function BrandLogo({ platform, size = 36 }: { platform: string; size?: number }) {
  const s = size;
  const common = { width: s, height: s, viewBox: '0 0 40 40', fill: 'none' as const };
  switch (platform) {
    case 'Facebook':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#1877F2" />
          <path d="M26.5 21.2h-3.4v12.3h-5.1V21.2h-2.4v-4.3h2.4v-2.6c0-2.4 1.1-6.1 6.1-6.1h4.5v4.4h-3.3c-.5 0-1.3.3-1.3 1.4v2.9h4.7l-.6 4.3z" fill="#fff" />
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
          <path d="M27.2 14.2c-1.4-.9-2.4-2.3-2.7-4h-3.3v14.2c0 1.8-1.5 3.3-3.3 3.3s-3.3-1.5-3.3-3.3 1.5-3.3 3.3-3.3c.3 0 .7.1 1 .2v-3.4c-.3 0-.7-.1-1-.1-3.7 0-6.7 3-6.7 6.7s3 6.7 6.7 6.7 6.7-3 6.7-6.7V18c1.5 1.1 3.3 1.7 5.2 1.7v-3.4c-1.1 0-2.1-.4-3-.9z" fill="#fff" />
        </svg>
      );
    case 'X / Twitter':
    case 'X':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0F1419" />
          <path d="M11.5 11.5h4.2l4.4 6.1 5-6.1h4.4l-7 8.3 7.4 8.7h-4.2l-4.8-6.6-5.4 6.6h-4.4l7.3-8.7-6.9-8.3z" fill="#fff" />
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
          <path d="M29.5 12.2L9.8 19.5c-1.3.5-1.3 1.2-.2 1.5l5 1.6 2 6c.2.6.4.8 1 .8.6 0 .9-.3 1.2-.6l3-2.9 5.5 4.1c1 .6 1.7.3 2-.9l3.6-17c.4-1.5-.5-2.2-1.6-1.7z" fill="#fff" />
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
    case 'WhatsApp':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#25D366" />
          <path d="M20 9.5c-5.8 0-10.5 4.7-10.5 10.5 0 1.9.5 3.6 1.4 5.2L9.5 30.5l5.5-1.4c1.5.8 3.2 1.2 5 1.2 5.8 0 10.5-4.7 10.5-10.5S25.8 9.5 20 9.5zm0 19.1c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.2.8.9-3.1-.2-.3c-.9-1.4-1.3-3-1.3-4.6 0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5-3.8 8.6-8.5 8.6zm4.9-6.4c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1.1-.1.2-.3.2-.6.1-1.5-.7-2.5-1.4-3.5-3-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5 0-.2.1-1 .7-1.3.9-.2.2-.4.2-.7.1-.6-.3-1.2-.6-1.7-1.1-.5-.4-.9-.9-1.3-1.5-.3-.5.2-.5.5-1 .1-.2 0-.4 0-.5-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.5.5-1 1.2-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 1.9 3 4.7 4.2 1.7.7 2.9.9 3.9 1 .6.1 1.7.1 2.2 0 1-.2 2-.7 2.4-1.4.4-.8.6-1.8.5-2-.1-.2-.3-.3-.6-.4z" fill="#fff" />
        </svg>
      );
    case 'Threads':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#010101" />
          <text x="20" y="27" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">@</text>
        </svg>
      );
    case 'LinkedIn':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0A66C2" />
          <path d="M13.4 16.9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-1.7 2.6h3.4v11h-3.4v-11zm5.7 0h3.3v1.5c.5-.9 1.6-1.8 3.4-1.8 2.9 0 3.9 1.8 3.9 4.6v6.7h-3.4v-6c0-1.5-.4-2.5-1.8-2.5-1.5 0-2.1 1-2.1 2.5v6h-3.3v-11z" fill="#fff" />
        </svg>
      );
    case 'Google Voice':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#1A73E8" />
          <path d="M20 9.8c-5.6 0-10.2 4.5-10.2 10.2S14.4 30.2 20 30.2c1 0 2-.2 2.9-.5l4.4 1.9-1.2-3.7c2.4-1.9 4-4.7 4-7.9C30.2 14.3 25.6 9.8 20 9.8zm-4.3 6.1c.4 0 .8.2 1 .7l1 2.2c.2.5.1 1-.3 1.4l-.8.8c.6 1.3 1.7 2.5 3.1 3.2l.8-.8c.4-.4.9-.5 1.4-.3l2.2 1c.5.2.7.6.7 1 0 .6-.6 1.3-1.5 1.6-.7.2-1.4.3-2.2.3-4.6 0-8.4-3.7-8.4-8.4 0-.8.1-1.5.3-2.2.3-.9 1-1.5 1.7-1.5z" fill="#fff" />
        </svg>
      );
    case 'Odnoklassniki':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#EE8208" />
          <path d="M20 9.6c-2.9 0-5.2 2.3-5.2 5.2s2.3 5.2 5.2 5.2 5.2-2.3 5.2-5.2-2.3-5.2-5.2-5.2zm0 7.6c-1.3 0-2.4-1.1-2.4-2.4s1.1-2.4 2.4-2.4 2.4 1.1 2.4 2.4-1.1 2.4-2.4 2.4zm7.2 4.7c-.5-.8-1.3-1.3-2.6-1.6-.6-.2-1.2 0-1.6.4-1 .8-2.1 1.2-3 1.2s-2-.4-3-1.2c-.4-.4-1-.6-1.6-.4-1.3.3-2.1.8-2.6 1.6-.3.5-.2 1.1.3 1.4 2 1.3 4.2 2 6.9 2 .7 0 1.4-.1 2-.2l2.4 3.4c.3.4.9.5 1.3.2.5-.3.6-.9.3-1.3l-2.1-3c.5-.4 1-.8 1.4-1.3.4-.4.4-1 .3-1.4z" fill="#fff" />
        </svg>
      );
    case 'Mobile Proxies':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0F766E" />
          <circle cx="20" cy="20" r="9.2" stroke="#fff" strokeWidth="2" />
          <path d="M11 17.4h18M11 22.6h18M20 10.8c-2.6 2.4-4 5.6-4 9.2s1.4 6.8 4 9.2c2.6-2.4 4-5.6 4-9.2s-1.4-6.8-4-9.2z" stroke="#fff" strokeWidth="1.6" fill="none" />
        </svg>
      );
    case 'Reddit':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#FF4500" />
          <circle cx="20" cy="23.5" r="7.5" fill="#fff" />
          <circle cx="17" cy="22.5" r="1.3" fill="#FF4500" />
          <circle cx="23" cy="22.5" r="1.3" fill="#FF4500" />
          <path d="M20 15.8V12.4" stroke="#fff" strokeWidth="1.6" />
          <circle cx="20" cy="11.2" r="1.7" fill="#fff" />
          <path d="M16 26.4c1.2.9 2.5 1.3 4 1.3s2.8-.4 4-1.3" stroke="#FF4500" strokeWidth="1.3" fill="none" />
        </svg>
      );
    case 'Indeed':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#2553EC" />
          <circle cx="17" cy="17" r="4" stroke="#fff" strokeWidth="2" fill="none" />
          <path d="M20 20.2l6.5 6.5" stroke="#fff" strokeWidth="2.4" />
          <rect x="10" y="27" width="20" height="2.4" rx="1.2" fill="#fff" />
        </svg>
      );
    case 'Truth Social':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#4A148C" />
          <path d="M14 13h13.5v4H22.7v10.5h-4.2V17H14v-4z" fill="#fff" />
        </svg>
      );
    case 'AI Accounts':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#6D28D9" />
          <path d="M17.2 10.5h5.6L29 29h-4.7l-1-3h-6.6l-1 3H11l6.2-18.5zM18.4 22h3.2l-1.6-5-1.6 5z" fill="#fff" />
        </svg>
      );
    case 'Google Ads':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#1A73E8" />
          <path d="M20 8.5c3.5 3.4 5.5 7.4 5.5 11.5S23.5 28.1 20 31.5c-3.5-3.4-5.5-7.4-5.5-11.5S16.5 11.9 20 8.5z" fill="#fff" />
          <circle cx="14.5" cy="20" r="1.7" fill="#FBBC05" />
          <circle cx="25.5" cy="20" r="1.7" fill="#34A853" />
          <circle cx="20" cy="31.5" r="1.7" fill="#EA4335" />
          <circle cx="20" cy="8.5" r="1.7" fill="#fff" />
        </svg>
      );
    case 'Bluesky':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0285FF" />
          <path d="M20 22.5c-2.6-4.3-7.8-6.3-9.9-4.4-1.9 1.7.2 5.9 3.5 7.2-2.3.9-3.6 3.3-2.7 5.3.9 1.9 3.3 1.2 4.9-.8.7-.8 1.5-1.7 1.9-2.3.4.6 1.2 1.5 1.9 2.3 1.6 2 4 2.7 4.9.8.9-2-.4-4.4-2.7-5.3 2.3-1.3 4.4-5.5 3.5-7.2-2.1-1.9-7.3.1-9.9 4.4z" fill="#fff" />
        </svg>
      );
    case 'Snapchat':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#FFFC00" />
          <path d="M20 9.6c-4.8 0-8 3.2-8 7.9v4.7c-1-.3-2-.6-2.8.2-.8.9-.4 2.4.8 3.2 1.2.9 2.6 1.5 3.3 1.7.6 1 1.7 1.7 3.3 1.7h6.8c1.6 0 2.7-.7 3.3-1.7.7-.2 2.1-.8 3.3-1.7 1.2-.8 1.6-2.3.8-3.2-.8-.8-1.8-.5-2.8-.2v-4.7c0-4.7-3.2-7.9-8-7.9zm-3.1 8.2c1-.2 2.3.1 2.4 1 .1.8-1.1 1.4-2.2 1.2-1-.2-1.2-2-.2-2.2zm6.2 0c1-.2 1.2 2 .2 2.2-1.1.2-2.3-.4-2.2-1.2.1-.9 1.4-1.2 2-1zm-3.1 5.2c1.9 0 3.3 1 3.3 1.5 0 .4-.7.2-1.6 0-.6-.1-1.1-.2-1.7-.2s-1.1.1-1.7.2c-.9.2-1.6.4-1.6 0 0-.5 1.4-1.5 3.3-1.5z" fill="#fff" />
        </svg>
      );
    case 'Twitch':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#9146FF" />
          <path d="M12 9.5h16.5v12.9l-5.1 5.1h-3.7l-3.1 3.1v-3.1H12V9.5zm3.9 3.6v8.1h2.3v-8.1h-2.3zm6 0v8.1h2.3v-8.1h-2.3z" fill="#fff" />
        </svg>
      );
    case 'Trustpilot':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#00B67A" />
          <path d="M20 10l2.7 5.6 6.1.8-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.8z" fill="#fff" />
        </svg>
      );
    case 'Quora':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#B92B27" />
          <path d="M28.4 26.2l-1.9-2.4c1.2-1.6 1.9-3.7 1.9-6.2 0-5.4-3.8-9.1-8.4-9.1s-8.5 3.7-8.5 9.1 3.9 9.1 8.5 9.1c.7 0 1.4-.1 2-.3l1.4 1.8c-2.5 1.1-5.3 1-8 .4l-.7 1.9c3.7.9 7.6.9 10.9-1l1.5 1.9h3.3l-2-4.2zm-8.4-1.9c-3.1 0-5.6-2.8-5.6-6.7s2.5-6.7 5.6-6.7 5.5 2.8 5.5 6.7-2.4 6.7-5.5 6.7z" fill="#fff" />
        </svg>
      );
    case 'Dating Apps':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#EC4899" />
          <path d="M20 30.8c-.7-.6-10.3-6.6-10.3-13.4 0-3.8 2.9-6.5 6.3-6.5 2 0 3.6 1 4 1.5.4-.5 2-1.5 4-1.5 3.4 0 6.3 2.7 6.3 6.5 0 6.8-9.6 12.8-10.3 13.4z" fill="#fff" />
        </svg>
      );
    case 'Grindr':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#1A1A1A" />
          <path d="M20 9c-5 0-8.6 2.2-8.6 2.2s.9 3.4 3 5.9c2.6 3.1 4.6 14 5.6 14s3-10.9 5.6-14c2.1-2.5 3-5.9 3-5.9S25 9 20 9z" fill="#FFC300" />
          <circle cx="20" cy="11.4" r="1.6" fill="#1A1A1A" />
        </svg>
      );
    case 'eHarmony':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#00A3E0" />
          <path d="M20 30c-.6-.5-9.6-6.2-9.6-12.5 0-3.5 2.7-6 5.8-6 1.8 0 3.3.9 3.8 1.4.4-.5 2-1.4 3.8-1.4 3 0 5.8 2.5 5.8 6C29.6 23.8 20.6 29.5 20 30z" fill="#fff" />
        </svg>
      );
    case 'Badoo':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#7C4DFF" />
          <path d="M20 30.6c-.6-.6-10-6.5-10-13.4 0-3.7 2.8-6.4 6.1-6.4 1.9 0 3.4 1 3.9 1.5.5-.5 2-1.5 3.9-1.5 3.3 0 6.1 2.7 6.1 6.4 0 6.9-9.4 12.8-10 13.4z" fill="#fff" />
          <circle cx="20" cy="24" r="1.5" fill="#7C4DFF" />
        </svg>
      );
    case 'Gaming':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#111827" />
          <rect x="8" y="14" width="24" height="13" rx="6.5" stroke="#fff" strokeWidth="2" fill="none" />
          <path d="M15.5 17.5v2.4h-2.4v2.2h2.4v2.4h2.2v-2.4h2.4v-2.2h-2.4v-2.4z" fill="#fff" />
          <circle cx="24.5" cy="18.8" r="1.4" fill="#fff" />
          <circle cx="27.2" cy="21.8" r="1.4" fill="#fff" />
        </svg>
      );
    case 'Premium Subscriptions':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#F59E0B" />
          <path d="M11 27l-1.6-10.4 6.4 4.2L20 12.4l4.2 8.4 6.4-4.2L29 27H11z" fill="#fff" />
        </svg>
      );
    case 'Mastercard':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#163E8C" />
          <circle cx="16.5" cy="20" r="6" fill="#EB001B" />
          <circle cx="23.5" cy="20" r="6" fill="#F79E1B" fillOpacity="0.9" />
          <path d="M20 25.6a6 6 0 0 1 0-11.2 6 6 0 0 1 0 11.2z" fill="#FF5F00" />
        </svg>
      );
    case 'Apple':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#111827" />
          <path d="M26.7 21.4c0-2.6 1.6-3.9 1.7-4-.9-1.3-2.3-1.5-2.8-1.5-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2 1 0 1.4-.6 2.6-.6 1.2 0 1.6.6 2.6.6 1.1 0 1.8-1 2.4-2 .5-.8.7-1.5.8-1.6-.1 0-1.9-.8-1.9-3.9zm-2-7.2c.5-.6.9-1.5.8-2.3-.8 0-1.8.5-2.4 1.2-.5.6-.9 1.5-.8 2.3.9.1 1.9-.5 2.4-1.2z" fill="#fff" />
        </svg>
      );
    case 'E-Commerce':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#2563EB" />
          <path d="M14 14h2.2l1 2h8.8l-1.6 8H16.4l-2.4-10zm3 12a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zm7 0a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z" fill="#fff" />
        </svg>
      );
    case 'Spotify':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#1DB954" />
          <circle cx="20" cy="20" r="10" fill="#fff" />
          <circle cx="20" cy="20" r="10" fill="none" />
          <path d="M15 17.5c3.5-1.2 7.5-.8 10 1M15.6 20.5c3-.9 6.3-.5 8.5.9M16.3 23.3c2.5-.7 5.2-.4 7 .8" stroke="#1DB954" strokeWidth="1.8" fill="none" />
        </svg>
      );
    case 'VPN':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#10B981" />
          <path d="M20 9l8.5 3v8.2c0 5.3-3.6 9.2-8.5 10.8-4.9-1.6-8.5-5.5-8.5-10.8V12L20 9zm-1.3 13l5.6-5.6-1.4-1.4-4.2 4.2-2.2-2.2-1.4 1.4 3.6 3.6z" fill="#fff" />
        </svg>
      );
    case 'Netflix':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0B0B0B" />
          <path d="M16.2 10.5h4.2l3.2 12.2v-12.2h3.9v19.8h-4l-3.4-12.8v12.8h-3.9V10.5z" fill="#E50914" />
        </svg>
      );
    case 'Pinterest':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#E60023" />
          <path d="M20 9.5c-5.7 0-8.8 4-8.8 7.8 0 2.3 1 4.4 3.2 5.2.4.1.6 0 .7-.4l.5-1.9c.1-.4 0-.5-.2-.8-.6-.8-.9-1.7-.9-2.7 0-3.4 2.6-6.4 6.7-6.4 3.7 0 5.7 2.2 5.7 5.2 0 3.9-1.8 7.2-4.4 7.2-1.4 0-2.3-1.1-2-2.5.4-1.6 1.1-3.3 1.1-4.5 0-1-.6-1.9-1.8-1.9-1.4 0-2.6 1.5-2.6 3.5 0 1.3.4 2.1.4 2.1l-1.7 7.2c-.5 2.1-.1 4.7 0 4.9 0 .2.3.2.4.1l1.9-2.9.8-3c.5.9 1.9 1.7 3.2 1.7 4.3 0 7.3-3.9 7.3-9.1 0-4-3.4-7.8-8.5-7.8z" fill="#fff" />
        </svg>
      );
    case 'Yahoo':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#6001D2" />
          <path d="M10 12h4l3.6 7 3.4-7h4l-6 11.2V28h-3.8v-4.8L10 12z" fill="#fff" />
        </svg>
      );
    case 'CapCut':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#000" />
          <rect x="11" y="11" width="18" height="18" rx="4" stroke="#fff" strokeWidth="2.4" fill="none" />
          <path d="M22 14l-5 7.5h3.4L19.2 26l5.6-8.4h-3.6L22 14z" fill="#fff" />
        </svg>
      );
    case 'Phone & Messaging':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0D9488" />
          <path d="M13.2 10.8c1.8.5 4.9 3.4 5.8 5.1.4.8.1 1.5-.5 2.1l-1.1 1c-.3.3-.4.6-.2 1 .7 1.5 2.3 3.2 3.9 4.1.4.2.7.1 1-.2l1-1.1c.6-.6 1.3-.9 2.1-.5 1.7.9 4.6 4 5.1 5.8.3 1-.4 2.1-1.5 2.6-2.7 1.2-7.5.5-12.7-4.6-5.2-5.2-5.9-10-4.6-12.7.4-1 1.4-1.8 2.7-1.4z" fill="#fff" />
        </svg>
      );
    case 'Roblox':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0F0F0F" />
          <path d="M15.6 10.2l14.2 3.8-3.8 14.2-14.2-3.8 3.8-14.2zm5 6.5l-1.9 7 7 1.9 1.9-7-7-1.9z" fill="#E2231A" />
        </svg>
      );
    case 'GitHub':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#181717" />
          <path d="M20 9.5a9.7 9.7 0 0 0-3.1 18.9c.5.1.7-.2.7-.5v-1.8c-2.7.6-3.3-1.2-3.3-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.4-2.2-.2-4.4-1.1-4.4-4.7 0-1 .4-1.9 1-2.5-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.6 1 1.5 1 2.5 0 3.6-2.2 4.5-4.4 4.7.3.3.6.9.6 1.9v2.8c0 .3.2.6.7.5A9.7 9.7 0 0 0 20 9.5z" fill="#fff" />
        </svg>
      );
    case 'Outlook':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0072C6" />
          <path d="M11 13.5h11.5v9.6H11z" fill="#fff" />
          <path d="M19.4 20.4l9.9 5.9-9.9 4.5-3.3-5.9z" fill="#fff" opacity="0.85" />
          <path d="M22.9 15.5l5.7-3.4 1.4 13.4-7.1-4.8z" fill="#fff" opacity="0.7" />
        </svg>
      );
    case 'Discord':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#5865F2" />
          <path d="M14.5 15c1.8-.8 3.4-1.2 5.5-1.2s3.7.4 5.5 1.2c.3 1.1.5 2.6.5 4.2 0 1.6-.2 3.1-.5 4.2-1.8.8-3.4 1.2-5.5 1.2s-3.7-.4-5.5-1.2c-.3-1.1-.5-2.6-.5-4.2 0-1.6.2-3.1.5-4.2zm2.3 5.8c.7 0 1.2-.6 1.2-1.3s-.5-1.3-1.2-1.3-1.2.6-1.2 1.3.5 1.3 1.2 1.3zm6.4 0c.7 0 1.2-.6 1.2-1.3s-.5-1.3-1.2-1.3-1.2.6-1.2 1.3.5 1.3 1.2 1.3z" fill="#fff" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0f172a" />
          <text x="20" y="24" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">
            {(platform || '?')[0]}
          </text>
        </svg>
      );
  }
}

function badgeClass(b?: AccountProduct['badge']) {
  if (b === 'SOFTREG') return 'badge-softreg';
  if (b === 'AGED') return 'badge-aged';
  if (b === 'PVA') return 'badge-pva';
  return 'badge-instant';
}

function platformKey(p: string) {
  if (p === 'X / Twitter') return 'X / Twitter';
  return p;
}

function offerToProduct(o: {
  id: string;
  platform: string;
  subtype: string;
  title: string;
  shortTitle: string;
  description: string;
  format: string;
  age: string;
  country: string;
  priceNgn: number;
  stock: number;
  sold?: number;
  instant: boolean;
  cookies: boolean;
  emailIncluded: boolean;
  twoFa: boolean;
  tags: string[];
  badge?: AccountProduct['badge'];
  providerListingId?: number;
}): AccountProduct {
  return {
    id: o.id,
    providerListingId: o.providerListingId,
    platform: o.platform,
    subtype: o.subtype,
    title: o.title,
    shortTitle: o.shortTitle,
    description: o.description,
    bullets: o.tags.slice(0, 5),
    format: o.format,
    age: o.age,
    country: o.country,
    price: o.priceNgn,
    stock: o.stock,
    sold: o.sold,
    instant: o.instant,
    cookies: o.cookies,
    emailIncluded: o.emailIncluded,
    twoFa: o.twoFa,
    tags: o.tags,
    badge: o.badge,
  };
}

export function AccountsPage({ onBack, session }: { onBack: () => void; session?: AuthSession | null }) {
  const walletBalance = session?.balanceNgn ?? 0;
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<string>('All');
  const [subtype, setSubtype] = useState<string | null>(null);
  const [subtypeDrawerOpen, setSubtypeDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<AccountProduct | null>(null);
  const [showMyLogs, setShowMyLogs] = useState(false);
  const [slide, setSlide] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [liveByPlatform, setLiveByPlatform] = useState<
    Record<
      string,
      {
        offers: AccountProduct[];
        subtypes: { name: string; count: number; stock: number }[];
      }
    >
  >({});
  const [loadingPlatforms, setLoadingPlatforms] = useState<Record<string, boolean>>({});
  const [errorByPlatform, setErrorByPlatform] = useState<Record<string, string | null>>({});

  const loadPlatformStock = useCallback(async (p: string) => {
    if (!LIVE_PLATFORM_SET.has(p)) return;
    const cacheKey = `verxor:cat:${p.toLowerCase()}:v2`;
    type Cat = { offers: unknown[]; subtypes: { name: string; count: number; stock: number }[] };

    let hadFreshCache = false;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const saved = JSON.parse(raw) as { at: number; data: Cat };
        if (saved?.data && Array.isArray(saved.data.offers) && saved.data.offers.length > 0) {
          // Hydrate immediately from cache (fresh or stale) so the list is never blank,
          // but only treat fresh cache as authoritative — stale cache triggers a re-fetch.
          setLiveByPlatform((prev) => ({
            ...prev,
            [p]: {
              offers: (saved.data.offers as Parameters<typeof offerToProduct>[0][]).map(offerToProduct),
              subtypes: saved.data.subtypes || [],
            },
          }));
          hadFreshCache = Date.now() - (saved.at || 0) < CAT_CACHE_TTL_MS;
        }
      }
    } catch {
      /* ignore */
    }

    if (!hadFreshCache) {
      setLoadingPlatforms((prev) => ({ ...prev, [p]: true }));
    }
    setErrorByPlatform((prev) => ({ ...prev, [p]: null }));

    async function fetchOnce(): Promise<Cat> {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(`/api/v1/accounts/catalog?platform=${encodeURIComponent(p)}`, {
          signal: ctrl.signal,
        });
        const text = await res.text();
        let data: (Cat & { ok?: boolean; error?: string }) | null = null;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error('Stock is refreshing. Retrying…');
        }
        if (!data?.ok || !Array.isArray(data.offers)) {
          throw new Error(data?.error || `Could not load live ${p} stock`);
        }
        return data;
      } finally {
        clearTimeout(timer);
      }
    }

    let lastErr = `Could not load live ${p} stock`;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!mountedRef.current) return;
      try {
        const data = await fetchOnce();
        if (!mountedRef.current) return;
        const offers = (data.offers as Parameters<typeof offerToProduct>[0][]).map(offerToProduct);
        const subtypes = (data.subtypes || []).map((sub) => ({
          name: sub.name,
          count: sub.count,
          stock: sub.stock,
        }));
        setLiveByPlatform((prev) => ({
          ...prev,
          [p]: { offers, subtypes },
        }));
        setErrorByPlatform((prev) => ({ ...prev, [p]: null }));
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), data }));
        } catch {
          /* storage full */
        }
        setLoadingPlatforms((prev) => ({ ...prev, [p]: false }));
        return;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : 'Network error';
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }

    if (!mountedRef.current) return;
    setErrorByPlatform((prev) => ({ ...prev, [p]: lastErr }));
    setLoadingPlatforms((prev) => ({ ...prev, [p]: false }));
  }, []);

  // Auto-load live stock for every platform on mount.
  useEffect(() => {
    for (const p of LIVE_PLATFORMS) {
      void loadPlatformStock(p);
    }
  }, [loadPlatformStock]);

  useEffect(() => {
    if (selected || showMyLogs) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % PROMO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, [selected, showMyLogs]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setSubtype(null);
    setSubtypeDrawerOpen(false);
  }, [platform]);

  const catalog = useMemo(() => {
    const list: AccountProduct[] = [];
    for (const stock of Object.values(liveByPlatform)) {
      list.push(...stock.offers);
    }
    return list;
  }, [liveByPlatform]);

  const platformSubtypes = useMemo(() => {
    if (platform === 'All') return [] as { name: string; count: number; stock: number }[];
    const live = liveByPlatform[platform];
    if (live && live.subtypes.length > 0) return live.subtypes;
    const map = new Map<string, { count: number; stock: number }>();
    for (const p of catalog) {
      if (p.stock <= 0) continue;
      const plat = platformKey(p.platform);
      const matches =
        platform === 'X / Twitter'
          ? plat === 'X / Twitter' || p.platform === 'X'
          : p.platform === platform;
      if (!matches) continue;
      const prev = map.get(p.subtype) || { count: 0, stock: 0 };
      map.set(p.subtype, { count: prev.count + 1, stock: prev.stock + p.stock });
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, count: v.count, stock: v.stock }))
      .sort((a, b) => b.stock - a.stock);
  }, [platform, catalog, liveByPlatform]);

  const showSubtypeBar = platform !== 'All' && platformSubtypes.length >= 2;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((p) => {
      if (p.stock <= 0) return false;
      const plat = platformKey(p.platform);
      if (platform !== 'All') {
        if (platform === 'X / Twitter' && plat !== 'X / Twitter' && p.platform !== 'X') return false;
        if (platform !== 'X / Twitter' && p.platform !== platform) return false;
      }
      if (subtype && p.subtype !== subtype) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.platform.toLowerCase().includes(q) ||
        p.subtype.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, platform, subtype, catalog]);

  const activePromo = PROMO_SLIDES[slide];

  if (showMyLogs) {
    return <MyLogsPage onBack={() => setShowMyLogs(false)} session={session} />;
  }

  // Full-page product detail (AccsMarket-style) — replaces list, not a popup sheet
  if (selected) {
    return (
      <AccountDetail
        product={selected}
        wallet={walletBalance}
        onClose={() => setSelected(null)}
        onCheckoutBlocked={(msg) => setToast(msg)}
        onOpenLogs={() => setShowMyLogs(true)}
      />
    );
  }

  function selectPlatform(p: string) {
    setPlatform(p);
    if (LIVE_PLATFORM_SET.has(p) && !liveByPlatform[p]) {
      void loadPlatformStock(p);
    }
  }

  function selectSubtype(name: string | null) {
    setSubtype(name);
    setSubtypeDrawerOpen(false);
  }

  return (
    <div className="accounts-page">
      <header className="accounts-header">
        <button
          type="button"
          className="accounts-back-btn"
          onClick={onBack}
          aria-label="Back to Services"
        >
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
        <div className="accounts-header-titles">
          <h1>Buy Accounts & Logs</h1>
          <p>Instant delivery & aged logs</p>
        </div>
        <button
          type="button"
          className="accounts-orders-btn"
          onClick={() => setShowMyLogs(true)}
          aria-label="My Orders"
        >
          <Package size={15} strokeWidth={2.2} />
          <span>My Orders</span>
        </button>
      </header>

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

      <div className="accounts-chips" role="tablist" aria-label="Platforms">
        {PLATFORMS.map((p) => {
          const count =
            p === 'All'
              ? catalog.filter((prod) => prod.stock > 0).length
              : catalog.filter((prod) => {
                  if (prod.stock <= 0) return false;
                  if (p === 'X / Twitter') return prod.platform === 'X' || prod.platform === 'X / Twitter';
                  return prod.platform === p;
                }).length;
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={platform === p}
              className={platform === p ? 'chip active' : 'chip'}
              onClick={() => selectPlatform(p)}
            >
              <span>{p}</span>
              {count > 0 && <span className="chip-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {(() => {
        const anyLoading = Object.values(loadingPlatforms).some(Boolean);
        const isCurrentLoading =
          platform === 'All'
            ? anyLoading && catalog.length === 0
            : Boolean(loadingPlatforms[platform]);
        const isCurrentLive =
          platform === 'All'
            ? Object.values(liveByPlatform).some((st) => st.offers.length > 0)
            : Boolean(liveByPlatform[platform]?.offers.length);
        const currentLiveOffers = platform !== 'All' ? liveByPlatform[platform]?.offers : null;
        const allFeedsFailed =
          LIVE_PLATFORMS.every((p) => (liveByPlatform[p]?.offers.length ?? 0) === 0) &&
          LIVE_PLATFORMS.every((p) => errorByPlatform[p]);
        const currentError =
          platform !== 'All'
            ? errorByPlatform[platform]
            : allFeedsFailed
              ? 'Live stock feed is unavailable right now. Tap a platform to retry.'
              : null;

        return (
          <>
            <div className="accounts-meta-row">
              <strong>
                {isCurrentLoading
                  ? 'Loading live stock…'
                  : `${filtered.length} listing${filtered.length === 1 ? '' : 's'}`}
              </strong>
              <span className="live-dot">
                <i /> {isCurrentLive ? 'Live · In stock only' : 'In stock only'}
              </span>
            </div>
            {currentError && (!currentLiveOffers || currentLiveOffers.length === 0) && (
              <p className="accounts-catalog-hint" role="status">
                {currentError}
              </p>
            )}
          </>
        );
      })()}

      {showSubtypeBar && (
        <button
          type="button"
          className={`accounts-subtype-bar${subtype ? ' is-filtered' : ''}`}
          onClick={() => setSubtypeDrawerOpen(true)}
          aria-expanded={subtypeDrawerOpen}
          aria-haspopup="dialog"
        >
          <span className="subtype-bar-icon" aria-hidden>
            <FolderOpen size={16} />
          </span>
          <span className="subtype-bar-copy">
            {subtype ? (
              <>
                <strong>
                  {platform} › {subtype}
                </strong>
                <small>
                  {platformSubtypes.find((s) => s.name === subtype)?.count ?? 0} listing
                  {(platformSubtypes.find((s) => s.name === subtype)?.count ?? 0) === 1 ? '' : 's'}
                </small>
              </>
            ) : (
              <>
                <strong>
                  All {platform} Accounts ({filtered.length})
                </strong>
                <small>Tap to filter by type (Marketplace, Aged, Softreg…)</small>
              </>
            )}
          </span>
          <span className="subtype-bar-action">
            {subtype ? 'Change' : ''}
            <ChevronRight size={16} />
          </span>
        </button>
      )}

      <div className="accounts-promo">
        <div className="promo-slide">
          <img className="accounts-promo-logo" src="/brand/verxor-logo.svg" alt="Verxor" width="28" height="28" />
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

      <div className="accounts-list">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="account-card-row"
            onClick={() => setSelected(p)}
          >
            <div className="card-row-left">
              <div className="card-row-logo-wrap">
                <BrandLogo platform={p.platform} size={36} />
              </div>
            </div>
            <div className="card-row-main">
              <div className="card-row-eyebrow">
                <span className="card-platform-tag">{p.platform}</span>
                {p.badge && <span className={badgeClass(p.badge)}>{p.badge}</span>}
                {p.twoFa && <span className="card-mini-flag">2FA</span>}
                {p.cookies && <span className="card-mini-flag">COOKIES</span>}
              </div>
              <h3 className="card-row-title">{p.title}</h3>
              <div className="card-row-meta">
                <span className="card-meta-spec">
                  {p.age} · {p.country}
                  {p.tags[0] ? ` · ${p.tags[0]}` : ''}
                </span>
                <span className="card-meta-stock">
                  <i className="stock-dot" /> {p.stock.toLocaleString()} in stock
                </span>
              </div>
            </div>
            <div className="card-row-right">
              <div className="card-row-price-wrap">
                <strong className="card-row-price">{money(p.price)}</strong>
              </div>
              <button
                type="button"
                className="card-row-buy-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(p);
                }}
              >
                Buy →
              </button>
            </div>
          </div>
        ))}
      </div>

      {!filtered.length && !Object.values(loadingPlatforms).some(Boolean) && (
        <Card className="accounts-empty">
          <Package size={22} />
          <strong>No accounts match</strong>
          <p>Try another platform or clear search.</p>
        </Card>
      )}

      {subtypeDrawerOpen && showSubtypeBar && (
        <div className="sheet-backdrop subtype-drawer-backdrop" onClick={() => setSubtypeDrawerOpen(false)}>
          <div className="subtype-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="subtype-drawer-handle" />
            <div className="subtype-drawer-head">
              <div>
                <strong>{platform} Categories ({platformSubtypes.length})</strong>
                <p>Filter listings by type</p>
              </div>
              <button type="button" onClick={() => setSubtypeDrawerOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="subtype-option-list">
              <button
                type="button"
                className={`subtype-option${!subtype ? ' active' : ''}`}
                onClick={() => selectSubtype(null)}
              >
                <div className="subtype-option-main">
                  <strong>All {platform}</strong>
                  <small>{filtered.length} listings</small>
                </div>
                {!subtype && <Check size={16} />}
              </button>
              {platformSubtypes.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className={`subtype-option${subtype === s.name ? ' active' : ''}`}
                  onClick={() => selectSubtype(s.name)}
                >
                  <div className="subtype-option-main">
                    <strong>{s.name}</strong>
                    <small>
                      {s.count} · {s.stock.toLocaleString()} in stock
                    </small>
                  </div>
                  {subtype === s.name && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="accounts-toast">{toast}</div>}
    </div>
  );
}

function AccountDetail({
  product,
  wallet,
  onClose,
  onCheckoutBlocked,
  onOpenLogs,
}: {
  product: AccountProduct;
  wallet: number;
  onClose: () => void;
  onCheckoutBlocked: (msg: string) => void;
  onOpenLogs: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<{ orderId: string | null; credentials: string[]; totalNgn: number; warning?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const total = product.price * qty;
  const LIVE_CHECKOUT_SET = useMemo(
    () => new Set(['Facebook', 'Instagram', 'TikTok', 'X / Twitter', 'Telegram', 'X', 'Gmail', 'YouTube', 'Threads', 'WhatsApp', 'Mobile Proxies', 'Google Voice', 'Odnoklassniki', 'LinkedIn', 'Reddit', 'Indeed', 'Truth Social', 'AI Accounts', 'Google Ads', 'Bluesky', 'Snapchat', 'Discord', 'Twitch', 'Trustpilot', 'Quora', 'Dating Apps', 'Grindr', 'eHarmony', 'Badoo', 'Gaming', 'Premium Subscriptions', 'Mastercard', 'Apple', 'E-Commerce', 'Spotify', 'VPN', 'Netflix', 'Pinterest', 'Yahoo', 'CapCut', 'Phone & Messaging', 'Roblox', 'GitHub', 'Outlook']),
    [],
  );
  const isLiveListing = LIVE_CHECKOUT_SET.has(product.platform) && Number(product.providerListingId) > 0;
  const canPay = wallet >= total;

  async function submitPurchase() {
    if (buying) return;
    if (!isLiveListing) {
      setBuyError('Live checkout is currently available for Facebook, Instagram, TikTok, X / Twitter, Telegram, Gmail, YouTube, Threads, WhatsApp, Mobile Proxies, Google Voice, Odnoklassniki, LinkedIn, Reddit, Indeed, Truth Social, AI Accounts, Google Ads, Bluesky, Snapchat, Discord, Twitch, Trustpilot, Quora, Dating Apps, Grindr, eHarmony, Badoo, Gaming, Premium Subscriptions, Mastercard, Apple, E-Commerce, Spotify, VPN, Netflix, Pinterest, Yahoo, CapCut, Phone & Messaging, Roblox, GitHub, and Outlook.');
      return;
    }
    const token = loadSessionTokens()?.access_token;
    if (!token) {
      setBuyError('Your secure session has expired. Sign in again before purchasing.');
      return;
    }
    setBuying(true);
    setBuyError(null);
    try {
      const res = await fetch('/api/v1/accounts/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ providerListingId: product.providerListingId, quantity: qty, platform: product.platform }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Purchase could not be completed.');
      const credentials = Array.isArray(data.credentials) ? data.credentials.map(String) : [];
      if (!credentials.length) throw new Error('The provider confirmed the purchase, but no account details were returned. Contact support before retrying.');
      setPurchase({ orderId: data.orderId ? String(data.orderId) : null, credentials, totalNgn: Number(data.totalNgn) || total, warning: data.warning || undefined });
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('verxor:balance-refresh'));
    } catch (error) {
      setBuyError(error instanceof Error ? error.message : 'Purchase failed. Please try again.');
    } finally {
      setBuying(false);
    }
  }

  if (purchase) {
    return (
      <div className="account-detail-page account-purchase-result">
        <header className="detail-page-header">
          <button
            type="button"
            className="accounts-back-btn"
            onClick={onClose}
            aria-label="Back to listings"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </button>
          <strong className="account-result-header">Order delivered</strong>
          <span style={{ width: 40 }} />
        </header>
        <main className="account-result-body">
          <div className="account-result-icon"><CheckCircle2 size={30} /></div>
          <p className="account-result-kicker">PAYMENT CONFIRMED</p>
          <h1>Your account{purchase.credentials.length === 1 ? ' is' : 's are'} ready</h1>
          <p className="account-result-summary">{product.title} · {purchase.credentials.length} delivered · {money(purchase.totalNgn)}</p>
          {purchase.orderId && <p className="account-result-reference">Order reference <code>{purchase.orderId}</code></p>}
          {purchase.warning && <p className="account-result-warning" role="status">{purchase.warning}</p>}
          <section className="account-delivery-credentials" aria-label="Delivered account credentials">
            <div className="account-credentials-heading"><div><strong>Delivered credentials</strong><span>Keep these details private and secure.</span></div><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(purchase.credentials.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setBuyError('Clipboard access is unavailable. Select and copy the credentials manually.'); } }}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy all'}</button></div>
            <div className="account-credential-list">{purchase.credentials.map((line, index) => <code key={`${index}-${line}`}>{line}</code>)}</div>
          </section>
          {buyError && <p className="account-checkout-error" role="alert">{buyError}</p>}
          <div className="account-result-actions"><PrimaryButton className="detail-order-btn" onClick={onOpenLogs}>View My Logs <ArrowRight size={16} /></PrimaryButton><button type="button" className="account-secondary-action" onClick={onClose}>Continue browsing</button></div>
        </main>
      </div>
    );
  }

  return (
    <div className="account-detail-page">
      <header className="detail-page-header">
        <button
          type="button"
          className="accounts-back-btn"
          onClick={onClose}
          aria-label="Back to listings"
        >
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
        <div className="detail-page-header-center">
          <span className="accounts-eyebrow">{product.platform}</span>
          <strong>Account details</strong>
        </div>
        <button
          type="button"
          className="accounts-orders-btn"
          onClick={onOpenLogs}
          aria-label="My Orders"
        >
          <Package size={15} strokeWidth={2.2} />
          <span>My Orders</span>
        </button>
      </header>

      <div className="detail-page-hero">
        <div className="detail-page-hero-logo">
          <BrandLogo platform={product.platform} size={48} />
        </div>
        <div className="detail-page-hero-copy">
          <h1>{product.title}</h1>
          <p className="detail-page-meta">
            {product.age} · {product.country} ·{' '}
            <span className="detail-page-stock">{product.stock.toLocaleString()} in stock</span>
          </p>
          <div className="detail-page-flags">
            {product.badge && <span className={badgeClass(product.badge)}>{product.badge}</span>}
            {product.twoFa && <span className="card-mini-flag">2FA</span>}
            {product.cookies && <span className="card-mini-flag">COOKIES</span>}
            {product.instant && <span className="badge-instant">INSTANT</span>}
          </div>
        </div>
      </div>

      <div className="detail-page-body">
        <section className="detail-page-section">
          <h2 className="detail-section-title">Description</h2>
          <DescriptionBody text={product.description} />
        </section>

        {product.bullets.length > 0 && (
          <section className="detail-page-section">
            <h2 className="detail-section-title">Key features</h2>
            <ul className="detail-bullets">
              {product.bullets.map((b) => (
                <li key={b}>
                  <Check size={14} /> {b}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="detail-page-section">
          <h2 className="detail-section-title">Account format</h2>
          <div className="detail-format-pill">
            <code>{product.format}</code>
          </div>
        </section>

        <section className="detail-guarantee-box">
          <ShieldCheck size={16} />
          <div>
            <strong>24-hour replacement window</strong>
            <p>Invalid on delivery is replaced when reported within policy.</p>
          </div>
        </section>
      </div>

      <div className="detail-page-checkout">
        <div className="detail-qty-row">
          <span>Quantity</span>
          <div className="qty-stepper">
            <button type="button" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
              <Minus size={14} />
            </button>
            <strong>{qty}</strong>
            <button
              type="button"
              disabled={qty >= Math.min(10, product.stock)}
              onClick={() => setQty((q) => Math.min(10, product.stock, q + 1))}
              aria-label="Increase"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="detail-price-row">
          <div>
            <span>Total payable</span>
            <small>{money(product.price)} each</small>
          </div>
          <strong>{money(total)}</strong>
        </div>

        <div className="detail-wallet-indicator">
          <span>Wallet</span>
          <strong>{money(wallet)}</strong>
        </div>

        {buyError && <p className="account-checkout-error" role="alert">{buyError}</p>}
        <PrimaryButton
          className="detail-order-btn"
          disabled={buying || !isLiveListing}
          onClick={() => {
            if (!canPay) {
              onCheckoutBlocked('Insufficient wallet balance. Fund wallet to continue.');
              return;
            }
            void submitPurchase();
          }}
        >
          {buying ? 'Processing secure payment…' : isLiveListing ? (canPay ? `Pay ${money(total)}` : 'Fund Wallet') : 'Coming soon'}
          {!buying && <ArrowRight size={16} />}
        </PrimaryButton>

        <p className="detail-footnote">Secure wallet payment · Credentials are delivered here and saved to My Logs.</p>
      </div>
    </div>
  );
}

