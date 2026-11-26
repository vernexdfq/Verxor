-- ============================================================
-- RENT LINE MESSAGES (VERXOR MAIN — verxor.com project)
-- Inbound (and later outbound) SMS for rented SignalWire lines.
-- Safe to run multiple times.
-- RLS enabled, NO policies (service-role-only — intentional,
-- do not add policies).
-- ============================================================

create table if not exists public.rent_line_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  line_id uuid,
  from_e164 text not null default '',
  to_e164 text not null default '',
  body text not null default '',
  direction text not null default 'inbound',
  provider_message_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists rent_line_messages_user_idx
  on public.rent_line_messages (user_id, created_at desc);
create index if not exists rent_line_messages_line_idx
  on public.rent_line_messages (line_id, created_at desc);
create unique index if not exists rent_line_messages_provider_idx
  on public.rent_line_messages (provider_message_id);

alter table public.rent_line_messages enable row level security;

-- The API writes through the service role. The table may be created by a
-- different owner (SQL editor), so grant explicitly.
grant select, insert, update, delete on public.rent_line_messages to service_role;
