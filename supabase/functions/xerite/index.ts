// HER Society — Google Maps linkindən məkanın adını və ünvanını tapır (yalnız adminlər üçün)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const ICAZELI = /^(maps\.app\.goo\.gl|goo\.gl|(www\.)?google\.[a-z.]+|maps\.google\.[a-z.]+|consent\.google\.[a-z.]+)$/i;

async function sonUnvan(url: string): Promise<string> {
  let u = url;
  for (let i = 0; i < 6; i++) {
    const host = new URL(u).hostname;
    if (!ICAZELI.test(host)) throw new Error("host");
    if (/consent\.google/.test(host)) {
      const c = new URL(u).searchParams.get("continue");
      if (!c) break; u = c; continue;
    }
    if (/\/maps\/(place|search|@)/.test(new URL(u).pathname) || /[?&]q=/.test(u)) return u;
    const r = await fetch(u, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" } });
    let loc = r.headers.get("location");
    if (!loc) {
      // Bəzən yönləndirmə əvəzinə səhifə qayıdır — içindən xəritə linkini tap
      const html = await r.text();
      const m = html.match(/https:\/\/(?:www\.|maps\.)?google\.[a-z.]+\/maps[^"'\s<>\\]*/);
      if (!m) return u;
      loc = m[0].replace(/&amp;/g, "&");
    }
    u = new URL(loc, u).toString();
  }
  return u;
}

function ayir(u: string) {
  const url = new URL(u);
  let ad = "";
  const m = url.pathname.match(/\/maps\/(?:place|search)\/([^/]+)/);
  if (m) ad = decodeURIComponent(m[1].replace(/\+/g, " "));
  if (!ad) ad = url.searchParams.get("q") || url.searchParams.get("query") || "";
  let lat: number | null = null, lng: number | null = null;
  const k = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (k) { lat = +k[1]; lng = +k[2]; }
  const qk = ad.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
  if (qk) { lat = +qk[1]; lng = +qk[2]; ad = ""; }
  return { ad: ad.trim(), lat, lng };
}

function adresYaz(a: Record<string, string>) {
  const kuce = a.road || a.pedestrian || a.square || "";
  const ev = a.house_number ? " " + a.house_number : "";
  const seher = a.city || a.town || a.village || "";
  return [kuce + ev, seher].filter((x) => x && x.trim()).join(", ");
}

const BRAUZER = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Accept-Language": "az,en;q=0.8",
  // Google-un razılıq səhifəsini keçmək üçün
  "Cookie": "CONSENT=YES+cb; SOCS=CAESHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVuIAEaBgiAo_CmBg",
};
function htmlAc(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(+n));
}
// Linkin göstərdiyi dəqiq yerin səhifəsini açıb ad, ünvan və koordinatı oxu (adla axtarış YOX)
async function sehife(u: string) {
  const r = await fetch(u, { headers: BRAUZER });
  const html = await r.text();
  const meta = (ad: string) => {
    const m = html.match(new RegExp('<meta[^>]+(?:property|name|itemprop)="' + ad + '"[^>]+content="([^"]*)"')) ||
      html.match(new RegExp('<meta[^>]+content="([^"]*)"[^>]+(?:property|name|itemprop)="' + ad + '"'));
    return m ? htmlAc(m[1]) : "";
  };
  const basliq = meta("og:title") || meta("name");
  let lat: number | null = null, lng: number | null = null;
  const k = html.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) ||
    html.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
    html.match(/@(-?\d+\.\d+),(-?\d+\.\d+),\d/);
  if (k) { lat = +k[1]; lng = +k[2]; }
  else {
    const a = html.match(/APP_INITIALIZATION_STATE=\[\[\[-?[\d.]+,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
    if (a) { lng = +a[1]; lat = +a[2]; }
  }
  return { basliq, lat, lng, son: r.url };
}

async function unvan(lat: number, lng: number) {
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=az&zoom=18`, {
    headers: { "User-Agent": "HER Society website (hersociety.az)" },
  });
  if (!r.ok) return "";
  const d = await r.json();
  return adresYaz(d.address || {});
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: admin } = await sb.rpc("is_admin");
    if (admin !== true) return json({ error: "icaze" }, 403);

    const { url } = await req.json();
    const temiz = String(url || "").match(/https:\/\/\S+/)?.[0];
    if (!temiz) return json({ error: "link" }, 400);
    const son = await sonUnvan(temiz);
    const p = ayir(son);
    console.log("xerite", new URL(son).host + new URL(son).pathname.slice(0, 80), "q=" + (p.ad || "").slice(0, 80), p.lat, p.lng);
    let adres = "";
    // 1) Linkdə "Ad, ünvan" varsa — birbaşa linkdən
    if (p.ad.includes(",")) {
      const i = p.ad.indexOf(",");
      adres = p.ad.slice(i + 1).trim(); p.ad = p.ad.slice(0, i).trim();
    }
    // 2) Yoxdursa — linkin açdığı dəqiq yerin səhifəsindən (başlıq "Ad · Ünvan" olur)
    if (!adres || p.lat === null) {
      try {
        const s = await sehife(son);
        console.log("xerite sehife", s.basliq.slice(0, 120), s.lat, s.lng, new URL(s.son).host);
        if (s.basliq.includes("·")) {
          const [a, ...b] = s.basliq.split("·");
          if (!p.ad) p.ad = a.trim();
          if (!adres) adres = b.join("·").replace(/\s*-\s*Google Maps\s*$/i, "").trim();
        }
        if (p.lat === null && s.lat !== null) { p.lat = s.lat; p.lng = s.lng; }
      } catch (e) { console.log("xerite sehife xeta", String(e)); }
    }
    // 3) Hələ ünvan yoxdursa — linkdəki dəqiq koordinatdan
    if (!adres && p.lat !== null && p.lng !== null) adres = await unvan(p.lat, p.lng);
    return json({ ad: p.ad, unvan: adres, lat: p.lat, lng: p.lng });
  } catch (e) {
    console.log("xerite xeta", String(e));
    return json({ error: "oxunmadi" }, 200);
  }
});
