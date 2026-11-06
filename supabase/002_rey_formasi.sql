-- Qonaq rəyləri (albom səhifəsindəki sorğu). Supabase-də "rey_formasi" adı ilə tətbiq olunub.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  liked text check (length(liked) <= 1000),
  wish text check (length(wish) <= 1000),
  name text check (length(name) <= 80),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
create index if not exists feedback_event_idx on public.feedback(event_id, created_at desc);
revoke all on public.feedback from anon, authenticated;
grant select, delete on public.feedback to authenticated;
create policy "rey oxu" on public.feedback for select to authenticated using (public.is_admin());
create policy "rey sil" on public.feedback for delete to authenticated using (public.is_admin());
-- rey_gonder(ev, qiymet, xos, arzu, ad): yalnız dərc olunmuş, görüş günündən 30 gün ərzində olan görüşə; hər görüşə ən çox 500 rəy.

-- 6 noyabr: sekil_esas_noqte — saytdakı kvadrat görünüş üçün mövqe (faizlə)
-- alter table public.photos add column focus_x real check (focus_x between 0 and 100), add column focus_y real check (focus_y between 0 and 100);
-- grant select (focus_x, focus_y) on public.photos to anon;  -- sayt mövqeyi oxuya bilsin (cədvəldə sütun səviyyəsində icazə var)

-- 6 noyabr: saat_sonra_aciqlanacaq — events.time_tbd (saat hələ bəlli deyil); devet_bax və giris_ac time_tbd qaytarır

-- 6 noyabr: ehtiyat_nusxe_sistemi — events.deleted_at (30 gün silinənlər), ehtiyat sxemi (API-yə bağlı):
--   ehtiyat.nusxe (gündəlik 30, aylıq 12, əl ilə 20), ehtiyat.canli/al/temizle;
--   public.ehtiyat_siyahi / ehtiyat_indi / ehtiyat_data (yalnız admin);
--   pg_cron: 'ehtiyat-gunluk' 00:00 UTC (04:00 Bakı), 'silinenleri-temizle' 00:20 UTC.
-- Bərpa: select data from ehtiyat.nusxe where id = … → lazım olan sətirləri geri yaz.
