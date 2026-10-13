import { NextResponse } from 'next/server';
import { findCredentials, readJson, requireUser, sbRequest, webauthnConfigResponse } from '../../../../../lib/webauthn-server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 });
    const credentials = await findCredentials(user.id);
    return NextResponse.json({ devices: credentials.map((c: any) => ({ id: c.id, deviceLabel: c.device_label || 'This device', createdAt: c.created_at, lastUsedAt: c.last_used_at })) });
  } catch (error) {
    if (error instanceof Error && error.message === 'WEBAUTHN_NOT_CONFIGURED') return webauthnConfigResponse();
    return NextResponse.json({ error: 'Could not load registered devices.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 });
    const body = await readJson(req);
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'Device ID required.' }, { status: 400 });
    const owned = await sbRequest<any[]>(`webauthn_credentials?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&select=id`);
    if (!owned.length) return NextResponse.json({ error: 'Device not found.' }, { status: 404 });
    await sbRequest(`webauthn_credentials?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}`, { method: 'DELETE' });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'WEBAUTHN_NOT_CONFIGURED') return webauthnConfigResponse();
    return NextResponse.json({ error: 'Could not remove this device.' }, { status: 500 });
  }
}
