-- HER Society — Büdcə bölməsi (25 noyabr 2026)
-- Məkanlar, onların menyuları və hesablamalar. Yalnız adminlər görür və dəyişir.
-- SİLMƏ YOXDUR: heç bir cədvəldə delete icazəsi verilmir, köhnələr "arxiv" olur.
-- Hesablamanın hər dəyişikliyindən əvvəlki vəziyyət tarixçəyə yazılır.

create table if not exists public.budce_mekanlar (
  id uuid primary key default gen_random_uuid(),
  ad text not null check (length(btrim(ad)) between 1 and 120),
  servis_faiz numeric(5,2) not null default 0 check (servis_faiz between 0 and 100),  -- menyu qiymətinə daxil deyilsə
  min_mebleg numeric(10,2) not null default 0 check (min_mebleg >= 0),               -- minimum xərc (depozit)
  qeyd text,
  arxiv boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budce_menyular (
  id uuid primary key default gen_random_uuid(),
  mekan_id uuid not null references public.budce_mekanlar(id) on delete restrict,
  ad text not null check (length(btrim(ad)) between 1 and 120),
  qiymet numeric(10,2) not null check (qiymet >= 0),   -- adambaşı, AZN
  terkib text,                                          -- nə daxildir (istəyə bağlı)
  arxiv boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists budce_menyular_mekan on public.budce_menyular(mekan_id);

create table if not exists public.budce_hesablar (
  id uuid primary key default gen_random_uuid(),
  ad text not null check (length(btrim(ad)) between 1 and 120),
  event_id uuid references public.events(id) on delete set null,   -- görüş hələ yoxdursa boş
  mekan_id uuid references public.budce_mekanlar(id) on delete restrict,
  data jsonb not null default '{}'::jsonb,   -- menyu sayları, qruplar, xərclər, haqq, sponsor
  arxiv boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists public.budce_tarixce (
  id bigint generated always as identity primary key,
  hesab_id uuid not null references public.budce_hesablar(id) on delete restrict,
  evvelki jsonb not null,                    -- dəyişiklikdən əvvəlki bütün sətir
  created_at timestamptz not null default now(),
  kim text
);
create index if not exists budce_tarixce_hesab on public.budce_tarixce(hesab_id, created_at desc);

-- updated_at + kim dəyişdi + tarixçə
create or replace function public.budce_yenilendi() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  new.updated_at := now();
  if tg_table_name = 'budce_hesablar' then
    new.updated_by := lower(coalesce(auth.jwt() ->> 'email', ''));
    if tg_op = 'UPDATE' then
      insert into public.budce_tarixce (hesab_id, evvelki, kim) values (old.id, to_jsonb(old), new.updated_by);
    end if;
  end if;
  return new;
end; $$;
revoke execute on function public.budce_yenilendi() from public, anon, authenticated;

drop trigger if exists budce_mekan_yeni on public.budce_mekanlar;
create trigger budce_mekan_yeni before update on public.budce_mekanlar for each row execute function public.budce_yenilendi();
drop trigger if exists budce_menyu_yeni on public.budce_menyular;
create trigger budce_menyu_yeni before update on public.budce_menyular for each row execute function public.budce_yenilendi();
drop trigger if exists budce_hesab_yeni on public.budce_hesablar;
create trigger budce_hesab_yeni before insert or update on public.budce_hesablar for each row execute function public.budce_yenilendi();

-- İcazələr: yalnız adminlər; silmə yoxdur
alter table public.budce_mekanlar enable row level security;
alter table public.budce_menyular enable row level security;
alter table public.budce_hesablar enable row level security;
alter table public.budce_tarixce enable row level security;

revoke all on public.budce_mekanlar, public.budce_menyular, public.budce_hesablar, public.budce_tarixce from anon;
revoke delete, truncate on public.budce_mekanlar, public.budce_menyular, public.budce_hesablar, public.budce_tarixce from authenticated;
revoke insert, update on public.budce_tarixce from authenticated;

drop policy if exists "budce mekan oxu" on public.budce_mekanlar;
create policy "budce mekan oxu" on public.budce_mekanlar for select to authenticated using (public.is_admin());
drop policy if exists "budce mekan elave" on public.budce_mekanlar;
create policy "budce mekan elave" on public.budce_mekanlar for insert to authenticated with check (public.is_admin());
drop policy if exists "budce mekan deyis" on public.budce_mekanlar;
create policy "budce mekan deyis" on public.budce_mekanlar for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "budce menyu oxu" on public.budce_menyular;
create policy "budce menyu oxu" on public.budce_menyular for select to authenticated using (public.is_admin());
drop policy if exists "budce menyu elave" on public.budce_menyular;
create policy "budce menyu elave" on public.budce_menyular for insert to authenticated with check (public.is_admin());
drop policy if exists "budce menyu deyis" on public.budce_menyular;
create policy "budce menyu deyis" on public.budce_menyular for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "budce hesab oxu" on public.budce_hesablar;
create policy "budce hesab oxu" on public.budce_hesablar for select to authenticated using (public.is_admin());
drop policy if exists "budce hesab elave" on public.budce_hesablar;
create policy "budce hesab elave" on public.budce_hesablar for insert to authenticated with check (public.is_admin());
drop policy if exists "budce hesab deyis" on public.budce_hesablar;
create policy "budce hesab deyis" on public.budce_hesablar for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "budce tarixce oxu" on public.budce_tarixce;
create policy "budce tarixce oxu" on public.budce_tarixce for select to authenticated using (public.is_admin());

-- Gecəlik ehtiyat nüsxəsinə büdcə də daxil olsun
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
    'admins', coalesce((select jsonb_agg(jsonb_build_object('email', a.email, 'super', a.super, 'active', a.active)) from public.admins a), '[]'::jsonb),
    'budce_mekanlar', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at) from public.budce_mekanlar m), '[]'::jsonb),
    'budce_menyular', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at) from public.budce_menyular m), '[]'::jsonb),
    'budce_hesablar', coalesce((select jsonb_agg(to_jsonb(h) order by h.created_at) from public.budce_hesablar h), '[]'::jsonb)
  );
$function$;
