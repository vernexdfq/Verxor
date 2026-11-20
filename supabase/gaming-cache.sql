-- Gaming catalog snapshot (MooGold) — run once in the Supabase SQL editor.
-- Purpose: cache provider data in Supabase so browsing the Gaming Top-Up
-- page (and later child panels / API users) does NOT burn the Fixie
-- proxy request budget (500 req/mo) on every page view.
--
-- All access is server-side with the service role key; RLS stays on with
-- no policies (service role bypasses RLS).

create table if not exists public.gaming_products (
  id text primary key,
  category_id text not null,
  name text not null,
  position integer not null default 0,
  synced_at timestamptz not null default now()
);

create index if not exists gaming_products_category_idx
  on public.gaming_products (category_id, position);

create table if not exists public.gaming_product_details (
  product_id text primary key,
  name text not null,
  image_url text,
  fields jsonb not null default '[]'::jsonb,
  variations jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now()
);

alter table public.gaming_products enable row level security;
alter table public.gaming_product_details enable row level security;
