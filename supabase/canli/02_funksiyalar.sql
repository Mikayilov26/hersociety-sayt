-- HER Society — canlı bazadakı bütün funksiyalar (Supabase layihəsi bxykddiqsxwnwfrgnutm)
-- Bu fayl canlı bazadan birə-bir köçürülüb (8 noyabr 2026). Tək həqiqət mənbəyi: bu fayl + 05_veziyyetler.sql.
-- Funksiyalar "create or replace" ilə yazılıb: yenidən işə salmaq məlumata toxunmur.
-- Qeyd: ehtiyat.al() yalnız köhnə EHTİYAT NÜSXƏLƏRİNİ limitə görə təmizləyir (30 gündəlik / 12 aylıq / 20 əl ilə).

-- ======================= ehtiyat =======================

CREATE OR REPLACE FUNCTION ehtiyat.al(n text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d jsonb := ehtiyat.canli(); v text := n; yeni bigint;
begin
  if v = 'gunluk' and not exists (select 1 from ehtiyat.nusxe x where x.novu = 'ayliq' and date_trunc('month', x.created_at at time zone 'Asia/Baku') = date_trunc('month', now() at time zone 'Asia/Baku')) then
    v := 'ayliq';
  end if;
  insert into ehtiyat.nusxe (novu, olcu, sayi, data)
  values (v, length(d::text), jsonb_build_object(
      'gorus', jsonb_array_length(d->'events'), 'kart', jsonb_array_length(d->'tickets'),
      'sekil', jsonb_array_length(d->'photos'), 'rey', jsonb_array_length(d->'feedback')), d)
  returning id into yeni;
  delete from ehtiyat.nusxe where novu = 'gunluk' and id not in (select id from ehtiyat.nusxe where novu = 'gunluk' order by created_at desc limit 30);
  delete from ehtiyat.nusxe where novu = 'ayliq' and id not in (select id from ehtiyat.nusxe where novu = 'ayliq' order by created_at desc limit 12);
  delete from ehtiyat.nusxe where novu = 'el' and id not in (select id from ehtiyat.nusxe where novu = 'el' order by created_at desc limit 20);
  return yeni;
end; $function$
;

CREATE OR REPLACE FUNCTION ehtiyat.canli()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'versiya', 1,
    'vaxt', now(),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.starts_at) from public.events e), '[]'::jsonb),
    'tickets', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at) from public.tickets t), '[]'::jsonb),
    'photos', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.photos p), '[]'::jsonb),
    'feedback', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.feedback f), '[]'::jsonb),
    'admins', coalesce((select jsonb_agg(jsonb_build_object('email', a.email, 'super', a.super, 'active', a.active)) from public.admins a), '[]'::jsonb)
  );
$function$
;

-- Silinən görüş 30 gündən sonra birdəfəlik silinir — yalnız şəkli YOXDURSA.
CREATE OR REPLACE FUNCTION ehtiyat.temizle()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  delete from public.events e where e.deleted_at < now() - interval '30 days'
    and not exists (select 1 from public.photos p where p.event_id = e.id);
$function$
;

-- ======================= adminlər =======================

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.admins a where a.active and a.email = lower(coalesce(auth.jwt() ->> 'email', '')))
     and (
       coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
       or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
     );
$function$
;

CREATE OR REPLACE FUNCTION public.is_super()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.is_admin() and exists (select 1 from public.admins a where a.super and a.email = lower(coalesce(auth.jwt() ->> 'email', '')));
$function$
;

CREATE OR REPLACE FUNCTION public.mvq_sifre()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare alfa text := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'; s text := ''; i int;
begin
  for i in 1..12 loop s := s || substr(alfa, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alfa)), 1); end loop;
  return 'Her-' || s || '7';
end; $function$
;

