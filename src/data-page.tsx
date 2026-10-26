import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Lock,
  Phone,
  Radio,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  AlertCircle,
} from 'lucide-react';
import './data-page.css';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionProfile } from './auth/session-unlock';

export type NetworkId = 'mtn' | 'airtel' | 'glo' | '9mobile';

export type CategoryId =
  | 'hot'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'threemonths'
  | 'router'
  | 'yearly';

export interface LivePlan {
  id: number;
  name: string;
  price: number;
  days: string;
  planType?: string;
}

interface NetworkOption {
  id: NetworkId;
  label: string;
  prefixHint: string;
}

interface RecentRecipient {
  phone: string;
  networkId?: NetworkId;
  lastUsed?: number;
}

const NETWORKS: NetworkOption[] = [
  { id: 'mtn', label: 'MTN', prefixHint: '0803, 0806, 0814...' },
  { id: 'airtel', label: 'Airtel', prefixHint: '0802, 0808, 0812...' },
  { id: 'glo', label: 'Glo', prefixHint: '0805, 0807, 0815...' },
  { id: '9mobile', label: '9mobile', prefixHint: '0809, 0817, 0818...' },
];

export interface CategoryItem {
  id: CategoryId;
  label: string;
  icon?: string;
}

export const CATEGORY_DEFINITIONS: Record<CategoryId, CategoryItem> = {
  hot: { id: 'hot', label: 'Hot deals', icon: '🔥' },
  daily: { id: 'daily', label: 'Daily' },
  weekly: { id: 'weekly', label: 'Weekly' },
  monthly: { id: 'monthly', label: 'Monthly' },
  threemonths: { id: 'threemonths', label: '3months+' },
  router: { id: 'router', label: 'Router' },
  yearly: { id: 'yearly', label: 'Yearly' },
};

export const NETWORK_CATEGORY_IDS: Record<NetworkId, CategoryId[]> = {
  mtn: ['hot', 'daily', 'weekly', 'monthly', 'threemonths', 'yearly'],
  glo: ['hot', 'daily', 'weekly', 'monthly', 'threemonths', 'yearly'],
  airtel: ['hot', 'daily', 'weekly', 'monthly', 'threemonths', 'router', 'yearly'],
  '9mobile': ['hot', 'monthly'],
};

const RECENT_KEY = 'verxor_data_recent_recipients_v1';
const AIRTIME_RECENT_KEY = 'verxor_airtime_recent_recipients_v1';
const MY_NUMBER = '08141620644';

