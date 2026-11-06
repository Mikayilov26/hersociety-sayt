// HER Society — Google Drive: şəkilləri orijinal keyfiyyətdə köçürmək və həftəlik ehtiyat nüsxəsi.
// Çağırış: pg_cron (x-acar başlığı ilə) və ya admin panel (admin JWT ilə).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-acar",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const URL_ = Deno.env.get("SUPABASE_URL")!;
const AYLAR = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];

function baku(iso: string) {
  const d = new Date(new Date(iso).getTime() + 4 * 3600e3);
  const p = (n: number) => String(n).padStart(2, "0");
  return { tarix: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`, saat: `${p(d.getUTCHours())}-${p(d.getUTCMinutes())}-${p(d.getUTCSeconds())}`,
    yazi: `${d.getUTCDate()} ${AYLAR[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}` };
}
function temizAd(s: string) { return s.replace(/[\\/:*?"<>|\n\r]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80); }

async function token(g: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: g.client_id, client_secret: g.client_secret, refresh_token: g.refresh_token, grant_type: "refresh_token" }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("token: " + (d.error || r.status));
  return d.access_token as string;
}
async function qovluq(at: string, ad: string, ana: string) {
  const r = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST", headers: { Authorization: "Bearer " + at, "Content-Type": "application/json" },
    body: JSON.stringify({ name: ad, mimeType: "application/vnd.google-apps.folder", parents: [ana] }),
  });
  const d = await r.json();
  if (!d.id) throw new Error("qovluq: " + JSON.stringify(d).slice(0, 200));
  return d.id as string;
}
async function yukle(at: string, meta: Record<string, unknown>, fayl: Blob, tip: string) {
  const serhed = "hs" + crypto.randomUUID().replace(/-/g, "");
  const bas = `--${serhed}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${serhed}\r\nContent-Type: ${tip}\r\n\r\n`;
  const body = new Blob([bas, fayl, `\r\n--${serhed}--`]);
  const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST", headers: { Authorization: "Bearer " + at, "Content-Type": "multipart/related; boundary=" + serhed }, body,
  });
  const d = await r.json();
  if (!d.id) throw new Error("yukle: " + JSON.stringify(d).slice(0, 200));
  return d.id as string;
}
async function yer(at: string) {
  const a = await (await fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota", { headers: { Authorization: "Bearer " + at } })).json();
  const q = a.storageQuota || {};
  return { istifade: +(q.usage || 0), limit: +(q.limit || 0) };
}

// ---------- şəkillər ----------
async function sekiller(srv: ReturnType<typeof createClient>, g: Record<string, string>, at: string) {
  const bas = Date.now();
  let kocdu = 0, xeta = 0;
  const qovluqlar: Record<string, string> = {};
  while (Date.now() - bas < 100000) {
    const { data: list } = await srv.from("photos").select("id,event_id,path,uploader,created_at")
      .eq("consent", true).is("drive_id", null).not("event_id", "is", null).order("created_at").limit(5);
    if (!list || !list.length) break;
    for (const s of list) {
      if (Date.now() - bas > 100000) break;
      try {
        let q = qovluqlar[s.event_id];
        if (!q) {
          const { data: ev } = await srv.from("events").select("id,title,guest_name,starts_at,drive_qovluq").eq("id", s.event_id).single();
          q = ev.drive_qovluq;
          if (q) {
            const r = await fetch("https://www.googleapis.com/drive/v3/files/" + q + "?fields=id,trashed", { headers: { Authorization: "Bearer " + at } });
            const d = r.ok ? await r.json() : null;
            if (!d || d.trashed) q = "";
          }
          if (!q) {
            q = await qovluq(at, temizAd(baku(ev.starts_at).tarix + " · " + (ev.guest_name || ev.title)), g.sekil_qovluq);
            await srv.from("events").update({ drive_qovluq: q }).eq("id", ev.id);
          }
          qovluqlar[s.event_id] = q;
        }
        const { data: blob, error } = await srv.storage.from("albom").download(s.path);
        if (error || !blob) throw new Error("download: " + (error?.message || ""));
        const uzanti = (s.path.split(".").pop() || "jpg").toLowerCase();
        const tip = uzanti === "png" ? "image/png" : uzanti === "webp" ? "image/webp" : "image/jpeg";
        const ad = temizAd((s.uploader || "Qonaq") + " · " + baku(s.created_at).saat + " · " + s.id.slice(0, 6)) + "." + uzanti;
        const id = await yukle(at, { name: ad, parents: [q], description: "HER Society albomu · yükləyən: " + (s.uploader || "—") }, blob, tip);
        await srv.from("photos").update({ drive_id: id }).eq("id", s.id);
        kocdu++;
      } catch (e) {
        xeta++; console.log("drive sekil xeta", s.id, String(e).slice(0, 200));
        if (xeta >= 3) break;
      }
    }
    if (xeta >= 3) break;
  }
  const { count } = await srv.from("photos").select("id", { count: "exact", head: true }).eq("consent", true).is("drive_id", null).not("event_id", "is", null);
  return { kocdu, qalan: count || 0, xeta };
}

// ---------- həftəlik ehtiyat ----------
async function ehtiyat(srv: ReturnType<typeof createClient>, g: Record<string, string>, at: string) {
  const { data: d } = await srv.rpc("ehtiyat_servis");
  const t = baku(new Date().toISOString());
  const ay = t.tarix.slice(0, 7);
  // bu ay aylıq nüsxə varmı?
  const qs = `'${g.ehtiyat_qovluq}' in parents and trashed=false and appProperties has { key='hs' and value='ehtiyat' }`;
  const lr = await (await fetch("https://www.googleapis.com/drive/v3/files?pageSize=1000&fields=files(id,name,appProperties)&q=" + encodeURIComponent(qs), { headers: { Authorization: "Bearer " + at } })).json();
  const fayllar: { id: string; appProperties?: Record<string, string> }[] = lr.files || [];
  const ayliq = !fayllar.some((f) => f.appProperties?.ayliq === "1" && (f.appProperties?.tarix || "").startsWith(ay));
  const props = { hs: "ehtiyat", tarix: t.tarix, ayliq: ayliq ? "1" : "0" };
  const ad = "HER-Society-ehtiyat-" + t.tarix;

  await yukle(at, { name: ad + ".json", parents: [g.ehtiyat_qovluq], appProperties: props, description: "Tam ehtiyat nüsxəsi (bərpa üçün) · " + t.yazi }, new Blob([JSON.stringify(d)]), "application/json");

  // Excel (oxumaq üçün)
  const gAd: Record<string, string> = {};
  for (const e of d.events || []) gAd[e.id] = baku(e.starts_at).tarix + " · " + (e.guest_name || e.title);
  const wb = XLSX.utils.book_new();
  const v = (ad: string, rows: Record<string, unknown>[]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), ad);
  v("Görüşlər", (d.events || []).map((e: Record<string, string>) => ({ "Tarix": baku(e.starts_at).yazi, "Ad": e.title, "Mövzu": e.topic || "", "Qonaq": e.guest_name || "", "Titul": e.guest_title || "", "Məkan": e.venue || "", "Ünvan": e.venue_detail || "", "Silinib": e.deleted_at ? "bəli" : "" })));
  v("Kartlar", (d.tickets || []).map((b: Record<string, string>) => ({ "Görüş": gAd[b.event_id] || "", "№": b.num, "Ad": b.name, "Kod": b.code, "Ləğv": b.revoked ? "bəli" : "", "Gəlib": b.checked_in_at ? baku(b.checked_in_at).yazi : "" })));
  v("Rəylər", (d.feedback || []).map((f: Record<string, string>) => ({ "Görüş": gAd[f.event_id] || "", "Tarix": baku(f.created_at).yazi, "Ad": f.name || "", "Qiymət": f.rating || "", "Xoşa gələn": f.liked || "", "Növbəti dəfə": f.wish || "" })));
  v("Şəkillər", (d.photos || []).map((p: Record<string, string>) => ({ "Görüş": gAd[p.event_id] || "", "Yükləyən": p.uploader || "", "Saytda": p.on_site ? "bəli" : "", "Drive-da": p.drive_id ? "bəli" : "", "Yüklənib": baku(p.created_at).yazi })));
  const xlsx = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  await yukle(at, { name: ad + ".xlsx", parents: [g.ehtiyat_qovluq], appProperties: props }, new Blob([xlsx]), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  // Təmizlik: aylıqlar həmişəlik; həftəliklərdən son 12 tarix qalır
  const heftelik = [...new Set(fayllar.filter((f) => f.appProperties?.ayliq !== "1").map((f) => f.appProperties?.tarix || ""))].filter(Boolean).sort().reverse();
  const saxla = new Set([t.tarix, ...heftelik.slice(0, 11)]);
  let silindi = 0;
  for (const f of fayllar) {
    if (f.appProperties?.ayliq === "1" || saxla.has(f.appProperties?.tarix || "")) continue;
    await fetch("https://www.googleapis.com/drive/v3/files/" + f.id, { method: "PATCH", headers: { Authorization: "Bearer " + at, "Content-Type": "application/json" }, body: JSON.stringify({ trashed: true }) });
    silindi++;
  }
  return { ok: true, ayliq, silindi };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const srv = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { data: g } = await srv.rpc("google_al");
    // icazə: cron açarı və ya admin
    const acar = req.headers.get("x-acar");
    let icaze = !!(acar && g?.cron_acar && acar === g.cron_acar);
    if (!icaze) {
      const user = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
      const { data: admin } = await user.rpc("is_admin");
      icaze = admin === true;
    }
    if (!icaze) return json({ error: "icaze" }, 403);
    if (!g?.refresh_token) return json({ error: "qosulmayib" });
    const { action } = await req.json();
    const at = await token(g);
    let netice: unknown;
    if (action === "sekiller") netice = await sekiller(srv, g, at);
    else if (action === "ehtiyat") netice = await ehtiyat(srv, g, at);
    else return json({ error: "action" }, 400);
    const y = await yer(at);
    await srv.rpc("google_yaz", { d: { istifade: y.istifade, limit: y.limit, yenilenib: new Date().toISOString(), son_xeta: null } });
    console.log("drive", action, JSON.stringify(netice));
    return json(netice);
  } catch (e) {
    console.log("drive xeta", String(e));
    try { await srv.rpc("google_yaz", { d: { son_xeta: String(e).slice(0, 300) } }); } catch (_e) { /* */ }
    return json({ error: "xeta", detal: String(e).slice(0, 200) });
  }
});
