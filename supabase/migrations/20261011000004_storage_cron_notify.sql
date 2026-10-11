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
