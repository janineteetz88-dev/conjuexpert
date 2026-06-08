const corsHeaders = {
  "Access-Control-Allow-Origin": "https://conjuexpert.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  const { plan, userId, email } = await req.json();
  if (!plan || !userId) {
    return new Response(JSON.stringify({ error: "Missing plan or userId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const priceId = plan === "annual_bonus"
    ? Deno.env.get("STRIPE_PRICE_ANNUAL_BONUS")!
    : plan === "annual"
    ? Deno.env.get("STRIPE_PRICE_ANNUAL")!
    : Deno.env.get("STRIPE_PRICE_MONTHLY")!;

  const params = new URLSearchParams({
    mode: "subscription",
    "payment_method_types[0]": "card",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "metadata[userId]": userId,
    success_url: "https://conjuexpert.app/?payment=success",
    cancel_url: "https://conjuexpert.app/?payment=cancel",
    locale: "de",
  });
  if (email) params.set("customer_email", email);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    return new Response(JSON.stringify({ error: data.error?.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ url: data.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
