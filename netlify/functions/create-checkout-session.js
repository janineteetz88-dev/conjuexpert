const Stripe = require("stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { plan, userId, email } = JSON.parse(event.body || "{}");
  if (!plan || !userId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing plan or userId" }) };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  const priceId = plan === "annual"
    ? process.env.STRIPE_PRICE_ANNUAL
    : process.env.STRIPE_PRICE_MONTHLY;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email || undefined,
    metadata: { userId },
    success_url: "https://conjuexpert.app/?payment=success",
    cancel_url:  "https://conjuexpert.app/?payment=cancel",
    locale: "de",
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: session.url }),
  };
};
