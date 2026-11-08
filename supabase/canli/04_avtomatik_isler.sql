-- HER Society — avtomatik işlər (pg_cron), canlı bazadan köçürülüb (8 noyabr 2026)
-- Vaxtlar UTC-dir (Bakı = UTC+4). SƏNƏD KİMİDİR.

-- ehtiyat-gunluk       0 0 * * *     (04:00 Bakı)  select ehtiyat.al('gunluk')
-- silinenleri-temizle  20 0 * * *    (04:20 Bakı)  select ehtiyat.temizle()
-- drive-sekiller       */20 * * * *  (hər 20 dəq)
--   select net.http_post(
--     url := 'https://bxykddiqsxwnwfrgnutm.supabase.co/functions/v1/drive',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-acar', (select cron_acar from gizli.google where id = 1)),
--     body := '{"action":"sekiller"}'::jsonb, timeout_milliseconds := 150000)
--   where exists (select 1 from gizli.google where id = 1 and refresh_token is not null)
--     and exists (select 1 from public.photos where consent and drive_id is null and event_id is not null);
-- drive-ehtiyat        40 0 * * 1    (bazar ertəsi 04:40 Bakı)
--   eyni çağırış, body := '{"action":"ehtiyat"}', yalnız Google qoşulubsa.

-- Supabase-i oyaq saxlamaq: GitHub Actions (.github/workflows/oyaq-saxla.yml), hər 3 gündən bir.
