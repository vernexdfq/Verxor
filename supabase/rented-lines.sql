-- ============================================================
-- RENTED LINES (VERXOR MAIN — verxor.com project)
-- Rent-for-SMS/Calls long-term numbers (SignalWire).
-- Safe to run multiple times.
-- RLS enabled, NO policies (service-role-only — intentional,
-- do not add policies).
-- ============================================================

create table if not exists public.rented_lines (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null default 'signalwire',
  provider_sid text,
  e164 text not null,
  friendly text not null default '',
  country_code text not null default '',
  number_type text not null default 'local',
  label text not null default '',
  status text not null default 'active',
  period text not null default '30d',
  amount_ngn numeric not null default 0,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rented_lines_sid_idx
  on public.rented_lines (provider_sid);
create index if not exists rented_lines_user_idx
  on public.rented_lines (user_id, created_at desc);

alter table public.rented_lines enable row level security;

-- The API writes through the service role. The table may be created by a
-- different owner (SQL editor), so grant explicitly.
grant select, insert, update, delete on public.rented_lines to service_role;
