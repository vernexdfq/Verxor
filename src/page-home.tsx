'use client';

import {
  ArrowRight,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Globe,
  History,
  Phone,
  PhoneCall,
  Plus,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Page } from './types';
import type { ServiceView } from './service-pages';

const wallet = { amount: '7,570.00', symbol: '₦' };

/** Global services only — Nigerian VTU lives on Services page */
const QUICK_ACTIONS: {
  id: string;
  title: string;
  icon: typeof Phone;
  tone: string;
  service?: ServiceView;
}[] = [
  { id: 'virtual-numbers', title: 'Virtual Number', icon: Phone, tone: 'qa-blue', service: 'virtual-numbers' },
  { id: 'boost', title: 'Boost Account', icon: Rocket, tone: 'qa-purple', service: 'boost' },
  { id: 'accounts', title: 'Buy Logs', icon: FileText, tone: 'qa-amber', service: 'accounts' },
  { id: 'rental', title: 'Rent Number', icon: PhoneCall, tone: 'qa-teal', service: 'rental' },
  { id: 'esim', title: 'eSIM', icon: Globe, tone: 'qa-royal', service: 'esim' },
  { id: 'proxies', title: 'Proxies', icon: ShieldCheck, tone: 'qa-green', service: 'proxies' },
  { id: 'gift', title: 'Gift Card', icon: Gift, tone: 'qa-pink', service: 'gift-card' },
  { id: 'vcard', title: 'Virtual Card', icon: CreditCard, tone: 'qa-slate', service: 'virtual-card' },
];

/** 8 promo slides — each opens its service */
const PROMO_SLIDES: {
  id: string;
  badge: string;
  headline: string;
  subtext: string;
  cta: string;
  service?: ServiceView;
  accent: string;
}[] = [
  {
    id: 'virtual-number',
    badge: 'INSTANT NUMBERS',
    headline: 'Get a number in seconds',
    subtext: 'OTP for WhatsApp, Telegram & more.',
    cta: 'Get Number',
    service: 'virtual-numbers',
    accent: 'promo-accent-blue',
  },
  {
    id: 'boost-account',
    badge: 'SOCIAL GROWTH',
    headline: 'Boost your social reach',
    subtext: 'Followers, likes & views — tracked.',
    cta: 'Boost Now',
    service: 'boost',
    accent: 'promo-accent-purple',
  },
  {
    id: 'buy-logs',
    badge: 'MARKETPLACE',
    headline: 'Browse digital logs',
    subtext: 'Verified accounts with instant delivery.',
    cta: 'Explore Logs',
    service: 'accounts',
    accent: 'promo-accent-amber',
  },
  {
    id: 'rent-number',
    badge: 'NUMBER RENTAL',
    headline: 'Rent dedicated lines',
    subtext: 'Long-term SMS & call numbers.',
    cta: 'Rent Line',
    service: 'rental',
    accent: 'promo-accent-teal',
  },
  {
    id: 'esim',
    badge: 'eSIM',
    headline: 'Stay connected abroad',
    subtext: 'Digital SIM profiles for travel.',
    cta: 'Get eSIM',
    service: 'esim',
    accent: 'promo-accent-sky',
  },
  {
    id: 'proxies',
    badge: 'PROXIES',
    headline: 'Secure residential IPs',
    subtext: 'Residential & datacenter proxies.',
    cta: 'Browse Proxies',
    service: 'proxies',
    accent: 'promo-accent-green',
  },
  {
    id: 'gift-card',
    badge: 'GIFT CARDS',
    headline: 'Trade gift cards easily',
    subtext: 'Buy from users or redeem brands.',
    cta: 'Open Cards',
    service: 'gift-card',
    accent: 'promo-accent-pink',
  },
  {
    id: 'virtual-card',
    badge: 'VIRTUAL CARDS',
    headline: 'Pay anywhere online',
    subtext: 'Dollar & local cards for checkout.',
    cta: 'Get Card',
    service: 'virtual-card',
    accent: 'promo-accent-indigo',
  },
];
