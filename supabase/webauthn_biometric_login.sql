-- Verxor WebAuthn / biometric login migration
-- Run only after the matching API routes are deployed to the test environment.
-- Tables are service-role-only: no client policies are intentionally created.

create table if not exists public.webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists webauthn_credentials_user_idx
  on public.webauthn_credentials(user_id);

alter table public.webauthn_credentials enable row level security;

create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null unique,
  user_id uuid references public.profiles(id) on delete cascade,
  purpose text not null check (purpose in ('registration','authentication')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

alter table public.webauthn_challenges
  add column if not exists consumed_at timestamptz;

create index if not exists webauthn_challenges_expiry_idx
  on public.webauthn_challenges(expires_at);

create index if not exists webauthn_challenges_pending_idx
  on public.webauthn_challenges(challenge, purpose, expires_at)
  where consumed_at is null;

alter table public.webauthn_challenges enable row level security;

-- No anon/authenticated policies: API routes must use server-side service-role access.
