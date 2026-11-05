-- HER Society: görüşlər, şəkillər, adminlər, anbar qaydaları

-- Adminlər (yalnız bu email-lər admin paneldə işləyə bilər)
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Görüşlər
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Çay Süfrəsi',
  topic text,
  guest_name text,
  guest_title text,
  starts_at timestamptz not null,
  venue text,
  album_open boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;

create or replace function public.album_acikdir(ev text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.events e where e.id::text = ev and e.album_open and e.published);
$$;

-- Şəkillər
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  path text not null unique,
  thumb_path text,
  source text not null default 'qonaq' check (source in ('qonaq', 'admin')),
  on_site boolean not null default false,
  site_path text,
  size_bytes bigint,
  downloaded_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.photos enable row level security;
create index if not exists photos_event_idx on public.photos(event_id, created_at desc);

-- İcazələr (cədvəllər avtomatik açılmır)
grant usage on schema public to anon, authenticated;
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant select on public.photos to anon, authenticated;
grant update, delete on public.photos to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.album_acikdir(text) to anon, authenticated;

-- Görüşlər: hamı dərc olunanları görür, yalnız admin dəyişir
create policy "gorusler oxu" on public.events for select to anon, authenticated
  using (published or public.is_admin());
create policy "gorusler elave" on public.events for insert to authenticated with check (public.is_admin());
create policy "gorusler deyis" on public.events for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "gorusler sil" on public.events for delete to authenticated using (public.is_admin());

-- Şəkillər: hamı yalnız saytda göstərilənləri görür; admin hamısını
create policy "sekiller oxu" on public.photos for select to anon, authenticated
  using (on_site or public.is_admin());
create policy "sekiller deyis" on public.photos for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "sekiller sil" on public.photos for delete to authenticated using (public.is_admin());

-- Anbar: albom (gizli) və sayt (ictimai)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('albom', 'albom', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
       ('sayt', 'sayt', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Qonaq: yalnız açıq albomlu görüşə yükləyə bilər, baxa/silə bilməz
create policy "qonaq yukleyir" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'albom' and public.album_acikdir((storage.foldername(name))[1]));
-- Admin: albomda hər şey
create policy "admin albom oxu" on storage.objects for select to authenticated
  using (bucket_id = 'albom' and public.is_admin());
create policy "admin albom yaz" on storage.objects for insert to authenticated
  with check (bucket_id = 'albom' and public.is_admin());
create policy "admin albom sil" on storage.objects for delete to authenticated
  using (bucket_id = 'albom' and public.is_admin());
-- Admin: sayt şəkilləri
create policy "admin sayt oxu" on storage.objects for select to authenticated
  using (bucket_id = 'sayt' and public.is_admin());
create policy "admin sayt yaz" on storage.objects for insert to authenticated
  with check (bucket_id = 'sayt' and public.is_admin());
create policy "admin sayt deyis" on storage.objects for update to authenticated
  using (bucket_id = 'sayt' and public.is_admin());
create policy "admin sayt sil" on storage.objects for delete to authenticated
  using (bucket_id = 'sayt' and public.is_admin());

-- Albom faylı yüklənəndə şəkil qeydi avtomatik yaranır (kiçik nüsxələr qeyd olunmur)
create or replace function public.albom_fayl_geldi()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  hisseler text[] := storage.foldername(new.name);
  fayl text := storage.filename(new.name);
begin
  if new.bucket_id <> 'albom' or array_length(hisseler, 1) <> 1 then
    return new;
  end if;
  insert into public.photos (event_id, path, thumb_path, source, size_bytes)
  values (
    case when hisseler[1] ~ '^[0-9a-f-]{36}$' then hisseler[1]::uuid end,
    new.name,
    hisseler[1] || '/kicik/' || fayl,
    case when public.is_admin() then 'admin' else 'qonaq' end,
    nullif(new.metadata ->> 'size', '')::bigint
  )
  on conflict (path) do nothing;
  return new;
end;
$$;

create or replace function public.albom_fayl_silindi()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.bucket_id = 'albom' then
    delete from public.photos where path = old.name;
  end if;
  return old;
end;
$$;

drop trigger if exists albom_fayl_geldi on storage.objects;
create trigger albom_fayl_geldi after insert on storage.objects
  for each row execute function public.albom_fayl_geldi();
drop trigger if exists albom_fayl_silindi on storage.objects;
create trigger albom_fayl_silindi after delete on storage.objects
  for each row execute function public.albom_fayl_silindi();

-- Başlanğıc məlumat
insert into public.admins (email) values ('hersociety.az@gmail.com'), ('kmikayilov00@gmail.com')
on conflict do nothing;

insert into public.events (title, topic, guest_name, guest_title, starts_at, venue, album_open)
values
  ('Çay Süfrəsi', null, 'Sabina xanım (Papillon''s)', 'süfrə təqdimatı', '2026-10-23 13:00:00+04', 'Luciano restoranı, Bakı', false),
  ('Çay Süfrəsi', 'Bir qadının bir neçə rolu', 'Dilarə Əliyeva', 'Azərbaycanın Əməkdar artisti', '2026-11-21 13:00:00+04', 'Latitude & Longitude Bar Lounge, The Merchant Baku', false);

-- Fayl ölçüsü yükləmə bitəndə yazılır
create or replace function public.albom_fayl_yenilendi()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.bucket_id = 'albom' and (new.metadata ->> 'size') is not null then
    update public.photos set size_bytes = (new.metadata ->> 'size')::bigint
    where path = new.name and size_bytes is null;
  end if;
  return new;
end;
$$;
drop trigger if exists albom_fayl_yenilendi on storage.objects;
create trigger albom_fayl_yenilendi after update on storage.objects
  for each row execute function public.albom_fayl_yenilendi();

-- Adminlər siyahısını yalnız adminlər görür
grant select on public.admins to authenticated;
create policy "adminler oxu" on public.admins for select to authenticated using (public.is_admin());
