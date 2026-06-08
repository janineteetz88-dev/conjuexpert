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

  // Check code exists and is active
  const { data: promo, error: promoError } = await supaAdmin
    .from("promo_codes")
    .select("code, months, active")
    .eq("code", code.trim().toUpperCase())
    .eq("active", true)
    .single();

  if (promoError || !promo) {
    return new Response(JSON.stringify({ error: "Ungültiger Code" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check this user hasn't already redeemed this code
  const { data: existing } = await supaAdmin
    .from("promo_redemptions")
    .select("redeemed_at")
    .eq("code", promo.code)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return new Response(JSON.stringify({ error: "Du hast diesen Code bereits eingelöst" }), {
      status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Record redemption
  const { error: redeemError } = await supaAdmin
    .from("promo_redemptions")
    .insert({ code: promo.code, user_id: user.id, redeemed_at: new Date().toISOString() });

  if (redeemError) {
    // Unique constraint violation = race condition, user already redeemed
    return new Response(JSON.stringify({ error: "Du hast diesen Code bereits eingelöst" }), {
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
