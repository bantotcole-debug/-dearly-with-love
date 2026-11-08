import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  if (req.method !== "POST") return Response.json({error:"Method not allowed"},{status:405,headers:cors});
  try {
    const {letter_id,reason} = await req.json();
    if (typeof letter_id !== "string" || typeof reason !== "string" || !reason.trim() || reason.length > 300)
      return Response.json({error:"Please provide a short report reason."},{status:400,headers:cors});
    const db = createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {error} = await db.from("reports").insert({letter_id,reason:reason.trim()});
    if(error) throw error;
    return Response.json({message:"Report received."},{headers:cors});
  } catch(e) {
    console.error(e);
    return Response.json({error:"Unable to submit report."},{status:500,headers:cors});
  }
});
