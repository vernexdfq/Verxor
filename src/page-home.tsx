'use client';

import {
  ArrowRight,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  History,
  Phone,
  PhoneCall,
  PhoneForwarded,
  Plus,
  Rocket,
  Store,
  Wifi,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { Page } from './types';
import type { ServiceView } from './service-pages';

type PromoSlide = {
  id: string;
  title: string;
  headline: string;
  subtext: string;
  badge: string;
  cta: string;
  image: string;
  link: string;
};

export const PROMO_SLIDES: PromoSlide[] = [
  { id: 'virtual-number', title: 'Virtual Number', headline: 'Get a Number in Seconds', subtext: 'Instant OTP verification for WhatsApp, Telegram & more.', badge: 'INSTANT NUMBERS', cta: 'Get Number ↗', image: '/banners/virtual-number.webp', link: '/services/virtual-number' },
  { id: 'boost-account', title: 'Boost Account', headline: 'Boost Your Social Growth', subtext: 'Gain followers, likes, and views instantly.', badge: 'SOCIAL GROWTH', cta: 'Boost Now ↗', image: '/banners/boost-account.webp', link: '/services/boost-account' },
  { id: 'buy-logs', title: 'Buy Logs', headline: 'Browse Digital Logs', subtext: 'Instant delivery on verified accounts & access logs.', badge: 'MARKETPLACE', cta: 'Explore Logs ↗', image: '/banners/buy-logs.webp', link: '/services/buy-logs' },
  { id: 'rent-number', title: 'Rent Number', headline: 'Rent Dedicated Lines', subtext: 'Keep virtual numbers active for long-term SMS & calls.', badge: 'NUMBER RENTAL', cta: 'Rent Line ↗', image: '/banners/rent-number.webp', link: '/services/rent-number' },
  { id: 'data-bundles', title: 'Data Bundles', headline: 'Stay Connected Anywhere', subtext: 'Instant high-speed mobile data top-ups at cheap rates.', badge: 'CHEAPEST DATA', cta: 'Buy Data ↗', image: '/banners/data-bundles.webp', link: '/services/data' },
  { id: 'airtime', title: 'Airtime', headline: 'Top Up Airtime in One Tap', subtext: 'Instant airtime refill for all major networks.', badge: 'AIRTIME', cta: 'Top Up ↗', image: '/banners/airtime.webp', link: '/services/airtime' },
  { id: 'gift-cards', title: 'Gift Cards', headline: 'Instant Gift Cards', subtext: 'Buy & redeem popular brand gift cards with ease.', badge: 'GIFT CARDS', cta: 'Shop Cards ↗', image: '/banners/gift-cards.webp', link: '/services/gift-cards' },
  { id: 'virtual-card', title: 'Virtual Card', headline: 'Pay Anywhere Online', subtext: 'Create dollar & local virtual cards for global checkout.', badge: 'VIRTUAL CARDS', cta: 'Get Card ↗', image: '/banners/virtual-card.webp', link: '/services/virtual-card' },
];

const BANNER_ASSET_FALLBACKS: Record<string, string> = {
  'virtual-number': '/banners/virtual-numbers.svg',
  'boost-account': '/banners/boost-account.svg',
  'buy-logs': '/banners/buy-logs.svg',
  'rent-number': '/banners/rent-number.svg',
  'data-bundles': '/banners/data-bundles.svg',
  airtime: '/banners/airtime-topup.svg',
  'gift-cards': '/banners/gift-cards.svg',
  'virtual-card': '/banners/virtual-card.svg',
};

type QuickAction = {
  id: string;
  title: string;
  service: ServiceView;
  icon: typeof Phone;
  iconClass: string;
  iconBg: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'virtual-number', title: 'Virtual Number', service: 'virtual-numbers', icon: Phone, iconClass: 'text-[#2563EB]', iconBg: 'bg-blue-50' },
  { id: 'boost-account', title: 'Boost Account', service: 'boost', icon: Rocket, iconClass: 'text-violet-600', iconBg: 'bg-violet-50' },
  { id: 'buy-logs', title: 'Buy Logs', service: 'accounts', icon: Store, iconClass: 'text-amber-500', iconBg: 'bg-amber-50' },
  { id: 'rent-number', title: 'Rent Number', service: 'rental', icon: PhoneCall, iconClass: 'text-emerald-600', iconBg: 'bg-emerald-50' },
  { id: 'data', title: 'Data', service: 'data', icon: Wifi, iconClass: 'text-sky-600', iconBg: 'bg-sky-50' },
  { id: 'airtime', title: 'Airtime', service: 'airtime', icon: PhoneForwarded, iconClass: 'text-teal-600', iconBg: 'bg-teal-50' },
  { id: 'gift-card', title: 'Gift Card', service: 'gift-card', icon: Gift, iconClass: 'text-pink-500', iconBg: 'bg-pink-50' },
  { id: 'virtual-card', title: 'Virtual Card', service: 'virtual-card', icon: CreditCard, iconClass: 'text-indigo-600', iconBg: 'bg-indigo-50' },
];

const SLIDE_TO_SERVICE: Record<string, ServiceView> = {
  'virtual-number': 'virtual-numbers',
  'boost-account': 'boost',
  'buy-logs': 'accounts',
  'rent-number': 'rental',
  'data-bundles': 'data',
  airtime: 'airtime',
  'gift-cards': 'gift-card',
  'virtual-card': 'virtual-card',
};

const wallet = { amount: '7,570.00', symbol: '₦' };

