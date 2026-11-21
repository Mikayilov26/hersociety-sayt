-- HER Society — rəyləri saytda yayımlamaq (21 noyabr 2026). Bazaya tətbiq olunub.
-- YALNIZ ƏLAVƏ: feedback.published / published_at sütunları, rey_yayimla() (yalnız admin), derc_reyler() (hamı oxuyur:
-- yalnız seçilmiş rəylərin "Xoşa gələn" mətni, ad, qiymət — "Növbəti dəfə" sütunu saytda göstərilmir). Heç bir sətir silinmir.
-- Admin → Statistika → görüş → "Rəyləri oxu" → "Saytda göstər / Saytdan götür". Saytda: ana səhifə, "Süfrə arxasından sözlər".
-- Eyni gün: albom səhifəsində rəy forması üçün QR şərti götürüldü — admin "Rəyi aç" basıbsa, linklə gələn də görür.
alter table public.feedback add column if not exists published boolean not null default false;
alter table public.feedback add column if not exists published_at timestamptz;
-- funksiyaların mətni: Supabase miqrasiyası "08_rey_yayimla"
