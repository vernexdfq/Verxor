-- Email OTP orders (run once in Supabase SQL editor)
create table if not exists public.email_orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null default 'anymessage',
  provider_order_id text not null,
  email_address text not null,
  site text not null,
  domain text not null,
  cost_usd numeric not null default 0,
  charged_ngn numeric not null default 0,
  audience text not null default 'retail',
  status text not null default 'waiting',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_orders_provider_order_id_idx
  on public.email_orders (provider_order_id);
create index if not exists email_orders_user_id_idx
  on public.email_orders (user_id, created_at desc);

-- Service role bypasses RLS; no client policies needed.
alter table public.email_orders enable row level security;
