-- ============================================================
-- VERXOR — Virtual Cards & Identity KYC Schema (XixaPay)
-- ============================================================

-- Virtual cards table
create table if not exists public.virtual_cards (
  id text primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  card_number_masked text not null,
  cardholder_name text not null,
  expiry text not null default '08/29',
  currency text not null default 'USD',
  balance_usd numeric(18, 2) not null default 0 check (balance_usd >= 0),
  status text not null default 'active' check (status in ('active', 'frozen', 'terminated')),
  is_frozen boolean not null default false,
  is_demo boolean not null default false,
  provider text not null default 'xixapay',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists virtual_cards_user_idx on public.virtual_cards (user_id, created_at desc);

-- Virtual accounts table (if not already existing)
create table if not exists public.virtual_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  provider text not null default 'xixapay',
  bank_code text,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  account_type text not null default 'dynamic' check (account_type in ('dynamic', 'static')),
  amount_ngn numeric(18, 2),
  external_ref text,
  provider_customer_id text,
  created_at timestamptz not null default now()
);

create index if not exists virtual_accounts_acc_num_idx on public.virtual_accounts (account_number);
create index if not exists virtual_accounts_user_idx on public.virtual_accounts (user_id, account_type);

-- RLS
alter table public.virtual_cards enable row level security;
alter table public.virtual_accounts enable row level security;

create policy "virtual_cards_select_own" on public.virtual_cards
  for select using (auth.uid() = user_id);

create policy "virtual_accounts_select_own" on public.virtual_accounts
  for select using (auth.uid() = user_id);
