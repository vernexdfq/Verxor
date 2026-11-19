-- Rent-for-SMS rentals (Textverified) — run once in Supabase SQL editor
create table if not exists public.rent_sms_rentals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null default 'textverified',
  provider_reservation_id text not null,
  service_name text not null,
  duration text not null,
  number text not null default '',
  cost_usd numeric not null default 0,
  charged_ngn numeric not null default 0,
  audience text not null default 'retail',
  status text not null default 'active',
  ends_at timestamptz,
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rent_sms_rentals_reservation_idx
  on public.rent_sms_rentals (provider_reservation_id);
create index if not exists rent_sms_rentals_user_idx
  on public.rent_sms_rentals (user_id, created_at desc);

-- Service role bypasses RLS; no client policies needed.
alter table public.rent_sms_rentals enable row level security;
