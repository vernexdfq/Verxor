/**
 * ClubKonnect cable TV packages — sourced from APICableTVPackagesV1.asp
 * Prices are face amounts customers pay; ClubKonnect API discount ~1% (DStv/GOtv/Startimes).
 * Keep UI labels clean; package `id` is the ClubKonnect Package code.
 */

export type CableProviderId = 'dstv' | 'gotv' | 'startimes';

export type CablePackage = {
  id: string;
  name: string;
  price: number;
  validityDays: number;
  /** ClubKonnect Package query param */
  ckPackageId: string;
};

export const CABLE_PROVIDERS: { id: CableProviderId; label: string; ckCode: string }[] = [
  { id: 'dstv', label: 'DStv', ckCode: 'dstv' },
  { id: 'gotv', label: 'GOtv', ckCode: 'gotv' },
  { id: 'startimes', label: 'StarTimes', ckCode: 'startimes' },
];

/** Static fallback catalog (live API preferred via getCablePackages). */
export const CABLE_PACKAGES: Record<CableProviderId, CablePackage[]> = {
  dstv: [
    { id: 'dstv-padi', name: 'Padi', price: 4400, validityDays: 30, ckPackageId: 'dstv-padi' },
    { id: 'dstv-yanga', name: 'Yanga', price: 6000, validityDays: 30, ckPackageId: 'dstv-yanga' },
    { id: 'dstv-confam', name: 'Confam', price: 11000, validityDays: 30, ckPackageId: 'dstv-confam' },
    { id: 'dstv79', name: 'Compact', price: 19000, validityDays: 30, ckPackageId: 'dstv79' },
    { id: 'dstv7', name: 'Compact Plus', price: 30000, validityDays: 30, ckPackageId: 'dstv7' },
    { id: 'dstv3', name: 'Premium', price: 44500, validityDays: 30, ckPackageId: 'dstv3' },
    { id: 'dstv9', name: 'Premium-French', price: 69000, validityDays: 30, ckPackageId: 'dstv9' },
    { id: 'dstv10', name: 'Premium-Asia', price: 50500, validityDays: 30, ckPackageId: 'dstv10' },
    { id: 'padi-extra', name: 'Padi + ExtraView', price: 10400, validityDays: 30, ckPackageId: 'padi-extra' },
    { id: 'yanga-extra', name: 'Yanga + ExtraView', price: 12000, validityDays: 30, ckPackageId: 'yanga-extra' },
    { id: 'confam-extra', name: 'Confam + ExtraView', price: 17000, validityDays: 30, ckPackageId: 'confam-extra' },
    { id: 'dstv30', name: 'Compact + Extra View', price: 25000, validityDays: 30, ckPackageId: 'dstv30' },
    { id: 'dstv45', name: 'Compact Plus + Extra View', price: 36000, validityDays: 30, ckPackageId: 'dstv45' },
    { id: 'dstv33', name: 'Premium + Extra View', price: 50500, validityDays: 30, ckPackageId: 'dstv33' },
    { id: 'com-frenchtouch', name: 'Compact + French Touch', price: 26000, validityDays: 30, ckPackageId: 'com-frenchtouch' },
    { id: 'complus-frenchtouch', name: 'Compact Plus + French Touch', price: 37000, validityDays: 30, ckPackageId: 'complus-frenchtouch' },
    { id: 'dstv-padi-showmax', name: 'Padi + Showmax', price: 8900, validityDays: 30, ckPackageId: 'dstv-padi-showmax' },
    { id: 'dstv-yanga-showmax', name: 'Yanga + Showmax', price: 8250, validityDays: 30, ckPackageId: 'dstv-yanga-showmax' },
    { id: 'dstv-confam-showmax', name: 'Confam + Showmax', price: 13250, validityDays: 30, ckPackageId: 'dstv-confam-showmax' },
    { id: 'dstv-compact-showmax', name: 'Compact + Showmax', price: 21250, validityDays: 30, ckPackageId: 'dstv-compact-showmax' },
    { id: 'dstv-compact-plus-showmax', name: 'Compact Plus + Showmax', price: 32250, validityDays: 30, ckPackageId: 'dstv-compact-plus-showmax' },
    { id: 'dstv-premium-showmax', name: 'Premium + Showmax', price: 44500, validityDays: 30, ckPackageId: 'dstv-premium-showmax' },
    { id: 'dstv-greatwall', name: 'Great Wall Standalone', price: 3800, validityDays: 30, ckPackageId: 'dstv-greatwall' },
    { id: 'dstv-indian', name: 'Indian', price: 14900, validityDays: 30, ckPackageId: 'dstv-indian' },
    { id: 'dstv-movie-bundle-add-on', name: 'Movie Bundle Add-on', price: 3500, validityDays: 30, ckPackageId: 'dstv-movie-bundle-add-on' },
    { id: 'frenchplus-addon', name: 'French Plus Add-on', price: 24500, validityDays: 30, ckPackageId: 'frenchplus-addon' },
    { id: 'frenchtouch-addon', name: 'French Touch Add-on', price: 7000, validityDays: 30, ckPackageId: 'frenchtouch-addon' },
  ],
  gotv: [
    { id: 'gotv-smallie', name: 'Smallie', price: 1900, validityDays: 30, ckPackageId: 'gotv-smallie' },
    { id: 'gotv-jinja', name: 'Jinja', price: 3900, validityDays: 30, ckPackageId: 'gotv-jinja' },
    { id: 'gotv-jolli', name: 'Jolli', price: 5800, validityDays: 30, ckPackageId: 'gotv-jolli' },
    { id: 'gotv-max', name: 'Max', price: 8500, validityDays: 30, ckPackageId: 'gotv-max' },
    { id: 'gotv-supa', name: 'Supa', price: 11400, validityDays: 30, ckPackageId: 'gotv-supa' },
    { id: 'gotv-supa-plus', name: 'Supa Plus', price: 16800, validityDays: 30, ckPackageId: 'gotv-supa-plus' },
    { id: 'gotv-smallie-3months', name: 'Smallie (3 months)', price: 5100, validityDays: 90, ckPackageId: 'gotv-smallie-3months' },
    { id: 'gotv-smallie-1year', name: 'Smallie (1 year)', price: 15000, validityDays: 365, ckPackageId: 'gotv-smallie-1year' },
  ],
  startimes: [
    { id: 'nova', name: 'Nova (Dish)', price: 2100, validityDays: 30, ckPackageId: 'nova' },
    { id: 'uni-2', name: 'Nova (Antenna)', price: 2100, validityDays: 30, ckPackageId: 'uni-2' },
    { id: 'basic', name: 'Basic (Antenna)', price: 4000, validityDays: 30, ckPackageId: 'basic' },
    { id: 'smart', name: 'Basic (Dish)', price: 5100, validityDays: 30, ckPackageId: 'smart' },
    { id: 'classic', name: 'Classic (Antenna)', price: 6000, validityDays: 30, ckPackageId: 'classic' },
    { id: 'special-monthly', name: 'Classic (Dish)', price: 7400, validityDays: 30, ckPackageId: 'special-monthly' },
    { id: 'super', name: 'Super (Dish)', price: 9800, validityDays: 30, ckPackageId: 'super' },
    { id: 'super-antenna-monthly', name: 'Super (Antenna)', price: 9500, validityDays: 30, ckPackageId: 'super-antenna-monthly' },
    { id: 'global-monthly-dish', name: 'Global (Dish)', price: 21000, validityDays: 30, ckPackageId: 'global-monthly-dish' },
    { id: 'uni-1', name: 'Chinese (Dish)', price: 21000, validityDays: 30, ckPackageId: 'uni-1' },
    { id: 'nova-weekly', name: 'Nova (Antenna) 1 Week', price: 700, validityDays: 7, ckPackageId: 'nova-weekly' },
    { id: 'nova-dish-weekly', name: 'Nova (Dish) 1 Week', price: 700, validityDays: 7, ckPackageId: 'nova-dish-weekly' },
    { id: 'basic-weekly', name: 'Basic (Antenna) 1 Week', price: 1400, validityDays: 7, ckPackageId: 'basic-weekly' },
    { id: 'smart-weekly', name: 'Basic (Dish) 1 Week', price: 1700, validityDays: 7, ckPackageId: 'smart-weekly' },
    { id: 'classic-weekly', name: 'Classic (Antenna) 1 Week', price: 2000, validityDays: 7, ckPackageId: 'classic-weekly' },
    { id: 'special-weekly', name: 'Classic (Dish) 1 Week', price: 2300, validityDays: 7, ckPackageId: 'special-weekly' },
    { id: 'classic-weekly-dish', name: 'Classic (Dish) 1 Week', price: 2500, validityDays: 7, ckPackageId: 'classic-weekly-dish' },
    { id: 'super-weekly', name: 'Super (Dish) 1 Week', price: 3300, validityDays: 7, ckPackageId: 'super-weekly' },
    { id: 'super-antenna-weekly', name: 'Super (Antenna) 1 Week', price: 3200, validityDays: 7, ckPackageId: 'super-antenna-weekly' },
    { id: 'global-weekly-dish', name: 'Global (Dish) 1 Week', price: 7000, validityDays: 7, ckPackageId: 'global-weekly-dish' },
    { id: 'shs-weekly-2800', name: 'SHS Weekly ₦2,800', price: 2800, validityDays: 7, ckPackageId: 'shs-weekly-2800' },
    { id: 'shs-weekly-4620', name: 'SHS Weekly ₦4,620', price: 4620, validityDays: 7, ckPackageId: 'shs-weekly-4620' },
    { id: 'shs-weekly-4900', name: 'SHS Weekly ₦4,900', price: 4900, validityDays: 7, ckPackageId: 'shs-weekly-4900' },
    { id: 'shs-weekly-9100', name: 'SHS Weekly ₦9,100', price: 9100, validityDays: 7, ckPackageId: 'shs-weekly-9100' },
    { id: 'shs-monthly-12000', name: 'SHS Monthly ₦12,000', price: 12000, validityDays: 30, ckPackageId: 'shs-monthly-12000' },
    { id: 'shs-monthly-19800', name: 'SHS Monthly ₦19,800', price: 19800, validityDays: 30, ckPackageId: 'shs-monthly-19800' },
    { id: 'shs-monthly-21000', name: 'SHS Monthly ₦21,000', price: 21000, validityDays: 30, ckPackageId: 'shs-monthly-21000' },
    { id: 'shs-monthly-39000', name: 'SHS Monthly ₦39,000', price: 39000, validityDays: 30, ckPackageId: 'shs-monthly-39000' },
  ],
};

export function findCablePackage(
  provider: CableProviderId,
  packageId: string,
): CablePackage | undefined {
  return CABLE_PACKAGES[provider]?.find(
    (p) => p.id === packageId || p.ckPackageId === packageId,
  );
}
