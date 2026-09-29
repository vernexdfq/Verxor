'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock3,
  Gift,
  LayoutGrid,
  Tag,
  Wallet,
} from 'lucide-react';

type Currency = 'ALL' | 'USD' | 'CAD' | 'AUD' | 'EUR' | 'GBP' | 'SGD';

type Card = {
  id: string;
  name: string;
  rate: string;
  currency: Exclude<Currency, 'ALL'>;
  kind: 'apple' | 'steam' | 'razer' | 'xbox' | 'google' | 'sephora' | 'playstation' | 'amazon';
  popular?: boolean;
};

const currencies: Array<{ id: Currency; flag?: string }> = [
  { id: 'ALL' },
  { id: 'USD', flag: '🇺🇸' },
  { id: 'CAD', flag: '🇨🇦' },
  { id: 'AUD', flag: '🇦🇺' },
  { id: 'EUR', flag: '🇪🇺' },
  { id: 'GBP', flag: '🇬🇧' },
  { id: 'SGD', flag: '🇸🇬' },
];

const cards: Card[] = [
  { id: 'apple', name: 'iTunes / Apple', rate: '₦1,333.15', currency: 'USD', kind: 'apple', popular: true },
  { id: 'steam', name: 'Steam', rate: '₦1,281.88', currency: 'USD', kind: 'steam', popular: true },
  { id: 'razer', name: 'Razer Gold', rate: '₦1,154.71', currency: 'USD', kind: 'razer' },
  { id: 'xbox', name: 'Xbox', rate: '₦1,281.88', currency: 'USD', kind: 'xbox' },
  { id: 'google', name: 'Google Play', rate: '₦1,175.22', currency: 'USD', kind: 'google' },
  { id: 'sephora', name: 'Sephora', rate: '₦1,117.80', currency: 'USD', kind: 'sephora' },
  { id: 'playstation', name: 'PlayStation', rate: '₦1,247.50', currency: 'USD', kind: 'playstation' },
  { id: 'amazon', name: 'Amazon', rate: '₦1,210.36', currency: 'USD', kind: 'amazon' },
];

const trades = [
  { initial: 'J', line: 'j***N traded Steam AUD 85*3', amount: '₦175,207.95', time: '5 mins ago' },
  { initial: 'K', line: 'k***8 traded Apple $50', amount: '₦58,746.20', time: '8 mins ago' },
  { initial: 'A', line: 'a***1 traded Google Play $80', amount: '₦96,320.11', time: '12 mins ago' },
];

const promos = [
  {
    id: 1,
    title: 'Get 5% Bonus on Every Trade!',
    body: 'Trade your gift cards today and enjoy instant bonus on selected brands.',
  },
  {
    id: 2,
    title: 'Trade at Today\'s Live Rates',
    body: 'Check the latest available payout rate before you sell your gift card.',
  },
  {
    id: 3,
    title: 'Sell Your Gift Card Today',
    body: 'Submit your card and track your trade securely from Verxor.',
  },
];

function AppleLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="currentColor">
      <path d="M43.4 34.1c0-6.9 5.6-10.2 5.8-10.4-3.2-4.7-8.1-5.3-9.8-5.4-4.1-.4-8 2.4-10.1 2.4-2.1 0-5.3-2.4-8.7-2.3-4.5.1-8.6 2.6-10.9 6.6-4.7 8.1-1.2 20 3.4 26.6 2.2 3.2 4.8 6.7 8.3 6.5 3.3-.1 4.6-2.1 8.7-2.1 4 0 5.2 2.1 8.7 2 3.6-.1 5.8-3.2 8-6.4 2.5-3.7 3.5-7.3 3.6-7.5-.1-.1-7-2.7-7-10zM36.8 14c1.8-2.2 3-5.2 2.6-8.2-2.6.1-5.7 1.7-7.5 3.9-1.6 1.9-3.1 5-2.7 7.9 2.9.2 5.8-1.4 7.6-3.6z" />
    </svg>
  );
}

function SteamLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      <circle cx="32" cy="32" r="27" fill="currentColor" />
      <circle cx="42.5" cy="22" r="8.5" fill="white" />
      <circle cx="42.5" cy="22" r="4.2" fill="currentColor" />
      <circle cx="23" cy="39.5" r="7" fill="white" />
      <circle cx="23" cy="39.5" r="3.4" fill="currentColor" />
      <path d="M27.5 36.2l8.7-9.4" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

function XboxLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      <circle cx="32" cy="32" r="28" fill="white" />
      <path
        d="M17 21c5.3-4.6 10.3-6.8 15-6.8S41.7 16.4 47 21c-4.1-2.7-8.3-4.1-11.4-4.1-1.4 0-2.6.4-3.6 1.1-1-.7-2.2-1.1-3.6-1.1C25.3 16.9 21.1 18.3 17 21z"
        fill="currentColor"
      />
      <path
        d="M16 25c4.7 3.2 9.7 8.3 16 17.2C38.3 33.3 43.3 28.2 48 25c-.4 11.1-6.7 20.8-16 24-9.3-3.2-15.6-12.9-16-24z"
        fill="currentColor"
      />
      <path
        d="M22.2 17.9c3.6-3 7-4.4 9.8-4.4s6.2 1.4 9.8 4.4c-3.2-1.3-6.3-1.6-9.8.9-3.5-2.5-6.6-2.2-9.8-.9z"
        fill="currentColor"
      />
    </svg>
  );
}

function GooglePlayLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M11 8.5l27.4 23.1L11 55.5c-1.1-.8-1.8-2.2-1.8-3.9V12.4c0-1.7.7-3.1 1.8-3.9z"
        fill="#35A854"
      />
      <path
        d="M38.4 31.6L45.7 25l-8.8-5-25.9-14.6c-.6-.3-1.2-.5-1.8-.5l29.2 26.7z"
        fill="#4285F4"
      />
      <path
        d="M38.4 32.4L9.2 59.1c.6 0 1.2-.2 1.8-.5l25.9-14.6 8.8-5-7.3-6.6z"
        fill="#EA4335"
      />
      <path
        d="M45.7 25l8.6 4.9c2.3 1.3 2.3 4.6 0 5.9l-8.6 4.9-7.3-6.6 7.3-6.6z"
        fill="#FBBC04"
      />
    </svg>
  );
}

function PlayStationLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      <path
        d="M23 48V16.5c0-2.1 1.2-3.1 3.1-2.5 7.1 2.1 12.4 6.7 12.4 14.7v14.1l-8.1 3.2V29.9c0-3.2-1.4-5.1-4.1-6.2v25.5L23 48z"
        fill="white"
      />
      <path
        d="M39.8 26.4c5.5 1.6 9.4 4.2 9.4 7.7 0 3.2-3.1 5.1-8.1 5.8l-5.7-2.1c3.6-.6 5.8-1.7 5.8-3.4 0-1.7-1.7-2.8-5.2-3.9l3.8-4.1z"
        fill="white"
      />
      <path
        d="M16.5 37.6c0-3.4 3.6-5.8 9.5-6.7v5.3c-2.8.5-4.3 1.2-4.3 2.3 0 1.1 1.5 1.7 4.3 2.2l-4.9 2.1c-2.9-.9-4.6-2.6-4.6-5.2z"
        fill="white"
      />
    </svg>
  );
}

function RazerLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 64" className={className} aria-hidden="true" fill="none">
      <circle cx="31" cy="32" r="20" fill="#F4B51B" />
      <circle cx="31" cy="32" r="14" stroke="#FFE77A" strokeWidth="2" />
      <path
        d="M31 20l3.5 8.2 8.5 1.2-6.2 5.8 1.7 8.3-7.5-4.2-7.5 4.2 1.7-8.3-6.2-5.8 8.5-1.2L31 20z"
        fill="#D88B00"
      />
      <text x="56" y="26" fill="#8AD43B" fontSize="11" fontWeight="800" letterSpacing="1">
        RAZER
      </text>
      <text x="56" y="43" fill="white" fontSize="17" fontWeight="700">
        Gold
      </text>
    </svg>
  );
}

function SephoraLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 64" className={className} aria-hidden="true" fill="none">
      <text
        x="80"
        y="40"
        textAnchor="middle"
        fill="white"
        fontSize="22"
        fontWeight="500"
        letterSpacing="3"
      >
        SEPHORA
      </text>
    </svg>
  );
}

function AmazonLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 70" className={className} aria-hidden="true" fill="none">
      <text
        x="75"
        y="39"
        textAnchor="middle"
        fill="white"
        fontSize="25"
        fontWeight="700"
        letterSpacing="-1.2"
      >
        amazon
      </text>
      <path
        d="M38 48c23 10 49 10 72-1"
        stroke="#FF9900"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M105 45l6 2-5 5"
        stroke="#FF9900"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BrandLogo({
  kind,
  className = '',
}: {
  kind: Card['kind'];
  className?: string;
}) {
  if (kind === 'apple') return <AppleLogo className={className} />;
  if (kind === 'steam') return <SteamLogo className={className} />;
  if (kind === 'xbox') return <XboxLogo className={className} />;
  if (kind === 'google') return <GooglePlayLogo className={className} />;
  if (kind === 'playstation') return <PlayStationLogo className={className} />;
  if (kind === 'razer') return <RazerLogo className={className} />;
  if (kind === 'sephora') return <SephoraLogo className={className} />;
  return <AmazonLogo className={className} />;
}

function CardBrandTile({ card }: { card: Card }) {
  const backgrounds: Record<Card['kind'], string> = {
    apple: 'bg-gradient-to-br from-[#151515] via-[#050505] to-[#292929]',
    steam: 'bg-gradient-to-br from-[#123c58] via-[#09283d] to-[#071827]',
    razer: 'bg-gradient-to-br from-[#090909] via-[#050505] to-[#171717]',
    xbox: 'bg-gradient-to-br from-[#12a744] via-[#07933b] to-[#078132]',
    google: 'bg-gradient-to-br from-[#101010] via-[#080808] to-[#171717]',
    sephora: 'bg-gradient-to-br from-[#111111] to-[#000000]',
    playstation: 'bg-gradient-to-br from-[#0871d5] via-[#0756b4] to-[#06469c]',
    amazon: 'bg-gradient-to-br from-[#171717] via-[#090909] to-[#222222]',
  };

  return (
    <div
      className={`relative flex h-[56px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] ${backgrounds[card.kind]}`}
      aria-label={`${card.name} gift card logo`}
    >
      {card.kind === 'razer' ? (
        <RazerLogo className="h-[32px] w-[58px]" />
      ) : card.kind === 'sephora' ? (
        <SephoraLogo className="h-[30px] w-[58px]" />
      ) : card.kind === 'amazon' ? (
        <AmazonLogo className="h-[28px] w-[58px]" />
      ) : (
        <BrandLogo
          kind={card.kind}
          className={
            card.kind === 'apple'
              ? 'h-[30px] w-[30px] text-white'
              : card.kind === 'steam'
                ? 'h-[32px] w-[32px] text-white'
                : card.kind === 'xbox'
                  ? 'h-[32px] w-[32px]'
                  : card.kind === 'google'
                    ? 'h-[30px] w-[30px]'
                    : 'h-[34px] w-[34px]'
          }
        />
      )}
    </div>
  );
}

