-- account_orders — My Logs persistence for Buy Accounts & Logs
-- Run once in Supabase SQL editor.

create table if not exists public.account_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null default 'Facebook',
  title text not null,
  quantity integer not null check (quantity > 0),
  unit_price_ngn integer not null check (unit_price_ngn >= 0),
  total_ngn integer not null check (total_ngn >= 0),
  provider_listing_id bigint not null,
  credentials text[] not null default '{}',
  status text not null default 'delivered'
    check (status in ('delivered', 'pending', 'failed', 'refunded')),
  provider_order_id text,
  client_reference text,
  created_at timestamptz not null default now()
);

create index if not exists account_orders_user_created_idx
  on public.account_orders (user_id, created_at desc);

alter table public.account_orders enable row level security;

-- Users can only read their own orders
create policy if not exists "account_orders_select_own"
  on public.account_orders
  for select
  using (auth.uid() = user_id);

comment on table public.account_orders is 'Purchased accounts/logs delivered to Verxor users';
