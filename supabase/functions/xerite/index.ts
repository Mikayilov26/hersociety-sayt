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
    const r = await fetch(u, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (HER Society)" } });
    const loc = r.headers.get("location");
    if (!loc) return u;
    u = new URL(loc, u).toString();
  }
  return u;
}

function ayir(u: string) {
  const url = new URL(u);
  let ad = "";
  const m = url.pathname.match(/\/maps\/place\/([^/]+)/);
  if (m) ad = decodeURIComponent(m[1].replace(/\+/g, " "));
  if (!ad) ad = url.searchParams.get("q") || url.searchParams.get("query") || "";
  let lat: number | null = null, lng: number | null = null;
  const k = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (k) { lat = +k[1]; lng = +k[2]; }
  const qk = ad.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
  if (qk) { lat = +qk[1]; lng = +qk[2]; ad = ""; }
  return { ad: ad.trim(), lat, lng };
}

async function unvan(lat: number, lng: number) {
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=az&zoom=18`, {
    headers: { "User-Agent": "HER Society website (hersociety.az)" },
  });
  if (!r.ok) return "";
  const d = await r.json();
  const a = d.address || {};
  const kuce = a.road || a.pedestrian || a.square || "";
  const ev = a.house_number ? " " + a.house_number : "";
  const seher = a.city || a.town || a.village || "";
  return [kuce + ev, seher].filter((x) => x && x.trim()).join(", ");
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
    const adres = p.lat !== null && p.lng !== null ? await unvan(p.lat, p.lng) : "";
    return json({ ad: p.ad, unvan: adres, lat: p.lat, lng: p.lng });
  } catch (_e) {
    return json({ error: "oxunmadi" }, 200);
  }
});
