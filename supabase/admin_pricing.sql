-- ============================================================
-- VERXOR — Admin pricing control (run in Supabase SQL Editor)
-- Safe to re-run. Does not drop existing data.
-- ============================================================

-- Global operator settings
create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.admin_settings (key, value)
values
  ('usd_ngn_rate', '1600'),
  ('default_retail_markup_pct', '35'),
  ('default_panel_markup_pct', '15')
on conflict (key) do nothing;

-- Per pool (+ optional product) retail / panel rates you control
-- pool_id examples: usa-economy, worldwide-premium
-- product: whatsapp | telegram | * (all products for that pool)
create table if not exists public.pool_pricing (
  id uuid primary key default gen_random_uuid(),
  pool_id text not null,
  product text not null default '*',
  -- provider cost is live from APIs; you only store your sell side
  retail_usd numeric(18, 6),
  retail_ngn numeric(18, 2),
  -- if retail_usd is null, sell = cost * (1 + retail_markup_pct/100)
  retail_markup_pct numeric(8, 2),
  panel_markup_pct numeric(8, 2) not null default 15,
  is_active boolean not null default true,
  notes text,
  updated_at timestamptz not null default now(),
  unique (pool_id, product)
);

create index if not exists pool_pricing_pool_idx on public.pool_pricing (pool_id);

-- Generic service rate cards (boost, logs, etc.)
create table if not exists public.service_pricing (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('boost', 'logs', 'other')),
  service_key text not null,
  service_name text not null,
  provider_cost_usd numeric(18, 6),
  retail_usd numeric(18, 6),
  retail_ngn numeric(18, 2),
  retail_markup_pct numeric(8, 2),
  panel_markup_pct numeric(8, 2) not null default 15,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (kind, service_key)
);

create index if not exists service_pricing_kind_idx on public.service_pricing (kind);

-- Service role only (admin API uses service role; no anon access)
alter table public.admin_settings enable row level security;
alter table public.pool_pricing enable row level security;
alter table public.service_pricing enable row level security;
