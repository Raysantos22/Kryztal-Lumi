-- =====================================================================
-- Order logic lives in Postgres so it is atomic and identical no matter
-- who calls it (edge function, admin dashboard, demo mode, tests).
--
-- Public:   get_order, submit_gcash_reference
-- Service:  create_order          (only via the create-order edge function)
-- Admin:    admin_list_orders, admin_get_order, admin_set_order_status,
--           admin_mark_paid, admin_update_tracking, admin_stats
-- System:   expire_unpaid_orders  (pg_cron / scheduled edge function)
--
-- Stock safety: stock is decremented with
--   update … set stock = stock - qty where id = … and stock >= qty
-- inside the order transaction. The UPDATE takes a row lock, so a
-- concurrent order for the same item waits, then re-checks the condition
-- against the committed stock: two customers can never buy the last item.
-- Lines are processed in a fixed (product, variant) order to avoid
-- deadlocks between multi-item orders.
-- =====================================================================

-- "₱1,299" / "₱399.50"
create or replace function public._money(p_amount numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select '₱' || case when p_amount = trunc(p_amount)
                     then to_char(p_amount, 'FM999,999,990')
                     else to_char(p_amount, 'FM999,999,990.00') end;
$$;

-- "kl 24a7f3" / "24A7F3" / "KL-24A7F3" → "KL-24A7F3"
create or replace function public._normalize_order_no(p_order_no text)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'KL-' || regexp_replace(
           regexp_replace(upper(coalesce(p_order_no, '')), '[^A-Z0-9]', '', 'g'),
           '^KL', '');
$$;

create or replace function public._status_label(p_status public.order_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'awaiting_payment' then 'awaiting payment'
    else p_status::text end;
$$;

-- ---------------------------------------------------------------------
-- Shape of an order for the customer (and, with p_admin, the dashboard).
-- ---------------------------------------------------------------------
create or replace function public._order_json(p_order_id uuid, p_admin boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id',               o.id,
    'order_no',         o.order_no,
    'status',           o.status,
    'payment_method',   o.payment_method,
    'payment_status',   o.payment_status,
    'currency',         o.currency,
    'customer',         jsonb_build_object('name', o.customer_name, 'phone', o.customer_phone, 'email', o.customer_email),
    'shipping',         jsonb_build_object(
                          'address_line', o.address_line, 'barangay', o.barangay, 'city', o.city,
                          'province', o.province, 'zip', o.zip, 'landmark', o.landmark,
                          'zone_name', o.shipping_zone_name, 'eta', o.shipping_eta),
    'notes',            o.notes,
    'subtotal',         o.subtotal,
    'shipping_fee',     o.shipping_fee,
    'total',            o.total,
    'gcash_reference',  o.gcash_reference,
    'courier',          o.courier,
    'tracking_no',      o.tracking_no,
    'cancelled_reason', o.cancelled_reason,
    'expires_at',       case when o.status = 'awaiting_payment' then o.expires_at end,
    'paid_at',          o.paid_at,
    'shipped_at',       o.shipped_at,
    'delivered_at',     o.delivered_at,
    'created_at',       o.created_at,
    'items', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', i.id, 'product_id', i.product_id, 'variant_id', i.variant_id,
                 'product_name', i.product_name, 'product_slug', i.product_slug,
                 'variant_name', i.variant_name, 'sku', i.sku, 'image_url', i.image_url,
                 'unit_price', i.unit_price, 'quantity', i.quantity, 'line_total', i.line_total)
               order by i.position)
          from public.order_items i where i.order_id = o.id), '[]'::jsonb),
    'timeline', coalesce((
        select jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'created_at', e.created_at)
               order by e.created_at, e.id)
          from public.order_events e where e.order_id = o.id), '[]'::jsonb)
  )
  || case when p_admin then jsonb_build_object(
       'admin_notes',    o.admin_notes,
       'stock_released', o.stock_released,
       'expires_at',     o.expires_at,
       'confirmed_at',   o.confirmed_at,
       'packed_at',      o.packed_at,
       'cancelled_at',   o.cancelled_at,
       'returned_at',    o.returned_at,
       'updated_at',     o.updated_at,
       'notifications', coalesce((
           select jsonb_agg(jsonb_build_object('channel', n.channel, 'kind', n.kind, 'recipient', n.recipient,
                                               'status', n.status, 'error', n.error, 'sent_at', n.sent_at)
                  order by n.sent_at desc)
             from public.notifications_log n where n.order_id = o.id), '[]'::jsonb))
     else '{}'::jsonb end
  from public.orders o
  where o.id = p_order_id;