function PromoArtwork() {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-[-9px] hidden w-[51%] sm:block"
      aria-hidden="true"
    >
      <div className="absolute right-[7px] top-[13px] flex h-[68px] w-[68px] rotate-[7deg] items-center justify-center rounded-[15px] bg-gradient-to-br from-[#1688ff] to-[#0756ca] shadow-[0_12px_22px_rgba(4,64,150,0.25)]">
        <span className="absolute right-[-2px] top-[-8px] text-[16px] text-white">✦</span>
        <strong className="text-[27px] font-extrabold leading-none text-white">
          5%
          <small className="mt-0.5 block text-[9px] tracking-[0.5px]">BONUS</small>
        </strong>
      </div>
      <div className="absolute left-[22px] top-[63px] flex h-[92px] w-[76px] -rotate-[7deg] items-center justify-center rounded-[8px] bg-gradient-to-br from-white to-[#d9e5f5] shadow-[0_15px_20px_rgba(16,55,105,0.25)]">
        <AppleLogo className="h-[42px] w-[42px] text-[#071b42]" />
      </div>
      <div className="absolute bottom-[18px] right-[28px] flex h-[48px] w-[48px] rotate-[12deg] items-center justify-center rounded-[12px] bg-gradient-to-br from-[#123c58] to-[#071827] shadow-md">
        <SteamLogo className="h-[28px] w-[28px] text-white" />
      </div>
    </div>
  );
}

function GiftCardPromo({
  promo,
  index,
}: {
  promo: (typeof promos)[number];
  index: number;
}) {
  const gradient =
    index === 0
      ? 'from-[#0764e9] via-[#0d72f0] to-[#9ac9ff]'
      : index === 1
        ? 'from-[#075ad9] via-[#167cf1] to-[#a9d4ff]'
        : 'from-[#075fdc] via-[#147af0] to-[#b2d9ff]';

  return (
    <article
      className={`relative h-[244px] overflow-hidden rounded-[19px] bg-gradient-to-br ${gradient} px-[20px] py-[17px] shadow-[0_10px_28px_rgba(20,96,189,0.12)]`}
    >
      <div className="relative z-10 max-w-[58%]">
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          <Gift size={12} />
          LIMITED TIME BONUS
        </span>
        <h2 className="text-[22px] font-extrabold leading-tight text-white">{promo.title}</h2>
        <p className="mt-2 text-[13px] leading-snug text-white/90">{promo.body}</p>
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#0764e9] shadow-sm"
        >
          View Details
          <ArrowRight size={15} />
        </button>
      </div>
      <PromoArtwork />
    </article>
  );
}

