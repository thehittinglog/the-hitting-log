const MEMBERSHIP_PLANS = Object.freeze({
  FREE: "free",
  PRO: "pro",
  PRO_PLUS: "pro_plus",
});

const FINALIZED_STRIPE_PRICE_IDS = Object.freeze({
  pro: "price_1TuoOlRHnsqSfi089T01MZvN",
  pro_plus: "price_1UAzWHRHnsqSfi08kACnt0Rs",
});

const FREE_GAME_LIMIT = 10;
const ENTITLED_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const RECONCILABLE_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
  "incomplete",
];

function getStripePriceIds(environment = process.env) {
  return {
    pro: environment.STRIPE_PRO_PRICE_ID || environment.STRIPE_PRICE_ID || "",
    pro_plus: environment.STRIPE_PRO_PLUS_PRICE_ID || "",
  };
}

function isPaidPlan(plan) {
  return plan === MEMBERSHIP_PLANS.PRO || plan === MEMBERSHIP_PLANS.PRO_PLUS;
}

function isEntitledSubscriptionStatus(status) {
  return ENTITLED_SUBSCRIPTION_STATUSES.has(status);
}

function getPlanForPriceId(priceId, priceIds = getStripePriceIds()) {
  if (priceId && priceIds.pro && priceIds.pro === priceIds.pro_plus && priceId === priceIds.pro) {
    return MEMBERSHIP_PLANS.FREE;
  }

  // These finalized IDs are authoritative. Checking them first prevents a
  // swapped environment variable from ever granting Pro users Pro Plus access.
  if (priceId === FINALIZED_STRIPE_PRICE_IDS.pro) {
    return MEMBERSHIP_PLANS.PRO;
  }

  if (priceId === FINALIZED_STRIPE_PRICE_IDS.pro_plus) {
    return MEMBERSHIP_PLANS.PRO_PLUS;
  }

  if (priceId && priceId === priceIds.pro_plus) {
    return MEMBERSHIP_PLANS.PRO_PLUS;
  }

  if (priceId && priceId === priceIds.pro) {
    return MEMBERSHIP_PLANS.PRO;
  }

  return MEMBERSHIP_PLANS.FREE;
}

function getPlanForSubscription(subscription, priceIds = getStripePriceIds()) {
  const status = subscription?.subscription_status || subscription?.status || "inactive";
  const priceId = subscription?.stripe_price_id || subscription?.priceId || "";

  if (!isEntitledSubscriptionStatus(status)) {
    return MEMBERSHIP_PLANS.FREE;
  }

  return getPlanForPriceId(priceId, priceIds);
}

function getEntitlements(plan) {
  const normalizedPlan = isPaidPlan(plan) ? plan : MEMBERSHIP_PLANS.FREE;

  return {
    gameLimit: normalizedPlan === MEMBERSHIP_PLANS.FREE ? FREE_GAME_LIMIT : null,
    unlimitedGames: isPaidPlan(normalizedPlan),
    fullStatistics: isPaidPlan(normalizedPlan),
    charts: isPaidPlan(normalizedPlan),
    ai: normalizedPlan === MEMBERSHIP_PLANS.PRO_PLUS,
  };
}

function hasSubscriptionEntitlement(subscription, entitlement, priceIds = getStripePriceIds()) {
  const plan = getPlanForSubscription(subscription, priceIds);
  return getEntitlements(plan)[entitlement] === true;
}

module.exports = {
  ENTITLED_SUBSCRIPTION_STATUSES,
  FINALIZED_STRIPE_PRICE_IDS,
  FREE_GAME_LIMIT,
  MEMBERSHIP_PLANS,
  RECONCILABLE_SUBSCRIPTION_STATUSES,
  getEntitlements,
  getPlanForPriceId,
  getPlanForSubscription,
  getStripePriceIds,
  hasSubscriptionEntitlement,
  isEntitledSubscriptionStatus,
  isPaidPlan,
};
