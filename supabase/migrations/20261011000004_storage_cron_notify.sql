-- =====================================================================
-- Storage bucket for product photos, logo and the GCash QR, the job that
-- auto-cancels unpaid GCash orders, and the trigger that emails customers
-- when their order is confirmed or shipped.
-- =====================================================================

-- Public bucket: anyone can fetch files by public URL; only admins can
-- list / upload / replace / delete. Paths: products/…, branding/…, payment/…
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do nothing;

create policy "media: admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.is_admin());
create policy "media: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy "media: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
create policy "media: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- ---------------------------------------------------------------------
-- Auto-cancel unpaid GCash orders every 10 minutes with pg_cron
-- (available on Supabase Cloud and local). Without pg_cron, schedule the
-- expire-unpaid-orders edge function instead (see README). create_order
-- also runs the expiry first, so stale orders never block new ones.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule(
      'expire-unpaid-orders',
      '*/10 * * * *',
      'select public.expire_unpaid_orders();'
    );
  else
    raise notice 'pg_cron not available — schedule the expire-unpaid-orders edge function instead.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- When an order becomes "confirmed" or "shipped", ask the
-- send-order-update edge function to email the customer (via pg_net).
-- Needs two Vault secrets:
--   project_url            e.g. https://<ref>.supabase.co
--   notify_webhook_secret  a random string; set the SAME value as the edge
--                          function secret NOTIFY_WEBHOOK_SECRET
-- Missing pg_net / secrets never block the status change; the dashboard
-- also has a "Resend email" button.
-- ---------------------------------------------------------------------
create or replace function public.notify_order_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  if new.status in ('confirmed', 'shipped') and old.status is distinct from new.status then
    begin
      if to_regclass('vault.decrypted_secrets') is not null
         and exists (select 1 from pg_catalog.pg_proc p
                       join pg_catalog.pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'net' and p.proname = 'http_post') then
        execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
          into v_url using 'project_url';
        execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1'
          into v_secret using 'notify_webhook_secret';
        if v_url is not null and v_secret is not null then
          execute 'select net.http_post(url := $1, body := $2, headers := $3)'
            using rtrim(v_url, '/') || '/functions/v1/send-order-update',
                  jsonb_build_object('order_id', new.id, 'kind', 'order_' || new.status::text),
                  jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret);
        else
          raise warning 'notify_order_update: vault secrets project_url / notify_webhook_secret not set';
        end if;
      end if;
    exception when others then
      raise warning 'notify_order_update failed: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

create trigger orders_notify_update
  after update of status on public.orders
  for each row execute function public.notify_order_update();

revoke execute on function public.notify_order_update() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- SERVICE ROLE ONLY: claim the right to send one notification, so two
-- overlapping calls (trigger retry + manual resend …) can't both email the
-- customer. Returns the new log row id, or null if this (order, kind,
-- channel) was already sent or is being sent right now. p_force (the
-- admin's "Resend" button) always claims. The caller updates the row with
-- the outcome; a "pending" row older than 10 minutes counts as abandoned.
-- ---------------------------------------------------------------------
create or replace function public.claim_notification(
  p_order_id uuid, p_kind text, p_channel text, p_force boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('notify:' || p_order_id || ':' || p_kind || ':' || p_channel, 0));
  if not p_force and exists (
    select 1 from public.notifications_log n
     where n.order_id = p_order_id and n.kind = p_kind and n.channel = p_channel
       and (n.status = 'sent' or (n.status = 'pending' and n.sent_at > now() - interval '10 minutes'))
  ) then
    return null;
  end if;
  insert into public.notifications_log (order_id, channel, kind, status)
  values (p_order_id, p_channel, p_kind, 'pending')
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- ADMIN: set stock only if it still has the value the admin form loaded,
-- so saving a product never overwrites sales / restocks that happened
-- while the form was open. Returns the new stock.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_stock(
  p_product_id uuid, p_variant_id uuid, p_expected int, p_new int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current int;
begin
  perform public._require_admin();
  if p_new is null or p_new < 0 then
    raise exception 'Stock must be 0 or more.' using hint = 'invalid_input';
  end if;
  if p_variant_id is null then
    select stock into v_current from public.products where id = p_product_id for update;
  else
    select stock into v_current from public.product_variants
     where id = p_variant_id and product_id = p_product_id for update;
  end if;
  if not found then
    raise exception 'Product not found.' using hint = 'not_found';
  end if;
  if v_current is distinct from p_expected then
    raise exception 'Stock changed to % while you were editing (orders or cancellations). Check the new number and save again.', v_current
      using hint = 'stock_changed';
  end if;
  if p_variant_id is null then
    update public.products set stock = p_new where id = p_product_id;
  else
    update public.product_variants set stock = p_new where id = p_variant_id;
  end if;
  return p_new;
end;
$$;

revoke execute on function public.claim_notification(uuid, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.admin_set_stock(uuid, uuid, int, int) from public, anon;
grant execute on function public.admin_set_stock(uuid, uuid, int, int) to authenticated;
grant execute on function public.claim_notification(uuid, text, text, boolean) to service_role;
grant execute on function public.admin_set_stock(uuid, uuid, int, int) to service_role;

-- Stock is changed only through admin_set_stock (compare-and-set) and the
-- order functions — never by a blind table update from the dashboard.
-- (A column REVOKE can't override a table-wide grant, so re-grant UPDATE
-- column by column, leaving out stock.)
revoke update on public.products, public.product_variants from authenticated;
grant update (slug, name, subtitle, description, details, ingredients, specs, price, compare_at_price,
              track_stock, variant_label, max_per_order, category_id, is_active, is_featured,
              badge_new, badge_bestseller, sort_order)
  on public.products to authenticated;
grant update (name, sku, price, swatch, image_url, is_active, sort_order)
  on public.product_variants to authenticated;
