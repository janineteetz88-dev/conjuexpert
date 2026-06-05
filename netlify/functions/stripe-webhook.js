const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = event.headers["stripe-signature"];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const userId = session.metadata?.userId;
    if (!userId) return { statusCode: 400, body: "No userId in metadata" };

    // Determine premium_until based on subscription interval
    const sub = await stripe.subscriptions.retrieve(session.subscription);
    const premiumUntil = new Date(sub.current_period_end * 1000).toISOString();

    await supabase.from("profiles").upsert({
      id: userId,
      is_premium: true,
      premium_until: premiumUntil,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
    });
  }

  if (stripeEvent.type === "customer.subscription.deleted") {
    const sub = stripeEvent.data.object;
    // Find user by stripe_customer_id and revoke premium
    await supabase
      .from("profiles")
      .update({ is_premium: false, premium_until: null, stripe_subscription_id: null })
      .eq("stripe_customer_id", sub.customer);
  }

  if (stripeEvent.type === "invoice.payment_failed") {
    const invoice = stripeEvent.data.object;
    await supabase
      .from("profiles")
      .update({ is_premium: false })
      .eq("stripe_customer_id", invoice.customer);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
