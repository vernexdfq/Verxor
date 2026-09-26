/**
 * Verxor Rent-a-Number constants & mock seeds
 * Wipe DEMO_* when wiring SignalWire / Telnyx
 */
export type NumberStatus = 'active' | 'grace' | 'expired';

export type RentedLine = {
  id: string;
  label: string;
  e164: string;
  display: string;
  flag: string;
  country: string;
  countryCode: string;
  type: 'VoIP' | 'Non-VoIP';
  provider: 'signalwire' | 'telnyx' | 'other';
  expiresAt: string;
  status: NumberStatus;
  dnd: boolean;
  smsToEmail: boolean;
  smsToMobile: boolean;
  forwardEmail: string;
  forwardMobile: string;
};

export type SmsThread = {
  id: string;
  lineId: string;
  from: string;
  preview: string;
  body: string;
  at: string;
  unread: boolean;
};

export type Country = {
  code: string;
  name: string;
  dial: string;
  flag: string;
  type: 'VoIP' | 'Non-VoIP';
  fromNgn: number;
};

export type Region = { id: string; name: string; area: string; city: string };
export type AvailNumber = { id: string; e164: string; display: string };
export type Period = {
  id: '30d' | '90d' | '365d';
  label: string;
  days: number;
  priceMul: number;
  saveLabel?: string;
};

export const GRACE_DAYS = 7;

export const PERIODS: Period[] = [
  { id: '30d', label: '1 Month', days: 30, priceMul: 1 },
  { id: '90d', label: '3 Months', days: 90, priceMul: 2.55, saveLabel: 'Save 15%' },
  { id: '365d', label: '12 Months', days: 365, priceMul: 8.4, saveLabel: 'Save 30%' },
];

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸', type: 'Non-VoIP', fromNgn: 6990 },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', type: 'VoIP', fromNgn: 6490 },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧', type: 'Non-VoIP', fromNgn: 7990 },
  { code: 'PR', name: 'Puerto Rico', dial: '+1', flag: '🇵🇷', type: 'Non-VoIP', fromNgn: 6990 },
  { code: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮', type: 'VoIP', fromNgn: 7490 },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪', type: 'Non-VoIP', fromNgn: 8490 },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱', type: 'Non-VoIP', fromNgn: 7990 },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺', type: 'VoIP', fromNgn: 8990 },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', type: 'VoIP', fromNgn: 7990 },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳', type: 'VoIP', fromNgn: 3990 },
];

export const REGIONS: Record<string, Region[]> = {
  US: [
    { id: 'us-ny-212', name: 'New York', area: '212', city: 'New York' },
    { id: 'us-ca-415', name: 'California', area: '415', city: 'San Francisco' },
    { id: 'us-ca-213', name: 'California', area: '213', city: 'Los Angeles' },
    { id: 'us-tx-214', name: 'Texas', area: '214', city: 'Dallas' },
    { id: 'us-fl-305', name: 'Florida', area: '305', city: 'Miami' },
    { id: 'us-il-312', name: 'Illinois', area: '312', city: 'Chicago' },
    { id: 'us-wa-206', name: 'Washington', area: '206', city: 'Seattle' },
  ],
  CA: [
    { id: 'ca-on-416', name: 'Ontario', area: '416', city: 'Toronto' },
    { id: 'ca-qc-514', name: 'Quebec', area: '514', city: 'Montreal' },
    { id: 'ca-bc-604', name: 'British Columbia', area: '604', city: 'Vancouver' },
  ],
  GB: [
    { id: 'gb-ldn-20', name: 'London', area: '20', city: 'London' },
    { id: 'gb-man-161', name: 'Manchester', area: '161', city: 'Manchester' },
  ],
  PR: [{ id: 'pr-787', name: 'Puerto Rico', area: '787', city: 'San Juan' }],
};

export const DEMO_LINES: RentedLine[] = [
  {
    id: 'RL-DEMO-US1',
    label: 'WhatsApp Business',
    e164: '+13125550199',
    display: '+1 (312) 555-0199',
    flag: '🇺🇸',
    country: 'United States',
    countryCode: 'US',
    type: 'Non-VoIP',
    provider: 'signalwire',
    expiresAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    dnd: false,
    smsToEmail: true,
    smsToMobile: false,
    forwardEmail: 'ops@example.com',
    forwardMobile: '',
  },
  {
    id: 'RL-DEMO-GB1',
    label: 'UK Client Line',
    e164: '+442071838750',
    display: '+44 20 7183 8750',
    flag: '🇬🇧',
    country: 'United Kingdom',
    countryCode: 'GB',
    type: 'Non-VoIP',
    provider: 'telnyx',
    expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'grace',
    dnd: false,
    smsToEmail: false,
    smsToMobile: false,
    forwardEmail: '',
    forwardMobile: '',
  },
];

export const DEMO_THREADS: SmsThread[] = [
  {
    id: 'sms-1',
    lineId: 'RL-DEMO-US1',
    from: 'WhatsApp',
    preview: 'Your verification code is 482-910',
    body: 'Your verification code is 482-910. Do not share this code.',
    at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    unread: true,
  },
  {
    id: 'sms-2',
    lineId: 'RL-DEMO-US1',
    from: '+1 415 555 0102',
    preview: 'Meeting confirmed for Thursday 2pm.',
    body: 'Meeting confirmed for Thursday 2pm. Reply YES to confirm.',
    at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    unread: false,
  },
];

export function formatNgn(n: number) {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

export function formatExp(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function daysLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function makeAvail(country: Country, region: Region): AvailNumber[] {
  const base = Number(region.area) || 200;
  return Array.from({ length: 10 }, (_, i) => {
    const mid = String(100 + ((base * 7 + i * 13) % 900)).padStart(3, '0');
    const last = String(1000 + ((base * 11 + i * 17) % 9000)).padStart(4, '0');
    const local = `${region.area}${mid}${last}`;
    return {
      id: `${region.id}-${i}`,
      e164: `${country.dial}${local}`,
      display: `${country.dial} ${region.area} ${mid} ${last}`,
    };
  });
}

export function priceOf(c: Country, p: Period) {
  return Math.round(c.fromNgn * p.priceMul);
}
