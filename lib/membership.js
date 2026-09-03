const MEMBERSHIP_PLANS = Object.freeze({
  FREE: "free",
  PRO: "pro",
  PRO_PLUS: "pro_plus",
});

const FREE_GAME_LIMIT = 10;
const PLAN_DETAILS = Object.freeze({
  free: Object.freeze({ displayName: "Free", priceMonthly: 0 }),
  pro: Object.freeze({ displayName: "Pro", priceMonthly: 14.99 }),
  pro_plus: Object.freeze({ displayName: "Pro Plus", priceMonthly: 19.99 }),
});
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

  // Deployment configuration is the source of truth. Never let a historical
  // hardcoded Price ID override the current Stripe catalog mapping.
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

  // The subscriptions table is service-role writable only. Product-derived
  // aliases are normalized before storage, so this canonical value is trusted
  // after status has been checked.
  if (isPaidPlan(subscription?.plan)) {
    return subscription.plan;
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

function getPlanDetails(plan) {
  return PLAN_DETAILS[plan] || PLAN_DETAILS.free;
}

function hasSubscriptionEntitlement(subscription, entitlement, priceIds = getStripePriceIds()) {
  const plan = getPlanForSubscription(subscription, priceIds);
  return getEntitlements(plan)[entitlement] === true;
}

module.exports = {
  ENTITLED_SUBSCRIPTION_STATUSES,
  FREE_GAME_LIMIT,
  MEMBERSHIP_PLANS,
  PLAN_DETAILS,
  RECONCILABLE_SUBSCRIPTION_STATUSES,
  getEntitlements,
  getPlanForPriceId,
  getPlanForSubscription,
  getPlanDetails,
  getStripePriceIds,
  hasSubscriptionEntitlement,
  isEntitledSubscriptionStatus,
  isPaidPlan,
};
