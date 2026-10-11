-- =====================================================================
-- Kryztal Lumi — core schema (online shop, single store)
-- Tables: store_settings, store_private, admin_users, categories,
--         products, product_variants, product_images, shipping_zones,
--         orders, order_items, order_events, notifications_log
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
-- awaiting_payment = GCash order not yet verified by the owner
-- new              = COD order not yet confirmed by the owner
create type public.order_status as enum
  ('awaiting_payment', 'new', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned');
create type public.payment_method as enum ('cod', 'gcash');
-- submitted = customer entered a GCash reference, owner has not verified it yet
create type public.payment_status as enum ('unpaid', 'submitted', 'paid', 'refunded');
create type public.admin_role as enum ('owner', 'staff');

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Phone numbers are compared on their last 10 digits so "0917 123 4567",
-- "+63 917 123 4567" and "639171234567" are the same customer.
create or replace function public.phone_key(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 10);
$$;

-- ---------------------------------------------------------------------
-- store_settings: one row (id = 1). Everything here is public.
-- ---------------------------------------------------------------------
create table public.store_settings (
  id                       smallint primary key default 1 check (id = 1),
  store_name               text not null default 'Kryztal Lumi',
  tagline                  text,
  about                    text,
  contact_email            text,
  contact_phone            text,
  viber                    text,
  whatsapp                 text,
  facebook_url             text,
  instagram_url            text,
  tiktok_url               text,
  -- Facebook Page username or id for m.me/<id> Messenger links
  messenger_id             text,
  announcement_enabled     boolean not null default false,
  announcement_text        text,
  currency                 text not null default 'PHP',
  timezone                 text not null default 'Asia/Manila',
  cod_enabled              boolean not null default true,
  gcash_enabled            boolean not null default true,
  gcash_name               text,
  gcash_number             text,
  gcash_qr_url             text,
  gcash_instructions       text,
  -- Unpaid GCash orders are cancelled (and stock released) after this long
  gcash_expiry_hours       int not null default 24 check (gcash_expiry_hours between 1 and 168),
  free_shipping_mode       text not null default 'off' check (free_shipping_mode in ('off', 'all', 'threshold')),
  free_shipping_threshold  numeric(10,2) not null default 0 check (free_shipping_threshold >= 0),
  min_order_amount         numeric(10,2) not null default 0 check (min_order_amount >= 0),
  max_unconfirmed_per_phone int not null default 3 check (max_unconfirmed_per_phone between 1 and 50),
  low_stock_threshold      int not null default 5 check (low_stock_threshold between 0 and 1000),
  shipping_policy          text,
  returns_policy           text,
  -- [{"q": "...", "a": "..."}]
  faq                      jsonb not null default '[]'::jsonb check (jsonb_typeof(faq) = 'array'),
  updated_at               timestamptz not null default now()
);
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

-- store_private: admin-only settings (where new-order alerts go).
create table public.store_private (
  id            smallint primary key default 1 check (id = 1),
  notify_email  text,
  updated_at    timestamptz not null default now()
);
create trigger store_private_updated_at before update on public.store_private
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- admin_users: which auth users can manage the shop
-- ---------------------------------------------------------------------
create table public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        public.admin_role not null default 'owner',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Catalogue (generic: any beauty / fashion product)
-- ---------------------------------------------------------------------
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null check (char_length(name) between 1 and 80),
  description  text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name              text not null check (char_length(name) between 1 and 120),
  subtitle          text,
  description       text,
  -- "How to use" / details (free text, line breaks kept)
  details           text,
  ingredients       text,
  -- Short selling points shown with heart bullets above the order form
  highlights        text[] not null default '{}',
  -- Small spec table: [{"label": "Net wt", "value": "1.8 g / 0.063 oz"}]
  specs             jsonb not null default '[]'::jsonb check (jsonb_typeof(specs) = 'array'),
  price             numeric(10,2) not null check (price >= 0),
  compare_at_price  numeric(10,2) check (compare_at_price is null or compare_at_price >= 0),
  -- Used when the product has no active variants
  stock             int not null default 0 check (stock >= 0),
  track_stock       boolean not null default true,
  -- Name of the variant option, e.g. "Shade" or "Size"
  variant_label     text not null default 'Option',
  max_per_order     int not null default 10 check (max_per_order between 1 and 100),
  category_id       uuid references public.categories(id) on delete set null,
  is_active         boolean not null default true,
  is_featured       boolean not null default false,
  badge_new         boolean not null default false,
  badge_bestseller  boolean not null default false,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_active_idx on public.products (is_active, sort_order);
create index products_category_idx on public.products (category_id);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Optional variants (shade / size / …), each with its own price and stock.
create table public.product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  sku          text,
  price        numeric(10,2) not null check (price >= 0),
  stock        int not null default 0 check (stock >= 0),
  -- Optional swatch colour (#rrggbb) for shade pickers
  swatch       text check (swatch is null or swatch ~ '^#[0-9a-fA-F]{6}$'),
  image_url    text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (product_id, name)
);
create index product_variants_product_idx on public.product_variants (product_id, sort_order);
create trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  url           text not null,
  storage_path  text,
  alt           text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

-- ---------------------------------------------------------------------
-- Shipping zones: a province belongs to the first active zone that lists
-- it. Customers whose province is in no zone pick a zone themselves.
-- ---------------------------------------------------------------------
create table public.shipping_zones (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 80),
  fee            numeric(10,2) not null check (fee >= 0),
  delivery_time  text,
  provinces      text[] not null default '{}',
  is_active      boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger shipping_zones_updated_at before update on public.shipping_zones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Orders. Customer, address, zone and product details are snapshotted so
-- later catalogue / settings edits never rewrite history.
-- ---------------------------------------------------------------------
create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_no           text not null unique,
  status             public.order_status not null,
  payment_method     public.payment_method not null,
  payment_status     public.payment_status not null default 'unpaid',
  customer_name      text not null,
  customer_phone     text not null,
  phone_key          text generated always as (public.phone_key(customer_phone)) stored,
  customer_email     text,
  address_line       text not null,
  barangay           text not null,
  city               text not null,
  province           text not null,
  zip                text,
  landmark           text,
  notes              text,
  shipping_zone_id   uuid references public.shipping_zones(id) on delete set null,
  shipping_zone_name text not null,
  shipping_eta       text,
  subtotal           numeric(10,2) not null check (subtotal >= 0),
  shipping_fee       numeric(10,2) not null check (shipping_fee >= 0),
  total              numeric(10,2) not null check (total >= 0),
  currency           text not null default 'PHP',
  gcash_reference    text,
  courier            text,
  tracking_no        text,
  admin_notes        text,
  cancelled_reason   text,
  -- true once reserved stock has been put back (cancel / return / expiry)
  stock_released     boolean not null default false,
  expires_at         timestamptz,
  paid_at            timestamptz,
  confirmed_at       timestamptz,
  packed_at          timestamptz,
  shipped_at         timestamptz,
  delivered_at       timestamptz,
  cancelled_at       timestamptz,
  returned_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_phone_idx on public.orders (phone_key);
create index orders_awaiting_idx on public.orders (expires_at) where status = 'awaiting_payment';
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  variant_id      uuid references public.product_variants(id) on delete set null,
  product_name    text not null,
  product_slug    text,
  variant_name    text,
  sku             text,
  image_url       text,
  unit_price      numeric(10,2) not null check (unit_price >= 0),
  quantity        int not null check (quantity > 0),
  line_total      numeric(10,2) not null check (line_total >= 0),
  -- did this line take stock (track_stock was on)? released on cancel/return
  stock_reserved  boolean not null default false,
  position        int not null default 0
);
create index order_items_order_idx on public.order_items (order_id);

-- Status history shown on the Track Order timeline.
create table public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      public.order_status not null,
  -- shown to the customer
  note        text,
  created_by  uuid,
  -- clock_timestamp: several events written in one transaction keep their order
  created_at  timestamptz not null default clock_timestamp()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.notifications_log (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references public.orders(id) on delete cascade,
  channel     text not null,             -- email | sms
  kind        text not null,             -- owner_new_order | order_confirmed | order_shipped
  recipient   text,
  status      text not null,             -- sent | failed | skipped
  error       text,
  sent_at     timestamptz not null default now()
);
create index notifications_log_order_idx on public.notifications_log (order_id, kind, channel);
