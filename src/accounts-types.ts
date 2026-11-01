/** Shared Buy Logs types */
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