$$;

-- ---------------------------------------------------------------------
-- Stock helpers
-- ---------------------------------------------------------------------
-- Take p_qty of a product (no variant) or a variant. Raises out_of_stock.
create or replace function public._take_stock(p_product_id uuid, p_variant_id uuid, p_qty int, p_label text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_left int;
begin
  if p_variant_id is null then
    update public.products set stock = stock - p_qty where id = p_product_id and stock >= p_qty;
    if found then return; end if;
    select stock into v_left from public.products where id = p_product_id;
  else
    update public.product_variants set stock = stock - p_qty where id = p_variant_id and stock >= p_qty;
    if found then return; end if;
    select stock into v_left from public.product_variants where id = p_variant_id;
  end if;
  if coalesce(v_left, 0) = 0 then
    raise exception 'Sorry, % is sold out.', p_label using hint = 'out_of_stock';
  end if;
  raise exception 'Sorry, only % left of %.', v_left, p_label using hint = 'out_of_stock';
end;
$$;

-- Put an order's reserved stock back (cancel / return / expiry). Idempotent.
-- Rows are updated one at a time in (product, variant) order — the same
-- order create_order() locks them in — so concurrent orders and cancels
-- can't deadlock. Lines whose variant/product was deleted are skipped,
-- and so are products whose stock is no longer tracked.
create or replace function public._release_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if (select o.stock_released from public.orders o where o.id = p_order_id for update) then
    return;
  end if;
  for r in
    select i.product_id, i.variant_id, i.variant_name, sum(i.quantity)::int as qty
      from public.order_items i
     where i.order_id = p_order_id and i.stock_reserved and i.product_id is not null
     group by i.product_id, i.variant_id, i.variant_name
     order by i.product_id, i.variant_id nulls first
  loop
    if r.variant_name is null then
      update public.products set stock = stock + r.qty where id = r.product_id and track_stock;
    elsif r.variant_id is not null then
      update public.product_variants v set stock = v.stock + r.qty
        from public.products p
       where v.id = r.variant_id and p.id = v.product_id and p.track_stock;
    end if;
  end loop;
  update public.orders set stock_released = true where id = p_order_id;
end;
$$;

-- Take an order's stock again (reinstating an auto-cancelled GCash order).
-- Uses the catalogue as it is now: lines of products that no longer track
-- stock take nothing; removed products / options refuse the reinstatement.
create or replace function public._reserve_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if not (select o.stock_released from public.orders o where o.id = p_order_id for update) then
    return;
  end if;
  for r in
    select i.product_id, i.variant_id, i.variant_name, i.product_name, sum(i.quantity)::int as qty
      from public.order_items i
     where i.order_id = p_order_id and i.stock_reserved
     group by i.product_id, i.variant_id, i.variant_name, i.product_name
     order by i.product_id, i.variant_id nulls first
  loop
    if r.product_id is null or (r.variant_name is not null and r.variant_id is null)
       or not exists (select 1 from public.products p where p.id = r.product_id and p.is_active) then
      raise exception '% is no longer in the catalogue.', r.product_name using hint = 'out_of_stock';
    end if;
    if (select p.track_stock from public.products p where p.id = r.product_id) then
      perform public._take_stock(r.product_id, r.variant_id, r.qty,
                                 r.product_name || coalesce(' (' || r.variant_name || ')', ''));
    end if;
  end loop;
  update public.orders set stock_released = false where id = p_order_id;
end;
$$;

-- Cancel an order, release its stock and log the event.
create or replace function public._cancel_order(p_order_id uuid, p_reason text, p_actor uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._release_order_stock(p_order_id);
  update public.orders
     set status = 'cancelled', cancelled_at = now(), cancelled_reason = p_reason
   where id = p_order_id;
  insert into public.order_events (order_id, status, note, created_by)
  values (p_order_id, 'cancelled', p_reason, p_actor);
end;
$$;

-- ---------------------------------------------------------------------
-- Auto-cancel GCash orders still unpaid after gcash_expiry_hours and
-- release their stock. Orders where the customer submitted a reference get
-- an extra 48 hours for the owner to verify it (so a fake reference can't
-- hold stock forever). A late payment can still be confirmed with
-- admin_mark_paid while stock lasts. Returns number cancelled.
-- ---------------------------------------------------------------------
create or replace function public.expire_unpaid_orders()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select o.id from public.orders o
     where o.status = 'awaiting_payment'
       and ((o.payment_status = 'unpaid' and o.expires_at < now())
            or (o.payment_status = 'submitted' and o.expires_at + interval '48 hours' < now()))
     order by o.id
     for update skip locked
  loop
    perform public._cancel_order(r.id, 'Auto-cancelled: GCash payment not confirmed in time');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- SERVICE ROLE ONLY: place an order atomically.
--   p_items    [{"product_id": uuid, "variant_id": uuid|null, "quantity": int}]
--   p_customer {"name","phone","email","address_line","barangay","city",
--               "province","zip","landmark"}
--   p_shipping_zone_id  kept for API compatibility; never used for pricing
-- Prices, stock, shipping and free-shipping rules are re-read from the
-- database — nothing the browser computed is trusted.
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_items             jsonb,
  p_customer          jsonb,
  p_payment_method    text,
  p_gcash_reference   text default null,
  p_shipping_zone_id  uuid default null,
  p_notes             text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  s            public.store_settings;
  c            jsonb := coalesce(p_customer, '{}'::jsonb);
  v_name       text := btrim(coalesce(c->>'name', ''));
  v_phone      text := btrim(coalesce(c->>'phone', ''));
  v_email      text := nullif(lower(btrim(coalesce(c->>'email', ''))), '');
  v_address    text := btrim(coalesce(c->>'address_line', ''));
  v_barangay   text := btrim(coalesce(c->>'barangay', ''));
  v_city       text := btrim(coalesce(c->>'city', ''));
  v_province   text := btrim(coalesce(c->>'province', ''));
  v_zip        text := nullif(btrim(coalesce(c->>'zip', '')), '');
  v_landmark   text := nullif(btrim(coalesce(c->>'landmark', '')), '');
  v_notes      text := nullif(btrim(coalesce(p_notes, '')), '');
  v_ref        text := nullif(upper(regexp_replace(coalesce(p_gcash_reference, ''), '\s', '', 'g')), '');
  v_uuid_re    text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_method     public.payment_method;
  v_key        text;
  v_line       record;
  v_product    public.products;
  v_variant    public.product_variants;
  v_price      numeric;
  v_label      text;
  v_image      text;
  v_lines      jsonb := '[]'::jsonb;
  v_subtotal   numeric := 0;
  v_zone       public.shipping_zones;
  v_fee        numeric;
  v_order_id   uuid;
  v_order_no   text;
  v_tries      int := 0;
begin
  select * into s from public.store_settings where id = 1;
  if not found then
    raise exception 'The shop is not set up yet.' using hint = 'not_found';
  end if;

  -- ---- customer + address ------------------------------------------------
  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'Please enter your full name.' using hint = 'invalid_input';
  end if;
  if char_length(regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 10 and 13
     or char_length(v_phone) > 30 then
    raise exception 'Please enter a valid mobile number (e.g. 0917 123 4567).' using hint = 'invalid_input';
  end if;
  -- Plain addresses only (no ?, &, % … that could smuggle mailto: parameters)
  if v_email is not null and (v_email !~ '^[a-z0-9._+''-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'
                              or char_length(v_email) > 254) then
    raise exception 'Please enter a valid email address.' using hint = 'invalid_input';
  end if;
  if char_length(v_address) < 3 or char_length(v_address) > 200 then
    raise exception 'Please enter your house no. and street.' using hint = 'invalid_input';
  end if;
  if char_length(v_barangay) < 2 or char_length(v_barangay) > 100 then
    raise exception 'Please enter your barangay.' using hint = 'invalid_input';
  end if;
  if char_length(v_city) < 2 or char_length(v_city) > 100 then
    raise exception 'Please enter your city or municipality.' using hint = 'invalid_input';
  end if;
  if char_length(v_province) < 2 or char_length(v_province) > 100 then
    raise exception 'Please choose your province.' using hint = 'invalid_input';
  end if;
  if v_zip is not null and v_zip !~ '^[0-9]{4}$' then
    raise exception 'ZIP code should be 4 digits.' using hint = 'invalid_input';
  end if;
  if char_length(coalesce(v_landmark, '')) > 200 then
    raise exception 'Landmark is too long (max 200 characters).' using hint = 'invalid_input';
  end if;
  if char_length(coalesce(v_notes, '')) > 500 then
    raise exception 'Notes are too long (max 500 characters).' using hint = 'invalid_input';
  end if;

  -- ---- payment -------------------------------------------------------------
  if coalesce(p_payment_method, '') not in ('cod', 'gcash') then
    raise exception 'Please choose a payment method.' using hint = 'invalid_input';
  end if;
  v_method := p_payment_method::public.payment_method;
  if (v_method = 'cod' and not s.cod_enabled) or (v_method = 'gcash' and not s.gcash_enabled) then
    raise exception 'That payment method is not available right now.' using hint = 'invalid_input';
  end if;
  if v_method = 'cod' then
    v_ref := null;
  elsif v_ref is not null and v_ref !~ '^[A-Z0-9-]{4,40}$' then
    raise exception 'The GCash reference number looks wrong — please check it.' using hint = 'invalid_input';
  end if;

  -- ---- anti-spam: cap unconfirmed orders per phone -------------------------
  -- Serialise orders from the same number so two parallel requests can't
  -- both slip under the cap.
  v_key := public.phone_key(v_phone);
  -- (Stale GCash orders past their payment window don't count; the cron
  -- job cancels them separately so this transaction never locks stock rows
  -- out of order.)
  perform pg_advisory_xact_lock(hashtextextended('order-phone:' || v_key, 0));
  if (select count(*) from public.orders o
       where o.phone_key = v_key
         and (o.status = 'new'
              or (o.status = 'awaiting_payment'
                  and (o.expires_at > now()
                       or (o.payment_status = 'submitted' and o.expires_at + interval '48 hours' > now())))))
     >= s.max_unconfirmed_per_phone then
    raise exception 'You already have % orders waiting for confirmation. Please message us or wait for them to be confirmed before ordering again.',
      s.max_unconfirmed_per_phone using hint = 'too_many_pending';
  end if;

  -- ---- items: validate shape -------------------------------------------------
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your bag is empty.' using hint = 'invalid_items';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'Too many different items in one order (max 20).' using hint = 'invalid_items';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
     where jsonb_typeof(e) <> 'object'
        or coalesce(e->>'product_id', '') !~* v_uuid_re
        or (e->>'variant_id' is not null and e->>'variant_id' !~* v_uuid_re)
        or coalesce(e->>'quantity', '') !~ '^[0-9]{1,3}$'
        or (e->>'quantity')::int < 1
  ) then
    raise exception 'Something in your bag is not valid. Please refresh and try again.' using hint = 'invalid_items';
  end if;

  -- ---- items: price from the DB + take stock (fixed lock order) -------------
  for v_line in
    select (e->>'product_id')::uuid as product_id,
           (e->>'variant_id')::uuid as variant_id,
           sum((e->>'quantity')::int)::int as qty
      from jsonb_array_elements(p_items) e
     group by 1, 2
     order by 1, 2 nulls first
  loop
    select * into v_product from public.products p where p.id = v_line.product_id and p.is_active;
    if not found then
      raise exception 'One of the items in your bag is no longer available.' using hint = 'invalid_items';
    end if;
    -- max per order counts every option of the product together
    if (select sum((e->>'quantity')::int) from jsonb_array_elements(p_items) e
         where (e->>'product_id')::uuid = v_product.id) > v_product.max_per_order then
      raise exception 'You can order up to % of % per order.', v_product.max_per_order, v_product.name
        using hint = 'invalid_items';
    end if;

    v_variant := null;
    if v_line.variant_id is null then
      if exists (select 1 from public.product_variants pv where pv.product_id = v_product.id and pv.is_active) then
        raise exception 'Please choose a % for %.', lower(v_product.variant_label), v_product.name
          using hint = 'invalid_items';
      end if;
      v_price := v_product.price;
      v_label := v_product.name;
    else
      select * into v_variant from public.product_variants pv
       where pv.id = v_line.variant_id and pv.product_id = v_product.id and pv.is_active;
      if not found then
        raise exception 'The % you chose for % is no longer available.', lower(v_product.variant_label), v_product.name
          using hint = 'invalid_items';
      end if;
      v_price := v_variant.price;
      v_label := v_product.name || ' (' || v_variant.name || ')';
    end if;

    if v_product.track_stock then
      perform public._take_stock(v_product.id, v_variant.id, v_line.qty, v_label);
    end if;

    select coalesce(v_variant.image_url, (select pi.url from public.product_images pi
                                            where pi.product_id = v_product.id
                                            order by pi.sort_order, pi.created_at limit 1))
      into v_image;

    v_subtotal := v_subtotal + v_price * v_line.qty;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id, 'variant_id', v_variant.id,
      'product_name', v_product.name, 'product_slug', v_product.slug,
      'variant_name', v_variant.name, 'sku', v_variant.sku, 'image_url', v_image,
      'unit_price', v_price, 'quantity', v_line.qty, 'line_total', v_price * v_line.qty,
      'stock_reserved', v_product.track_stock);
  end loop;

  if s.min_order_amount > 0 and v_subtotal < s.min_order_amount then
    raise exception 'The minimum order is %. Add a little more to your bag.', public._money(s.min_order_amount)
      using hint = 'below_minimum';
  end if;

  -- ---- shipping zone + fee -------------------------------------------------
  select z.* into v_zone from public.shipping_zones z
   where z.is_active
     and exists (select 1 from unnest(z.provinces) p where lower(btrim(p)) = lower(v_province))
   order by z.sort_order, z.name
   limit 1;
  -- A province in no zone pays the highest active zone fee. The zone the
  -- browser suggests (p_shipping_zone_id) is never trusted for pricing.
  if v_zone.id is null then
    select z.* into v_zone from public.shipping_zones z
     where z.is_active
     order by z.fee desc, z.sort_order
     limit 1;
  end if;
  if v_zone.id is null then
    raise exception 'Sorry, we can''t ship to that address yet. Please message us.' using hint = 'invalid_input';
  end if;
  v_fee := case
             when s.free_shipping_mode = 'all' then 0
             when s.free_shipping_mode = 'threshold' and v_subtotal >= s.free_shipping_threshold then 0
             else v_zone.fee
           end;

  -- ---- insert order (retry on the rare order-number collision) -----------------
  loop
    v_tries := v_tries + 1;
    v_order_no := 'KL-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    begin
      insert into public.orders (
        order_no, status, payment_method, payment_status,
        customer_name, customer_phone, customer_email,
        address_line, barangay, city, province, zip, landmark, notes,
        shipping_zone_id, shipping_zone_name, shipping_eta,
        subtotal, shipping_fee, total, currency, gcash_reference, expires_at)
      values (
        v_order_no,
        case when v_method = 'gcash' then 'awaiting_payment' else 'new' end::public.order_status,
        v_method,
        case when v_ref is not null then 'submitted' else 'unpaid' end::public.payment_status,
        v_name, v_phone, v_email,
        v_address, v_barangay, v_city, v_province, v_zip, v_landmark, v_notes,
        v_zone.id, v_zone.name, v_zone.delivery_time,
        v_subtotal, v_fee, v_subtotal + v_fee, s.currency, v_ref,
        case when v_method = 'gcash' then now() + make_interval(hours => s.gcash_expiry_hours) end)
      returning id into v_order_id;
      exit;
    exception when unique_violation then
      if v_tries >= 5 then raise; end if;
    end;
  end loop;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, product_slug, variant_name, sku, image_url,
    unit_price, quantity, line_total, stock_reserved, position)
  select v_order_id, (l->>'product_id')::uuid, (l->>'variant_id')::uuid, l->>'product_name', l->>'product_slug',
         l->>'variant_name', l->>'sku', l->>'image_url', (l->>'unit_price')::numeric, (l->>'quantity')::int,
         (l->>'line_total')::numeric, (l->>'stock_reserved')::boolean, (ord - 1)::int
    from jsonb_array_elements(v_lines) with ordinality as t(l, ord);

  insert into public.order_events (order_id, status, note)
  values (v_order_id,
          case when v_method = 'gcash' then 'awaiting_payment' else 'new' end::public.order_status,
          case when v_method = 'cod' then 'Order placed — cash on delivery'
               when v_ref is not null then 'Order placed — GCash reference submitted, waiting for verification'
               else 'Order placed — waiting for GCash payment' end);

  return public._order_json(v_order_id);
