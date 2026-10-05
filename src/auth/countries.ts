/** ISO dial list for auth country picker — flag via regional indicators */

export type Country = {
  iso: string;
  name: string;
  dial: string; // without +
};

export function flagEmoji(iso: string): string {
  const code = iso.toUpperCase();
  if (code.length !== 2) return '🌐';
  return String.fromCodePoint(
    ...[...code].map((c) => 127397 + c.charCodeAt(0)),
  );
}

/** Curated world list; Nigeria first as product default */
export const COUNTRIES: Country[] = [
  { iso: 'NG', name: 'Nigeria', dial: '234' },
  { iso: 'US', name: 'United States', dial: '1' },
  { iso: 'GB', name: 'United Kingdom', dial: '44' },
  { iso: 'CA', name: 'Canada', dial: '1' },
  { iso: 'GH', name: 'Ghana', dial: '233' },
  { iso: 'KE', name: 'Kenya', dial: '254' },
  { iso: 'ZA', name: 'South Africa', dial: '27' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971' },
  { iso: 'IN', name: 'India', dial: '91' },
  { iso: 'CN', name: 'China', dial: '86' },
  { iso: 'AU', name: 'Australia', dial: '61' },
  { iso: 'DE', name: 'Germany', dial: '49' },
  { iso: 'FR', name: 'France', dial: '33' },
  { iso: 'IT', name: 'Italy', dial: '39' },
  { iso: 'ES', name: 'Spain', dial: '34' },
  { iso: 'NL', name: 'Netherlands', dial: '31' },
  { iso: 'BE', name: 'Belgium', dial: '32' },
  { iso: 'IE', name: 'Ireland', dial: '353' },
  { iso: 'SE', name: 'Sweden', dial: '46' },
  { iso: 'NO', name: 'Norway', dial: '47' },
  { iso: 'DK', name: 'Denmark', dial: '45' },
  { iso: 'FI', name: 'Finland', dial: '358' },
  { iso: 'CH', name: 'Switzerland', dial: '41' },
  { iso: 'AT', name: 'Austria', dial: '43' },
  { iso: 'PT', name: 'Portugal', dial: '351' },
  { iso: 'PL', name: 'Poland', dial: '48' },
  { iso: 'TR', name: 'Turkey', dial: '90' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966' },
  { iso: 'QA', name: 'Qatar', dial: '974' },
  { iso: 'KW', name: 'Kuwait', dial: '965' },
  { iso: 'BH', name: 'Bahrain', dial: '973' },
  { iso: 'OM', name: 'Oman', dial: '968' },
  { iso: 'EG', name: 'Egypt', dial: '20' },
  { iso: 'MA', name: 'Morocco', dial: '212' },
  { iso: 'DZ', name: 'Algeria', dial: '213' },
  { iso: 'TN', name: 'Tunisia', dial: '216' },
  { iso: 'ET', name: 'Ethiopia', dial: '251' },
  { iso: 'TZ', name: 'Tanzania', dial: '255' },
  { iso: 'UG', name: 'Uganda', dial: '256' },
  { iso: 'RW', name: 'Rwanda', dial: '250' },
  { iso: 'CM', name: 'Cameroon', dial: '237' },
  { iso: 'CI', name: "Côte d'Ivoire", dial: '225' },
  { iso: 'SN', name: 'Senegal', dial: '221' },
  { iso: 'BJ', name: 'Benin', dial: '229' },
  { iso: 'TG', name: 'Togo', dial: '228' },
  { iso: 'BF', name: 'Burkina Faso', dial: '226' },
  { iso: 'ML', name: 'Mali', dial: '223' },
  { iso: 'NE', name: 'Niger', dial: '227' },
  { iso: 'LR', name: 'Liberia', dial: '231' },
  { iso: 'SL', name: 'Sierra Leone', dial: '232' },
  { iso: 'GM', name: 'Gambia', dial: '220' },
  { iso: 'ZW', name: 'Zimbabwe', dial: '263' },
  { iso: 'ZM', name: 'Zambia', dial: '260' },
  { iso: 'BW', name: 'Botswana', dial: '267' },
  { iso: 'NA', name: 'Namibia', dial: '264' },
  { iso: 'MZ', name: 'Mozambique', dial: '258' },
  { iso: 'AO', name: 'Angola', dial: '244' },
  { iso: 'BR', name: 'Brazil', dial: '55' },
  { iso: 'MX', name: 'Mexico', dial: '52' },
  { iso: 'AR', name: 'Argentina', dial: '54' },
  { iso: 'CO', name: 'Colombia', dial: '57' },
  { iso: 'CL', name: 'Chile', dial: '56' },
  { iso: 'PE', name: 'Peru', dial: '51' },
  { iso: 'PH', name: 'Philippines', dial: '63' },
  { iso: 'ID', name: 'Indonesia', dial: '62' },
  { iso: 'MY', name: 'Malaysia', dial: '60' },
  { iso: 'SG', name: 'Singapore', dial: '65' },
  { iso: 'TH', name: 'Thailand', dial: '66' },
  { iso: 'VN', name: 'Vietnam', dial: '84' },
  { iso: 'PK', name: 'Pakistan', dial: '92' },
  { iso: 'BD', name: 'Bangladesh', dial: '880' },
  { iso: 'NP', name: 'Nepal', dial: '977' },
  { iso: 'LK', name: 'Sri Lanka', dial: '94' },
  { iso: 'JP', name: 'Japan', dial: '81' },
  { iso: 'KR', name: 'South Korea', dial: '82' },
  { iso: 'NZ', name: 'New Zealand', dial: '64' },
  { iso: 'JM', name: 'Jamaica', dial: '1876' },
  { iso: 'TT', name: 'Trinidad and Tobago', dial: '1868' },
  { iso: 'BB', name: 'Barbados', dial: '1246' },
  { iso: 'GY', name: 'Guyana', dial: '592' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Nigeria

export function findCountry(iso: string): Country {
  return COUNTRIES.find((c) => c.iso === iso) || DEFAULT_COUNTRY;
}

/** National digits only (strip leading 0 for NG-style local format) */
export function normalizeNational(raw: string, iso: string): string {
  let d = raw.replace(/\D/g, '');
  if (iso === 'NG' && d.startsWith('0')) d = d.slice(1);
  return d;
}

/** E.164 without + */
export function toE164(iso: string, dial: string, nationalRaw: string): string {
  const national = normalizeNational(nationalRaw, iso);
  return `${dial}${national}`;
}

/** Display helper for remembered local numbers (never includes dial code). */
export function displayNational(iso: string, nationalOrFull: string): string {
  let d = nationalOrFull.replace(/\D/g, '');
  const c = findCountry(iso);
  // Strip leading country dial if the value was stored as full E.164
  if (c.dial && d.startsWith(c.dial) && d.length > c.dial.length + 5) {
    d = d.slice(c.dial.length);
  }
  if (iso === 'NG') {
    if (d.startsWith('234') && d.length >= 13) d = d.slice(3);
    // Show Nigerian numbers with leading 0 for familiarity
    if (d.length === 10 && !d.startsWith('0')) d = '0' + d;
  }
  return d;
}

/**
 * Country-aware national-number length rules (WhatsApp-style).
 * Returns null when valid, or a user-facing error string.
 */
const NATIONAL_LEN: Record<string, { min: number; max: number }> = {
  NG: { min: 10, max: 10 }, // 8012345678 (after strip leading 0 → 10)
  US: { min: 10, max: 10 },
  CA: { min: 10, max: 10 },
  GB: { min: 10, max: 11 },
  GH: { min: 9, max: 10 },
  KE: { min: 9, max: 10 },
  ZA: { min: 9, max: 9 },
  AE: { min: 9, max: 9 },
  IN: { min: 10, max: 10 },
  AU: { min: 9, max: 9 },
  DE: { min: 10, max: 12 },
  FR: { min: 9, max: 9 },
  EG: { min: 10, max: 10 },
  TZ: { min: 9, max: 9 },
  UG: { min: 9, max: 9 },
  RW: { min: 9, max: 9 },
  CM: { min: 9, max: 9 },
  SN: { min: 9, max: 9 },
  BR: { min: 10, max: 11 },
  MX: { min: 10, max: 10 },
};

export function validatePhoneForCountry(
  iso: string,
  nationalRaw: string,
): string | null {
  const c = findCountry(iso);
  let d = nationalRaw.replace(/\D/g, '');
  // Reject if user pasted full international into national field
  if (c.dial && d.startsWith(c.dial) && d.length > c.dial.length + 6) {
    return `Enter the local number only — without +${c.dial}`;
  }
  // Normalize NG leading 0 for length check
  const forLen = iso === 'NG' && d.startsWith('0') ? d.slice(1) : d;
  if (!forLen) {
    return 'Enter a phone number';
  }
  const rule = NATIONAL_LEN[iso] || { min: 7, max: 12 };
  if (forLen.length < rule.min || forLen.length > rule.max) {
    const label =
      rule.min === rule.max
        ? `${rule.min} digits`
        : `${rule.min}–${rule.max} digits`;
    return `This is not a valid ${c.name} number. Use ${label} for ${c.name}.`;
  }
  // NG mobile: after strip 0, must start with 7, 8, or 9
  if (iso === 'NG') {
    const n = forLen;
    if (!/^[789]/.test(n)) {
      return 'Nigerian mobile numbers start with 070, 080, 081, 090, or 091.';
    }
  }
  // US/CA: area code cannot start with 0 or 1
  if ((iso === 'US' || iso === 'CA') && /^[01]/.test(forLen)) {
    return `This is not a valid ${c.name} number.`;
  }
  return null;
}

export function homeCurrencyFor(iso: string): 'NGN' | 'USD' {
  return iso === 'NG' ? 'NGN' : 'USD';
}

export function isVtuEligible(iso: string): boolean {
  return iso === 'NG';
}
