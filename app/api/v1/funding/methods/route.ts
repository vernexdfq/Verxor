import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Always return OPay immediately — no DB/auth wait so Fund page never spins. */
const OPAY = {
  id: 'opay',
  label: 'OPay',
  bankCode: '100004',
  bankName: 'OPay',
  accountNumber: undefined as string | undefined,
  accountName: undefined as string | undefined,
  hasAccount: false,
  accountType: 'dynamic' as const,
  amountNgn: undefined as number | undefined,
  feeNote: undefined as string | undefined,
};

export async function GET(_req: NextRequest) {
  const providers = [OPAY];
  return NextResponse.json({
    ok: true,
    banks: providers,
    providers,
  });
}