end;
$$;

-- ---------------------------------------------------------------------
-- PUBLIC: customers look up their own order with order no. + mobile.
-- ---------------------------------------------------------------------
create or replace function public.get_order(p_order_no text, p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public._order_json(o.id)
    from public.orders o
   where o.order_no = public._normalize_order_no(p_order_no)
     and char_length(public.phone_key(p_phone)) = 10
     and o.phone_key = public.phone_key(p_phone);
$$;

-- PUBLIC: add / correct the GCash reference after ordering.
create or replace function public.submit_gcash_reference(p_order_no text, p_phone text, p_reference text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o   public.orders;
  v_ref text := nullif(upper(regexp_replace(coalesce(p_reference, ''), '\s', '', 'g')), '');
begin
  select * into o from public.orders
   where order_no = public._normalize_order_no(p_order_no)
     and char_length(public.phone_key(p_phone)) = 10
     and phone_key = public.phone_key(p_phone)
   for update;
  if not found then
    raise exception 'We couldn''t find that order. Check the order number and mobile number.' using hint = 'not_found';
  end if;
  if o.payment_method <> 'gcash' or o.status <> 'awaiting_payment' or o.payment_status = 'paid' then
    raise exception 'This order doesn''t need a GCash reference any more.' using hint = 'invalid_status';
  end if;
  if o.payment_status = 'unpaid' and o.expires_at <= now() then
    raise exception 'The payment window for this order has closed. Please message us or place a new order.'
      using hint = 'invalid_status';
  end if;
  if v_ref is null or v_ref !~ '^[A-Z0-9-]{4,40}$' then
    raise exception 'Please enter the reference number from your GCash receipt.' using hint = 'invalid_input';
  end if;
  update public.orders set gcash_reference = v_ref, payment_status = 'submitted' where id = o.id;
  insert into public.order_events (order_id, status, note)
  values (o.id, 'awaiting_payment', 'GCash reference submitted — waiting for verification');
  return public._order_json(o.id);
end;
$$;

-- ---------------------------------------------------------------------
-- ADMIN
-- ---------------------------------------------------------------------
create or replace function public._require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;
end;
$$;

-- List orders, newest first.
--   p_status: an order_status, or 'open' (not delivered/cancelled/returned),
--             'to_verify' (GCash awaiting payment), 'cod_to_collect'
create or replace function public.admin_list_orders(
  p_status          text default null,
  p_payment_method  text default null,
  p_search          text default null,
  p_limit           int default 50,
  p_offset          int default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_digits text := regexp_replace(coalesce(p_search, ''), '[^0-9]', '', 'g');
  v_total  int;
  v_rows   jsonb;
begin
  perform public._require_admin();

  with filtered as (
    select o.* from public.orders o
     where (p_status is null or p_status = ''
            or (p_status = 'open' and o.status not in ('delivered', 'cancelled', 'returned'))
            or (p_status = 'to_verify' and o.payment_method = 'gcash' and o.status = 'awaiting_payment')
            or (p_status = 'cod_to_collect' and o.payment_method = 'cod'
                and o.status in ('new', 'confirmed', 'packed', 'shipped'))
            or o.status::text = p_status)
       and (p_payment_method is null or p_payment_method = '' or o.payment_method::text = p_payment_method)
       and (v_search is null
            or o.order_no ilike '%' || v_search || '%'
            or o.customer_name ilike '%' || v_search || '%'
            or (char_length(v_digits) >= 4 and o.phone_key like '%' || right(v_digits, 10) || '%')
            or o.tracking_no ilike '%' || v_search || '%')
  )
  select (select count(*) from filtered)::int,
         coalesce(jsonb_agg(r.j order by r.created_at desc), '[]'::jsonb)
    into v_total, v_rows
    from (
      select f.created_at,
             jsonb_build_object(
               'id', f.id, 'order_no', f.order_no, 'status', f.status,
               'payment_method', f.payment_method, 'payment_status', f.payment_status,
               'customer_name', f.customer_name, 'customer_phone', f.customer_phone,
               'city', f.city, 'province', f.province, 'total', f.total,
               'gcash_reference', f.gcash_reference, 'courier', f.courier, 'tracking_no', f.tracking_no,
               'expires_at', f.expires_at, 'created_at', f.created_at,
               'item_count', (select coalesce(sum(i.quantity), 0) from public.order_items i where i.order_id = f.id),
               'items_summary', (select string_agg(i.quantity || '× ' || i.product_name
                                                   || coalesce(' (' || i.variant_name || ')', ''), ', ' order by i.position)
                                   from public.order_items i where i.order_id = f.id)
             ) as j
        from filtered f
       order by f.created_at desc
       limit least(greatest(coalesce(p_limit, 50), 1), 200)
      offset greatest(coalesce(p_offset, 0), 0)
    ) r;

  return jsonb_build_object('total', v_total, 'orders', v_rows);
end;
$$;

create or replace function public.admin_get_order(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public._require_admin();
  return public._order_json(p_order_id, true);
end;
$$;

-- Move an order along:  new → confirmed → packed → shipped → delivered,
-- or cancelled / returned (both put stock back). GCash orders leave
-- "awaiting payment" through admin_mark_paid().
create or replace function public.admin_set_order_status(
  p_order_id     uuid,
  p_status       public.order_status,
  p_courier      text default null,
  p_tracking_no  text default null,
  p_note         text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o          public.orders;
  v_allowed  text[];
  v_courier  text := nullif(btrim(coalesce(p_courier, '')), '');
  v_tracking text := nullif(btrim(coalesce(p_tracking_no, '')), '');
  v_note     text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform public._require_admin();
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using hint = 'not_found';
  end if;

  v_allowed := case o.status
    when 'new'              then array['confirmed', 'cancelled']
    when 'awaiting_payment' then array['cancelled']
    when 'confirmed'        then array['packed', 'shipped', 'cancelled']
    when 'packed'           then array['shipped', 'cancelled']
    when 'shipped'          then array['delivered', 'returned']
    when 'delivered'        then array['returned']
    else array[]::text[]
  end;
  if not (p_status::text = any(v_allowed)) then
    if o.status = 'awaiting_payment' and p_status = 'confirmed' then
      raise exception 'Use "Mark GCash paid" to confirm a GCash order.' using hint = 'invalid_status';
    end if;
    raise exception 'An order that is % can''t be marked %.',
      public._status_label(o.status), public._status_label(p_status) using hint = 'invalid_status';
  end if;
  if char_length(coalesce(v_note, '')) > 500 then
    raise exception 'Note is too long (max 500 characters).' using hint = 'invalid_input';
  end if;

  if p_status = 'cancelled' then
    perform public._cancel_order(o.id, coalesce(v_note, 'Cancelled by the shop'), auth.uid());
    return public._order_json(o.id, true);
  end if;

  if p_status = 'shipped' then
    if v_courier is null or v_tracking is null then
      raise exception 'Enter the courier and tracking number to mark the order shipped.' using hint = 'invalid_input';
    end if;
    if char_length(v_courier) > 60 or char_length(v_tracking) > 60 then
      raise exception 'Courier or tracking number is too long.' using hint = 'invalid_input';
    end if;
  end if;

  if p_status = 'returned' then
    perform public._release_order_stock(o.id);
  end if;

  update public.orders set
    status       = p_status,
    confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
    packed_at    = case when p_status = 'packed' then now() else packed_at end,
    shipped_at   = case when p_status = 'shipped' then now() else shipped_at end,
    courier      = case when p_status = 'shipped' then v_courier else courier end,
    tracking_no  = case when p_status = 'shipped' then v_tracking else tracking_no end,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
    returned_at  = case when p_status = 'returned' then now() else returned_at end,
    -- Cash on delivery is collected by the courier on delivery.
    payment_status = case when p_status = 'delivered' and payment_method = 'cod' then 'paid' else payment_status end,
    paid_at      = case when p_status = 'delivered' and payment_method = 'cod' then coalesce(paid_at, now()) else paid_at end
  where id = o.id;

  insert into public.order_events (order_id, status, note, created_by)
  values (o.id, p_status,
          case when p_status = 'shipped'
               then 'Shipped via ' || v_courier || ' · tracking no. ' || v_tracking
                    || coalesce(' — ' || v_note, '')
               else v_note end,
          auth.uid());

  return public._order_json(o.id, true);
end;
$$;

-- Correct the courier / tracking number of a shipped order.
create or replace function public.admin_update_tracking(p_order_id uuid, p_courier text, p_tracking_no text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o          public.orders;
  v_courier  text := nullif(btrim(coalesce(p_courier, '')), '');
  v_tracking text := nullif(btrim(coalesce(p_tracking_no, '')), '');
begin
  perform public._require_admin();
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using hint = 'not_found';
  end if;
  if o.status not in ('shipped', 'delivered', 'returned') then
    raise exception 'Tracking can only be edited after the order has shipped.' using hint = 'invalid_status';
  end if;
  if v_courier is null or v_tracking is null or char_length(v_courier) > 60 or char_length(v_tracking) > 60 then
    raise exception 'Enter the courier and tracking number.' using hint = 'invalid_input';
  end if;
  update public.orders set courier = v_courier, tracking_no = v_tracking where id = o.id;
  return public._order_json(o.id, true);
end;
$$;

-- Owner saw the GCash payment arrive → order confirmed + paid.
-- Also reinstates an order that was AUTO-cancelled for late payment, as
-- long as its stock can still be taken.
create or replace function public.admin_mark_paid(p_order_id uuid, p_reference text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o     public.orders;
  v_ref text := nullif(upper(regexp_replace(coalesce(p_reference, ''), '\s', '', 'g')), '');
begin
  perform public._require_admin();
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using hint = 'not_found';
  end if;
  if o.payment_method <> 'gcash' then
    raise exception 'Cash on delivery orders are marked paid automatically when delivered.' using hint = 'invalid_status';
  end if;
  if o.payment_status = 'paid' then
    raise exception 'This order is already marked paid.' using hint = 'invalid_status';
  end if;
  if char_length(coalesce(v_ref, '')) > 40 then
    raise exception 'Reference is too long.' using hint = 'invalid_input';
  end if;

  if o.status = 'cancelled' and coalesce(o.cancelled_reason, '') like 'Auto-cancelled%' then
    perform public._reserve_order_stock(o.id);
  elsif o.status <> 'awaiting_payment' then
    raise exception 'Only orders awaiting payment (or auto-cancelled for late payment) can be marked paid.'
      using hint = 'invalid_status';
  end if;

  update public.orders set
    status = 'confirmed', payment_status = 'paid', paid_at = now(), confirmed_at = now(),
    gcash_reference = coalesce(v_ref, gcash_reference),
    cancelled_at = null, cancelled_reason = null
  where id = o.id;

  insert into public.order_events (order_id, status, note, created_by)
  values (o.id, 'confirmed', 'GCash payment received — order confirmed', auth.uid());

  return public._order_json(o.id, true);
end;
$$;

-- Dashboard numbers (in the store's local time).
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s            public.store_settings;
  v_local_now  timestamp;
  v_week_from  timestamptz;
  v_month_from timestamptz;
begin
  perform public._require_admin();
  select * into s from public.store_settings where id = 1;
  v_local_now  := now() at time zone s.timezone;
  v_week_from  := date_trunc('week', v_local_now) at time zone s.timezone;
  v_month_from := date_trunc('month', v_local_now) at time zone s.timezone;

  return jsonb_build_object(
    'currency', s.currency,
    'new_orders', (select count(*) from public.orders o where o.status = 'new'),
    'orders_this_week', (select count(*) from public.orders o
                          where o.created_at >= v_week_from and o.status <> 'cancelled'),
    'sales_this_month', (select coalesce(sum(o.total), 0) from public.orders o
                          where o.created_at >= v_month_from
                            and o.status in ('confirmed', 'packed', 'shipped', 'delivered')),
    'cod_to_collect', (select coalesce(sum(o.total), 0) from public.orders o
                        where o.payment_method = 'cod' and o.status in ('new', 'confirmed', 'packed', 'shipped')),
    'cod_to_collect_count', (select count(*) from public.orders o
                              where o.payment_method = 'cod' and o.status in ('new', 'confirmed', 'packed', 'shipped')),
    'gcash_to_verify', (select count(*) from public.orders o
                         where o.payment_method = 'gcash' and o.status = 'awaiting_payment'),
    'gcash_submitted', (select count(*) from public.orders o
                         where o.payment_method = 'gcash' and o.status = 'awaiting_payment'
                           and o.payment_status = 'submitted'),
    'to_ship', (select count(*) from public.orders o where o.status in ('confirmed', 'packed')),
    'low_stock_threshold', s.low_stock_threshold,
    'low_stock', coalesce((
      select jsonb_agg(x.j order by x.stock, x.name)
        from (
          select p.name, p.stock,
                 jsonb_build_object('product_id', p.id, 'product_name', p.name, 'variant_name', null, 'stock', p.stock) as j
            from public.products p
           where p.is_active and p.track_stock and p.stock <= s.low_stock_threshold
             and not exists (select 1 from public.product_variants v where v.product_id = p.id and v.is_active)
          union all
          select p.name, v.stock,
                 jsonb_build_object('product_id', p.id, 'product_name', p.name, 'variant_name', v.name, 'stock', v.stock)
            from public.product_variants v
            join public.products p on p.id = v.product_id
           where p.is_active and p.track_stock and v.is_active and v.stock <= s.low_stock_threshold
        ) x), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Function privileges: Postgres grants EXECUTE to PUBLIC by default, so
-- revoke everything and grant back only what each role needs.
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.get_order(text, text) to anon, authenticated;
grant execute on function public.submit_gcash_reference(text, text, text) to anon, authenticated;
grant execute on function public.admin_list_orders(text, text, text, int, int) to authenticated;
grant execute on function public.admin_get_order(uuid) to authenticated;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text, text, text) to authenticated;
grant execute on function public.admin_update_tracking(uuid, text, text) to authenticated;
grant execute on function public.admin_mark_paid(uuid, text) to authenticated;
grant execute on function public.admin_stats() to authenticated;
-- Used inside RLS policies / generated columns, evaluated as the calling role.
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_product_public(uuid) to anon, authenticated;
grant execute on function public.phone_key(text) to anon, authenticated;
-- Trigger functions run as the table owner; nothing to grant.

grant execute on all functions in schema public to service_role;
