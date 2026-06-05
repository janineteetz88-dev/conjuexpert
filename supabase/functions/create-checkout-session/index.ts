import Stripe from "https://esm.sh/stripe@14?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://conjuexpert.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const { plan, userId, email } = await req.json();
  if (!plan || !userId) {
    return new Response(JSON.stringify({ error: "Missing plan or userId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
  });

  const priceId = plan === "annual_bonus"
    ? Deno.env.get("STRIPE_PRICE_ANNUAL_BONUS")!
    : plan === "annual"
    ? Deno.env.get("STRIPE_PRICE_ANNUAL")!
    : Deno.env.get("STRIPE_PRICE_MONTHLY")!;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email || undefined,
    metadata: { userId },
    success_url: "https://conjuexpert.app/?payment=success",
    cancel_url: "https://conjuexpert.app/?payment=cancel",
    locale: "de",
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
