-- HER Society — canlı bazanın cədvəlləri (8 noyabr 2026, canlı bazadan köçürülüb)
-- SƏNƏD KİMİDİR: "if not exists" ilə yazılıb, mövcud cədvəllərə və məlumata toxunmur.
-- Sxemlər: public (sayt), gizli (Google açarları — API-yə bağlı), ehtiyat (nüsxələr — API-yə bağlı).

-- ---------- public.admins ----------
create table if not exists public.admins (
  email text primary key,
  super boolean not null default false,       -- baş admin
  must_change boolean not null default false,  -- müvəqqəti şifrə ilə girib, öz şifrəsini qoymalıdır
  active boolean not null default true         -- false = çıxarılıb (auth-da da banlanır)
);

-- ---------- public.events (görüşlər) ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Çay Süfrəsi',
  topic text,
  guest_name text,
  guest_title text,
  starts_at timestamptz not null,
  venue text,
  album_open boolean not null default false,  -- albom şəkil qəbul edir (eyni anda bir görüş)
  published boolean not null default true,   -- false = gizli (saytda görünmür)
  created_at timestamptz not null default now(),
  venue_detail text,
  card_note text,
  door_code_hash text,                        -- giriş kodu (bcrypt)
  door_active boolean not null default false, -- girişdə QR oxutmaq açıqdır
  map_url text check (map_url is null or map_url ~* '^https://'),
  time_tbd boolean not null default false,    -- saat hələ bəlli deyil
  deleted_at timestamptz,                     -- silinib (30 gün geri qaytarmaq olar)
  drive_qovluq text                           -- Google Drive-dakı şəkil qovluğu
);

-- ---------- public.tickets (dəvət kartları) ----------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  num integer not null check (num between 1 and 9999),
  name text not null check (length(btrim(name)) between 1 and 80),
  code text not null check (code ~ '^[A-Z0-9]{6}$'),
  secret text not null unique check (length(secret) >= 20), -- QR-dakı açar
  revoked boolean not null default false,
  checked_in_at timestamptz,
  checked_in_via text,
  created_by text,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);
create index if not exists tickets_event_idx on public.tickets (event_id, num);

-- ---------- public.photos (albom şəkilləri) ----------
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
  created_at timestamptz not null default now(),
  uploader text,
  consent boolean not null default false,
  consent_at timestamptz,
  focus_x real check (focus_x between 0 and 100),
  focus_y real check (focus_y between 0 and 100),
  drive_id text
);
create index if not exists photos_event_idx on public.photos (event_id, created_at desc);
-- Şəklin vəziyyəti və "icazəsiz sayta çıxmaz" qaydası: 05_veziyyetler.sql

-- ---------- public.feedback (rəylər) ----------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  liked text check (length(liked) <= 1000),
  wish text check (length(wish) <= 1000),
  name text check (length(name) <= 80),
  created_at timestamptz not null default now()
);
create index if not exists feedback_event_idx on public.feedback (event_id, created_at desc);

-- ---------- gizli.google (Google Drive qoşulması) ----------
create table if not exists gizli.google (
  id integer primary key default 1 check (id = 1),
  client_id text,
  client_secret text,
  refresh_token text,
  email text,
  kok_qovluq text,
  sekil_qovluq text,
  ehtiyat_qovluq text,
  qosulub timestamptz,
  istifade bigint,
  hecm_limit bigint,
  yenilenib timestamptz,
  son_xeta text,
  cron_acar text default encode(gen_random_bytes(24), 'hex')
);
create table if not exists gizli.google_state (
  state text primary key,
  created_at timestamptz not null default now(),
  admin text
);

-- ---------- ehtiyat.nusxe (ehtiyat nüsxələri) ----------
create table if not exists ehtiyat.nusxe (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  novu text not null check (novu in ('gunluk', 'ayliq', 'el')),
  olcu integer not null,
  sayi jsonb not null,
  data jsonb not null
);

-- ---------- Anbar (Storage) ----------
-- albom: gizli, 30 MB, image/jpeg, image/png, image/webp
-- sayt:  ictimai, 5 MB, image/jpeg, image/webp

-- ---------- Triggerlər (storage.objects üzərində) ----------
-- create trigger albom_fayl_geldi after insert on storage.objects for each row execute function public.albom_fayl_geldi();
-- create trigger albom_fayl_yenilendi after update on storage.objects for each row execute function public.albom_fayl_yenilendi();
-- (Köhnə "albom_fayl_silindi" trigger-i artıq YOXDUR: anbardan fayl silmək şəkil qeydini avtomatik silmir.)
