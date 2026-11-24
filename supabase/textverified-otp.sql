-- ============================================================
-- TARGET PROJECT: VERXOR MAIN SUPABASE (verxor.com)
-- NOT the vernexdigital panel project.
--
-- VERXOR — Textverified one-time OTP numbers joining the USA pools.
-- Adds provider_service to vn_price_options so a Textverified purchase
-- knows the provider's own service slug (the Verxor service code may be a
-- merged GrizzlySMS code like 'wa' for whatsapp).
-- Safe to re-run.
-- ============================================================

alter table public.vn_price_options
  add column if not exists provider_service text;

comment on column public.vn_price_options.provider_service is
  'Provider''s own service slug for this option (e.g. textverified service_name). Null for GrizzlySMS (code == service code).';
