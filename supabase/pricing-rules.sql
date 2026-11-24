-- ============================================================
-- TARGET PROJECT: VERXOR MAIN SUPABASE (verxor.com)
-- NOT the vernexdigital panel project.
--
-- VERXOR — pricing_rules: single source of truth for one-time SMS OTP
-- (GrizzlySMS + Textverified) and Virtual Number pricing.
--
-- Price = Provider USD cost × base_naira_rate × multiplier(tier, audience),
-- rounded UP to the nearest rounding_step_ngn (default ₦50).
--
-- audience: retail (website) | api (user API keys) | panel (child panels)
-- tier by provider cost band:
--   economy  < $0.50 | standard $0.50-1.00 | fast $1.01-2.00 | premium > $2.00
--
-- Seed values (copy from legacy vn_pricing_settings when present, else defaults):
--   retail 5.0/4.0/3.0/2.0 | api 2.0/1.6/1.4/1.25 | panel 1.5/1.3/1.2/1.15
-- Safe to re-run.
-- ============================================================

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  base_naira_rate numeric(12, 2) not null default 1380,
  rounding_step_ngn int not null default 50,
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

alter table public.pricing_rules enable row level security;
-- No policies: this table is only touched by the server (service role).

-- Seed: copy the live legacy row if one exists, otherwise the defaults above.
insert into public.pricing_rules (
  base_naira_rate, rounding_step_ngn,
  retail_economy, retail_standard, retail_fast, retail_premium,
  api_economy, api_standard, api_fast, api_premium,
  panel_economy, panel_standard, panel_fast, panel_premium
)
select
  coalesce(l.base_naira_rate, 1380),
  50,
  coalesce(l.retail_economy, 5.0),
  coalesce(l.retail_standard, 4.0),
  coalesce(l.retail_fast, 3.0),
  coalesce(l.retail_premium, 2.0),
  coalesce(l.api_economy, 2.0),
  coalesce(l.api_standard, 1.6),
  coalesce(l.api_fast, 1.4),
  coalesce(l.api_premium, 1.25),
  coalesce(l.panel_economy, 1.5),
  coalesce(l.panel_standard, 1.3),
  coalesce(l.panel_fast, 1.2),
  coalesce(l.panel_premium, 1.15)
from (select 1) s
left join (
  select * from public.vn_pricing_settings limit 1
) l on true
where not exists (select 1 from public.pricing_rules);