const FALLBACK_PLANS: Record<NetworkId, LivePlan[]> = {
  mtn: [
    { id: 101, name: '100MB Daily', price: 100, days: '1', planType: 'Daily' },
    { id: 102, name: '1GB Daily', price: 350, days: '1', planType: 'Daily' },
    { id: 103, name: '2GB (2 Days)', price: 600, days: '2', planType: 'Daily' },
    { id: 104, name: '1GB Weekly', price: 600, days: '7', planType: 'Weekly' },
    { id: 105, name: '1.5GB Weekly', price: 1000, days: '7', planType: 'Weekly' },
    { id: 106, name: '3.5GB Weekly', price: 1500, days: '7', planType: 'Weekly' },
    { id: 107, name: '5GB Weekly', price: 2000, days: '7', planType: 'Weekly' },
    { id: 108, name: '1.5GB Monthly', price: 1200, days: '30', planType: 'Monthly' },
    { id: 109, name: '2GB Monthly', price: 1500, days: '30', planType: 'Monthly' },
    { id: 110, name: '3GB Monthly', price: 2000, days: '30', planType: 'Monthly' },
    { id: 111, name: '5GB Monthly', price: 3000, days: '30', planType: 'Monthly' },
    { id: 112, name: '10GB Monthly', price: 5000, days: '30', planType: 'Monthly' },
    { id: 113, name: '15GB Monthly', price: 6000, days: '30', planType: 'Monthly' },
    { id: 114, name: '120GB Yearly', price: 50000, days: '365', planType: 'Yearly' },
  ],
  airtel: [
    { id: 201, name: '100MB Daily', price: 100, days: '1', planType: 'Daily' },
    { id: 202, name: '1GB Daily', price: 350, days: '1', planType: 'Daily' },
    { id: 203, name: '2GB (2 Days)', price: 600, days: '2', planType: 'Daily' },
    { id: 204, name: '1.5GB Weekly', price: 1000, days: '7', planType: 'Weekly' },
    { id: 205, name: '3.5GB Weekly', price: 1500, days: '7', planType: 'Weekly' },
    { id: 206, name: '1.5GB Monthly', price: 1200, days: '30', planType: 'Monthly' },
    { id: 207, name: '2GB Monthly', price: 1500, days: '30', planType: 'Monthly' },
    { id: 208, name: '3GB Monthly', price: 2000, days: '30', planType: 'Monthly' },
    { id: 209, name: '5GB Monthly', price: 3000, days: '30', planType: 'Monthly' },
    { id: 210, name: '10GB Monthly', price: 5000, days: '30', planType: 'Monthly' },
    { id: 211, name: '120GB Yearly', price: 50000, days: '365', planType: 'Yearly' },
  ],
  glo: [
    { id: 301, name: '1GB Daily', price: 300, days: '1', planType: 'Daily' },
    { id: 302, name: '2GB (2 Days)', price: 500, days: '2', planType: 'Daily' },
    { id: 303, name: '1.5GB Weekly', price: 800, days: '7', planType: 'Weekly' },
    { id: 304, name: '3.5GB Weekly', price: 1200, days: '7', planType: 'Weekly' },
    { id: 305, name: '2GB Monthly', price: 1200, days: '30', planType: 'Monthly' },
    { id: 306, name: '3.5GB Monthly', price: 1500, days: '30', planType: 'Monthly' },
    { id: 307, name: '5.5GB Monthly', price: 2000, days: '30', planType: 'Monthly' },
    { id: 308, name: '10GB Monthly', price: 4000, days: '30', planType: 'Monthly' },
    { id: 309, name: '120GB Yearly', price: 45000, days: '365', planType: 'Yearly' },
  ],
  '9mobile': [
    { id: 401, name: '1GB Daily', price: 350, days: '1', planType: 'Daily' },
    { id: 402, name: '2GB (3 Days)', price: 600, days: '3', planType: 'Daily' },
    { id: 403, name: '2GB Weekly', price: 1000, days: '7', planType: 'Weekly' },
    { id: 404, name: '1.5GB Monthly', price: 1200, days: '30', planType: 'Monthly' },
    { id: 405, name: '3GB Monthly', price: 2000, days: '30', planType: 'Monthly' },
    { id: 406, name: '5GB Monthly', price: 3000, days: '30', planType: 'Monthly' },
    { id: 407, name: '11GB Monthly', price: 5000, days: '30', planType: 'Monthly' },
    { id: 408, name: '100GB Yearly', price: 50000, days: '365', planType: 'Yearly' },
  ],
};

function detectNetwork(raw: string): NetworkId | null {
  let clean = raw.replace(/\D/g, '');
  if (clean.startsWith('234')) clean = '0' + clean.slice(3);
  if (clean.length < 4) return null;
  const prefix = clean.substring(0, 4);

  const map: Record<string, NetworkId> = {
    '0803': 'mtn', '0806': 'mtn', '0810': 'mtn', '0813': 'mtn',
    '0814': 'mtn', '0816': 'mtn', '0903': 'mtn', '0906': 'mtn',
    '0913': 'mtn', '0916': 'mtn', '0703': 'mtn', '0706': 'mtn',
    '0704': 'mtn', '0702': 'mtn',
    '0802': 'airtel', '0808': 'airtel', '0812': 'airtel',
    '0701': 'airtel', '0708': 'airtel', '0901': 'airtel',
    '0902': 'airtel', '0904': 'airtel', '0907': 'airtel',
    '0911': 'airtel', '0912': 'airtel',
    '0805': 'glo', '0807': 'glo', '0811': 'glo', '0815': 'glo',
    '0905': 'glo', '0915': 'glo', '0705': 'glo',
    '0809': '9mobile', '0817': '9mobile', '0818': '9mobile',
    '0908': '9mobile', '0909': '9mobile',
  };
  return map[prefix] ?? null;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) {
    return '0' + digits.slice(3);
  }
  return digits;
}

