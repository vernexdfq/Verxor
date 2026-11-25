import { NextRequest, NextResponse } from 'next/server';
import * as anymessage from '@/lib/providers/anymessage';
import { resolveEmailOtpPricing } from '@/lib/email-otp-pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!anymessage.isConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Email OTP service is temporarily unavailable' },
        { status: 503 },
      );
    }

    const rawSite = (req.nextUrl.searchParams.get('site') || '').trim();
    if (!rawSite || rawSite.length < 2) {
      return NextResponse.json({ ok: false, error: 'Please enter a platform or website domain' }, { status: 400 });
    }

    const cleanSite = anymessage.normalizeSite(rawSite);

    // Audience-aware: retail / API user / Child Panel toggles decide the markup.
    const { audience, markup, rate } = await resolveEmailOtpPricing(req);

    let raw: Record<string, anymessage.DomainStock>;
    try {
      raw = await anymessage.getQuantity(cleanSite);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load domains';
      return NextResponse.json({ ok: false, error: msg }, { status: 503 });
    }

    const domains = anymessage.priceDomains(raw, { markup, rate });

    return NextResponse.json(
      {
        ok: true,
        site: cleanSite,
        audience,
        domains,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load domains';
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