CREATE OR REPLACE FUNCTION public.admin_elave_et(yeni_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare em text := lower(btrim(coalesce(yeni_email, ''))); uid uuid; sifre text;
begin
  if not public.is_super() then raise exception 'icaze yoxdur'; end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'email duz deyil'; end if;
  sifre := public.mvq_sifre();
  select id into uid from auth.users where lower(email) = em;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em,
      extensions.crypt(sifre, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
  else
    update auth.users set encrypted_password = extensions.crypt(sifre, extensions.gen_salt('bf')), banned_until = null, updated_at = now() where id = uid;
    update auth.refresh_tokens set revoked = true where user_id = uid::text;
  end if;
  insert into public.admins (email, active, must_change) values (em, true, true)
    on conflict (email) do update set active = true, must_change = true;
  return sifre;
end; $function$
;

CREATE OR REPLACE FUNCTION public.admin_cixar(hedef text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare em text := lower(btrim(coalesce(hedef, ''))); uid uuid;
begin
  if not public.is_super() then raise exception 'icaze yoxdur'; end if;
  if em = lower(coalesce(auth.jwt() ->> 'email', '')) then raise exception 'ozunu cixara bilmez'; end if;
  if exists (select 1 from public.admins where email = em and super) then raise exception 'bas admin'; end if;
  update public.admins set active = false where email = em;
  select id into uid from auth.users where lower(email) = em;
  if uid is not null then
    update auth.users set banned_until = 'infinity', updated_at = now() where id = uid;
    update auth.refresh_tokens set revoked = true where user_id = uid::text;
  end if;
end; $function$
;

CREATE OR REPLACE FUNCTION public.admin_sifre_sifirla(hedef text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  alfa text := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  sifre text := '';
  i int;
  uid uuid;
begin
  if not public.is_super() then raise exception 'icaze yoxdur'; end if;
  if not exists (select 1 from public.admins where email = lower(hedef)) then raise exception 'admin deyil'; end if;
  select id into uid from auth.users where lower(email) = lower(hedef);
  if uid is null then raise exception 'hesab yoxdur'; end if;
  for i in 1..12 loop
    sifre := sifre || substr(alfa, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alfa)), 1);
  end loop;
  sifre := 'Her-' || sifre || '7';
  update auth.users set encrypted_password = extensions.crypt(sifre, extensions.gen_salt('bf')), updated_at = now() where id = uid;
  update auth.refresh_tokens set revoked = true where user_id = uid::text;
  update auth.mfa_factors set status = 'unverified', friendly_name = coalesce(friendly_name, 'kohne') || '-sifirlandi-' || extract(epoch from now())::bigint where user_id = uid;
  update public.admins set must_change = true where email = lower(hedef);
  return sifre;
end; $function$
;

CREATE OR REPLACE FUNCTION public.admin_mfa_veziyyeti()
 RETURNS TABLE(email text, mfa boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select a.email, exists (select 1 from auth.users u join auth.mfa_factors f on f.user_id = u.id where lower(u.email) = a.email and f.status = 'verified')
  from public.admins a where public.is_super();
$function$
;

CREATE OR REPLACE FUNCTION public.sifre_deyisdi()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  update public.admins set must_change = false where email = lower(coalesce(auth.jwt() ->> 'email', ''));
$function$
;

-- ======================= albom və şəkillər =======================

CREATE OR REPLACE FUNCTION public.album_acikdir(ev text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.events e where e.id::text = ev and e.album_open and e.published)
     and (select count(*) from public.photos p where p.event_id::text = ev) < 3000;
$function$
;

-- Anbara fayl gələndə şəkil qeydi yaranır (kiçik surətlər qeyd olunmur)
CREATE OR REPLACE FUNCTION public.albom_fayl_geldi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  hisseler text[] := storage.foldername(new.name);
  fayl text := storage.filename(new.name);
begin
  if new.bucket_id <> 'albom' or coalesce(array_length(hisseler, 1), 0) <> 1 then
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
$function$
;

CREATE OR REPLACE FUNCTION public.albom_fayl_yenilendi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.bucket_id = 'albom' and (new.metadata ->> 'size') is not null then
    update public.photos set size_bytes = (new.metadata ->> 'size')::bigint where path = new.name and size_bytes is null;
  end if;
  return new;
end;
$function$
;

-- Köhnə (8 noyabra qədər) icazə qeydi. Yeni sayt albom_icaze() işlədir; bu, köhnə yaddaşdakı səhifələr üçün qalır.
CREATE OR REPLACE FUNCTION public.albom_qeyd(yol text, ad text, razilik boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not razilik then
    raise exception 'razilik lazimdir';
  end if;
  update public.photos p
     set uploader = nullif(left(btrim(coalesce(ad, '')), 80), ''),
         consent = true,
         consent_at = now()
   where p.path = yol
     and p.created_at > now() - interval '30 minutes'
     and p.consent_at is null
     and public.album_acikdir(split_part(yol, '/', 1));
end;
$function$
;

-- ======================= dəvət kartları və giriş =======================

CREATE OR REPLACE FUNCTION public.devet_bax(acar text)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select json_build_object('name', t.name, 'num', t.num, 'revoked', t.revoked,
    'event', json_build_object('title', e.title, 'topic', e.topic, 'guest_name', e.guest_name, 'guest_title', e.guest_title,
      'starts_at', e.starts_at, 'time_tbd', e.time_tbd, 'venue', e.venue, 'venue_detail', e.venue_detail, 'card_note', e.card_note, 'map_url', e.map_url))
  from public.tickets t join public.events e on e.id = t.event_id
  where t.secret = acar and length(acar) >= 20;
$function$
;

CREATE OR REPLACE FUNCTION public.giris_kodu_duzdur(ev uuid, kod text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.events e where e.id = ev and e.door_active and e.door_code_hash is not null
    and e.door_code_hash = extensions.crypt(lower(btrim(coalesce(kod, ''))), e.door_code_hash));
$function$
;

CREATE OR REPLACE FUNCTION public.giris_kodu_qoy(ev uuid, kod text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_admin() then raise exception 'icaze yoxdur'; end if;
  kod := lower(btrim(coalesce(kod, '')));
  if length(kod) < 6 or kod !~ '[a-zəğıöşüç]' or kod !~ '[0-9]' then raise exception 'kod zeifdir'; end if;
  update public.events set door_code_hash = extensions.crypt(kod, extensions.gen_salt('bf', 10)), door_active = true where id = ev;
end; $function$
;

CREATE OR REPLACE FUNCTION public.giris_sondur(ev uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_admin() then raise exception 'icaze yoxdur'; end if;
  update public.events set door_active = false where id = ev;
end; $function$
;

CREATE OR REPLACE FUNCTION public.giris_ac(ev uuid, kod text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r json;
begin
  if not public.giris_kodu_duzdur(ev, kod) then return null; end if;
  select json_build_object(
    'event', (select json_build_object('id', e.id, 'title', e.title, 'topic', e.topic, 'starts_at', e.starts_at, 'time_tbd', e.time_tbd, 'venue', e.venue) from public.events e where e.id = ev),
    'list', coalesce((select json_agg(json_build_object('id', t.id, 'code', t.code, 'num', t.num, 'name', t.name,
        'h', encode(extensions.digest(t.secret, 'sha256'), 'hex'), 'revoked', t.revoked, 'in', t.checked_in_at) order by t.num)
      from public.tickets t where t.event_id = ev), '[]'::json),
    'now', now()
  ) into r;
  return r;
end; $function$
;

-- Cavab: ok / artiq / legv / yoxdur / kod (kod = giriş söndürülüb və ya kod dəyişib)
CREATE OR REPLACE FUNCTION public.giris_qeyd(ev uuid, kod text, acar text, usul text, vaxt timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.tickets%rowtype; v timestamptz;
begin
  if not public.giris_kodu_duzdur(ev, kod) then return json_build_object('status', 'kod'); end if;
  select * into t from public.tickets x where x.event_id = ev and (x.secret = acar or x.code = upper(acar) or x.id::text = acar) limit 1;
  if not found then return json_build_object('status', 'yoxdur'); end if;
  if t.revoked then return json_build_object('status', 'legv', 'name', t.name, 'num', t.num); end if;
  if t.checked_in_at is not null then return json_build_object('status', 'artiq', 'name', t.name, 'num', t.num, 'in', t.checked_in_at); end if;
  v := least(coalesce(vaxt, now()), now());
  update public.tickets set checked_in_at = v, checked_in_via = left(coalesce(usul, 'qr'), 20) where id = t.id;
  return json_build_object('status', 'ok', 'name', t.name, 'num', t.num, 'in', v, 'id', t.id);
end; $function$
;

CREATE OR REPLACE FUNCTION public.giris_geri(ev uuid, kod text, bilet uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.giris_kodu_duzdur(ev, kod) then return false; end if;
  update public.tickets set checked_in_at = null, checked_in_via = null where id = bilet and event_id = ev;
  return true;
end; $function$
;

-- ======================= rəy forması =======================

CREATE OR REPLACE FUNCTION public.rey_gonder(ev uuid, qiymet integer, xos text, arzu text, ad text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare x text := nullif(left(btrim(coalesce(xos, '')), 1000), '');
        a text := nullif(left(btrim(coalesce(arzu, '')), 1000), '');
        n text := nullif(left(btrim(coalesce(ad, '')), 80), '');
begin
  if qiymet is not null and (qiymet < 1 or qiymet > 5) then raise exception 'qiymet'; end if;
  if qiymet is null and x is null and a is null then raise exception 'bos'; end if;
  if not exists (
    select 1 from public.events e
    where e.id = ev and e.published
      and e.starts_at <= now() + interval '12 hours'
      and e.starts_at >= now() - interval '30 days'
  ) then raise exception 'vaxt'; end if;
  if (select count(*) from public.feedback f where f.event_id = ev) >= 500 then raise exception 'limit'; end if;
  insert into public.feedback (event_id, rating, liked, wish, name) values (ev, qiymet, x, a, n);
  return true;
end; $function$
;

-- ======================= ehtiyat nüsxələri (admin) =======================

CREATE OR REPLACE FUNCTION public.ehtiyat_data(nid bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_admin() then raise exception 'icaze'; end if;
  if nid is null then return ehtiyat.canli(); end if;
  return (select x.data from ehtiyat.nusxe x where x.id = nid);
end; $function$
;

CREATE OR REPLACE FUNCTION public.ehtiyat_indi()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare i bigint;
begin
  if not public.is_admin() then raise exception 'icaze'; end if;
  i := ehtiyat.al('el');
  return (select json_build_object('id', x.id, 'vaxt', x.created_at, 'novu', x.novu, 'olcu', x.olcu, 'sayi', x.sayi) from ehtiyat.nusxe x where x.id = i);
end; $function$
;

CREATE OR REPLACE FUNCTION public.ehtiyat_servis()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select ehtiyat.canli(); $function$
;

CREATE OR REPLACE FUNCTION public.ehtiyat_siyahi()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_admin() then raise exception 'icaze'; end if;
  return coalesce((select json_agg(json_build_object('id', x.id, 'vaxt', x.created_at, 'novu', x.novu, 'olcu', x.olcu, 'sayi', x.sayi) order by x.created_at desc) from ehtiyat.nusxe x), '[]'::json);
end; $function$
;

-- ======================= Google / Drive =======================

CREATE OR REPLACE FUNCTION public.google_al()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select to_jsonb(g) from gizli.google g where g.id = 1;
$function$
;

CREATE OR REPLACE FUNCTION public.google_ayar_saxla(cid text, csec text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_admin() then raise exception 'icaze'; end if;
  if coalesce(btrim(cid), '') !~ '\.apps\.googleusercontent\.com$' then raise exception 'client_id'; end if;
  if length(coalesce(btrim(csec), '')) < 10 then raise exception 'client_secret'; end if;
  insert into gizli.google (id, client_id, client_secret) values (1, btrim(cid), btrim(csec))
  on conflict (id) do update set client_id = excluded.client_id, client_secret = excluded.client_secret,
    refresh_token = null, email = null, qosulub = null, son_xeta = null;
end; $function$
;

CREATE OR REPLACE FUNCTION public.google_ayir()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_admin() then raise exception 'icaze'; end if;
  update gizli.google set refresh_token = null, email = null, qosulub = null where id = 1;
end; $function$
;

CREATE OR REPLACE FUNCTION public.google_state_yarat(st text, kim text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  delete from gizli.google_state where created_at < now() - interval '1 hour';
  insert into gizli.google_state (state, admin) values (st, kim);
$function$
;

CREATE OR REPLACE FUNCTION public.google_state_yoxla(st text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ok boolean;
begin
  delete from gizli.google_state where state = st and created_at > now() - interval '15 minutes' returning true into ok;
  return coalesce(ok, false);
end; $function$
;

CREATE OR REPLACE FUNCTION public.google_veziyyet()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare g gizli.google%rowtype;
begin
  if not public.is_admin() then raise exception 'icaze'; end if;
  select * into g from gizli.google where id = 1;
  return json_build_object('client', g.client_id is not null, 'client_son', right(coalesce(g.client_id, ''), 40),
    'qosulub', g.refresh_token is not null, 'email', g.email, 'tarix', g.qosulub,
    'istifade', g.istifade, 'limit', g.hecm_limit, 'yenilenib', g.yenilenib, 'xeta', g.son_xeta);
end; $function$
;

CREATE OR REPLACE FUNCTION public.google_yaz(d jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update gizli.google set
    refresh_token = case when d ? 'refresh_token' then d->>'refresh_token' else refresh_token end,
    email = case when d ? 'email' then d->>'email' else email end,
    kok_qovluq = case when d ? 'kok_qovluq' then d->>'kok_qovluq' else kok_qovluq end,
    sekil_qovluq = case when d ? 'sekil_qovluq' then d->>'sekil_qovluq' else sekil_qovluq end,
    ehtiyat_qovluq = case when d ? 'ehtiyat_qovluq' then d->>'ehtiyat_qovluq' else ehtiyat_qovluq end,
    qosulub = case when d ? 'qosulub' then (d->>'qosulub')::timestamptz else qosulub end,
    istifade = case when d ? 'istifade' then (d->>'istifade')::bigint else istifade end,
    hecm_limit = case when d ? 'limit' then (d->>'limit')::bigint else hecm_limit end,
    yenilenib = case when d ? 'yenilenib' then (d->>'yenilenib')::timestamptz else yenilenib end,
    son_xeta = case when d ? 'son_xeta' then d->>'son_xeta' else son_xeta end
  where id = 1;
end; $function$
;

-- ======================= Supabase-in öz köməkçisi =======================

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;
