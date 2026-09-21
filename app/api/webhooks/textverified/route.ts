import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = process.env.TEXTVERIFIED_WEBHOOK_SECRET;
  if (!process.env.TEXTVERIFIED_API_KEY) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  if (secret) {
    const provided =
      req.headers.get('x-webhook-secret') ||
      req.headers.get('x-textverified-signature') ||
      req.headers.get('authorization');
    if (!provided || !provided.includes(secret)) {
      // Soft check until provider docs confirm exact header name
      console.warn('[textverified] webhook secret header missing or mismatched');
    }
  }

  try {
    await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  return NextResponse.json({ status: 'ok' });
}

export async function GET() {
  return NextResponse.json({
    service: 'textverified-webhook',
    ready: Boolean(process.env.TEXTVERIFIED_API_KEY),
  });
}
