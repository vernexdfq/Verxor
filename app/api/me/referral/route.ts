import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/me/referral — the signed-in user's referral dashboard data.
 *   code, link, totals (invited / rewarded / pending), earnings sum,
 *   history entries (masked names) from referral_rewards.
 * Reward: 10% of the referred user's FIRST successful deposit, once per user.
 * Auth: Bearer Supabase access token.
 */
export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] || 'User';
  if (parts.length === 1) return first;
  return `${first} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
  }

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !serviceKey || !anonKey) {
    return NextResponse.json({ ok: false, error: 'Auth backend is not configured' }, { status: 503 });
  }

  try {
    const meRes = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!meRes.ok) {
      return NextResponse.json({ ok: false, error: 'Session expired. Sign in again.' }, { status: 401 });
    }
    const me = (await meRes.json()) as { id?: string };
    if (!me?.id) {
      return NextResponse.json({ ok: false, error: 'Session expired. Sign in again.' }, { status: 401 });
    }

    const hdr = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    const profileRes = await fetch(
      `${base}/rest/v1/profiles?id=eq.${encodeURIComponent(String(me.id))}&select=id,username,referral_code&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    const profileRows = profileRes.ok
      ? ((await profileRes.json()) as Array<{ username?: string | null; referral_code?: string | null }>)
      : [];
    const profile = profileRows?.[0] || {};

    // Ensure a referral code exists
    let code = String(profile.referral_code || '').trim();
    if (!code) {
      try {
        const gen = await fetch(`${base}/rest/v1/rpc/generate_referral_code`, {
          method: 'POST',
          headers: hdr,
          body: JSON.stringify({ p_user: String(me.id) }),
        });
        if (gen.ok) {
          code = String(await gen.json()).trim();
        }
      } catch {
        /* code stays empty; UI shows an honest retry state */
      }
    }

    // Rewards as the referrer
    const rewardsRes = await fetch(
      `${base}/rest/v1/referral_rewards?referrer_id=eq.${encodeURIComponent(String(me.id))}&select=referred_id,status,first_deposit_amount,reward_amount,rewarded_at,created_at&order=created_at.desc&limit=200`,
      { headers: hdr, cache: 'no-store' },
    );
    const rewards = rewardsRes.ok
      ? ((await rewardsRes.json()) as Array<{
          referred_id: string;
          status: string;
          first_deposit_amount: number | null;
          reward_amount: number | null;
          rewarded_at: string | null;
          created_at: string;
        }>)
      : [];

    // Masked referred-user names
    const referredIds = [...new Set(rewards.map((r) => String(r.referred_id)))];
    const nameById = new Map<string, string>();
    for (let i = 0; i < referredIds.length; i += 100) {
      const chunk = referredIds.slice(i, i + 100);
      const res = await fetch(
        `${base}/rest/v1/profiles?id=in.(${chunk.map((c) => `"${c}"`).join(',')})&select=id,full_name&limit=500`,
        { headers: hdr, cache: 'no-store' },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ id: string; full_name?: string | null }>;
        for (const r of rows || []) nameById.set(String(r.id), r.full_name || 'User');
      }
    }

    const entries = rewards.map((r) => ({
      name: maskName(nameById.get(String(r.referred_id)) || 'User'),
      status: r.status === 'rewarded' ? 'rewarded' : 'pending',
      firstDepositNgn: r.first_deposit_amount != null ? Number(r.first_deposit_amount) : null,
      rewardNgn: r.reward_amount != null ? Number(r.reward_amount) : null,
      rewardedAt: r.rewarded_at || null,
      invitedAt: r.created_at,
    }));

    const total = entries.length;
    const rewarded = entries.filter((e) => e.status === 'rewarded').length;
    const totalEarned = entries.reduce((sum, e) => sum + (e.rewardNgn || 0), 0);

    return NextResponse.json({
      ok: true,
      code,
      username: profile.username || null,
      link: code ? `https://verxor.com/?ref=${code}` : null,
      totals: {
        invited: total,
        rewarded,
        pending: total - rewarded,
        earnedNgn: Math.round(totalEarned * 100) / 100,
      },
      entries,
      note: 'You earn 10% of each invited user\u2019s FIRST successful deposit — credited to your wallet instantly, once per user.',
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not load referral data.' }, { status: 500 });
  }
}
