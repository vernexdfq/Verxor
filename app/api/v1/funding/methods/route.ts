import { NextRequest, NextResponse } from 'next/server';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/** OPay first — PalmPay often fails/timeouts on XixaPay dynamic VA for some merchants */
const XIXA_BANKS = [
  { id: 'opay', label: 'OPay', bankCode: '100004', bankName: 'OPay' },
  { id: 'palmpay', label: 'PalmPay', bankCode: '20867', bankName: 'PalmPay' },
];

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    const uid = req.nextUrl.searchParams.get('userId');
    return uid || null;
  }

  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return null;

  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: string };
    return u.id || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const xixapayReady = Boolean(
    process.env.XIXAPAY_API_KEY &&
      process.env.XIXAPAY_SECRET_KEY &&
      process.env.XIXAPAY_BUSINESS_ID,
  );

  if (!xixapayReady) {
    return NextResponse.json({
      ok: true,
      banks: [],
      providers: [],
      message: 'Payment provider not configured yet',
    });
  }

  const userId = await resolveUserId(req);
  let accounts: Array<{
    bank_code?: string;
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    account_type?: string;
    amount_ngn?: number;
  }> = [];

  if (userId && supabaseConfigured()) {
    try {
      accounts = await sbSelect(
        'virtual_accounts',
        `user_id=eq.${userId}&order=created_at.desc&limit=20`,
      );
    } catch {
      accounts = [];
    }
  }

  const providers = XIXA_BANKS.map((b) => {
    const match = accounts.find(
      (a) =>
        a.bank_code === b.bankCode ||
        (a.bank_name || '').toLowerCase().includes(b.label.toLowerCase()),
    );
    return {
      id: b.id,
      label: b.label,
      bankCode: b.bankCode,
      bankName: match?.bank_name || b.bankName,
      accountNumber: match?.account_number || undefined,
      accountName: match?.account_name || undefined,
      hasAccount: Boolean(match?.account_number),
      accountType: match?.account_type || 'dynamic',
      amountNgn: match?.amount_ngn ?? undefined,
      feeNote: undefined as string | undefined,
    };
  });

  return NextResponse.json({
    ok: true,
    banks: providers,
    providers,
  });
}
