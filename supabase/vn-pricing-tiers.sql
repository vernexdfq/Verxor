-- ============================================================
-- VERXOR — Virtual Number pricing tiers (run in Supabase SQL Editor)
-- Safe to re-run. Adds API-user and Child-Panel multiplier columns
-- to vn_pricing_settings and seeds one settings row.
--
-- Price = Provider USD cost x base_naira_rate x multiplier(tier, audience)
-- audience: retail (website customers) | api (user API keys) | panel (child panels + toggled users)
-- tier is decided by the provider cost band:
--   economy  < 0.50 | standard 0.50-1.00 | fast 1.01-2.00 | premium > 2.00
-- ============================================================

create table if not exists public.vn_pricing_settings (
  id uuid primary key default gen_random_uuid(),
  base_naira_rate numeric(12, 2) not null default 1380,
  retail_economy numeric(6, 2) not null default 5.0,
  retail_standard numeric(6, 2) not null default 4.0,
  retail_fast numeric(6, 2) not null default 3.0,
  retail_premium numeric(6, 2) not null default 2.0,
  api_economy numeric(6, 2) not null default 2.0,
  api_standard numeric(6, 2) not null default 1.6,
  api_fast numeric(6, 2) not null default 1.4,
  api_premium numeric(6, 2) not null default 1.25,
  panel_economy numeric(6, 2) not null default 1.5,
  panel_standard numeric(6, 2) not null default 1.3,
  panel_fast numeric(6, 2) not null default 1.2,
  panel_premium numeric(6, 2) not null default 1.15,
  updated_at timestamptz not null default now()
);

alter table public.vn_pricing_settings
  add column if not exists base_naira_rate numeric(12, 2) not null default 1380;
alter table public.vn_pricing_settings
  add column if not exists retail_economy numeric(6, 2) not null default 5.0;
alter table public.vn_pricing_settings
  add column if not exists retail_standard numeric(6, 2) not null default 4.0;
alter table public.vn_pricing_settings
  add column if not exists retail_fast numeric(6, 2) not null default 3.0;
alter table public.vn_pricing_settings
  add column if not exists retail_premium numeric(6, 2) not null default 2.0;
alter table public.vn_pricing_settings
  add column if not exists api_economy numeric(6, 2) not null default 2.0;
alter table public.vn_pricing_settings
  add column if not exists api_standard numeric(6, 2) not null default 1.6;
alter table public.vn_pricing_settings
  add column if not exists api_fast numeric(6, 2) not null default 1.4;
alter table public.vn_pricing_settings
  add column if not exists api_premium numeric(6, 2) not null default 1.25;
alter table public.vn_pricing_settings
  add column if not exists panel_economy numeric(6, 2) not null default 1.5;
alter table public.vn_pricing_settings
  add column if not exists panel_standard numeric(6, 2) not null default 1.3;
alter table public.vn_pricing_settings
  add column if not exists panel_fast numeric(6, 2) not null default 1.2;
alter table public.vn_pricing_settings
  add column if not exists panel_premium numeric(6, 2) not null default 1.15;

-- Seed exactly one settings row
insert into public.vn_pricing_settings (base_naira_rate)
select 1380
where not exists (select 1 from public.vn_pricing_settings);

alter table public.vn_pricing_settings enable row level security;
