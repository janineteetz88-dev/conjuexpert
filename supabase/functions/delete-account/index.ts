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

  // User client — to verify the JWT and get the user
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

  // Admin client — for deleting data and auth user
  const supaAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

  // 1. Get Stripe IDs from profile
  const { data: profile } = await supaAdmin
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("id", user.id)
    .single();

  // 2. Cancel Stripe subscription
  if (profile?.stripe_subscription_id) {
    await fetch(`https://api.stripe.com/v1/subscriptions/${profile.stripe_subscription_id}/cancel`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${stripeKey}` },
    });
  }

  // 3. Delete Stripe customer (removes all payment methods + invoices)
  if (profile?.stripe_customer_id) {
    await fetch(`https://api.stripe.com/v1/customers/${profile.stripe_customer_id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${stripeKey}` },
    });
  }

  // 4. Delete all user data from tables
  await supaAdmin.from("favorites").delete().eq("user_id", user.id);
  await supaAdmin.from("progress").delete().eq("user_id", user.id);
  await supaAdmin.from("profiles").delete().eq("id", user.id);

  // 5. Delete auth user (removes login credentials)
  const { error: deleteError } = await supaAdmin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
