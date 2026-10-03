-- ============================================================
-- VERXOR — Supabase schema (run in SQL Editor)
-- Virtual numbers + wallet + notifications + wholesale API keys
-- ============================================================

create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  pin_hash text,
  country_code text default 'NG',
  currency text default 'NGN',
  role text not null default 'customer' check (role in ('customer', 'admin', 'wholesale')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Wallet balances
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance_usd numeric(18, 6) not null default 0 check (balance_usd >= 0),
  balance_ngn numeric(18, 2) not null default 0 check (balance_ngn >= 0),
  updated_at timestamptz not null default now()
);

-- Immutable ledger
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
  tier text check (tier in ('economy', 'standard', 'fast', 'premium')),
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
create index if not exists number_orders_pool_idx on public.number_orders (pool_id, status);

-- Cached provider price rows (optional; filled by scrape jobs)
create table if not exists public.provider_price_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  country text not null,
  product text not null,
  operator text,
  cost_usd numeric(18, 6) not null,
  stock_count int,
  region text not null check (region in ('usa', 'worldwide')),
  tier text not null check (tier in ('economy', 'standard', 'fast', 'premium')),
  pool_id text not null,
  server_lane int not null check (server_lane in (1, 2)),
  fetched_at timestamptz not null default now()
);

create index if not exists provider_price_cache_pool_idx
  on public.provider_price_cache (pool_id, product, fetched_at desc);

-- Provider health (admin)
create table if not exists public.provider_health (
  provider text primary key,
  is_up boolean not null default true,
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  updated_at timestamptz not null default now()
);

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

-- Notifications
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

-- Wholesale / child-panel API keys
create table if not exists public.api_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_key_hash text not null unique,
  api_key_prefix text not null,
  markup_percent numeric(8, 2) not null default 0,
  allowed_products text[] not null default array['virtual_numbers'],
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
alter table public.number_orders enable row level security;
alter table public.service_orders enable row level security;
alter table public.notifications enable row level security;
alter table public.api_clients enable row level security;
alter table public.provider_price_cache enable row level security;
alter table public.provider_health enable row level security;

-- Drop old policies if re-running
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "wallets_select_own" on public.wallets;
drop policy if exists "ledger_select_own" on public.wallet_ledger;
drop policy if exists "number_orders_select_own" on public.number_orders;
drop policy if exists "service_orders_select_own" on public.service_orders;
drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "wallets_select_own" on public.wallets
  for select using (auth.uid() = user_id);

create policy "ledger_select_own" on public.wallet_ledger
  for select using (auth.uid() = user_id);

create policy "number_orders_select_own" on public.number_orders
  for select using (auth.uid() = user_id);

create policy "service_orders_select_own" on public.service_orders
  for select using (auth.uid() = user_id);

create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- provider_price_cache / provider_health / api_clients: service role only (no anon policies)

-- Optional seed health rows
insert into public.provider_health (provider, is_up)
values
  ('fivesim', true),
  ('grizzly', true),
  ('smsbower', true),
  ('pvapins', true)
on conflict (provider) do nothing;
