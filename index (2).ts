import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
async function sha(value: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  if (req.method !== "POST") return Response.json({error:"Method not allowed"},{status:405,headers:cors});
  try {
    const { letter_id, visitor_token } = await req.json();
    if (typeof letter_id !== "string" || typeof visitor_token !== "string" || visitor_token.length < 20 || visitor_token.length > 100)
      return Response.json({error:"Invalid reaction."},{status:400,headers:cors});
    const salt = Deno.env.get("RATE_LIMIT_SALT");
    if (!salt) throw new Error("Missing RATE_LIMIT_SALT");
    const visitorHash = await sha(salt + ":" + visitor_token);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await db.rpc("add_heart", {p_letter_id:letter_id,p_visitor_hash:visitorHash});
    if (error) throw error;
    return Response.json({added:!!data},{headers:cors});
  } catch (e) {
    console.error(e);
    return Response.json({error:"Unable to react right now."},{status:500,headers:cors});
  }
});
