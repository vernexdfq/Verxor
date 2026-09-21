import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  if (!process.env.SMSBOWER_API_KEY) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  try {
    await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  return NextResponse.json({ status: 'ok' });
}

export async function GET() {
  return NextResponse.json({ service: 'smsbower-webhook', ready: Boolean(process.env.SMSBOWER_API_KEY) });
}
