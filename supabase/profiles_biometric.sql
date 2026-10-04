-- ============================================================
-- VERXOR — Full migration: username, biometric, transaction PIN
-- Run once in Supabase → SQL Editor
-- Safe to re-run (IF NOT EXISTS / CREATE OR REPLACE)
-- ============================================================

create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists username text,
  add column if not exists biometric_enabled boolean not null default false,
  add column if not exists webauthn_credential_id text,
  add column if not exists tx_pin_hash text,
  add column if not exists avatar_url text,
  add column if not exists pin_hash text;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null and username <> '';

create table if not exists public.webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists webauthn_credentials_user_idx
  on public.webauthn_credentials (user_id);

alter table public.webauthn_credentials enable row level security;

drop policy if exists "webauthn_select_own" on public.webauthn_credentials;
drop policy if exists "webauthn_insert_own" on public.webauthn_credentials;
drop policy if exists "webauthn_delete_own" on public.webauthn_credentials;

create policy "webauthn_select_own" on public.webauthn_credentials
  for select using (auth.uid() = user_id);
create policy "webauthn_insert_own" on public.webauthn_credentials
  for insert with check (auth.uid() = user_id);
create policy "webauthn_delete_own" on public.webauthn_credentials
  for delete using (auth.uid() = user_id);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.hash_pin(plain text)
returns text language sql immutable as $$
  select crypt(plain, gen_salt('bf'));
$$;

create or replace function public.verify_pin(plain text, hashed text)
returns boolean language sql immutable as $$
  select hashed is not null and crypt(plain, hashed) = hashed;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'phone',
    nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), '')
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    username = coalesce(excluded.username, public.profiles.username),
    updated_at = now();

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.update_my_profile(
  p_full_name text default null,
  p_username text default null
)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  result public.profiles;
  clean_user text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  clean_user := nullif(lower(trim(coalesce(p_username, ''))), '');
  if clean_user is not null and clean_user !~ '^[a-z0-9._]{3,20}$' then
    raise exception 'Username must be 3-20 chars: letters, numbers, . or _';
  end if;
  update public.profiles
  set
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    username = coalesce(clean_user, username),
    updated_at = now()
  where id = auth.uid()
  returning * into result;
  return result;
end;
$$;

grant execute on function public.update_my_profile(text, text) to authenticated;

create or replace function public.set_my_tx_pin(p_pin text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if p_pin is null or p_pin !~ '^\d{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;
  update public.profiles
  set
    tx_pin_hash = public.hash_pin(p_pin),
    pin_hash = public.hash_pin(p_pin),
    updated_at = now()
  where id = auth.uid();
  return true;
end;
$$;

grant execute on function public.set_my_tx_pin(text) to authenticated;

create or replace function public.verify_my_pin(p_pin text)
returns boolean language plpgsql security definer set search_path = public as $$
declare stored text;
begin
  if auth.uid() is null then return false; end if;
  select coalesce(tx_pin_hash, pin_hash) into stored
  from public.profiles where id = auth.uid();
  if stored is null then return false; end if;
  return public.verify_pin(p_pin, stored);
end;
$$;

grant execute on function public.verify_my_pin(text) to authenticated;

create or replace function public.set_my_biometric(
  p_enabled boolean,
  p_credential_id text default null
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.profiles
  set
    biometric_enabled = coalesce(p_enabled, false),
    webauthn_credential_id = case
      when p_enabled then coalesce(p_credential_id, webauthn_credential_id)
      else null
    end,
    updated_at = now()
  where id = auth.uid();
  return true;
end;
$$;

grant execute on function public.set_my_biometric(boolean, text) to authenticated;
