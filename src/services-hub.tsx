'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  FileText,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Phone,
  PhoneCall,
  PhoneForwarded,
  Rocket,
  Search,
  ShieldCheck,
  Tv,
  Wifi,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ServiceView } from './service-pages';
import './services-hub.css';

type ServiceItem = {
  id: string;
  title: string;
  description: string;
  tone: string;
  icon: LucideIcon;
  service?: ServiceView;
  tags: string[];
};

/** Nigerian VTU services — bold on Services page */
const ADDITIONAL: ServiceItem[] = [
  {
    id: 'data',
    title: 'Data',
    description: 'Cheap mobile data bundles.',
    tone: 'svc-sky',
    icon: Wifi,
    service: 'data',
    tags: ['data', 'bundle', 'mtn', 'glo'],
  },
  {
    id: 'airtime',
    title: 'Airtime',
    description: 'Top up all networks.',
    tone: 'svc-teal',
    icon: PhoneForwarded,
    service: 'airtime',
    tags: ['airtime', 'topup'],
  },
  {
    id: 'tv',
    title: 'TV Sub / Cable',
    description: 'Renew DStv, GOtv, and more.',
    tone: 'svc-rose',
    icon: Tv,
    service: 'tv-cable',
    tags: ['dstv', 'gotv', 'cable', 'tv'],
  },
  {
    id: 'electricity',
    title: 'Electricity',
    description: 'Prepaid meter top-ups fast.',
    tone: 'svc-yellow',
    icon: Zap,
    service: 'electricity',
    tags: ['electricity', 'prepaid', 'nepa', 'phcn'],
  },
  {
    id: 'exam-pin',
    title: 'Exam Pin',
    description: 'Purchase results pins effortlessly.',
    tone: 'svc-green',
    icon: GraduationCap,
    service: 'exam-pin',
    tags: ['waec', 'neco', 'jamb', 'pin'],
  },
  {
    id: 'bet-wallet',
    title: 'Bet Wallet',
    description: 'Fund betting wallets instantly.',
    tone: 'svc-orange',
    icon: Gamepad2,
    service: 'bet-wallet',
    tags: ['betting', 'sportybet', 'bet9ja'],
  },
];

/** Same 8 global services as Home quick actions — for discovery */
const POPULAR: ServiceItem[] = [
  {
    id: 'virtual-number',
    title: 'Virtual Number',
    description: 'Instant OTP verification.',
    tone: 'svc-blue',
    icon: Phone,
    service: 'virtual-numbers',
    tags: ['otp', 'sms', 'whatsapp', 'telegram'],
  },
  {
    id: 'boost',
    title: 'Boost Account',
    description: 'Social growth orders.',
    tone: 'svc-purple',
    icon: Rocket,
    service: 'boost',
    tags: ['smm', 'instagram', 'tiktok'],
  },
  {
    id: 'buy-logs',
    title: 'Buy Logs',
    description: 'Verified accounts & logs.',
    tone: 'svc-amber',
    icon: FileText,
    service: 'accounts',
    tags: ['accounts', 'logs'],
  },
  {
    id: 'rent-number',
    title: 'Rent Number',
    description: 'Dedicated rental lines.',
    tone: 'svc-emerald',
    icon: PhoneCall,
    service: 'rental',
    tags: ['rental', 'dedicated'],
  },
  {
    id: 'esim',
    title: 'eSIM Profiles',
    description: 'Global connectivity instantly.',
    tone: 'svc-indigo',
    icon: Globe,
    service: 'esim',
    tags: ['esim', 'roaming', 'sim', 'global'],
  },
  {
    id: 'proxies',
    title: 'Proxies (IP)',
    description: 'Secure residential & datacenter IPs.',
    tone: 'svc-cyan',
    icon: ShieldCheck,
    service: 'proxies',
    tags: ['proxy', 'ip', 'residential'],
  },
  {
    id: 'gift-card',
    title: 'Gift Card',
    description: 'Buy & trade gift cards.',
    tone: 'svc-pink',
    icon: Gift,
    service: 'gift-card',
    tags: ['gift', 'trade'],
  },
  {
    id: 'virtual-card',
    title: 'Virtual Card',
    description: 'Online payment cards.',
    tone: 'svc-slate',
    icon: CreditCard,
    service: 'virtual-card',
    tags: ['card', 'usd', 'virtual'],
  },
];
