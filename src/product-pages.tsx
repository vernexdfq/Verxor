'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FolderOpen,
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
import type { AuthSession } from './auth/AuthFlow';

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
