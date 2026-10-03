import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  LayoutDashboard,
  MessageSquare,
  Package,
  Percent,
  Plug,
  Settings,
  ToggleLeft,
  Users,
} from 'lucide-react';

export type AdminSection =
  | 'overview'
  | 'catalog'
  | 'pricing'
  | 'panels'
  | 'orders'
  | 'users'
  | 'providers'
  | 'feedback'
  | 'settings';

export type CatalogItem = {
  id: string;
  name: string;
  scope: 'global' | 'nigeria' | 'both';
  status: 'live' | 'coming_soon' | 'hidden';
  provider: string;
};

export type PriceRow = {
  id: string;
  service: string;
  costUsd: number;
  retailUsd: number;
  retailNgn: number;
  panelMarkupPct: number;
};

export type FeedbackRow = {
  id: string;
  type?: string;
  subject?: string;
  message?: string;
  user_name?: string;
  user_contact?: string;
  user_email?: string;
  created_at?: string;
};

export const SESSION_KEY = 'verxor-admin-ok';
export const PASS_KEY = 'verxor-admin-pw';

export const NAV: { id: AdminSection; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'catalog', label: 'Catalog', icon: ToggleLeft },
  { id: 'pricing', label: 'Pricing', icon: Percent },
  { id: 'panels', label: 'Child panels', icon: Building2 },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'providers', label: 'Providers', icon: Plug },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const DEFAULT_CATALOG: CatalogItem[] = [
  { id: 'virtual-numbers', name: 'Virtual Number', scope: 'global', status: 'live', provider: '5sim / PVAPins' },
  { id: 'boost', name: 'Boost Account', scope: 'global', status: 'live', provider: 'SMM' },
  { id: 'accounts', name: 'Buy Logs', scope: 'global', status: 'coming_soon', provider: 'AccsZone' },
  { id: 'rental', name: 'Rent Number', scope: 'global', status: 'live', provider: 'Rental pool' },
  { id: 'esim', name: 'eSIM', scope: 'global', status: 'coming_soon', provider: '—' },
  { id: 'proxies', name: 'Proxies', scope: 'global', status: 'coming_soon', provider: '—' },
  { id: 'gift-card', name: 'Gift Card', scope: 'global', status: 'live', provider: 'Trade desk' },
  { id: 'virtual-card', name: 'Virtual Card', scope: 'global', status: 'coming_soon', provider: '—' },
  { id: 'airtime', name: 'Airtime', scope: 'nigeria', status: 'live', provider: 'VTU' },
  { id: 'data', name: 'Data', scope: 'nigeria', status: 'live', provider: 'VTU' },
  { id: 'tv-cable', name: 'TV Subscription', scope: 'nigeria', status: 'live', provider: 'VTU' },
  { id: 'bet-wallet', name: 'Bet Wallet', scope: 'nigeria', status: 'live', provider: 'Betting' },
];

export const DEFAULT_PRICES: PriceRow[] = [
  { id: 'vn-eco', service: 'Virtual Numbers · Economy', costUsd: 0.22, retailUsd: 0.3, retailNgn: 480, panelMarkupPct: 15 },
  { id: 'vn-std', service: 'Virtual Numbers · Standard', costUsd: 0.65, retailUsd: 0.88, retailNgn: 1408, panelMarkupPct: 15 },
  { id: 'vn-fast', service: 'Virtual Numbers · Fast', costUsd: 1.2, retailUsd: 1.62, retailNgn: 2592, panelMarkupPct: 12 },
  { id: 'vn-prem', service: 'Virtual Numbers · Premium', costUsd: 2.4, retailUsd: 3.24, retailNgn: 5184, panelMarkupPct: 12 },
  { id: 'boost', service: 'Boost Account (base)', costUsd: 1, retailUsd: 1.5, retailNgn: 2400, panelMarkupPct: 20 },
  { id: 'logs', service: 'Buy Logs (base)', costUsd: 2, retailUsd: 3.5, retailNgn: 5600, panelMarkupPct: 18 },
  { id: 'airtime', service: 'Airtime (NG)', costUsd: 0, retailUsd: 0, retailNgn: 100, panelMarkupPct: 5 },
  { id: 'data', service: 'Data (NG)', costUsd: 0, retailUsd: 0, retailNgn: 500, panelMarkupPct: 5 },
];

export const TYPE_LABEL: Record<string, string> = {
  feature: 'Feature Suggestion',
  bug: 'Bug / Issue Report',
  poor: 'Poor Experience',
  like: 'What You Like',
  general: 'General Suggestion',
};

export function formatWhen(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function panelUsd(cost: number, pct: number) {
  return Math.round(cost * (1 + pct / 100) * 100) / 100;
}
