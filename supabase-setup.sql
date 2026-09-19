-- Run once in a NEW Supabase project's SQL Editor (as postgres).
-- First create the owner's Auth account. Put its UUID in owner_id below.
-- Never put the owner's password or any service key in this file.
begin;

create table public.admin_users (
    user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
create policy "Owner reads own membership" on public.admin_users
    for select to authenticated using (user_id = (select auth.uid()));
-- No client write policy/grant: signing up cannot make someone an admin.

create table public.products (
    id text primary key default gen_random_uuid()::text,
    title text not null check (length(trim(title)) between 1 and 160),
    category text not null check (category in ('serum', 'mask', 'body')),
    size text not null default '' check (length(size) <= 120),
    short_description text not null check (length(trim(short_description)) between 1 and 300),
    full_description text not null check (length(trim(full_description)) between 1 and 10000),
    usage text not null default '' check (length(usage) <= 5000),
    highlights text not null default '' check (length(highlights) <= 5000),
    image_url text not null default '' check (image_url = '' or image_url like 'https://%'),
    active boolean not null default true,
    sort_order integer not null default 0 check (sort_order between 0 and 999999),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create function public.set_product_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.updated_at = now();
    return new;
end;
$$;
create trigger product_updated_at before update on public.products
    for each row execute function public.set_product_updated_at();

alter table public.products enable row level security;
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
create policy "Public reads visible products" on public.products
    for select to anon, authenticated using (active);
create policy "Owner manages products" on public.products
    for all to authenticated
    using (exists (select 1 from public.admin_users where user_id = (select auth.uid())))
    with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']);
-- Public bucket URLs are readable without a SELECT policy. Listing and all
-- mutations remain owner-only. Hiding a product does not make its photo private.
create policy "Owner reads image objects" on storage.objects for select to authenticated
    using (bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "Owner uploads product images" on storage.objects for insert to authenticated
    with check (bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "Owner replaces product images" on storage.objects for update to authenticated
    using (bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid())))
    with check (bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "Owner deletes product images" on storage.objects for delete to authenticated
    using (bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid())));

-- Set this to the UUID copied from Authentication > Users. NULL deliberately
-- authorizes nobody; you can also insert user_id via Table Editor as postgres.
do $$
declare owner_id uuid := null;
begin
    if owner_id is not null then
        insert into public.admin_users(user_id) values (owner_id);
    end if;
end;
$$;

-- One-time migration of the existing example catalog; IDs stay unchanged.
insert into public.products (id, title, category, size, short_description, full_description, sort_order) values
('serum-1', '保濕精華（示例）', 'serum', '30 ml', '清透水感質地，作為日常保濕步驟的示例。', '清透水感質地，作為日常保濕步驟的示例。', 0),
('serum-2', '柔潤精華（示例）', 'serum', '30 ml', '柔潤觸感的晚間護理示例，為日常留一點從容。', '柔潤觸感的晚間護理示例，為日常留一點從容。', 1),
('mask-1', '保濕面膜（示例）', 'mask', '5 片 / 盒', '片裝面膜示例，適合展示每週護理系列。', '片裝面膜示例，適合展示每週護理系列。', 2),
('mask-2', '晚安面膜（示例）', 'mask', '5 片 / 盒', '晚間放鬆系列示例，為自己安排一段安靜時間。', '晚間放鬆系列示例，為自己安排一段安靜時間。', 3),
('body-1', '身體護理乳（示例）', 'body', '200 ml', '日常身體護理示例，呈現沐浴後的柔潤儀式。', '日常身體護理示例，呈現沐浴後的柔潤儀式。', 4),
('body-2', '香氛沐浴露（示例）', 'body', '250 ml', '溫暖木質調概念示例，讓沐浴成為一天的小休息。', '溫暖木質調概念示例，讓沐浴成為一天的小休息。', 5);

commit;
