-- =====================================================================
-- Community & reviews shown in the home page slideshow.
--   kind = 'review'  a written quote (customer review or press mention)
--   kind = 'look'    a photo / short video of someone wearing the product
-- Managed by the owner in Admin → Reviews; only published posts are public.
-- =====================================================================

create table public.community_posts (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'review' check (kind in ('review', 'look')),
  author       text not null check (char_length(author) between 1 and 80),
  -- e.g. "@glowwithmaria", "Allure", "Verified buyer"
  source       text check (char_length(source) <= 80),
  quote        text check (char_length(quote) <= 600),
  rating       smallint check (rating between 1 and 5),
  image_url    text,
  image_path   text,
  video_url    text,
  video_path   text,
  -- optional link to the original post (TikTok / Instagram / Facebook / article)
  link_url     text check (link_url is null or link_url ~* '^https://'),
  product_id   uuid references public.products(id) on delete set null,
  is_published boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (kind = 'look' or quote is not null),
  check (kind = 'review' or image_url is not null or video_url is not null)
);
create index community_posts_public_idx on public.community_posts (is_published, sort_order, created_at desc);
create trigger community_posts_updated_at before update on public.community_posts
  for each row execute function public.set_updated_at();

grant select on public.community_posts to anon;
grant select, insert, update, delete on public.community_posts to authenticated;
grant all on public.community_posts to service_role;

alter table public.community_posts enable row level security;
create policy "community_posts: public read published" on public.community_posts
  for select to anon, authenticated using (is_published or public.is_admin());
create policy "community_posts: admin insert" on public.community_posts
  for insert to authenticated with check (public.is_admin());
create policy "community_posts: admin update" on public.community_posts
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "community_posts: admin delete" on public.community_posts
  for delete to authenticated using (public.is_admin());

-- Short videos for "looks" (MP4 / WebM, up to 50 MB) in the media bucket.
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm']
 where id = 'media';
