import { NextResponse } from 'next/server';

/**
 * Public catalog shape for Verxor app + white-label panels.
 * Live provider merge lands after env + buy path are proven.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    product: 'virtual_numbers',
    lanes: [
      {
        server: 1,
        label: 'Server 1',
        pools: [
          { id: 'usa-economy', title: 'USA · Economy', region: 'usa', tier: 'economy' },
          { id: 'usa-standard', title: 'USA · Standard', region: 'usa', tier: 'standard' },
          { id: 'worldwide-economy', title: 'Worldwide · Economy', region: 'worldwide', tier: 'economy' },
          { id: 'worldwide-standard', title: 'Worldwide · Standard', region: 'worldwide', tier: 'standard' },
        ],
      },
      {
        server: 2,
        label: 'Server 2',
        pools: [
          { id: 'usa-fast', title: 'USA · Fast', region: 'usa', tier: 'fast' },
          { id: 'usa-premium', title: 'USA · Premium', region: 'usa', tier: 'premium' },
          { id: 'worldwide-fast', title: 'Worldwide · Fast', region: 'worldwide', tier: 'fast' },
          { id: 'worldwide-premium', title: 'Worldwide · Premium', region: 'worldwide', tier: 'premium' },
        ],
      },
    ],
    maxProviderCostUsd: 2,
    note: 'Live stock attaches after provider buy path is enabled.',
  });
}
