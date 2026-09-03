const {
  MEMBERSHIP_PLANS,
  RECONCILABLE_SUBSCRIPTION_STATUSES,
  getPlanForPriceId,
  getPlanForSubscription,
} = require("./membership");

const SUBSCRIPTION_STATUS_PRIORITY = [
  ...RECONCILABLE_SUBSCRIPTION_STATUSES,
  "canceled",
  "incomplete_expired",
];

function objectId(value) {
  return typeof value === "string" ? value : value?.id || null;
}

function unixTimestampToIso(value) {
  return Number.isFinite(value) ? new Date(value * 1000).toISOString() : null;
}

function getSubscriptionPeriod(subscription, field) {
  const itemPeriods = (subscription?.items?.data || [])
    .map((item) => item[field])
    .filter(Number.isFinite);

  if (itemPeriods.length > 0) {
    return field === "current_period_start"
      ? Math.min(...itemPeriods)
      : Math.max(...itemPeriods);
  }

  return subscription?.[field] || null;
}

function getItemPriceId(item) {
  return objectId(item?.price) || objectId(item?.pricing?.price_details?.price) || null;
}

function getPriceId(subscription, priceIds) {
  const itemPriceIds = (subscription?.items?.data || []).map(getItemPriceId).filter(Boolean);
  const proPlusPrice = itemPriceIds.find(
    (priceId) => getPlanForPriceId(priceId, priceIds) === MEMBERSHIP_PLANS.PRO_PLUS,
  );
  const proPrice = itemPriceIds.find(
    (priceId) => getPlanForPriceId(priceId, priceIds) === MEMBERSHIP_PLANS.PRO,
  );

  // A subscription can briefly contain more than one item while Stripe applies
  // a portal change. Inspect every item and preserve the highest paid tier.
  return proPlusPrice || proPrice || itemPriceIds[0] || null;
}

function toSubscriptionRecord(subscription, userId, priceIds) {
  const status = subscription?.status || "inactive";
  const priceId = getPriceId(subscription, priceIds);
  const plan = getPlanForSubscription({
    subscription_status: status,
    stripe_price_id: priceId,
  }, priceIds);

  return {
    user_id: userId,
    stripe_customer_id: objectId(subscription?.customer),
    stripe_subscription_id: objectId(subscription?.id),
    stripe_price_id: priceId,
    subscription_status: status,
    cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
    current_period_start: unixTimestampToIso(
      getSubscriptionPeriod(subscription, "current_period_start"),
    ),
    current_period_end: unixTimestampToIso(
      getSubscriptionPeriod(subscription, "current_period_end"),
    ),
    created_at: unixTimestampToIso(subscription?.created) || new Date().toISOString(),
    plan,
  };
}

function selectRelevantSubscription(subscriptions, priceIds) {
  const candidates = subscriptions
    .filter((subscription) => {
      return getPlanForPriceId(getPriceId(subscription, priceIds), priceIds) !== MEMBERSHIP_PLANS.FREE;
    })
    .filter((subscription) => SUBSCRIPTION_STATUS_PRIORITY.includes(subscription.status));

  return candidates.sort((left, right) => {
    const statusDifference =
      SUBSCRIPTION_STATUS_PRIORITY.indexOf(left.status) -
      SUBSCRIPTION_STATUS_PRIORITY.indexOf(right.status);
    return statusDifference || (right.created || 0) - (left.created || 0);
  })[0] || null;
}

function subscriptionRecordChanged(previous, next) {
  if (!previous) return true;
  const fields = [
    "stripe_customer_id",
    "stripe_subscription_id",
    "stripe_price_id",
    "subscription_status",
    "current_period_start",
    "current_period_end",
    "cancel_at_period_end",
    "plan",
  ];
  return fields.some((field) => (previous[field] ?? null) !== (next[field] ?? null));
}

module.exports = {
  getPriceId,
  getSubscriptionPeriod,
  objectId,
  selectRelevantSubscription,
  subscriptionRecordChanged,
  toSubscriptionRecord,
  unixTimestampToIso,
};
