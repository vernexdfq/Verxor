import { NextRequest, NextResponse } from 'next/server';
import {
  isSmeConfigured,
  purchaseData,
  type SmeNetworkSlug,
} from '@/lib/providers/smeapi';

const NETWORKS = new Set<SmeNetworkSlug>(['mtn', 'glo', '9mobile', 'airtel']);

export async function POST(req: NextRequest) {
  if (!isSmeConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Data provider not configured' },
      { status: 503 },
    );
  }

  let body: {
    network?: string;
    phone?: string;
    dataPlanId?: number | string;
    planId?: number | string;
    ported?: boolean;
    ref?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const network = String(body.network || '').toLowerCase() as SmeNetworkSlug;
  if (!NETWORKS.has(network)) {
    return NextResponse.json({ ok: false, error: 'Invalid network' }, { status: 400 });
  }

  const dataPlanId = Number(body.dataPlanId ?? body.planId);
  if (!Number.isFinite(dataPlanId) || dataPlanId <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid data plan' }, { status: 400 });
  }

  try {
    const result = await purchaseData({
      network,
      phone: String(body.phone || ''),
      dataPlanId,
      ported: Boolean(body.ported),
      ref: body.ref,
    });
    return NextResponse.json({
      ok: true,
      order: {
        ref: result.ref,
        status: result.status,
        phone: result.phone,
        dataPlanId: result.dataPlanId,
        network: result.network,
        message: result.message,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Data purchase failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
