Deno.serve(async () => {
  const key = Deno.env.get("STRIPE_SECRET_KEY")!;

  const couponRes = await fetch("https://api.stripe.com/v1/coupons", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ percent_off: "100", duration: "forever", name: "100 Prozent Rabatt" }),
  });
  const coupon = await couponRes.json();
  if (!couponRes.ok) return new Response(JSON.stringify({ error: coupon }), { status: 400 });

  const promoRes = await fetch("https://api.stripe.com/v1/promotion_codes", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ coupon: coupon.id, code: "LIA100" }),
  });
  const promo = await promoRes.json();
  if (!promoRes.ok) return new Response(JSON.stringify({ error: promo }), { status: 400 });

  return new Response(JSON.stringify({ coupon_id: coupon.id, promo_code: promo.code, status: "ok" }), {
    headers: { "Content-Type": "application/json" },
  });
});
