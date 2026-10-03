import type { ServiceView } from '../service-pages';

/**
 * Services available only for accounts registered with a Nigerian phone number.
 * Still shown in the UI for everyone — blocked with "Not available" when tapped.
 */
export const NG_ONLY_SERVICES: ReadonlySet<ServiceView> = new Set([
  'data',
  'airtime',
  'tv-cable',
  'electricity',
  'exam-pin',
  'bet-wallet',
]);

/** Global products — open for all countries */
export const GLOBAL_SERVICES: ReadonlySet<ServiceView> = new Set([
  'virtual-numbers',
  'boost',
  'accounts',
  'rental',
  'gift-card',
  'virtual-card',
  'esim',
  'proxies',
]);

export function isNigerianOnlyService(view: ServiceView | string): boolean {
  return NG_ONLY_SERVICES.has(view as ServiceView);
}

/**
 * @param vtuEligible - true when signup phone country is NG
 */
export function canOpenService(
  view: ServiceView | string,
  vtuEligible: boolean | undefined,
): boolean {
  if (!isNigerianOnlyService(view)) return true;
  // Default true for legacy sessions without the flag (existing NG users)
  if (vtuEligible === undefined || vtuEligible === null) return true;
  return vtuEligible === true;
}

export const NG_ONLY_MESSAGE =
  'Not available for your account. This service is only available for accounts registered with a Nigerian phone number.';
