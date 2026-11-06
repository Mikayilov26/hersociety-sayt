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

// Koordinat yoxdursa (iPhone-dan paylaşılan linklərdə olur), adla axtar
async function axtar(q: string) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=az&accept-language=az&q=${encodeURIComponent(q)}`, {
    headers: { "User-Agent": "HER Society website (hersociety.az)" },
  });
  if (!r.ok) return null;
  const d = await r.json();
  if (!Array.isArray(d) || !d.length) return null;
  return { lat: +d[0].lat, lng: +d[0].lon, unvan: adresYaz(d[0].address || {}) };
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
    // "Ad, ünvan" formasında gələn q: adı və ünvanı ayır
    if (p.ad.includes(",")) {
      const i = p.ad.indexOf(",");
      adres = p.ad.slice(i + 1).trim(); p.ad = p.ad.slice(0, i).trim();
    }
    if (!adres && p.lat !== null && p.lng !== null) adres = await unvan(p.lat, p.lng);
    if (!adres && p.ad) {
      const a = await axtar(p.ad);
      if (a) { adres = a.unvan; if (p.lat === null) { p.lat = a.lat; p.lng = a.lng; } }
    }
    return json({ ad: p.ad, unvan: adres, lat: p.lat, lng: p.lng });
  } catch (e) {
    console.log("xerite xeta", String(e));
    return json({ error: "oxunmadi" }, 200);
  }
});
