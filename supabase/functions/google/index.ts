// HER Society — Google Drive: qoşulma linki və vəziyyət (yalnız adminlər)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const URL_ = Deno.env.get("SUPABASE_URL")!;
const REDIRECT = "https://bxykddiqsxwnwfrgnutm.supabase.co/functions/v1/google-qosul";

async function token(g: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: g.client_id, client_secret: g.client_secret, refresh_token: g.refresh_token, grant_type: "refresh_token" }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("token: " + (d.error || r.status));
  return d.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const user = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
    const { data: admin } = await user.rpc("is_admin");
    if (admin !== true) return json({ error: "icaze" }, 403);
    const { data: u } = await user.auth.getUser();
    const srv = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { action } = await req.json();
    const { data: g } = await srv.rpc("google_al");

    if (action === "url") {
      if (!g?.client_id) return json({ error: "client" });
      const st = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      await srv.rpc("google_state_yarat", { st, kim: u?.user?.email || "" });
      const p = new URLSearchParams({
        client_id: g.client_id, redirect_uri: REDIRECT, response_type: "code",
        scope: "openid email https://www.googleapis.com/auth/drive.file",
        access_type: "offline", prompt: "consent", state: st,
      });
      return json({ url: "https://accounts.google.com/o/oauth2/v2/auth?" + p.toString() });
    }

    if (action === "yoxla") {
      if (!g?.refresh_token) return json({ error: "qosulmayib" });
      try {
        const at = await token(g);
        const r = await fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota,user(emailAddress)", { headers: { Authorization: "Bearer " + at } });
        const d = await r.json();
        const q = d.storageQuota || {};
        await srv.rpc("google_yaz", { d: { istifade: +(q.usage || 0), limit: +(q.limit || 0), yenilenib: new Date().toISOString(), son_xeta: null } });
        return json({ ok: true, istifade: +(q.usage || 0), limit: +(q.limit || 0) });
      } catch (e) {
        await srv.rpc("google_yaz", { d: { son_xeta: String(e).slice(0, 300) } });
        return json({ error: "google", detal: String(e).slice(0, 200) });
      }
    }
    return json({ error: "action" }, 400);
  } catch (e) {
    console.log("google xeta", String(e));
    return json({ error: "xeta" }, 200);
  }
});
