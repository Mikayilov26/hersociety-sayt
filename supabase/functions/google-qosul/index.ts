// HER Society — Google icazəsindən sonra qayıdış: açarı saxlayır, Drive-da qovluqları yaradır, admin panelə qaytarır
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const REDIRECT = "https://bxykddiqsxwnwfrgnutm.supabase.co/functions/v1/google-qosul";
const PANEL = "https://hersociety.az/admin/";
const geri = (n: string) => new Response(null, { status: 302, headers: { Location: PANEL + "?google=" + n + "#hesab" } });

async function qovluq(at: string, ad: string, ana?: string) {
  const r = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST", headers: { Authorization: "Bearer " + at, "Content-Type": "application/json" },
    body: JSON.stringify({ name: ad, mimeType: "application/vnd.google-apps.folder", ...(ana ? { parents: [ana] } : {}) }),
  });
  const d = await r.json();
  if (!d.id) throw new Error("qovluq: " + JSON.stringify(d).slice(0, 200));
  return d.id as string;
}
async function var_(at: string, id: string) {
  const r = await fetch("https://www.googleapis.com/drive/v3/files/" + id + "?fields=id,trashed", { headers: { Authorization: "Bearer " + at } });
  if (!r.ok) return false;
  const d = await r.json(); return !!d.id && !d.trashed;
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("error")) return geri("redd");
  const code = u.searchParams.get("code"), st = u.searchParams.get("state");
  if (!code || !st) return geri("xeta");
  const srv = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { data: ok } = await srv.rpc("google_state_yoxla", { st });
    if (ok !== true) return geri("vaxt");
    const { data: g } = await srv.rpc("google_al");
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: g.client_id, client_secret: g.client_secret, code, redirect_uri: REDIRECT, grant_type: "authorization_code" }),
    });
    const t = await r.json();
    if (!t.refresh_token || !t.access_token) { console.log("google-qosul token", JSON.stringify(t).slice(0, 300)); return geri("xeta"); }
    let email = "";
    try { email = JSON.parse(atob(t.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email || ""; } catch (_e) { /* */ }
    const at = t.access_token as string;
    // Qovluqlar: HER Society / Şəkillər, Ehtiyat nüsxələri (eyni hesabdırsa köhnələri saxla)
    let kok = g.email === email && g.kok_qovluq && await var_(at, g.kok_qovluq) ? g.kok_qovluq : "";
    let sek = kok && g.sekil_qovluq && await var_(at, g.sekil_qovluq) ? g.sekil_qovluq : "";
    let eht = kok && g.ehtiyat_qovluq && await var_(at, g.ehtiyat_qovluq) ? g.ehtiyat_qovluq : "";
    if (!kok) kok = await qovluq(at, "HER Society");
    if (!sek) sek = await qovluq(at, "Şəkillər", kok);
    if (!eht) eht = await qovluq(at, "Ehtiyat nüsxələri", kok);
    const a = await (await fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota", { headers: { Authorization: "Bearer " + at } })).json();
    const q = a.storageQuota || {};
    await srv.rpc("google_yaz", { d: {
      refresh_token: t.refresh_token, email, kok_qovluq: kok, sekil_qovluq: sek, ehtiyat_qovluq: eht,
      qosulub: new Date().toISOString(), istifade: +(q.usage || 0), limit: +(q.limit || 0), yenilenib: new Date().toISOString(), son_xeta: null,
    } });
    return geri("ok");
  } catch (e) {
    console.log("google-qosul xeta", String(e));
    try { await srv.rpc("google_yaz", { d: { son_xeta: String(e).slice(0, 300) } }); } catch (_e) { /* */ }
    return geri("xeta");
  }
});
