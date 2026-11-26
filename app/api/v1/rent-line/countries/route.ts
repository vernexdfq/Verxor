import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/rent-line/countries
 * Countries SignalWire officially supports for acquiring numbers.
 * US + CA are enabled by default on every SignalWire Space; the others
 * require international services to be activated on the Space (request
 * form in the SignalWire dashboard) before searches will return stock.
 * Retail / API only — this service is not offered to child panels.
 */

type Country = {
  code: string;
  name: string;
  flag: string;
  defaultEnabled: boolean;
};

const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', defaultEnabled: true },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', defaultEnabled: true },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', defaultEnabled: false },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', defaultEnabled: false },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', defaultEnabled: false },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', defaultEnabled: false },
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    countries: COUNTRIES,
    note: 'US and Canada are always available. Other countries activate after international services are enabled on the SignalWire Space.',
  });
}
