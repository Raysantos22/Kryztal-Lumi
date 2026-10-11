-- =====================================================================
-- Row Level Security
--   * Public (anon) reads only the ACTIVE catalogue, active shipping zones
--     and the public store settings.
--   * Customers have no accounts: they see their own order only through
--     get_order(order_no, phone) (security definer, matches both).
--   * Orders are only ever created by create_order() (called by the
--     create-order edge function with the service role) — there are no
--     client INSERT policies on orders / order_items.
--   * Admins (admin_users) manage everything.
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (select 1 from public.admin_users au where au.user_id = auth.uid());
$$;

-- Is this product visible to the public (active)?
create or replace function public.is_product_public(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.products p where p.id = p_product_id and p.is_active);
$$;

-- ---------------------------------------------------------------------
-- Grants (RLS below narrows these down row by row)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on
  public.store_settings, public.categories, public.products, public.product_variants,
  public.product_images, public.shipping_zones
  to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
-- Orders are created by create_order() only; admins change them through
-- the admin_* functions, plus direct edits of their private notes.
revoke insert, update, delete on public.orders, public.order_items, public.order_events from authenticated;
grant update (admin_notes) on public.orders to authenticated;
revoke insert, update, delete on public.admin_users, public.notifications_log from authenticated;
revoke insert, delete on public.store_settings, public.store_private from authenticated;

alter table public.store_settings    enable row level security;
alter table public.store_private     enable row level security;
alter table public.admin_users       enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.product_variants  enable row level security;
alter table public.product_images    enable row level security;
alter table public.shipping_zones    enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.order_events      enable row level security;
alter table public.notifications_log enable row level security;

-- store_settings -------------------------------------------------------
create policy "store_settings: public read" on public.store_settings
  for select to anon, authenticated using (true);
create policy "store_settings: admin update" on public.store_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- store_private --------------------------------------------------------
create policy "store_private: admin read" on public.store_private
  for select to authenticated using (public.is_admin());
create policy "store_private: admin update" on public.store_private
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- admin_users ----------------------------------------------------------
create policy "admin_users: read own membership" on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- categories -----------------------------------------------------------
create policy "categories: public read active" on public.categories
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "categories: admin insert" on public.categories
  for insert to authenticated with check (public.is_admin());
create policy "categories: admin update" on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "categories: admin delete" on public.categories
  for delete to authenticated using (public.is_admin());

-- products -------------------------------------------------------------
create policy "products: public read active" on public.products
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "products: admin insert" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "products: admin update" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products: admin delete" on public.products
  for delete to authenticated using (public.is_admin());

-- product_variants -----------------------------------------------------
create policy "product_variants: public read active" on public.product_variants
  for select to anon, authenticated
  using ((is_active and public.is_product_public(product_id)) or public.is_admin());
create policy "product_variants: admin insert" on public.product_variants
  for insert to authenticated with check (public.is_admin());
create policy "product_variants: admin update" on public.product_variants
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_variants: admin delete" on public.product_variants
  for delete to authenticated using (public.is_admin());

-- product_images -------------------------------------------------------
create policy "product_images: public read" on public.product_images
  for select to anon, authenticated
  using (public.is_product_public(product_id) or public.is_admin());
create policy "product_images: admin insert" on public.product_images
  for insert to authenticated with check (public.is_admin());
create policy "product_images: admin update" on public.product_images
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product_images: admin delete" on public.product_images
  for delete to authenticated using (public.is_admin());

-- shipping_zones -------------------------------------------------------
create policy "shipping_zones: public read active" on public.shipping_zones
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "shipping_zones: admin insert" on public.shipping_zones
  for insert to authenticated with check (public.is_admin());
create policy "shipping_zones: admin update" on public.shipping_zones
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "shipping_zones: admin delete" on public.shipping_zones
  for delete to authenticated using (public.is_admin());

-- orders / items / events / notifications: admins only ------------------
create policy "orders: admin read" on public.orders
  for select to authenticated using (public.is_admin());
create policy "orders: admin update notes" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "order_items: admin read" on public.order_items
  for select to authenticated using (public.is_admin());
create policy "order_events: admin read" on public.order_events
  for select to authenticated using (public.is_admin());
create policy "notifications_log: admin read" on public.notifications_log
  for select to authenticated using (public.is_admin());
