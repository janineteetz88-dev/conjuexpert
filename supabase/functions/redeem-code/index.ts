import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://conjuexpert.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_CODES: Record<string, { months: number | null }> = {
  "LIA100": { months: null }, // null = lifetime
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { code, userId } = await req.json();
  if (!code || !userId) {
    return new Response(JSON.stringify({ error: "Missing code or userId" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const normalized = code.trim().toUpperCase();
  const entry = VALID_CODES[normalized];
  if (!entry) {
    return new Response(JSON.stringify({ error: "Ungültiger Code" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const premiumUntil = entry.months
    ? new Date(Date.now() + entry.months * 30 * 24 * 60 * 60 * 1000).toISOString()
    : "2099-12-31T00:00:00.000Z";

  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    is_premium: true,
    premium_until: premiumUntil,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, premium_until: premiumUntil }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
