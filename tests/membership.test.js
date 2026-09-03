const assert = require("node:assert/strict");
const membership = require("../lib/membership");

const priceIds = {
  pro: "price_configured_pro",
  pro_plus: "price_configured_pro_plus",
};

assert.equal(
  membership.getStripePriceIds({ STRIPE_PRICE_ID: priceIds.pro }).pro,
  priceIds.pro,
  "Existing Pro deployments must retain the legacy STRIPE_PRICE_ID mapping",
);

assert.equal(membership.getPlanForPriceId(priceIds.pro, priceIds), "pro");
assert.equal(membership.getPlanForPriceId(priceIds.pro_plus, priceIds), "pro_plus");
const configuredWithAliases = membership.getStripePriceIds({
  STRIPE_PRO_PRICE_ID: priceIds.pro,
  STRIPE_PRO_PLUS_PRICE_ID: priceIds.pro_plus,
  STRIPE_PRO_PLUS_PRICE_IDS: "price_legacy_plus, price_yearly_plus",
});
assert.deepEqual(configuredWithAliases.pro_plus_ids, [
  priceIds.pro_plus,
  "price_legacy_plus",
  "price_yearly_plus",
]);
assert.equal(membership.getPlanForPriceId("price_legacy_plus", configuredWithAliases), "pro_plus");
assert.equal(membership.getPlanForPriceId("price_overlap", {
  pro: "price_configured_pro",
  pro_plus: "price_configured_pro_plus",
  pro_ids: ["price_configured_pro", "price_overlap"],
  pro_plus_ids: ["price_configured_pro_plus", "price_overlap"],
}), "free", "A Price configured for both tiers must fail closed");
assert.equal(membership.getPlanForPriceId("price_unknown", priceIds), "free");
assert.equal(
  membership.getPlanForPriceId("price_same", { pro: "price_same", pro_plus: "price_same" }),
  "free",
  "An ambiguous duplicate Price configuration must never grant AI",
);
assert.equal(
  membership.getPlanForPriceId(priceIds.pro, { pro: priceIds.pro_plus, pro_plus: priceIds.pro }),
  "pro_plus",
  "The deployment's configured Price mapping must override historical assumptions",
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
