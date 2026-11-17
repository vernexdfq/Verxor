-- ============================================================
-- Verxor Admin Phase 2 — run once in Supabase SQL Editor
-- ============================================================

-- 1) Admin settings (USD→NGN daily rate, global switches)
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.admin_settings (key, value)
values ('usd_ngn_rate', to_jsonb(1380))
on conflict (key) do nothing;

-- 2) Per-user API service permissions (the unlock matrix)
-- service ids: virtual-numbers, email-otp, boost, vtu,
-- buy-logs, rent-sms, rent-sms-calls, telegram-premium
create table if not exists public.service_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  service text not null,
  enabled boolean not null default false,
  unlock_note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, service)
);

-- 3) Admin audit log (manual credits/debits, unlocks, bans)
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_label text not null default 'operator',
  action text not null,
  user_id uuid,
  amount_ngn numeric,
  reason text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4) Child panels registry
create table if not exists public.child_panels (
  id text primary key,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  domain text,
  api_key_prefix text,
  suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
