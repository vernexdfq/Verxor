-- ============================================================
-- GAMING TOP-UP ORDERS (VERXOR MAIN — verxor.com project)
-- Safe to run multiple times.
-- Tracks Shop2TopUp game top-up orders placed for customers
-- so delivery status (processing -> completed) is visible to
-- the user, exactly like Shop2TopUp shows its own orders.
-- RLS enabled, NO policies (service-role-only table — intentional,
-- do not add policies).
-- ============================================================

create table if not exists public.gaming_orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  audience text not null default 'retail',
  ref text not null,
  provider text not null default 'shop2topup',
  provider_order_id text,
  product_name text not null default '',
  variation_name text not null default '',
  quantity int not null default 1,
  fields jsonb,
  total_ngn numeric not null default 0,
  status text not null default 'processing',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gaming_orders_ref_idx
  on public.gaming_orders (ref);
create index if not exists gaming_orders_user_idx
  on public.gaming_orders (user_id, created_at desc);
create index if not exists gaming_orders_provider_idx
  on public.gaming_orders (provider_order_id);

alter table public.gaming_orders enable row level security;

-- The API writes through the service role. The table may be created by a
-- different owner (SQL editor), so grant explicitly — this is the step that
-- was missing for email_orders and caused "permission denied".
grant select, insert, update, delete on public.gaming_orders to service_role;