export function HomePage({ go, openService }: { go: (page: Page) => void; openService: (view: ServiceView) => void }) {
  const [showBalance, setShowBalance] = useState(true);
  const [promoIndex, setPromoIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const currentSlide = PROMO_SLIDES[promoIndex];

  const nextSlide = () => setPromoIndex((index) => (index + 1) % PROMO_SLIDES.length);
  const previousSlide = () => setPromoIndex((index) => (index - 1 + PROMO_SLIDES.length) % PROMO_SLIDES.length);

  useEffect(() => {
    if (dragging) return;
    const timer = window.setInterval(nextSlide, 5000);
    return () => window.clearInterval(timer);
  }, [dragging]);

  const displayBalance = useMemo(
    () => (showBalance ? `${wallet.symbol}${wallet.amount}` : `${wallet.symbol}••••••`),
    [showBalance],
  );

  return (
    <div className="flex flex-col gap-5 pb-2">
      <section aria-label="Wallet balance" className="relative overflow-hidden rounded-[24px] bg-[#0F172A] p-5 text-white shadow-[0_14px_34px_rgba(15,23,42,0.18)]">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-500/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.12em] text-slate-400">AVAILABLE BALANCE</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Active</span>
        </div>
        <div className="relative z-10 mt-4 flex items-center gap-3">
          <strong className="text-[32px] font-extrabold leading-none tracking-[-0.035em] sm:text-[36px]">{displayBalance}</strong>
          <button type="button" aria-label={showBalance ? 'Hide balance' : 'Show balance'} onClick={() => setShowBalance((value) => !value)} className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15">
            {showBalance ? <Eye size={17} /> : <EyeOff size={17} />}
          </button>
        </div>
        <div className="relative z-10 mt-5 grid grid-cols-[1.2fr_1fr] gap-2.5">
          <button type="button" onClick={() => go('fund')} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] px-3 text-[13px] font-bold text-white transition hover:bg-blue-700"><Plus size={18} strokeWidth={2.6} />Fund Wallet</button>
          <button type="button" onClick={() => go('history')} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 text-[13px] font-bold text-white transition hover:bg-white/15"><History size={16} />History</button>
        </div>
      </section>

      <section aria-label="Quick actions">
        <p className="mb-3 text-[11px] font-bold tracking-[0.1em] text-slate-400">QUICK ACTIONS</p>
        <div className="grid grid-cols-4 gap-2.5">
          {QUICK_ACTIONS.map(({ id, title, service, icon: Icon, iconClass, iconBg }) => (
            <motion.button key={id} type="button" whileTap={{ scale: 0.97 }} onClick={() => openService(service)} className="flex h-[105px] w-full flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-3.5 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
              <span className={`mb-2 flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg} ${iconClass}`}><Icon className="h-5 w-5" strokeWidth={1.9} /></span>
              <strong className="line-clamp-2 text-[11px] font-semibold leading-tight text-slate-700">{title}</strong>
            </motion.button>
          ))}
        </div>
      </section>

      <section aria-label="Verxor promotions" className="mt-[-2px]">
        <div className="relative overflow-hidden rounded-[24px] shadow-[0_10px_28px_rgba(15,23,42,0.14)]">
          <AnimatePresence initial={false} mode="wait">
            <motion.button key={currentSlide.id} type="button" aria-label={`${currentSlide.title}: ${currentSlide.headline}`} onClick={() => openService(SLIDE_TO_SERVICE[currentSlide.id])} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.16} onDragStart={() => setDragging(true)} onDragEnd={(_, info) => { setDragging(false); if (info.offset.x < -60) nextSlide(); if (info.offset.x > 60) previousSlide(); }} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.28, ease: 'easeOut' }} className="group relative block min-h-[190px] w-full overflow-hidden bg-[#0F172A] text-left sm:min-h-[205px]">
              <img src={BANNER_ASSET_FALLBACKS[currentSlide.id]} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/95 via-[#0F172A]/78 to-[#0F172A]/20" />
              <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-blue-500/10 to-transparent" />
              <div className="relative z-10 flex min-h-[190px] max-w-[82%] flex-col justify-between p-5 sm:min-h-[205px] sm:p-6">
                <div>
                  <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[9px] font-bold tracking-[0.1em] text-blue-100 backdrop-blur-md">{currentSlide.badge}</span>
                  <h2 className="mt-2 text-[19px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[21px]">{currentSlide.headline}</h2>
                  <p className="mt-1.5 max-w-[290px] text-[11px] leading-[17px] text-slate-300 sm:text-xs">{currentSlide.subtext}</p>
                </div>
                <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-[11px] font-bold text-slate-900 shadow-sm transition group-hover:bg-slate-100">{currentSlide.cta}<ArrowRight size={13} /></span>
              </div>
            </motion.button>
          </AnimatePresence>
        </div>
        <div className="mt-2.5 flex items-center justify-center gap-1.5" role="tablist" aria-label="Promotion slides">
          {PROMO_SLIDES.map((slide, index) => (
            <button key={slide.id} type="button" role="tab" aria-selected={index === promoIndex} aria-label={`Go to ${slide.title}`} onClick={() => setPromoIndex(index)} className={`h-1.5 rounded-full transition-all ${index === promoIndex ? 'w-5 bg-[#1877F2]' : 'w-1.5 bg-slate-300'}`} />
          ))}
        </div>
      </section>

      <section aria-label="Recent activity" className="mt-[-2px]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold tracking-[0.1em] text-slate-400">RECENT ACTIVITY</p>
          <button type="button" onClick={() => go('history')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#1877F2] transition hover:underline">View all<ChevronRight size={14} /></button>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><Clock3 size={17} /></div>
          <div className="min-w-0 text-left"><strong className="block text-[13px] font-semibold text-slate-800">No recent activity</strong><p className="mt-0.5 text-xs leading-[17px] text-slate-400">Your wallet activity and orders will appear here.</p></div>
        </div>
      </section>
    </div>
  );
}
