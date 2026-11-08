# Canlı baza — tək həqiqət mənbəyi

Bu qovluq Supabase-dəki (layihə `bxykddiqsxwnwfrgnutm`) canlı bazanın tam təsviridir. 8 noyabr 2026-da canlı bazadan köçürülüb; funksiyaların mətni bazadakı ilə md5 ilə yoxlanıb (35/35 eyni).

| Fayl | Nə var |
|---|---|
| `01_cedveller.sql` | Bütün cədvəllər, sütunlar, qaydalar (check), indekslər, anbar, trigger-lər |
| `02_funksiyalar.sql` | Bütün funksiyalar (giriş, kartlar, albom, rəy, adminlər, ehtiyat, Google) |
| `03_icazeler.sql` | Kim nəyi oxuya/yaza bilər (RLS, sütun icazələri, funksiya icazələri) |
| `04_avtomatik_isler.sql` | Gecə nüsxələri, Drive köçürmə, təmizlik (pg_cron) |
| `05_veziyyetler.sql` | Şəklin vəziyyəti, görüşün mərhələsi, icazə qeydi, vəziyyət hesabatı |
| `06_albom_bir_acik.sql` | Eyni anda yalnız bir açıq albom (bazada qayda) və `albom_ac()` |

Köhnə `001_quruluş.sql` və `002_rey_formasi.sql` tarixçə üçün qalır; hazırkı vəziyyət bu qovluqdadır.

## Vəziyyətlər (adlı)

- **Şəkil** — `veziyyet(photos)`: `icaze_gozleyir` → `hazir` → `drive` / `endirilib` → `saytda`. Qayda: icazəsiz şəkil sayta çıxa bilməz (`photos_sayt_ucun_icaze`).
- **Görüş** — `merhele(events)`: `gizli` | `silinib` | `gelecek` | `bu_gun` | `kecib` (30 gün) | `arxiv`.
- **Kart** — gözlənilir / gəlib / ləğv (ləğvdən əvvəl gəlmiş ola bilər — giriş qeydi saxlanır).
- **Giriş** — `door_active` + kod; giriş qeydi cavabları: `ok`, `artiq`, `legv`, `yoxdur`, `kod`.
- **Albom** — `albom_ac(ev, ac)`: `acildi` | `baglandi` | `gizli` | `silinib` | `tapilmadi`. Bazada qayda: eyni anda ən çox bir açıq albom (`events_yalniz_bir_acik_albom`).
- **Giriş telefonu (giris.js)** — internetsiz qeydlər telefonda növbədə qalır; növbədən yalnız serverin qəti cavabı ilə çıxır (ok/artiq/legv/yoxdur). `kod` cavabında qeydlər saxlanır, işçidən yeni kod soruşulur; yeni kodla giriş növbəni saxlayıb göndərir.
- **Qonağın icazəsi** — `albom_icaze()`: `ok`, `tapilmadi`, `vaxt`, `bagli`.

## Yoxlama

Admin → Statistika → "Sistem vəziyyəti" və ya `select public.veziyyet_hesabati();` (yalnız admin, yalnız oxuyur).

## Qayda

Bazada dəyişiklik edilən kimi bu qovluq da yenilənir. Məlumat silən əmr yazılmır; hər dəyişiklikdən əvvəl əl ilə ehtiyat nüsxəsi alınır.
