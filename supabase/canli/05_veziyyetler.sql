-- HER Society — adlı vəziyyətlər və vəziyyət hesabatı (8 noyabr 2026)
-- YALNIZ ƏLAVƏ: yeni funksiyalar və bir qayda. Heç bir sətir silinmir və dəyişdirilmir.

-- ===================================================================
-- 1) Şəklin vəziyyəti — 7 sahə əvəzinə bir ad
--    icaze_gozleyir → hazir → (drive | endirilib) → saytda
--    Admin paneldə: select('*, veziyyet') — PostgREST "hesablanan sahə" kimi qaytarır.
-- ===================================================================
create or replace function public.veziyyet(p public.photos)
returns text language sql stable set search_path = '' as $$
  select case
    when not p.consent then 'icaze_gozleyir'
    when p.on_site then 'saytda'
    when p.drive_id is not null then 'drive'
    when p.downloaded_at is not null then 'endirilib'
    else 'hazir'
  end;
$$;
revoke all on function public.veziyyet(public.photos) from public, anon;
grant execute on function public.veziyyet(public.photos) to authenticated, service_role;

-- Qayda: icazəsiz şəkil sayta çıxa bilməz (əvvəl yalnız admin ekranı yoxlayırdı).
-- Tətbiq anında pozan şəkil yox idi (0).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'photos_sayt_ucun_icaze') then
    alter table public.photos add constraint photos_sayt_ucun_icaze check (not on_site or consent);
  end if;
end $$;

-- ===================================================================
-- 2) Qonağın icazə qeydi — nəticəni açıq deyir (köhnə albom_qeyd heç nə qaytarmırdı)
--    'ok'        icazə yazıldı (və ya artıq yazılmışdı — təkrar çağırmaq təhlükəsizdir)
--    'tapilmadi' şəkil hələ anbarda deyil
--    'vaxt'      yükləmədən 30 dəqiqədən çox keçib
--    'bagli'     albom bağlanıb
-- ===================================================================
create or replace function public.albom_icaze(yol text, ad text, razilik boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare p public.photos%rowtype;
begin
  if not coalesce(razilik, false) then raise exception 'razilik lazimdir'; end if;
  select * into p from public.photos x where x.path = yol;
  if not found then return 'tapilmadi'; end if;
  if p.consent_at is not null then return 'ok'; end if;
  if p.created_at <= now() - interval '30 minutes' then return 'vaxt'; end if;
  if not public.album_acikdir(split_part(yol, '/', 1)) then return 'bagli'; end if;
  update public.photos x
     set uploader = nullif(left(btrim(coalesce(ad, '')), 80), ''),
         consent = true,
         consent_at = now()
   where x.id = p.id and x.consent_at is null;
  return 'ok';
end; $$;
revoke all on function public.albom_icaze(text, text, boolean) from public;
grant execute on function public.albom_icaze(text, text, boolean) to anon, authenticated;

-- ===================================================================
-- 3) Görüşün mərhələsi — bir yerdə
--    gizli | silinib | gelecek | bu_gun | kecib (30 gün, rəy açıq) | arxiv
--    "bu_gun" saytdakı kimi: görüş günü bitənə qədər (başlamadan 6 saat sonrayadək).
-- ===================================================================
create or replace function public.merhele(e public.events)
returns text language sql stable set search_path = '' as $$
  select case
    when e.deleted_at is not null then 'silinib'
    when not e.published then 'gizli'
    when (e.starts_at at time zone 'Asia/Baku')::date = (now() at time zone 'Asia/Baku')::date
         or (e.starts_at <= now() and e.starts_at > now() - interval '6 hours') then 'bu_gun'
    when e.starts_at > now() then 'gelecek'
    when e.starts_at >= now() - interval '30 days' then 'kecib'
    else 'arxiv'
  end;
$$;
revoke all on function public.merhele(public.events) from public, anon;
grant execute on function public.merhele(public.events) to authenticated, service_role;

-- ===================================================================
-- 4) Vəziyyət hesabatı — yalnız admin, yalnız OXUYUR
--    Tədbirdən əvvəl bir sorğu ilə hər şey: görüşlər, kartlar, albom, giriş, şəkillər, ehtiyat, Drive.
-- ===================================================================
create or replace function public.veziyyet_hesabati()
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  r json; x text[] := '{}';
  acik_albom int; icazesiz_sayt int; kohne_sekil int; son_nusxe timestamptz;
  g gizli.google%rowtype; gozleyen_drive int;
  ev record;
