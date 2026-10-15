import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function signBrowserId(browserId: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(browserId));
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !supabaseUrl || !serviceRoleKey) return json({ error: "monitor_not_configured" }, 503);

  let payload: { browser_id?: string; browser_signature?: string; session_id?: string; turnstile_token?: string };
  try { payload = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const { browser_id: browserId, browser_signature: browserSignature, session_id: sessionId, turnstile_token: turnstileToken } = payload;
  if (!browserId || !sessionId || !turnstileToken || browserId.length > 128 || sessionId.length > 128) return json({ error: "invalid_payload" }, 400);

  const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: turnstileToken }),
  });
  const verificationData = await verification.json().catch(() => null);
  if (!verification.ok || !verificationData?.success) return json({ error: "turnstile_failed" }, 403);

  const expectedSignature = await signBrowserId(browserId, secret);
  if (browserSignature && !safeEqual(browserSignature, expectedSignature)) return json({ error: "invalid_browser_signature" }, 403);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase.rpc("register_anonymous_access", {
    p_browser_id: browserId,
    p_browser_signature: expectedSignature,
    p_session_id: sessionId,
  });
  if (error) return json({ error: "recording_failed" }, 500);
  return json({ ...data, browser_id: browserId, browser_signature: expectedSignature });
});
