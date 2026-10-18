import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { sbInsert, sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

/**
 * Generate a child-panel API key and persist to public.api_clients.
 * Key format: vx_panel_<32 hex chars> — shown once.
 *
 * Body: { password, panelName?, ownerEmail?, markupPercent? }
 * ownerEmail → links wallet_user_id so VN buys debit that Verxor wallet.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      password?: string;
      panelName?: string;
      ownerEmail?: string;
      markupPercent?: number;
    };
    const password = typeof body.password === 'string' ? body.password : '';
    const panelName = (typeof body.panelName === 'string' && body.panelName.trim()) || 'Child Panel';
    const ownerEmail = (typeof body.ownerEmail === 'string' ? body.ownerEmail : '').trim().toLowerCase();
    const markupPercent =
      typeof body.markupPercent === 'number' && Number.isFinite(body.markupPercent)
        ? body.markupPercent
        : 15;
    const expected = process.env.ADMIN_PASSWORD || '';

    if (!expected) {
      return NextResponse.json(
        { ok: false, reason: 'ADMIN_PASSWORD is not configured on the server' },
        { status: 503 },
      );
    }
    if (!password || password !== expected) {
      return NextResponse.json({ ok: false, reason: 'Invalid password' }, { status: 401 });
    }

    const raw = randomBytes(16).toString('hex');
    const apiKey = `vx_panel_${raw}`;
    const apiKeyPrefix = apiKey.slice(0, 16);
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    let walletUserId: string | null = null;
    if (ownerEmail && supabaseConfigured()) {
      try {
        const rows = (await sbSelect(
          'profiles',
          `email=eq.${encodeURIComponent(ownerEmail)}&select=id,email&limit=1`,
        )) as Array<{ id: string }>;
        if (rows?.[0]?.id) walletUserId = rows[0].id;
      } catch {
        /* profile lookup optional */
      }
    }

    let clientId: string | null = null;
    if (supabaseConfigured()) {
      try {
        const inserted = (await sbInsert('api_clients', {
          name: panelName,
          api_key_hash: keyHash,
          api_key_prefix: apiKeyPrefix,
          markup_percent: markupPercent,
          allowed_products: ['virtual_numbers'],
          is_active: true,
          meta: {
            wallet_user_id: walletUserId,
            owner_email: ownerEmail || null,
          },
        })) as Array<{ id: string }>;
        clientId = inserted?.[0]?.id || null;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'persist failed';
        return NextResponse.json(
          {
            ok: false,
            reason: `Could not save API key to api_clients: ${msg}. Run supabase/schema.sql if the table is missing.`,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      panel: {
        id: clientId,
        name: panelName,
        apiKey,
        apiKeyPrefix,
        keyHash,
        markupPercent,
        walletUserId,
        ownerEmail: ownerEmail || null,
        walletLinked: Boolean(walletUserId),
        createdAt: new Date().toISOString(),
        usage: {
          base: 'https://verxor.com/api/v1',
          header: 'Authorization: Bearer <apiKey>  OR  X-Api-Key: <apiKey>',
          endpoints: {
            catalog: 'GET /api/v1/catalog?mode=services|countries|prices&pool=...&service=...&country=...',
            buy: 'POST /api/v1/numbers/buy',
            status: 'GET /api/v1/numbers/status?provider=grizzly&providerOrderId=...',
            cancel: 'POST /api/v1/numbers/cancel',
          },
        },
        envHint: {
          VERXOR_API_BASE: 'https://verxor.com/api/v1',
          VERXOR_PANEL_API_KEY: apiKey,
          ...(walletUserId ? { VERXOR_PANEL_WALLET_USER_ID: walletUserId } : {}),
        },
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: 'Bad request' }, { status: 400 });
  }
}
