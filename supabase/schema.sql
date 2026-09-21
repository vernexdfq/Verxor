-- ============================================================
-- VERXOR — Supabase schema (run once in SQL Editor)
-- Wallet + orders + notifications + wholesale API keys
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  country_code text default 'NG',
  currency text default 'NGN',
  role text not null default 'customer' check (role in ('customer', 'admin', 'wholesale')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Wallet balances (one row per user)
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance_usd numeric(18, 6) not null default 0 check (balance_usd >= 0),
  balance_ngn numeric(18, 2) not null default 0 check (balance_ngn >= 0),
  updated_at timestamptz not null default now()
);

-- Immutable ledger (credits / debits)
create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('fund', 'purchase', 'refund', 'adjustment', 'wholesale_debit')),
  amount_usd numeric(18, 6) not null,
  amount_ngn numeric(18, 2),
  currency text not null default 'USD',
  balance_after_usd numeric(18, 6),
  reference text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wallet_ledger_user_created_idx
  on public.wallet_ledger (user_id, created_at desc);

-- Flutterwave / payment intents
create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'flutterwave',
  amount numeric(18, 2) not null check (amount > 0),
  currency text not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'successful', 'failed', 'cancelled')),
  flw_tx_ref text unique,
  flw_transaction_id text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_intents_user_idx on public.payment_intents (user_id, created_at desc);

-- Virtual number (OTP) orders
create table if not exists public.number_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  provider_order_id text,
  phone text,
  country text,
  product text,
  pool_id text,
  server_lane int check (server_lane in (1, 2)),
  tier text,
  cost_usd numeric(18, 6),
  price_usd numeric(18, 6) not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'received', 'completed', 'cancelled', 'expired', 'failed')),
  otp_code text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists number_orders_user_idx on public.number_orders (user_id, created_at desc);
create index if not exists number_orders_provider_idx on public.number_orders (provider, provider_order_id);

-- Generic service orders (SMM, accounts, etc.)
create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('smm', 'accounts', 'rental', 'other')),
  provider text,
  provider_order_id text,
  title text not null,
  price_usd numeric(18, 6) not null,
  status text not null default 'pending',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_orders_user_idx on public.service_orders (user_id, created_at desc);

-- In-app notifications (single feed)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('otp', 'order', 'wallet', 'security', 'system', 'number')),
  title text not null,
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- Wholesale / panel API keys (vernexdigital etc.)
create table if not exists public.api_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_key_hash text not null unique,
  api_key_prefix text not null,
  markup_percent numeric(8, 2) not null default 0,
  is_active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Auto profile + wallet on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.payment_intents enable row level security;
alter table public.number_orders enable row level security;
alter table public.service_orders enable row level security;
alter table public.notifications enable row level security;
alter table public.api_clients enable row level security;

-- Users read/update own profile
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "wallets_select_own" on public.wallets
  for select using (auth.uid() = user_id);

create policy "ledger_select_own" on public.wallet_ledger
  for select using (auth.uid() = user_id);

create policy "payments_select_own" on public.payment_intents
  for select using (auth.uid() = user_id);

create policy "number_orders_select_own" on public.number_orders
  for select using (auth.uid() = user_id);

create policy "service_orders_select_own" on public.service_orders
  for select using (auth.uid() = user_id);

create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- api_clients: no direct client access (service role only)
-- (no policies for anon/authenticated = blocked by RLS)

-- Service role bypasses RLS for webhooks and provider jobs.
