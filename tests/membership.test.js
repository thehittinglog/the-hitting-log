const assert = require("node:assert/strict");
const membership = require("../lib/membership");

const priceIds = {
  pro: "price_1TuoOlRHnsqSfi089T01MZvN",
  pro_plus: "price_1UAzWHRHnsqSfi08kACnt0Rs",
};

assert.equal(
  membership.getStripePriceIds({ STRIPE_PRICE_ID: priceIds.pro }).pro,
  priceIds.pro,
  "Existing Pro deployments must retain the legacy STRIPE_PRICE_ID mapping",
);

assert.equal(membership.getPlanForPriceId(priceIds.pro, priceIds), "pro");
assert.equal(membership.getPlanForPriceId(priceIds.pro_plus, priceIds), "pro_plus");
assert.equal(membership.getPlanForPriceId("price_unknown", priceIds), "free");
assert.equal(
  membership.getPlanForPriceId("price_same", { pro: "price_same", pro_plus: "price_same" }),
  "free",
  "An ambiguous duplicate Price configuration must never grant AI",
);
assert.equal(
  membership.getPlanForPriceId(priceIds.pro, { pro: priceIds.pro_plus, pro_plus: priceIds.pro }),
  "pro",
  "The finalized Pro Price must never be reclassified as Pro Plus by swapped configuration",
);

assert.equal(
  membership.getPlanForSubscription({ subscription_status: "active", stripe_price_id: priceIds.pro }, priceIds),
  "pro",
);
assert.equal(
  membership.getPlanForSubscription({ subscription_status: "trialing", stripe_price_id: priceIds.pro_plus }, priceIds),
  "pro_plus",
);
assert.equal(
  membership.getPlanForSubscription({ subscription_status: "past_due", stripe_price_id: priceIds.pro_plus }, priceIds),
  "free",
);
assert.equal(
  membership.getPlanForSubscription({ subscription_status: "active", stripe_price_id: priceIds.pro, cancel_at_period_end: true }, priceIds),
  "pro",
  "Cancellation at period end must retain access until Stripe changes the status",
);
assert.equal(membership.getEntitlements("free").gameLimit, 10);
assert.equal(membership.getEntitlements("pro").ai, false);
assert.equal(membership.getEntitlements("pro_plus").ai, true);
assert.equal(
  membership.hasSubscriptionEntitlement({ subscription_status: "active", stripe_price_id: priceIds.pro }, "ai", priceIds),
  false,
  "Pro must not pass server-side AI authorization",
);
assert.equal(
  membership.hasSubscriptionEntitlement({ subscription_status: "active", stripe_price_id: priceIds.pro_plus }, "ai", priceIds),
  true,
  "Pro Plus must pass server-side AI authorization",
);

console.log("Membership entitlement tests passed");