function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234')) digits = '0' + digits.slice(3);
  return digits.slice(0, 11);
}

function formatPhoneDisplay(raw: string): string {
  const digits = formatPhone(raw);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

function money(n: number): string {
  return '₦' + Math.round(n).toLocaleString('en-NG');
}

function parseVolume(name: string): string {
  const m = name.match(/(\d+(?:\.\d+)?)\s*(MB|GB|TB)/i);
  if (m) {
    const num = parseFloat(m[1]);
    const unit = m[2].toUpperCase();
    return `${num} ${unit}`;
  }
  return name;
}

function parseValidity(days: string, name: string): string {
  const dStr = (days || '').trim().toLowerCase();
  const nStr = (name || '').trim().toLowerCase();

  const mNum = dStr.match(/\d+/);
  if (mNum) {
    const num = parseInt(mNum[0], 10);
    if (num === 1) return '1 Day';
    if (num <= 3 && num > 1) return `${num} Days`;
    if (num === 7) return '7 Days';
    if (num === 14) return '14 Days';
    if (num === 30) return '30 Days';
    if (num === 60) return '60 Days';
    if (num === 90) return '90 Days';
    if (num >= 365) return '1 Year';
    return `${num} Days`;
  }

  const matchInName = nStr.match(/(\d+)\s*(day|days|month|months|week|weeks|year|years)/i);
  if (matchInName) {
    const val = parseInt(matchInName[1], 10);
    const unit = matchInName[2].toLowerCase();
    if (unit.startsWith('year') || val >= 365) return '1 Year';
    if (unit.startsWith('month')) return val === 1 ? '30 Days' : `${val * 30} Days`;
    if (unit.startsWith('week')) return `${val * 7} Days`;
    return val === 1 ? '1 Day' : `${val} Days`;
  }

  if (nStr.includes('daily')) return '1 Day';
  if (nStr.includes('weekly')) return '7 Days';
  if (nStr.includes('monthly')) return '30 Days';
  if (nStr.includes('yearly') || nStr.includes('annual')) return '1 Year';

  return '30 Days';
}

function getPlanCategory(plan: LivePlan): Exclude<CategoryId, 'hot'> {
  const v = parseValidity(plan.days, plan.name).toLowerCase();
  const n = (plan.name || '').toLowerCase();
  const t = (plan.planType || '').toLowerCase();

  // Router plans
  if (n.includes('router') || t.includes('router')) return 'router';

  // 3 months+ (90-day validity or explicit planType)
  const m = v.match(/\d+/);
  const d = m ? parseInt(m[0], 10) : 30;

  if (v.includes('year') || d >= 300) return 'yearly';
  if (
    t.includes('3 month') ||
    t.includes('threemonths') ||
    v.includes('3 month') ||
    v.includes('90 day') ||
    (d >= 75 && d < 300)
  ) {
    return 'threemonths';
  }
  if (d >= 15) return 'monthly';
  if (d >= 4) return 'weekly';
  return 'daily';
}

function NetworkLogo({ id, size = 48 }: { id: NetworkId; size?: number }) {
  const assets: Record<NetworkId, { src: string; alt: string }> = {
    mtn: { src: '/brand/networks/mtn.png', alt: 'MTN' },
    airtel: { src: '/brand/networks/airtel.png', alt: 'Airtel' },
    glo: { src: '/brand/networks/glo.png', alt: 'Glo' },
    '9mobile': { src: '/brand/networks/9mobile.png', alt: '9mobile' },
  };
  const asset = assets[id];

  return (
    <span
      className={`air-network-logo air-network-logo-${id}`}
      style={{ width: size, height: size }}
    >
      <img
        src={asset.src}
        alt={asset.alt}
        width={size}
        height={size}
        draggable={false}
      />
    </span>
  );
}

export interface DataPageProps {
  onBack: () => void;
  session?: AuthSession | null;
  onFund?: () => void;
}

export function DataPage({ onBack, session, onFund }: DataPageProps) {
  const walletBalance = session?.balanceNgn ?? 0;
  const userAccountPhone = useMemo(() => {
    if (session?.contact) {
      const clean = normalizePhone(session.contact);
      if (clean.length === 11) return clean;
    }
    if (typeof window !== 'undefined') {
      try {
        const profile = loadSessionProfile();
        if (profile?.contact) {
          const clean = normalizePhone(profile.contact);
          if (clean.length === 11) return clean;
        }
      } catch {
        /* noop */
      }
      try {
        const raw = localStorage.getItem('verxor-last-phone');
        if (raw) {
          const parsed = JSON.parse(raw) as { national?: string };
          if (parsed?.national) {
            const clean = normalizePhone(parsed.national);
            if (clean.length === 11) return clean;
          }
        }
      } catch {
        /* noop */
      }
      try {
        const userRaw = localStorage.getItem('verxor-user');
        if (userRaw) {
          const u = JSON.parse(userRaw) as { phone?: string; contact?: string };
          const c = u?.phone || u?.contact;
          if (c) {
            const clean = normalizePhone(c);
            if (clean.length === 11) return clean;
          }
        }
      } catch {
        /* noop */
      }
    }
    return MY_NUMBER;
  }, [session]);

  const [networkId, setNetworkId] = useState<NetworkId>('mtn');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('hot');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [livePlans, setLivePlans] = useState<LivePlan[]>(FALLBACK_PLANS['mtn']);
  const [toast, setToast] = useState<string | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipient[]>([]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 2800);
  }, []);

  const phoneDigits = formatPhone(phone);
  const phoneValid = phoneDigits.length === 11;
  const selectedNetObj = NETWORKS.find((n) => n.id === networkId) || NETWORKS[0];

  // Load recent recipients from both Data and Airtime keys
  useEffect(() => {
    try {
      const rawData = localStorage.getItem(RECENT_KEY);
      const rawAir = localStorage.getItem(AIRTIME_RECENT_KEY);
      const listData: RecentRecipient[] = rawData ? JSON.parse(rawData) : [];
      const listAir: RecentRecipient[] = rawAir ? JSON.parse(rawAir) : [];

      const mergedMap = new Map<string, RecentRecipient>();
      [...listData, ...listAir].forEach((r) => {
        if (r && r.phone && !mergedMap.has(r.phone)) {
          mergedMap.set(r.phone, r);
        }
      });
      setRecentRecipients(Array.from(mergedMap.values()).slice(0, 5));
    } catch {
      // Ignore
    }
  }, []);

  const handleApplyPhone = useCallback((v: string, netHint?: NetworkId) => {
    const digits = formatPhone(v);
    setPhone(digits);
    if (netHint) {
      setNetworkId(netHint);
      setAutoDetected(true);
    } else if (digits.length >= 4) {
      const detected = detectNetwork(digits);
      if (detected) {
        setNetworkId(detected);
        setAutoDetected(true);
      }
    } else {
      setAutoDetected(false);
    }
  }, []);

  const handlePhoneChange = (v: string) => {
    handleApplyPhone(v);
  };

  /** Use My Number click: instantly applies the registered account number like Airtime */
  const handleUseMyNumber = () => {
    if (userAccountPhone) {
      handleApplyPhone(userAccountPhone);
      showToast(`Account number applied (${formatPhoneDisplay(userAccountPhone)})`);
      return;
    }
    if (recentRecipients.length > 0) {
      setPickerOpen(true);
      return;
    }
    showToast('No registered phone number found on account');
  };

  const saveRecentRecipient = useCallback((p: string, net: NetworkId) => {
    try {
      const clean = formatPhone(p);
      if (clean.length !== 11) return;
      const prev = recentRecipients.filter((r) => r.phone !== clean);
      const next: RecentRecipient[] = [
        { phone: clean, networkId: net, lastUsed: Date.now() },
        ...prev,
      ].slice(0, 5);
      setRecentRecipients(next);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      localStorage.setItem(AIRTIME_RECENT_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }, [recentRecipients]);

  /** Load live plans whenever network changes; falls back gracefully to standard bundles */
  useEffect(() => {
    let cancelled = false;
    setLoadingPlans(true);
    setSelectedPlanId(null);

    fetch(`/api/v1/data/plans?network=${networkId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok || !Array.isArray(data.plans) || data.plans.length === 0) {
          throw new Error(data.error || 'No provider plans');
        }
        return data.plans as LivePlan[];
      })
      .then((plans) => {
        if (cancelled) return;
        setLivePlans(plans);
      })
      .catch(() => {
        if (cancelled) return;
        setLivePlans(FALLBACK_PLANS[networkId] || FALLBACK_PLANS['mtn']);
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });

    return () => {
      cancelled = true;
    };
  }, [networkId]);

  // Group plans into Hot deals, Daily, Weekly, Monthly, Yearly
  const categorizedPlans = useMemo(() => {
    const daily: LivePlan[] = [];
    const weekly: LivePlan[] = [];
    const monthly: LivePlan[] = [];
    const threemonths: LivePlan[] = [];
    const router: LivePlan[] = [];
    const yearly: LivePlan[] = [];

    const sorted = [...livePlans].sort((a, b) => a.price - b.price);

    sorted.forEach((p) => {
      const cat = getPlanCategory(p);
      if (cat === 'daily') daily.push(p);
      else if (cat === 'weekly') weekly.push(p);
      else if (cat === 'threemonths') threemonths.push(p);
      else if (cat === 'router') router.push(p);
      else if (cat === 'yearly') yearly.push(p);
      else monthly.push(p);
    });

    // Curate Hot deals
    const targetSizes = [
      '1 gb', '2 gb', '2.5 gb', '3 gb', '5 gb', '10 gb',
      '500 mb', '1.5 gb', '20 gb',
    ];
    const hot: LivePlan[] = [];
    const seenSizes = new Set<string>();

    for (const target of targetSizes) {
      const match = sorted.find((p) => {
        const vol = parseVolume(p.name).toLowerCase();
        return vol === target && !seenSizes.has(vol);
      });
      if (match) {
        hot.push(match);
        seenSizes.add(parseVolume(match.name).toLowerCase());
      }
    }

    if (hot.length < 6) {
      const remaining = sorted.filter((p) => !hot.some((h) => h.id === p.id));
      hot.push(...remaining.slice(0, 9 - hot.length));
    }

    hot.sort((a, b) => a.price - b.price);

    return {
      hot,
      daily,
      weekly,
      monthly,
      threemonths,
      router,
      yearly,
    };
  }, [livePlans]);

  const availableCategories = useMemo(() => {
    const ids = NETWORK_CATEGORY_IDS[networkId] || NETWORK_CATEGORY_IDS['mtn'];
    return ids.map((id) => CATEGORY_DEFINITIONS[id]);
  }, [networkId]);

  // Keep activeCategory valid for currently selected network
  useEffect(() => {
    const validIds = NETWORK_CATEGORY_IDS[networkId] || [];
    if (!validIds.includes(activeCategory)) {
      setActiveCategory(validIds[0] || 'hot');
    }
  }, [networkId, activeCategory]);

  const currentCategoryPlans = useMemo(() => {
    return categorizedPlans[activeCategory] || [];
  }, [categorizedPlans, activeCategory]);

  useEffect(() => {
    if (currentCategoryPlans.length > 0) {
      if (!currentCategoryPlans.some((p) => p.id === selectedPlanId)) {
        setSelectedPlanId(currentCategoryPlans[0].id);
      }
    } else {
      setSelectedPlanId(null);
    }
  }, [currentCategoryPlans, selectedPlanId]);

  const selectedPlan = useMemo(() => {
    return livePlans.find((p) => p.id === selectedPlanId) || null;
  }, [livePlans, selectedPlanId]);

  /** Tapping a plan card triggers validation or opens the checkout sheet */
  const handleSelectPlan = (plan: LivePlan) => {
    setSelectedPlanId(plan.id);
    if (!phoneDigits) {
      showToast('Enter recipient phone number to proceed');
      const inputEl = document.getElementById('data-phone-input');
      if (inputEl) inputEl.focus();
      return;
    }
    if (!phoneValid) {
      showToast('Enter a valid 11-digit Nigerian number');
      const inputEl = document.getElementById('data-phone-input');
      if (inputEl) inputEl.focus();
      return;
    }
    setConfirmOpen(true);
  };

  const handleFund = () => {
    if (onFund) {
      onFund();
    } else {
      showToast('Redirecting to wallet funding...');
      window.location.hash = '#fund';
    }
  };

  const executePurchase = async () => {
    if (!selectedPlan) {
      showToast('Please select a data bundle');
      return;
    }
    if (!phoneValid) {
      showToast('Enter a valid 11-digit phone number');
      return;
    }

    const price = selectedPlan.price;
    if (walletBalance < price) {
      setConfirmOpen(false);
      showToast(`Insufficient balance. Please fund ₦${Math.round(price - walletBalance).toLocaleString('en-NG')}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network: networkId,
          phone: phoneDigits,
          dataPlanId: selectedPlan.id,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to complete data purchase');
      }

      saveRecentRecipient(phoneDigits, networkId);
      setConfirmOpen(false);
      showToast(`Data recharge of ${parseVolume(selectedPlan.name)} to ${formatPhoneDisplay(phoneDigits)} successful!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Purchase failed. Please try again';
      showToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="air-page">
      {/* ── Top Bar with Back, Title, and Fund Wallet Button ── */}
      <header className="air-topbar">
        <button
          type="button"
          className="air-back"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
        <div className="air-title-wrap">
          <h1 className="air-title">Buy Data</h1>
          <p className="air-subtitle">Instant mobile data bundles</p>
        </div>
        <button
          type="button"
          className="air-wallet-btn"
          aria-label="Fund Wallet"
          title="Fund Wallet"
          onClick={handleFund}
        >
          <Wallet size={15} strokeWidth={2.2} />
          <span className="air-wallet-val">{money(walletBalance)}</span>
          <span className="air-wallet-plus">+</span>
        </button>
      </header>

      {/* ── Card 1: Network Selection ── */}
      <section className="air-section">
        <div className="air-section-head">
          <div className="air-head-badge" aria-hidden>
            <Radio size={18} strokeWidth={2.2} />
          </div>
          <div className="air-head-text">
            <h2>Select Network</h2>
            <p>
              {autoDetected && networkId
                ? 'Network detected from recipient number'
                : 'Auto-detect works when you type number'}
            </p>
          </div>
        </div>

        <div className="air-networks" role="listbox" aria-label="Mobile networks">
          {NETWORKS.map((net) => {
            const selected = networkId === net.id;
            return (
              <button
                key={net.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`air-net${selected ? ' selected' : ''}`}
                onClick={() => {
                  setNetworkId(net.id);
                  setAutoDetected(false);
                }}
              >
                {selected && (
                  <span className="air-net-badge" aria-hidden>
                    <Check size={11} strokeWidth={3.5} />
                  </span>
                )}
                <div className="air-net-logo-wrap">
                  <NetworkLogo id={net.id} size={48} />
                </div>
                <span className="air-net-label">{net.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Card 2: Recharge Details & Bundles ── */}
      <section className="air-section air-details">
        <div className="air-section-head">
          <div className="air-head-badge" aria-hidden>
            <Receipt size={18} strokeWidth={2.2} />
          </div>
          <div className="air-head-text">
            <h2>Recharge Details</h2>
            <p>Enter recipient and choose bundle</p>
          </div>
        </div>

        {/* Recipient Phone Field with clean header actions that do not obstruct typing */}
        <div className="air-field">
          <div className="air-field-header">
            <span className="air-field-label">Phone Number</span>
            <div className="air-field-actions">
              <button
                type="button"
                className="air-use-mine-pill"
                onClick={handleUseMyNumber}
                title="Use your registered account number"
              >
                <Sparkles size={11} className="air-use-mine-ico" />
                <span>Use My Number</span>
              </button>
              <button
                type="button"
                className="air-recent-pill"
                title="Choose from recent recharges"
                aria-label="Choose from recent recharges"
                onClick={() => setPickerOpen(true)}
              >
                <Clock size={11} />
                <span>Recent</span>
              </button>
            </div>
          </div>

          <div
            className={
              phoneDigits && !phoneValid ? 'air-input-wrap is-error' : 'air-input-wrap'
            }
          >
            <div className="air-input-lead-icon" aria-hidden>
              <Phone size={17} strokeWidth={2.2} />
            </div>
            <input
              id="data-phone-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="08012345678"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              aria-label="Phone number"
            />
            {phone ? (
              <button
                type="button"
                className="air-clear"
                onClick={() => {
                  setPhone('');
                  setAutoDetected(false);
                }}
                aria-label="Clear phone number"
                title="Clear phone number"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            ) : null}
          </div>

          {phoneDigits && !phoneValid && (
            <p className="air-field-error" role="alert">
              Enter a valid 11-digit Nigerian number
            </p>
          )}
        </div>

        {/* Category Tabs: Hot deals, Daily, Weekly, Monthly, Yearly */}
        <div className="data-tabs-wrap">
          <div className="data-tabs" role="tablist" aria-label="Data bundle validity">
            {availableCategories.map((cat) => {
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`data-tab${isActive ? ' active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.icon && <span className="data-tab-icon">{cat.icon}</span>}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bundle Cards Grid (3 Columns Moniepoint & OPay style) */}
        {loadingPlans ? (
          <div className="data-bundles-grid data-bundles-skeleton" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="data-bundle-card skeleton">
                <div className="skel-vol" />
                <div className="skel-val" />
                <div className="skel-pill" />
              </div>
            ))}
          </div>
        ) : currentCategoryPlans.length === 0 ? (
          <div className="data-empty-state">
            <p>
              No {CATEGORY_DEFINITIONS[activeCategory]?.label.toLowerCase() || 'selected'} plans currently listed for {selectedNetObj.label}.
            </p>
            <div className="data-empty-actions">
              <button
                type="button"
                className="air-use-mine-pill"
                onClick={() => setActiveCategory('monthly')}
              >
                View Monthly Bundles
              </button>
              <button
                type="button"
                className="air-recent-pill"
                onClick={() => setActiveCategory('hot')}
              >
                View Hot Deals
              </button>
            </div>
          </div>
        ) : (
          <div className="data-bundles-grid" role="radiogroup" aria-label="Available data plans">
            {currentCategoryPlans.map((plan) => {
              const isSelected = plan.id === selectedPlanId;
              const volume = parseVolume(plan.name);
              const validity = parseValidity(plan.days, plan.name);
              const isHot = activeCategory === 'hot';

              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`data-bundle-card${isSelected ? ' selected' : ''}`}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isSelected && (
                    <span className="data-bundle-check" aria-hidden>
                      <Check size={10} strokeWidth={3.5} />
                    </span>
                  )}
                  {isHot && (
                    <span className="data-bundle-hot-badge">HOT</span>
                  )}
                  <strong className="data-bundle-volume">{volume}</strong>
                  <span className="data-bundle-validity">{validity}</span>
                  <span className="data-bundle-pay-pill">
                    Pay {money(plan.price)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Card 3: Instant Delivery Trust Card ── */}
      <div className="air-trust">
        <div className="air-trust-icon" aria-hidden>
          <ShieldCheck size={20} strokeWidth={2.2} />
        </div>
        <div className="air-trust-body">
          <strong>Instant Delivery</strong>
          <p>
            Data bundles are credited immediately to the recipient line after successful payment.
          </p>
        </div>
      </div>

      {/* ── Recipient Picker Modal (matching Airtime page) ── */}
      {pickerOpen && (
        <div className="air-modal-backdrop" onClick={() => setPickerOpen(false)}>
          <div
            className="air-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Choose recipient"
          >
            <div className="air-modal-header">
              <div className="air-modal-title-wrap">
                <h3>Choose Recipient</h3>
                <p>Your number or recent recharges</p>
              </div>
              <button
                type="button"
                className="air-modal-close"
                aria-label="Close"
                onClick={() => setPickerOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="air-modal-list">
              {userAccountPhone && (
                <button
                  type="button"
                  className="air-modal-item"
                  onClick={() => {
                    handleApplyPhone(userAccountPhone);
                    setPickerOpen(false);
                    showToast(`Account number applied (${formatPhoneDisplay(userAccountPhone)})`);
                  }}
                >
                  <div className="air-modal-item-icon account">
                    <Sparkles size={16} />
                  </div>
                  <div className="air-modal-item-info">
                    <div className="air-modal-item-top">
                      <strong>{formatPhoneDisplay(userAccountPhone)}</strong>
                      <span className="air-tag primary">My number</span>
                    </div>
                    <span className="air-modal-item-sub">Registered on your account</span>
                  </div>
                </button>
              )}
              {recentRecipients.map((r) => (
                <button
                  key={r.phone}
                  type="button"
                  className="air-modal-item"
                  onClick={() => {
                    handleApplyPhone(r.phone, r.networkId);
                    setPickerOpen(false);
                    showToast(`Selected ${formatPhoneDisplay(r.phone)}`);
                  }}
                >
                  <div className="air-modal-item-icon recent">
                    <Clock size={16} />
                  </div>
                  <div className="air-modal-item-info">
                    <div className="air-modal-item-top">
                      <strong>{formatPhoneDisplay(r.phone)}</strong>
                      {r.networkId && (
                        <span className={`air-tag net-${r.networkId}`}>{r.networkId}</span>
                      )}
                    </div>
                    <span className="air-modal-item-sub">Recent recharge</span>
                  </div>
                </button>
              ))}
              {!userAccountPhone && recentRecipients.length === 0 && (
                <div className="air-modal-empty">
                  <p>No saved numbers yet</p>
                  <span>Recharge once to see them here</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Checkout Confirmation Modal Sheet ── */}
      {confirmOpen && selectedPlan && (
        <div className="air-modal-backdrop" onClick={() => !submitting && setConfirmOpen(false)}>
          <div
            className="air-modal-card data-confirm-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Confirm Data Purchase"
          >
            <div className="air-modal-header">
              <div className="air-modal-title-wrap">
                <h3>Confirm Data Purchase</h3>
                <p>Review details before paying</p>
              </div>
              <button
                type="button"
                className="air-modal-close"
                aria-label="Close"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="data-confirm-details">
              <div className="data-confirm-row">
                <span className="data-confirm-label">Network</span>
                <span className="data-confirm-val strong">{selectedNetObj.label}</span>
              </div>
              <div className="data-confirm-row">
                <span className="data-confirm-label">Recipient</span>
                <span className="data-confirm-val strong">{formatPhoneDisplay(phone)}</span>
              </div>
              <div className="data-confirm-row">
                <span className="data-confirm-label">Data Bundle</span>
                <span className="data-confirm-val strong">
                  {parseVolume(selectedPlan.name)} · {parseValidity(selectedPlan.days, selectedPlan.name)}
                </span>
              </div>
              <div className="data-confirm-divider" />
              <div className="data-confirm-row">
                <span className="data-confirm-label">Amount</span>
                <span className="data-confirm-amount">{money(selectedPlan.price)}</span>
              </div>
              <div className="data-confirm-row subtle">
                <span className="data-confirm-label">Wallet Balance</span>
                <span className="data-confirm-val">{money(walletBalance)}</span>
              </div>
              {walletBalance >= selectedPlan.price ? (
                <div className="data-confirm-row subtle">
                  <span className="data-confirm-label">Balance After</span>
                  <span className="data-confirm-val">{money(walletBalance - selectedPlan.price)}</span>
                </div>
              ) : null}
            </div>

            {walletBalance < selectedPlan.price ? (
              <div className="data-confirm-warn">
                <div className="data-confirm-warn-text">
                  <AlertCircle size={15} />
                  <span>
                    Insufficient balance · Need {money(selectedPlan.price - walletBalance)} more
                  </span>
                </div>
                <button
                  type="button"
                  className="data-confirm-btn fund"
                  onClick={() => {
                    setConfirmOpen(false);
                    handleFund();
                  }}
                >
                  <Wallet size={16} />
                  <span>Fund Wallet to Continue</span>
                </button>
              </div>
            ) : (
              <div className="data-confirm-actions">
                <button
                  type="button"
                  className="data-confirm-btn pay"
                  disabled={submitting}
                  onClick={executePurchase}
                >
                  <Lock size={16} strokeWidth={2.4} />
                  <span>{submitting ? 'Processing Payment...' : `Confirm & Pay ${money(selectedPlan.price)}`}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className="air-toast">{toast}</div>}
    </div>
  );
}
