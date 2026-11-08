-- HER Society — "eyni anda yalnız bir albom açıq" bazada (8 noyabr 2026)
-- YALNIZ ƏLAVƏ: bir indeks və bir funksiya. Heç bir sətir silinmir.
-- Tətbiq anında açıq albom sayı: 0.

-- 1) Qayda: iki görüşün albomu eyni anda açıq ola bilməz (iki admin eyni anda bassa da, internet kəsilsə də).
create unique index if not exists events_yalniz_bir_acik_albom on public.events ((true)) where album_open;

-- 2) Albomu açmaq/bağlamaq — bir əməliyyat. Açanda köhnə açıq albom eyni anda bağlanır.
--    Cavab: 'acildi' | 'baglandi' | 'tapilmadi' | 'silinib' | 'gizli'
create or replace function public.albom_ac(ev uuid, ac boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare e public.events%rowtype;
begin
  if not public.is_admin() then raise exception 'icaze yoxdur'; end if;
  select * into e from public.events x where x.id = ev for update;
  if not found then return 'tapilmadi'; end if;
  if not ac then
    update public.events set album_open = false where id = ev;
    return 'baglandi';
  end if;
  if e.deleted_at is not null then return 'silinib'; end if;
  if not e.published then return 'gizli'; end if;
  update public.events set album_open = false where album_open and id <> ev;
  update public.events set album_open = true where id = ev;
  return 'acildi';
end; $$;
revoke all on function public.albom_ac(uuid, boolean) from public, anon;
grant execute on function public.albom_ac(uuid, boolean) to authenticated;