begin
  if not public.is_admin() then raise exception 'icaze'; end if;

  select count(*) into acik_albom from public.events e where e.album_open and e.deleted_at is null;
  select count(*) into icazesiz_sayt from public.photos p where p.on_site and not p.consent;
  select count(*) into kohne_sekil from public.photos p
    where p.downloaded_at is null and p.drive_id is null and not p.on_site and p.created_at < now() - interval '30 days';
  select max(created_at) into son_nusxe from ehtiyat.nusxe;
  select * into g from gizli.google where id = 1;
  select count(*) into gozleyen_drive from public.photos p where p.consent and p.drive_id is null and p.event_id is not null;

  -- Xəbərdarlıqlar (boşdursa — hər şey qaydasındadır)
  if acik_albom > 1 then x := x || ('Eyni anda ' || acik_albom || ' albom açıqdır — biri bağlanmalıdır.'); end if;
  if icazesiz_sayt > 0 then x := x || (icazesiz_sayt || ' icazəsiz şəkil saytdadır.'); end if;
  if kohne_sekil > 0 then x := x || (kohne_sekil || ' şəkil 30 gündən çoxdur ki, nə endirilib, nə Drive-a köçüb.'); end if;
  if son_nusxe is null or son_nusxe < now() - interval '36 hours' then x := x || 'Son ehtiyat nüsxəsi 36 saatdan köhnədir.'::text; end if;
  if g.refresh_token is null then x := x || 'Google Drive qoşulmayıb.'::text;
  elsif coalesce(g.son_xeta, '') <> '' then x := x || ('Google Drive xətası: ' || left(g.son_xeta, 120)); end if;
  if gozleyen_drive > 0 and g.refresh_token is not null then
    if exists (select 1 from public.photos p where p.consent and p.drive_id is null and p.event_id is not null and p.created_at < now() - interval '2 hours') then
      x := x || (gozleyen_drive || ' şəkil 2 saatdan çoxdur ki, Drive-a köçmür.');
    end if;
  end if;
  for ev in
    select e.*, public.merhele(e) m from public.events e
    where e.deleted_at is null and e.published and public.merhele(e) in ('gelecek', 'bu_gun')
  loop
    if ev.time_tbd and ev.starts_at < now() + interval '7 days' then
      x := x || (to_char(ev.starts_at at time zone 'Asia/Baku', 'DD.MM') || ' görüşünün saatı hələ yazılmayıb.');
    end if;
    if ev.m = 'bu_gun' and not ev.door_active then
      x := x || (to_char(ev.starts_at at time zone 'Asia/Baku', 'DD.MM') || ' görüşü bu gündür, girişdə QR oxutmaq hələ açılmayıb.');
    end if;
    if ev.m = 'bu_gun' and not ev.album_open then
      x := x || (to_char(ev.starts_at at time zone 'Asia/Baku', 'DD.MM') || ' görüşü bu gündür, albom hələ açılmayıb.');
    end if;
  end loop;

  select json_build_object(
    'vaxt', now(),
    'xeberdarliqlar', to_json(x),
    'gorusler', coalesce((
      select json_agg(json_build_object(
        'id', e.id,
        'ad', to_char(e.starts_at at time zone 'Asia/Baku', 'DD.MM.YYYY') || ' - ' || coalesce(e.guest_name, e.title),
        'tarix', e.starts_at,
        'merhele', public.merhele(e),
        'saat_belli', not e.time_tbd,
        'albom_acik', e.album_open,
        'giris_acik', e.door_active,
        'kartlar', (select json_build_object(
            'cemi', count(*),
            'etibarli', count(*) filter (where not t.revoked),
            'gelib', count(*) filter (where not t.revoked and t.checked_in_at is not null),
            'gozlenilir', count(*) filter (where not t.revoked and t.checked_in_at is null),
            'legv', count(*) filter (where t.revoked),
            'legv_amma_gelib', count(*) filter (where t.revoked and t.checked_in_at is not null))
          from public.tickets t where t.event_id = e.id),
        'sekiller', (select coalesce(json_object_agg(v, n), '{}'::json) from (
            select public.veziyyet(p) v, count(*) n from public.photos p where p.event_id = e.id group by 1) s),
        'reyler', (select json_build_object('say', count(*), 'orta', round(avg(f.rating)::numeric, 1))
          from public.feedback f where f.event_id = e.id)
      ) order by e.starts_at desc)
      from public.events e where e.deleted_at is null), '[]'::json),
    'silinen_gorus', (select count(*) from public.events e where e.deleted_at is not null),
    'sekiller', (select coalesce(json_object_agg(v, n), '{}'::json) from (
        select public.veziyyet(p) v, count(*) n from public.photos p group by 1) s),
    'ehtiyat', json_build_object('son', son_nusxe,
        'say', (select count(*) from ehtiyat.nusxe),
        'son_sayi', (select x2.sayi from ehtiyat.nusxe x2 order by x2.created_at desc limit 1)),
    'drive', json_build_object('qosulub', g.refresh_token is not null, 'yenilenib', g.yenilenib,
        'xeta', nullif(g.son_xeta, ''), 'gozleyen', gozleyen_drive),
    'adminler', (select json_build_object('aktiv', count(*) filter (where a.active), 'cixarilib', count(*) filter (where not a.active))
        from public.admins a)
  ) into r;
  return r;
end; $$;
revoke all on function public.veziyyet_hesabati() from public, anon;
grant execute on function public.veziyyet_hesabati() to authenticated;
