/** Shared Buy Logs types */
export type AccountProduct = {
  id: string;
  /** AccsZone listing id for live purchase. 0 / omitted = not purchasable via provider. */
  providerListingId?: number;
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

/** Order row returned by /api/v1/accounts/orders (My Logs). */
export type AccountOrder = {
  id: string;
  user_id: string;
  platform: string;
  title: string;
  quantity: number;
  unit_price_ngn: number;
  total_ngn: number;
  provider_listing_id: number;
  credentials: string[];
  status: 'delivered' | 'pending' | 'failed' | 'refunded';
  created_at: string;
};
