-- ============================================================
-- TARGET PROJECT: VERXOR MAIN SUPABASE (verxor.com)
-- NOT the vernexdigital panel project.
--
-- VERXOR — server-side usernames + referral program.
--   • profiles: username (unique), referral_code (unique),
--     referred_by, first_deposit_at
--   • referral_rewards: one row per referred user; 10% of the
--     referred user's FIRST successful deposit is credited to the
--     referrer's wallet exactly once.
--   • RPC referral_reward_on_deposit(p_user, p_amount) is called by
--     the deposit webhooks after the wallet credit succeeds.
-- Safe to re-run.
-- ============================================================

-- ---------- 1. profiles columns ----------
alter table public.profiles
  add column if not exists username text,
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles (id) on delete set null,
  add column if not exists first_deposit_at timestamptz;

create unique index if not exists profiles_username_key
  on public.profiles (lower(username)) where username is not null;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code) where referral_code is not null;

create index if not exists profiles_referred_by_idx on public.profiles (referred_by);

-- ---------- 2. referral rewards table ----------
create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referred_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'rewarded')),
  first_deposit_amount numeric(18, 2),
  reward_amount numeric(18, 2),
  rewarded_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists referral_rewards_referred_key
  on public.referral_rewards (referred_id);

alter table public.referral_rewards enable row level security;
-- No policies: server (service role) only. Client roles blocked.

-- ---------- 3. referral code generator ----------
create or replace function public.generate_referral_code(p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  code text;
  n int := 0;
begin
  if p_user is null then return null; end if;

  select coalesce(full_name, 'user') into base from public.profiles where id = p_user;
  base := upper(regexp_replace(split_part(coalesce(base, 'user'), ' ', 1), '[^A-Za-z0-9]', '', 'g'));
  if base is null or base = '' then base := 'USER'; end if;
  base := substr(base, 1, 6);

  loop
    n := n + 1;
    code := base || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    exit when not exists (select 1 from public.profiles where referral_code = code) or n > 25;
  end loop;

  update public.profiles
     set referral_code = code
   where id = p_user and referral_code is null;

  return code;
end;
$$;

-- ---------- 4. backfill codes for existing profiles ----------
do $$
declare
  r record;
begin
  for r in select id from public.profiles where referral_code is null order by created_at asc
  loop
    perform public.generate_referral_code(r.id);
  end loop;
end;
$$;

-- ---------- 5. first-deposit reward (10%, once per referred user) ----------
-- Called by the deposit webhooks AFTER the wallet credit succeeds.
-- Credits the referrer's naira wallet + ledger row and marks the reward done.
create or replace function public.referral_reward_on_deposit(p_user uuid, p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  r_ref uuid;
  rew numeric;
begin
  if p_user is null or p_amount is null or p_amount <= 0 then
    return 0;
  end if;

  select referred_by into r_ref from public.profiles where id = p_user;
  if r_ref is null then
    return 0;
  end if;

  -- Only the FIRST successful deposit rewards. The atomic update makes sure
  -- concurrent webhook calls cannot double-pay.
  update public.profiles
     set first_deposit_at = now()
   where id = p_user
     and first_deposit_at is null;
  if not found then
    return 0;
  end if;

  rew := round(p_amount * 0.10, 2);
  if rew <= 0 then
    return 0;
  end if;

  -- Credit the referrer's wallet (NGN)
  insert into public.wallets (user_id, balance_ngn)
       values (r_ref, rew)
  on conflict (user_id) do update
      set balance_ngn = public.wallets.balance_ngn + rew,
          updated_at = now();

  -- Immutable ledger entry
  insert into public.wallet_ledger (user_id, kind, amount_usd, amount_ngn, currency, reference, meta)
  values (
    r_ref,
    'adjustment',
    0,
    rew,
    'NGN',
    'referral-first-deposit:' || p_user::text,
    jsonb_build_object('type', 'referral_reward', 'referred_user', p_user)
  );

  insert into public.referral_rewards
    (referrer_id, referred_id, status, first_deposit_amount, reward_amount, rewarded_at)
  values
    (r_ref, p_user, 'rewarded', p_amount, rew, now())
  on conflict (referred_id) do update
    set status = 'rewarded',
        first_deposit_amount = excluded.first_deposit_amount,
        reward_amount = excluded.reward_amount,
        rewarded_at = now();

  return rew;
end;
$$;

-- Mark historical deposits so existing users don't retroactively reward on their next deposit
do $$
begin
  update public.profiles p
     set first_deposit_at = coalesce(
       (select min(l.created_at)
          from public.wallet_ledger l
         where l.user_id = p.id and l.kind = 'fund'),
       now()
     )
   where p.first_deposit_at is null;
end;
$$;
