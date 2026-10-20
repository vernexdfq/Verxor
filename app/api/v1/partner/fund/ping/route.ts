import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 20;

/**
 * Lightweight check: panel auth + can Verxor reach XixaPay?
 * Does NOT create an account (sends empty body → expect 401/400 from provider).
 */
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

    const base = (process.env.XIXAPAY_BASE_URL || 'https://api.xixapay.com').replace(/\/$/, '');
    let status = 0;
    let bodySnippet = '';
    let networkError = '';

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 12_000);
      const res = await fetch(`${base}/api/v1/createVirtualAccount`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        // Intentionally incomplete — we only care that we get a JSON reply from XixaPay
        body: JSON.stringify({ businessId }),
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(t);
      status = res.status;
      bodySnippet = (await res.text().catch(() => '')).slice(0, 200);
    } catch (e) {
      networkError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }

    const reachable = !networkError && status > 0;
    return NextResponse.json({
      ok: reachable,
      step: 'xixapay',
      merchant: 'verxor',
      panel: { id: panel.id, name: panel.name },
      xixapayHttpStatus: status,
      xixapayBody: bodySnippet,
      networkError: networkError || null,
      ms: Date.now() - started,
      message: reachable
        ? 'Verxor can reach XixaPay with merchant keys. Generate should work.'
        : `Cannot reach XixaPay from Verxor: ${networkError || `HTTP ${status}`}`,
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
