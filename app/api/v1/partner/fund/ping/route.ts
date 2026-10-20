import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 25;

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const panel = await resolvePanelClient(req);
    if (!panel?.walletUserId) {
      return NextResponse.json(
        { ok: false, step: 'auth', message: 'Invalid panel key or no linked wallet' },
        { status: 401 },
      );
    }

    const apiKey = process.env.XIXAPAY_API_KEY?.trim();
    const secret = process.env.XIXAPAY_SECRET_KEY?.trim();
    const businessId = process.env.XIXAPAY_BUSINESS_ID?.trim();
    if (!apiKey || !secret || !businessId) {
      return NextResponse.json({
        ok: false,
        step: 'config',
        message: 'XIXAPAY_* missing on Verxor',
        ms: Date.now() - started,
      });
    }

    let body: { amount?: number } = {};
    try {
      body = await req.json();
    } catch {
      /* empty */
    }
    const amount = Math.round(Number(body.amount)) || 0;
    const fullTest = amount >= 500;

    const base = (process.env.XIXAPAY_BASE_URL || 'https://api.xixapay.com').replace(/\/$/, '');
    const panelSlug =
      (panel.name || 'partner').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'partner';
    const externalRef = `vxp-panel-${String(panel.id).slice(0, 8)}-${Date.now()}`;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.verxor.com').replace(/\/$/, '');

    const payload = fullTest
      ? {
          email:
            panelSlug === 'vernexdigital'
              ? 'vernexdigital@gmail.com'
              : `partner.${panelSlug}@gmail.com`,
          name: `Verxor-${panelSlug}`,
          phoneNumber: '08000000000',
          bankCode: ['100004'],
          businessId,
          accountType: 'dynamic',
          amount,
          externalReference: externalRef,
          callbackUrl: `${appUrl}/api/webhooks/xixapay/virtual-account`,
        }
      : { businessId };

    let status = 0;
    let bodySnippet = '';
    let networkError = '';

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(`${base}/api/v1/createVirtualAccount`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(t);
      status = res.status;
      bodySnippet = (await res.text().catch(() => '')).slice(0, 400);
    } catch (e) {
      networkError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }

    const reachable = !networkError && status > 0;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(bodySnippet) as Record<string, unknown>;
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      ok: reachable,
      step: fullTest ? 'full_create' : 'xixapay',
      fullTest,
      merchant: 'verxor',
      panel: { id: panel.id, name: panel.name },
      xixapayHttpStatus: status,
      xixapayBody: bodySnippet,
      networkError: networkError || null,
      providerMessage: typeof parsed.message === 'string' ? parsed.message : null,
      ms: Date.now() - started,
      message: networkError
        ? `Cannot reach XixaPay: ${networkError}`
        : fullTest
          ? `Full create HTTP ${status}`
          : 'Reachability OK',
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        step: 'crash',
        message: e instanceof Error ? e.message : 'error',
        ms: Date.now() - started,
      },
      { status: 500 },
    );
  }
}
