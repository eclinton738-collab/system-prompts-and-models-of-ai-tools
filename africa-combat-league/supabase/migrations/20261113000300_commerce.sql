-- Ticketing, orders, shop and memberships.
-- All money is stored as integer minor units (kobo for NGN) plus a currency code.
-- Orders, tickets and payment state are written ONLY by the server (service role)
-- after a signed payment webhook is verified. Clients can read their own rows.

create table public.ticket_types (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  name          text not null,                  -- Regular, VIP, Ringside...
  description   text,
  price_minor   bigint not null check (price_minor >= 0),
  currency      char(3) not null default 'NGN',
  quantity_total int not null check (quantity_total >= 0),
  quantity_sold  int not null default 0 check (quantity_sold >= 0),
  max_per_order int not null default 10 check (max_per_order > 0),
  sales_start   timestamptz,
  sales_end     timestamptz,
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  is_sample     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (quantity_sold <= quantity_total)
);
create index ticket_types_event_idx on public.ticket_types (event_id);
create trigger ticket_types_set_updated_at before update on public.ticket_types
  for each row execute function public.set_updated_at();

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete set null,
  kind            text not null check (kind in ('ticket', 'shop', 'membership', 'ppv')),
  status          text not null default 'pending'
                  check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  currency        char(3) not null default 'NGN',
  subtotal_minor  bigint not null default 0 check (subtotal_minor >= 0),
  fees_minor      bigint not null default 0 check (fees_minor >= 0),
  total_minor     bigint not null default 0 check (total_minor >= 0),
  email           extensions.citext,
  phone           text,
  payment_provider text check (payment_provider in ('paystack', 'flutterwave')),
  provider_reference text unique,               -- our reference sent to the gateway
  idempotency_key text unique,
  paid_at         timestamptz,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status);
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  images      jsonb not null default '[]'::jsonb,
  category    text,
  status      text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  is_sample   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  sku         text not null unique,
  name        text not null,                    -- "Black / L"
  attributes  jsonb not null default '{}'::jsonb,
  price_minor bigint not null check (price_minor >= 0),
  currency    char(3) not null default 'NGN',
  stock       int not null default 0 check (stock >= 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index variants_product_idx on public.variants (product_id);
create trigger variants_set_updated_at before update on public.variants
  for each row execute function public.set_updated_at();

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  ticket_type_id  uuid references public.ticket_types (id) on delete set null,
  variant_id      uuid references public.variants (id) on delete set null,
  description     text not null,
  quantity        int not null check (quantity > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0), -- price snapshot from the server
  created_at      timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);

create table public.tickets (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  ticket_type_id  uuid not null references public.ticket_types (id),
  event_id        uuid not null references public.events (id),
  owner_id        uuid references auth.users (id) on delete set null,
  holder_name     text,
  -- Opaque random token encoded in the QR. Verified server-side at the gate.
  qr_token        text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  status          text not null default 'valid' check (status in ('valid', 'scanned', 'void', 'refunded')),
  scanned_at      timestamptz,
  scanned_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index tickets_owner_idx on public.tickets (owner_id);
create index tickets_event_idx on public.tickets (event_id, status);
create index tickets_order_idx on public.tickets (order_id);
create trigger tickets_set_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();

-- Raw gateway webhooks. The unique key makes webhook handling idempotent.
create table public.payment_events (
  id            bigint generated always as identity primary key,
  provider      text not null check (provider in ('paystack', 'flutterwave')),
  provider_event_id text not null,
  event_type    text,
  order_id      uuid references public.orders (id) on delete set null,
  payload       jsonb not null,
  signature_valid boolean not null default false,
  processed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users (id) on delete cascade,
  currency    char(3) not null default 'NGN',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger carts_set_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

create table public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts (id) on delete cascade,
  variant_id  uuid not null references public.variants (id) on delete cascade,
  quantity    int not null default 1 check (quantity between 1 and 20),
  created_at  timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table public.membership_plans (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  kind        text not null check (kind in ('lions_den', 'fan_club')),
  description text,
  benefits    jsonb not null default '[]'::jsonb,
  price_minor bigint not null check (price_minor >= 0),
  currency    char(3) not null default 'NGN',
  billing_interval text not null default 'month' check (billing_interval in ('month', 'quarter', 'year', 'once')),
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  is_sample   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger membership_plans_set_updated_at before update on public.membership_plans
  for each row execute function public.set_updated_at();

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  plan_id     uuid not null references public.membership_plans (id),
  order_id    uuid references public.orders (id) on delete set null,
  status      text not null default 'pending' check (status in ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  started_at  timestamptz,
  current_period_end timestamptz,
  provider_subscription_ref text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index memberships_user_idx on public.memberships (user_id, status);
create trigger memberships_set_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();

create table public.class_schedule (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  sport_id    uuid references public.sports (id),
  coach       text,
  level       text,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time  time not null,
  end_time    time not null,
  location    text,
  capacity    int,
  is_active   boolean not null default true,
  is_sample   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_time > start_time)
);
create trigger class_schedule_set_updated_at before update on public.class_schedule
  for each row execute function public.set_updated_at();
