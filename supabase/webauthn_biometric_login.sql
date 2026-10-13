-- Verxor WebAuthn / biometric login migration
-- Keep credential and challenge tables server-only (service role API access).
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
create index if not exists webauthn_credentials_user_idx on public.webauthn_credentials(user_id);
alter table public.webauthn_credentials enable row level security;
drop policy if exists "webauthn_select_own" on public.webauthn_credentials;
drop policy if exists "webauthn_insert_own" on public.webauthn_credentials;
drop policy if exists "webauthn_delete_own" on public.webauthn_credentials;

create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null unique,
  user_id uuid references public.profiles(id) on delete cascade,
  purpose text not null check (purpose in ('registration','authentication')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists webauthn_challenges_expiry_idx on public.webauthn_challenges(expires_at);
alter table public.webauthn_challenges enable row level security;
