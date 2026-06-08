import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://conjuexpert.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Verify JWT — authenticated user only
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supaUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supaUser.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { code } = await req.json();
  if (!code) {
    return new Response(JSON.stringify({ error: "Missing code" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supaAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Look up code in DB — single atomic select-then-update to prevent double redemption
  const { data: promo, error: promoError } = await supaAdmin
    .from("promo_codes")
    .select("code, months, used_at, used_by_user_id")
    .eq("code", code.trim().toUpperCase())
    .single();

  if (promoError || !promo) {
    return new Response(JSON.stringify({ error: "Ungültiger Code" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (promo.used_at !== null) {
    return new Response(JSON.stringify({ error: "Dieser Code wurde bereits eingelöst" }), {
      status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Mark code as used atomically (re-check used_at to prevent race conditions)
  const { error: markError } = await supaAdmin
    .from("promo_codes")
    .update({ used_at: new Date().toISOString(), used_by_user_id: user.id })
    .eq("code", promo.code)
    .is("used_at", null); // only update if still unused

  if (markError) {
    return new Response(JSON.stringify({ error: "Code konnte nicht eingelöst werden" }), {
      status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const premiumUntil = promo.months
    ? new Date(Date.now() + promo.months * 30 * 24 * 60 * 60 * 1000).toISOString()
    : "2099-12-31T00:00:00.000Z";

  const { error: profileError } = await supaAdmin.from("profiles").upsert({
    id: user.id,
    is_premium: true,
    premium_until: premiumUntil,
  });

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, premium_until: premiumUntil }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
