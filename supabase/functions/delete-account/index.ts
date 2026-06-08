import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://conjuexpert.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

  const supaAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

  // 1. Get Stripe IDs from profile
  const { data: profile } = await supaAdmin
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, premium_until")
    .eq("id", user.id)
    .single();

  let premiumUntil: string | null = profile?.premium_until || null;

  // 2. Cancel Stripe subscription (with error handling — non-fatal)
  if (profile?.stripe_subscription_id) {
    try {
      const cancelRes = await fetch(
        `https://api.stripe.com/v1/subscriptions/${profile.stripe_subscription_id}/cancel`,
        { method: "POST", headers: { "Authorization": `Bearer ${stripeKey}` } }
      );
      if (cancelRes.ok) {
        const sub = await cancelRes.json();
        if (sub.current_period_end) {
          premiumUntil = new Date(sub.current_period_end * 1000).toISOString();
        }
      } else {
        console.error("Stripe cancel failed:", await cancelRes.text());
      }
    } catch (e) {
      console.error("Stripe cancel error:", e);
    }
  }

  // 3. Delete Stripe customer — DSGVO: removes payment methods, invoices, all PII
  if (profile?.stripe_customer_id) {
    try {
      const delRes = await fetch(
        `https://api.stripe.com/v1/customers/${profile.stripe_customer_id}`,
        { method: "DELETE", headers: { "Authorization": `Bearer ${stripeKey}` } }
      );
      if (!delRes.ok) {
        console.error("Stripe customer delete failed:", await delRes.text());
      }
    } catch (e) {
      console.error("Stripe customer delete error:", e);
    }
  }

  // 4. Delete all user data FIRST — before auth deletion to avoid orphaned data
  await supaAdmin.from("favorites").delete().eq("user_id", user.id);
  await supaAdmin.from("progress").delete().eq("user_id", user.id);
  await supaAdmin.from("profiles").delete().eq("id", user.id);

  // 5. Delete auth user last — after all data is gone
  const { error: deleteError } = await supaAdmin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, premiumUntil }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
