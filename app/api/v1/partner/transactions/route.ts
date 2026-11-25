import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/partner/transactions
 * Panel-key auth. Returns the partner (reseller) wallet funding history:
 *   - kind 'partner_fund' transactions (OPay/virtual-account self-funding)
 *   - admin audit entries (panel_wallet_credit / panel_wallet_debit done by
 *     the Verxor admin from the Verxor admin panel)
 * Net credited amounts only — platform fee details are never exposed.
 */

type Entry = {
  id: string;
  type: 'deposit' | 'admin_credit' | 'admin_debit';
  title: string;
  amount: number;
  createdAt: string;
};

export async function GET(req: NextRequest) {
  try {
    const panel = await resolvePanelClient(req).catch(() => null);
    const userId = (panel?.walletUserId || '').trim();
    if (!panel || !userId) {
      return NextResponse.json(
        { ok: false, error: 'unauthorized', reason: 'Missing or invalid panel API key' },
        { status: 401 },
      );
    }

    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
    }
    const hdr = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    };

    // Self-funding deposits (OPay virtual account) — newest 50
    const depositsRes = await fetch(
      `${base}/rest/v1/transactions?user_id=eq.${encodeURIComponent(userId)}&kind=eq.partner_fund&status=eq.completed&select=id,amount,created_at&order=created_at.desc&limit=50`,
      { headers: hdr, cache: 'no-store' },
    ).catch(() => null);
    const deposits = depositsRes?.ok
      ? ((await depositsRes.json().catch(() => [])) as Array<{
          id: string;
          amount?: string | number;
          created_at: string;
        }>)
      : [];

    // Verxor admin manual credit / debit on the panel wallet — newest 50
    const auditRes = await fetch(
      `${base}/rest/v1/admin_audit_log?user_id=eq.${encodeURIComponent(userId)}&action=in.(panel_wallet_credit,panel_wallet_debit)&select=id,action,amount_ngn,reason,created_at&order=created_at.desc&limit=50`,
      { headers: hdr, cache: 'no-store' },
    ).catch(() => null);
    const audit = auditRes?.ok
      ? ((await auditRes.json().catch(() => [])) as Array<{
          id: string;
          action?: string;
          amount_ngn?: string | number;
          reason?: string | null;
          created_at: string;
        }>)
      : [];

    const entries: Entry[] = [];
    for (const d of deposits) {
      entries.push({
        id: `dep-${d.id}`,
        type: 'deposit',
        title: 'Wallet top-up via bank transfer',
        amount: Math.round((Number(d.amount) || 0) * 100) / 100,
        createdAt: d.created_at,
      });
    }
    for (const a of audit) {
      const isDebit = a.action === 'panel_wallet_debit';
      entries.push({
        id: `adm-${a.id}`,
        type: isDebit ? 'admin_debit' : 'admin_credit',
        title: isDebit
          ? `Verxor admin debit${a.reason ? ` — ${a.reason}` : ''}`
          : `Verxor admin top-up${a.reason ? ` — ${a.reason}` : ''}`,
        amount: Math.round((Number(a.amount_ngn) || 0) * 100) / 100,
        createdAt: a.created_at,
      });
    }

    entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return NextResponse.json({
      ok: true,
      entries: entries.slice(0, 60),
    });
  } catch (e) {
    console.error('[partner/transactions]', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
