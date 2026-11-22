/**
 * GET /api/v1/accounts/download?id=<orderId>&token=<downloadToken>
 * Serves a clean .txt file containing the purchased credentials and instructions.
 * Instant download via email link or website button.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';
import { createAccountDownloadToken, buildCredentialsFileText } from '@/lib/accounts-download';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const id = (req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('orderId') || '').trim();
    const token = (req.nextUrl.searchParams.get('token') || '').trim();

    if (!id) {
      return new NextResponse('Order ID is required', { status: 400 });
    }

    if (!supabaseConfigured()) {
      return new NextResponse('Database service not configured', { status: 503 });
    }

    // Security check: either a valid HMAC download token, or authenticated user
    const expectedToken = createAccountDownloadToken(id);
    const tokenValid = token && token === expectedToken;

    let authorized = Boolean(tokenValid);

    if (!authorized) {
      const auth = req.headers.get('authorization') || '';
      const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
      if (bearer) {
        const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
        const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
        if (base && anon) {
          const res = await fetch(`${base}/auth/v1/user`, {
            headers: { apikey: anon, Authorization: `Bearer ${bearer}` },
            cache: 'no-store',
          }).catch(() => null);
          if (res && res.ok) {
            const u = (await res.json().catch(() => ({}))) as { id?: string };
            if (u.id) authorized = true;
          }
        }
      }
    }

    if (!authorized) {
      return new NextResponse('Unauthorized: Invalid or expired download link', { status: 401 });
    }

    const rows = await sbSelect('account_orders', `id=eq.${encodeURIComponent(id)}&limit=1`);
    const order = Array.isArray(rows) && rows[0] ? (rows[0] as Record<string, unknown>) : null;

    if (!order) {
      return new NextResponse('Order not found', { status: 404 });
    }

    const platform = String(order.platform || 'Account');
    const title = String(order.title || 'Delivered Accounts');
    const quantity = Number(order.quantity) || 1;
    const credentials = Array.isArray(order.credentials) ? order.credentials.map(String) : [];

    const fileContent = buildCredentialsFileText({
      id,
      platform,
      title,
      quantity,
      credentials,
      createdAt: order.created_at ? String(order.created_at) : undefined,
    });

    const safePlatform = platform.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `verxor-${safePlatform}-order-${id.slice(0, 8)}.txt`;

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Download failed';
    return new NextResponse(`Download error: ${message}`, { status: 500 });
  }
}