export function GiftCardPage({ onBack }: { onBack?: () => void }) {
  const [currency, setCurrency] = useState<Currency>('ALL');
  const [promo, setPromo] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPromo((value) => (value + 1) % promos.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const visibleCards = useMemo(() => {
    if (currency === 'ALL') return cards;
    return cards.filter((card) => card.currency === currency);
  }, [currency]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28">
      <main className="mx-auto max-w-md px-4 pt-4">
        <header className="mb-4 flex items-center gap-3">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-[#E2E8F0]"
            type="button"
            onClick={onBack}
            aria-label="Back to Verxor dashboard"
          >
            <ArrowLeft size={22} className="text-[#0F172A]" />
          </button>
          <h1 className="text-[20px] font-bold text-[#0F172A]">Gift Card Trade</h1>
        </header>

        <section className="mb-4 grid grid-cols-2 gap-3" aria-label="Gift card actions">
          <button
            type="button"
            className="flex h-[52px] items-center justify-between rounded-2xl bg-white px-4 shadow-sm border border-[#E2E8F0]"
            aria-label="Open gift card wallet and withdrawal"
          >
            <span className="flex items-center gap-2 text-[14px] font-semibold text-[#0F172A]">
              <Wallet size={21} className="text-[#0767e9]" />
              Withdraw
            </span>
            <ChevronRight size={18} className="text-[#94A3B8]" />
          </button>
          <button
            type="button"
            className="flex h-[52px] items-center justify-between rounded-2xl bg-gradient-to-br from-[#0868e8] to-[#1475ee] px-4 text-white shadow-[0_7px_15px_rgba(11,102,231,0.16)]"
          >
            <span className="flex items-center gap-2 text-[14px] font-semibold">
              <Tag size={21} />
              Sell Now
            </span>
            <ChevronRight size={18} />
          </button>
        </section>

        <section className="mb-3" aria-label="Gift card promotions">
          <GiftCardPromo promo={promos[promo]} index={promo} />
          <div className="mt-3 flex items-center justify-center gap-2">
            {promos.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Promotion ${index + 1}`}
                onClick={() => setPromo(index)}
                className={`h-[8px] rounded-full transition-all ${
                  index === promo ? 'w-[8px] bg-[#1769df]' : 'w-[8px] bg-[#cbdcf3]'
                }`}
              />
            ))}
          </div>
        </section>

        <section
          className="mb-4 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm"
          aria-label="Live completed trades"
        >
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
            <strong className="flex items-center gap-2 text-[14px] font-bold text-[#0F172A]">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Live Completed Trades
            </strong>
            <button type="button" className="flex items-center gap-1 text-[12px] font-semibold text-[#1769df]">
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="flex overflow-x-auto">
            {trades.map((trade, index) => (
              <article
                key={trade.line}
                className={`flex h-[74px] min-w-[236px] items-center gap-[10px] px-[17px] ${
                  index !== trades.length - 1 ? 'border-r border-[#dce6f0]' : ''
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[14px] font-bold text-[#1769df]">
                  {trade.initial}
                </span>
                <div>
                  <strong className="block text-[12px] font-semibold text-[#0F172A]">{trade.line}</strong>
                  <p className="text-[12px] text-[#64748B]">
                    {trade.amount}{' '}
                    <small className="text-[#94A3B8]">{trade.time}</small>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-4" aria-label="Gift card currencies">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {currencies.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setCurrency(item.id)}
                className={`flex h-[58px] shrink-0 items-center gap-[8px] rounded-full border px-[17px] text-[13px] font-medium transition-all ${
                  currency === item.id
                    ? 'border-[#0767e9] bg-gradient-to-br from-[#0868e8] to-[#1475ee] text-white shadow-[0_7px_15px_rgba(11,102,231,0.16)]'
                    : 'border-[#e0e8f2] bg-white/65 text-[#64748a] shadow-[0_3px_8px_rgba(31,73,120,0.035)]'
                }`}
              >
                {item.flag && <span>{item.flag}</span>}
                {item.id === 'ALL' ? 'All' : item.id}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-[#0F172A]">Popular Gift Cards</h2>
            <button type="button" className="flex items-center gap-1 text-[12px] font-semibold text-[#1769df]">
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {visibleCards.map((card) => (
              <article
                key={card.id}
                className="relative flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm"
              >
                {card.popular && (
                  <span className="absolute right-3 top-3 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    Popular
                  </span>
                )}
                <CardBrandTile card={card} />
                <div className="min-w-0 flex-1">
                  <strong className="block text-[14px] font-bold text-[#0F172A]">{card.name}</strong>
                  <p className="text-[12px] font-semibold text-emerald-600">$1 = {card.rate}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-3 py-2 text-[12px] font-bold text-[#1769df]"
                >
                  Sell <ArrowRight size={13} />
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-w-md items-center justify-around border-t border-[#E2E8F0] bg-white/95 px-6 py-2.5 backdrop-blur-md"
        aria-label="Gift card navigation"
      >
        <button
          className="relative flex flex-col items-center gap-1 text-[11px] font-bold text-[#1769df]"
          type="button"
          aria-current="page"
        >
          <span className="absolute -top-2.5 h-0.5 w-8 rounded-full bg-[#1769df]" />
          <LayoutGrid size={22} />
          <span>Trade</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-[11px] font-medium text-[#94A3B8]"
          type="button"
        >
          <Clock3 size={22} />
          <span>History</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-[11px] font-medium text-[#94A3B8]"
          type="button"
        >
          <Wallet size={22} />
          <span>Wallet</span>
        </button>
      </nav>
    </div>
  );
}
