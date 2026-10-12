'use client';

import { useMemo, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  Coins,
  Hash,
  Inbox,
  Info,
  Link2,
  RefreshCw,
  Rocket,
  Search,
  Wallet,
  X,
  AlertTriangle,
} from 'lucide-react';
import './boost-page.css';

type PlatformId =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'facebook'
  | 'x'
  | 'telegram'
  | 'spotify'
  | 'audiomack';

type BoostService = {
  id: string;
  platform: PlatformId;
  title: string;
  ratePer1000: number;
  min: number;
  max: number;
};

type Category = {
  id: PlatformId;
  label: string;
  placeholder: string;
  linkHint: string;
  urlPattern: RegExp;
};

type OrderStatus = 'pending' | 'processing' | 'completed' | 'partial' | 'canceled';

type BoostOrder = {
  id: string;
  serviceTitle: string;
  platform: PlatformId;
  targetUrl: string;
  quantity: number;
  amount: number;
  status: OrderStatus;
  createdAt: string;
};

const CATEGORIES: Category[] = [
  { id: 'tiktok', label: 'TikTok', placeholder: 'https://www.tiktok.com/@username', linkHint: 'Paste your TikTok profile or video link', urlPattern: /tiktok\.com/i },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://www.instagram.com/p/yourpost/', linkHint: 'Paste your Instagram post or profile link', urlPattern: /instagram\.com/i },
  { id: 'youtube', label: 'YouTube', placeholder: 'https://www.youtube.com/watch?v=', linkHint: 'Paste your YouTube video or channel link', urlPattern: /(youtube\.com|youtu\.be)/i },
  { id: 'facebook', label: 'Facebook', placeholder: 'https://www.facebook.com/', linkHint: 'Paste your Facebook page or post link', urlPattern: /facebook\.com/i },
  { id: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/username', linkHint: 'Paste your X profile or post link', urlPattern: /(x\.com|twitter\.com)/i },
  { id: 'telegram', label: 'Telegram', placeholder: 'https://t.me/channel', linkHint: 'Paste your Telegram channel or post link', urlPattern: /t\.me/i },
  { id: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/', linkHint: 'Paste your Spotify track or playlist link', urlPattern: /spotify\.com/i },
  { id: 'audiomack', label: 'Audiomack', placeholder: 'https://audiomack.com/', linkHint: 'Paste your Audiomack track or profile link', urlPattern: /audiomack\.com/i },
];

const SERVICES: BoostService[] = [
  { id: 'tt-followers-guaranteed', platform: 'tiktok', title: 'TikTok Followers [Max 10M] [LQ Profile] [Refill: 10D] [Instant Start] 200K/Day', ratePer1000: 4858.67, min: 10, max: 1_000_000 },
  { id: 'tt-followers-hq', platform: 'tiktok', title: 'TikTok Followers [HQ] [Refill: 30D] [Max 500K] 50K/Day', ratePer1000: 8200, min: 50, max: 500_000 },
  { id: 'tt-likes', platform: 'tiktok', title: 'TikTok Likes [Instant] [Max 5M] [No Refill] 500K/Day', ratePer1000: 1100, min: 50, max: 5_000_000 },
  { id: 'tt-views', platform: 'tiktok', title: 'TikTok Views [Real] [Max 10M] [Instant Start] 1M/Day', ratePer1000: 250, min: 500, max: 10_000_000 },
  { id: 'ig-followers', platform: 'instagram', title: 'Instagram Followers [Max 50K] [Refill: 30D] [HQ] 10K/Day', ratePer1000: 2500, min: 100, max: 50_000 },
  { id: 'ig-likes', platform: 'instagram', title: 'Instagram Likes [Instant] [Max 100K] [No Drop] 50K/Day', ratePer1000: 800, min: 50, max: 100_000 },
  { id: 'ig-views', platform: 'instagram', title: 'Instagram Views / Reels [Max 500K] [Instant] 100K/Day', ratePer1000: 300, min: 100, max: 500_000 },
  { id: 'yt-subs', platform: 'youtube', title: 'YouTube Subscribers [Refill: 30D] [Max 10K] [HQ]', ratePer1000: 12000, min: 50, max: 10_000 },
  { id: 'yt-views', platform: 'youtube', title: 'YouTube Views [Retention 60%] [Max 100K] [Speed 20K/Day]', ratePer1000: 1500, min: 100, max: 100_000 },
  { id: 'fb-page-likes', platform: 'facebook', title: 'Facebook Page Likes [Max 20K] [Refill: 15D]', ratePer1000: 4000, min: 50, max: 20_000 },
  { id: 'fb-followers', platform: 'facebook', title: 'Facebook Followers [Max 20K] [Instant Start]', ratePer1000: 4500, min: 50, max: 20_000 },
  { id: 'x-followers', platform: 'x', title: 'X Followers [Max 20K] [Refill: 30D] [HQ]', ratePer1000: 5000, min: 50, max: 20_000 },
  { id: 'x-likes', platform: 'x', title: 'X Likes [Instant] [Max 50K]', ratePer1000: 1200, min: 50, max: 50_000 },
  { id: 'tg-members', platform: 'telegram', title: 'Telegram Channel Members [Max 50K] [Real]', ratePer1000: 3500, min: 100, max: 50_000 },
  { id: 'spotify-plays', platform: 'spotify', title: 'Spotify Plays [Max 1M] [Premium Accounts]', ratePer1000: 1800, min: 500, max: 1_000_000 },
  { id: 'audiomack-plays', platform: 'audiomack', title: 'Audiomack Plays [Max 500K] [Real]', ratePer1000: 900, min: 100, max: 500_000 },
];

const CATEGORY_CHIPS: { id: PlatformId; label: string }[] = [
  { id: 'tiktok', label: 'TikTok Followers [Guaranteed]' },
  { id: 'instagram', label: 'Instagram Growth' },
  { id: 'youtube', label: 'YouTube Growth' },
  { id: 'facebook', label: 'Facebook Growth' },
  { id: 'x', label: 'X (Twitter) Growth' },
  { id: 'telegram', label: 'Telegram Growth' },
  { id: 'spotify', label: 'Spotify Plays' },
  { id: 'audiomack', label: 'Audiomack Plays' },
];

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQty(n: number) {
  return n.toLocaleString('en-NG');
}

export function BoostPage({ onBack, balanceNgn = 0 }: { onBack: () => void; balanceNgn?: number }) {
  const WALLET_BALANCE = balanceNgn;
  const [categoryId, setCategoryId] = useState<PlatformId | ''>('');
  const [serviceId, setServiceId] = useState('');
  const [link, setLink] = useState('');
  const [qty, setQty] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [svcOpen, setSvcOpen] = useState(false);
  const [orders, setOrders] = useState<BoostOrder[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const categoryChip = CATEGORY_CHIPS.find((c) => c.id === categoryId);
  const servicesForCat = useMemo(
    () => (categoryId ? SERVICES.filter((s) => s.platform === categoryId) : []),
    [categoryId],
  );
  const selected = servicesForCat.find((s) => s.id === serviceId);
  const qtyNum = Number(qty);
  const qtyValid = Number.isFinite(qtyNum) && qtyNum > 0;
  const total = useMemo(() => {
    if (!selected || !qtyValid) return 0;
    return Math.round((qtyNum / 1000) * selected.ratePer1000 * 100) / 100;
  }, [selected, qtyNum, qtyValid]);
  const insufficient = total > 0 && total > WALLET_BALANCE;
  const formReady = !!selected && !!link.trim() && qtyValid && total > 0;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const handlePlaceOrder = async () => {
    if (!formReady || !selected || insufficient) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    setOrders((prev) => [{
      id: 'BX-' + Date.now().toString(36).toUpperCase(),
      serviceTitle: selected.title,
      platform: selected.platform,
      targetUrl: link.trim(),
      quantity: qtyNum,
      amount: total,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    setSubmitting(false);
    setLink('');
    setQty('');
    showToast('Order placed successfully');
  };

  return (
    <div className="boost-page">
      <header className="boost-topbar">
        <button type="button" className="boost-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <h1 className="boost-title">Boost Account</h1>
        <span className="boost-balance-pill" aria-label="Wallet balance">
          <Wallet size={13} strokeWidth={2.4} />
          {money(WALLET_BALANCE)}
        </span>
      </header>

      <section className="boost-hero" aria-label="Boost Your Account">
        <div className="boost-hero-icon" aria-hidden>
          <Rocket size={26} strokeWidth={1.8} />
        </div>
        <div className="boost-hero-copy">
          <strong>Boost Your Account</strong>
          <p>Get followers, likes, views and more instantly</p>
        </div>
      </section>

      <label className="boost-field">
        <span className="boost-label">Category</span>
        <button type="button" className={categoryId ? 'boost-select has-value' : 'boost-select'} onClick={() => setCatOpen(true)}>
          {categoryChip ? categoryChip.label : <span className="boost-select-placeholder">Select a category</span>}
          <ChevronDown size={18} />
        </button>
      </label>

      <label className="boost-field">
        <span className="boost-label">Service</span>
        <button type="button" className={selected ? 'boost-select has-value' : 'boost-select'} onClick={() => categoryId && setSvcOpen(true)} disabled={!categoryId}>
          {selected ? selected.title : <span className="boost-select-placeholder">{categoryId ? 'Select a service' : 'Select category first'}</span>}
          <ChevronDown size={18} />
        </button>
      </label>

      <label className="boost-field">
        <span className="boost-label">Target Link</span>
        <div className="boost-input-wrap">
          <Link2 size={16} className="boost-input-icon" aria-hidden />
          <input type="url" placeholder={category?.placeholder ?? 'https://...'} value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
      </label>

      <label className="boost-field">
        <span className="boost-label">Quantity</span>
        <div className="boost-input-wrap">
          <Hash size={16} className="boost-input-icon" aria-hidden />
          <input type="text" inputMode="numeric" placeholder="e.g. 1000" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} />
        </div>
      </label>

      {total > 0 && (
        <div className="boost-total">
          Total: <strong>{money(total)}</strong>
          {insufficient && <span className="boost-warn"> · Insufficient balance</span>}
        </div>
      )}

      <button
        type="button"
        className={insufficient && formReady ? 'boost-cta boost-cta-fund' : 'boost-cta'}
        disabled={submitting || (!insufficient && !formReady)}
        onClick={insufficient && formReady ? () => showToast('Opening Fund Wallet...') : handlePlaceOrder}
      >
        {submitting ? 'Placing order...' : insufficient && formReady ? 'Fund Wallet' : formReady ? 'Place Order' : 'Fill the form'}
      </button>

      {toast && (
        <div className="boost-toast" role="status">
          <Check size={15} /> {toast}
        </div>
      )}

      {catOpen && (
        <div className="boost-sheet-root" role="dialog">
          <button type="button" className="boost-sheet-backdrop" onClick={() => setCatOpen(false)} aria-label="Close" />
          <div className="boost-sheet">
            <div className="boost-sheet-head"><strong>Category</strong>
              <button type="button" onClick={() => setCatOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="boost-sheet-body">
              {CATEGORY_CHIPS.map((c) => (
                <button key={c.id} type="button" onClick={() => { setCategoryId(c.id); setServiceId(''); setCatOpen(false); }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {svcOpen && (
        <div className="boost-sheet-root" role="dialog">
          <button type="button" className="boost-sheet-backdrop" onClick={() => setSvcOpen(false)} aria-label="Close" />
          <div className="boost-sheet">
            <div className="boost-sheet-head"><strong>Service</strong>
              <button type="button" onClick={() => setSvcOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="boost-sheet-body">
              {servicesForCat.map((s) => (
                <button key={s.id} type="button" onClick={() => { setServiceId(s.id); setSvcOpen(false); }}>
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BoostPage;
