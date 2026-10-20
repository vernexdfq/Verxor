import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';
import { sbInsert, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Register a partner virtual account that was created outside Verxor
 * (e.g. child panel called XixaPay directly). Ensures the webhook can
 * resolve user_id and credit reseller_wallet when payment arrives.
 *
 * Auth: X-Api-Key: vx_panel_*
 * Body: {
 *   accountNumber, bankName?, accountName?, amountNgn?, externalRef?,
 *   reservedAccountId?, expireAt?
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const panel = await resolvePanelClient(req);
    if (!panel) {
      return NextResponse.json(
        { ok: false, message: 'Missing or invalid panel API key.' },
        { status: 401 },
      );
    }

    const userId = (panel.walletUserId || '').trim();
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: 'Panel key has no linked wallet.' },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const accountNumber = String(body.accountNumber || '').replace(/\D/g, '');
    if (!accountNumber || accountNumber.length < 8) {
      return NextResponse.json(
        { ok: false, message: 'Valid accountNumber is required.' },
        { status: 400 },
      );
    }

    const panelSlug =
      (panel.name || 'partner').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) ||
      'partner';
    const accountName =
      String(body.accountName || `Verxor-${panelSlug}`).slice(0, 80);
    const bankName = String(body.bankName || 'OPay');
    const amount = Math.round(Number(body.amountNgn ?? body.amount)) || null;
    const externalRef =
      String(body.externalRef || body.externalReference || '').trim() ||
      `vxp-panel-${String(panel.id).slice(0, 8)}-${Date.now()}`;
    const expireAt = body.expireAt ? String(body.expireAt) : null;
    const providerCustomerId = body.reservedAccountId
      ? String(body.reservedAccountId)
      : null;

    if (!externalRef.startsWith('vxp-')) {
      return NextResponse.json(
        { ok: false, message: 'externalRef must start with vxp- for partner funds.' },
        { status: 400 },
      );
    }

    if (supabaseConfigured()) {
      try {
        await sbInsert('virtual_accounts', {
          user_id: userId,
          provider: 'xixapay',
          bank_code: '100004',
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          account_type: 'dynamic',
          amount_ngn: amount,
          external_ref: externalRef,
          provider_customer_id: providerCustomerId,
          raw: {
            expire_at: expireAt,
            partner_fund: true,
            wallet_type: 'reseller',
            panel_id: panel.id,
            panel_name: panel.name,
            registered_by: 'panel',
          },
        });
      } catch (e) {
        console.error('[partner/register-va] insert', e);
        // Non-fatal if duplicate — webhook can still match by account number on retry
      }
    }

    return NextResponse.json({
      ok: true,
      registered: true,
      accountNumber,
      accountName,
      bankName,
      externalRef,
      panel: { id: panel.id, name: panel.name },
    });
  } catch (e) {
    console.error('[partner/register-va]', e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : 'Server error' },
      { status: 500 },
    );
  }
}
