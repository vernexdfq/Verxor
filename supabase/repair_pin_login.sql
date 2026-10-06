-- ============================================================
-- VERXOR — Fix PIN login (run in Supabase → SQL Editor)
-- ============================================================

create extension if not exists "pgcrypto";

-- Columns the app expects on public.profiles
alter table public.profiles
  add column if not exists pin_hash text,
  add column if not exists phone text,
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists country_code text default 'NG',
  add column if not exists phone_country text,
  add column if not exists username text,
  add column if not exists balance_ngn numeric(18, 2) default 0,
  add column if not exists balance_usd numeric(18, 6) default 0;

-- ----------------------------------------------------------
-- YOUR ACCOUNT (dennygodzilla0@gmail.com / PIN 2007)
-- 1) Supabase → Authentication → Users
-- 2) Click the user → copy UUID
-- 3) Paste UUID below and run the insert/update
-- ----------------------------------------------------------

-- bcrypt of PIN "2007":
-- $2a$10$Kgq6sO2l/B/VDcJNYdLYP.zMf.2959oReaUU4BjgUcyf4MuE2aR/C

-- Option A: profile row already exists (by email)
update public.profiles
set
  phone = coalesce(nullif(trim(phone), ''), '+2348141620644'),
  pin_hash = '$2a$10$Kgq6sO2l/B/VDcJNYdLYP.zMf.2959oReaUU4BjgUcyf4MuE2aR/C',
  full_name = coalesce(nullif(trim(full_name), ''), 'Destiny Ikedichukwu'),
  updated_at = now()
where lower(email) = 'dennygodzilla0@gmail.com';

-- Option B: no profile row yet — paste UUID from Auth → Users
-- insert into public.profiles (id, email, full_name, phone, pin_hash, country_code, updated_at)
-- values (
--   'PASTE-USER-UUID-HERE'::uuid,
--   'dennygodzilla0@gmail.com',
--   'Destiny Ikedichukwu',
--   '+2348141620644',
--   '$2a$10$Kgq6sO2l/B/VDcJNYdLYP.zMf.2959oReaUU4BjgUcyf4MuE2aR/C',
--   'NG',
--   now()
-- )
-- on conflict (id) do update set
--   email = excluded.email,
--   full_name = excluded.full_name,
--   phone = excluded.phone,
--   pin_hash = excluded.pin_hash,
--   country_code = excluded.country_code,
--   updated_at = now();

-- Verify
select id, email, phone, (pin_hash is not null) as has_pin
from public.profiles
where lower(email) = 'dennygodzilla0@gmail.com'
   or phone like '%8141620644%';
