import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
async function sha(value: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({error:"Method not allowed"}, {status:405,headers:cors});
  try {
    const { title, body, mood } = await req.json();
    if (typeof title !== "string" || typeof body !== "string" || title.trim().length < 1 || title.length > 90 || body.trim().length < 10 || body.length > 5000)
      return Response.json({error:"Please check your letter."},{status:400,headers:cors});
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const salt = Deno.env.get("RATE_LIMIT_SALT");
    if (!salt) throw new Error("Missing RATE_LIMIT_SALT");
    const ipHash = await sha(salt + ":" + ip);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: allowed, error: limitError } = await db.rpc("try_submission_limit", { p_ip_hash: ipHash });
    if (limitError) throw limitError;
    if (!allowed) return Response.json({error:"Please wait before sending another letter."},{status:429,headers:cors});
    const { error } = await db.from("letters").insert({
      title: title.trim(), body: body.trim(),
      mood: typeof mood === "string" ? mood.slice(0,40) : "A little hope",
      status: "pending"
    });
    if (error) throw error;
    return Response.json({message:"Your letter is in the review queue. Thank you for sharing. ♡"},{headers:cors});
  } catch (e) {
    console.error(e);
    return Response.json({error:"Unable to submit right now."},{status:500,headers:cors});
  }
});
