'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Copy,
  Database,
  Info,
  Radio,
  Search,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import './virtual-numbers-page.css';

/* Virtual Numbers — grade-1 fintech catalog: full categories, live counts, real logos */

type PoolId =
  | 'usa-economy'
  | 'usa-standard'
  | 'usa-fast'
  | 'usa-premium'
  | 'worldwide-economy'
  | 'worldwide-standard'
  | 'worldwide-fast'
  | 'worldwide-premium';

type Tier = 'ECO' | 'STD' | 'FAST' | 'PREMIUM';
type Location = 'USA' | 'Worldwide';

type Pool = {
  id: PoolId;
  title: string;
  server: 1 | 2;
  location: Location;
  hint: string;
  tier: Tier;
  fromNgn: number;
};

type Country = { code: string; flag: string; name: string; dial: string };

type ServiceCategory =
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

type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
};

type PriceOption = {
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
  expiresAt: number;
  createdAt: string;
};

type Step = 'pools' | 'services' | 'countries' | 'activations' | 'orders' | 'inbox';

const SERVER1_POOLS: Pool[] = [
  { id: 'usa-economy', title: 'USA · Economy', server: 1, location: 'USA', hint: 'Low cost (VoIP/Non-VoIP mix)', tier: 'ECO', fromNgn: 150 },
  { id: 'usa-standard', title: 'USA · Standard', server: 1, location: 'USA', hint: 'Reliable speed for standard apps', tier: 'STD', fromNgn: 380 },
  { id: 'worldwide-economy', title: 'Worldwide · Economy', server: 1, location: 'Worldwide', hint: 'Global coverage (VoIP/Non-VoIP mix)', tier: 'ECO', fromNgn: 280 },
  { id: 'worldwide-standard', title: 'Worldwide · Standard', server: 1, location: 'Worldwide', hint: 'Standard global delivery', tier: 'STD', fromNgn: 450 },
];

const SERVER2_POOLS: Pool[] = [
  { id: 'usa-fast', title: 'USA · Fast', server: 2, location: 'USA', hint: 'High OTP success (Non-VoIP)', tier: 'FAST', fromNgn: 620 },
  { id: 'usa-premium', title: 'USA · Premium', server: 2, location: 'USA', hint: 'Maximum reliability & instant delivery', tier: 'PREMIUM', fromNgn: 990 },
  { id: 'worldwide-fast', title: 'Worldwide · Fast', server: 2, location: 'Worldwide', hint: 'Fast global delivery', tier: 'FAST', fromNgn: 750 },
  { id: 'worldwide-premium', title: 'Worldwide · Premium', server: 2, location: 'Worldwide', hint: 'Premium routes & highest success', tier: 'PREMIUM', fromNgn: 1100 },
];

const USA_COUNTRY: Country = { code: 'US', flag: '🇺🇸', name: 'United States', dial: '+1' };

const WORLDWIDE_COUNTRIES: Country[] = [
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

const CATEGORIES: { id: ServiceCategory; label: string }[] = [
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

const SERVICES: Service[] = [
  { id: 'whatsapp', name: 'WhatsApp', category: 'messengers' },
  { id: 'telegram', name: 'Telegram', category: 'messengers' },
  { id: 'signal', name: 'Signal', category: 'messengers' },
  { id: 'discord', name: 'Discord', category: 'messengers' },
  { id: 'imo', name: 'Imo', category: 'messengers' },
  { id: 'viber', name: 'Viber', category: 'messengers' },
  { id: 'wechat', name: 'WeChat', category: 'messengers' },
  { id: 'line', name: 'LINE', category: 'messengers' },
  { id: 'skype', name: 'Skype', category: 'messengers' },
  { id: 'facebook', name: 'Facebook', category: 'social' },
  { id: 'instagram', name: 'Instagram + Threads', category: 'social' },
  { id: 'tiktok', name: 'TikTok', category: 'social' },
  { id: 'twitter', name: 'X (Twitter)', category: 'social' },
  { id: 'snapchat', name: 'Snapchat', category: 'social' },
  { id: 'linkedin', name: 'LinkedIn', category: 'social' },
  { id: 'reddit', name: 'Reddit', category: 'social' },
  { id: 'tinder', name: 'Tinder', category: 'dating' },
  { id: 'badoo', name: 'Badoo', category: 'dating' },
  { id: 'bumble', name: 'Bumble', category: 'dating' },
  { id: 'hinge', name: 'Hinge', category: 'dating' },
  { id: 'steam', name: 'Steam', category: 'games' },
  { id: 'pubg', name: 'PUBG Mobile', category: 'games' },
  { id: 'mobilelegends', name: 'Mobile Legends', category: 'games' },
  { id: 'freefire', name: 'Free Fire', category: 'games' },
  { id: 'roblox', name: 'Roblox', category: 'games' },
  { id: 'amazon', name: 'Amazon', category: 'marketplace' },
  { id: 'ebay', name: 'eBay', category: 'marketplace' },
  { id: 'alibaba', name: 'Alibaba', category: 'marketplace' },
  { id: 'etsy', name: 'Etsy', category: 'marketplace' },
  { id: 'paypal', name: 'PayPal', category: 'payments' },
  { id: 'googlepay', name: 'Google Pay', category: 'payments' },
  { id: 'wise', name: 'Wise', category: 'payments' },
  { id: 'revolut', name: 'Revolut', category: 'payments' },
  { id: 'cashapp', name: 'Cash App', category: 'payments' },
  { id: 'ubereats', name: 'Uber Eats', category: 'food' },
  { id: 'doordash', name: 'DoorDash', category: 'food' },
  { id: 'deliveroo', name: 'Deliveroo', category: 'food' },
  { id: 'walmart', name: 'Walmart', category: 'shops' },
  { id: 'nike', name: 'Nike', category: 'shops' },
  { id: 'shopify', name: 'Shopify', category: 'shops' },
  { id: 'bet365', name: 'Bet365', category: 'betting' },
  { id: 'betway', name: 'Betway', category: 'betting' },
  { id: '1xbet', name: '1xBet', category: 'betting' },
  { id: 'uber', name: 'Uber', category: 'taxi' },
  { id: 'lyft', name: 'Lyft', category: 'taxi' },
  { id: 'bolt', name: 'Bolt', category: 'taxi' },
  { id: 'grab', name: 'Grab', category: 'taxi' },
  { id: 'google', name: 'Google / Gmail / YouTube', category: 'other' },
  { id: 'microsoft', name: 'Microsoft / Outlook', category: 'other' },
  { id: 'apple', name: 'Apple', category: 'other' },
  { id: 'netflix', name: 'Netflix', category: 'other' },
  { id: 'spotify', name: 'Spotify', category: 'other' },
  { id: 'openai', name: 'OpenAI / ChatGPT', category: 'other' },
  { id: 'twitch', name: 'Twitch', category: 'other' },
];
