const {
  MEMBERSHIP_PLANS,
  RECONCILABLE_SUBSCRIPTION_STATUSES,
  getPlanForPriceId,
  isEntitledSubscriptionStatus,
} = require("./membership");

const SUBSCRIPTION_STATUS_PRIORITY = [
  ...RECONCILABLE_SUBSCRIPTION_STATUSES,
  "canceled",
  "incomplete_expired",
];
const PRICE_CATALOG_CACHE_MS = 5 * 60 * 1000;
const priceCatalogCache = new Map();

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

function getItemProductId(item) {
  return objectId(item?.price?.product) || objectId(item?.plan?.product) || null;
}

function getActivePriceIds(subscription) {
  return [...new Set((subscription?.items?.data || []).map(getItemPriceId).filter(Boolean))];
}

function getTierFromStripeSubscription(subscription, priceIds, catalog = {}) {
  const items = subscription?.items?.data || [];
  const candidates = items.map((item) => {
    const priceId = getItemPriceId(item);
    const productId = getItemProductId(item);
    let priceTier = getPlanForPriceId(priceId, priceIds);
    let resolution = priceTier === MEMBERSHIP_PLANS.FREE ? "unrecognized" : "price_id";

    if (priceTier === MEMBERSHIP_PLANS.FREE && productId) {
      if (productId === catalog.proPlusProductId) {
        priceTier = MEMBERSHIP_PLANS.PRO_PLUS;
        resolution = "configured_product";
      } else if (productId === catalog.proProductId) {
        priceTier = MEMBERSHIP_PLANS.PRO;
        resolution = "configured_product";
      }
    }

    return { priceId, productId, priceTier, resolution };
  });
  const selected = candidates.find((item) => item.priceTier === MEMBERSHIP_PLANS.PRO_PLUS)
    || candidates.find((item) => item.priceTier === MEMBERSHIP_PLANS.PRO)
    || candidates[0]
    || { priceId: null, productId: null, priceTier: MEMBERSHIP_PLANS.FREE, resolution: "missing" };
  const status = subscription?.status || "inactive";

  return {
    ...selected,
    tier: isEntitledSubscriptionStatus(status) ? selected.priceTier : MEMBERSHIP_PLANS.FREE,
    status,
    proPriceMatch: (priceIds.pro_ids || [priceIds.pro]).includes(selected.priceId),
    proPlusPriceMatch: (priceIds.pro_plus_ids || [priceIds.pro_plus]).includes(selected.priceId),
  };
}

async function loadStripePriceCatalog(stripe, priceIds) {
  const proIds = priceIds?.pro_ids || [priceIds?.pro].filter(Boolean);
  const proPlusIds = priceIds?.pro_plus_ids || [priceIds?.pro_plus].filter(Boolean);
  const hasOverlap = proIds.some((priceId) => proPlusIds.includes(priceId));
  if (!priceIds?.pro || !priceIds?.pro_plus) {
    const error = new Error("Stripe Pro and Pro Plus Price IDs must be configured.");
    error.code = "stripe_price_config_invalid";
    throw error;
  }

  const cacheKey = `${proIds.join(",")}:${proPlusIds.join(",")}`;
  const cached = priceCatalogCache.get(cacheKey);
  if (cached && Date.now() - cached.loadedAt < PRICE_CATALOG_CACHE_MS) return cached.catalog;

  async function retrieveFirstConfiguredPrice(configuredIds) {
    const results = await Promise.allSettled(
      configuredIds.map((priceId) => stripe.prices.retrieve(priceId)),
    );
    return results.find((result) => result.status === "fulfilled")?.value || null;
  }

  const [proPrice, proPlusPrice] = await Promise.all([
    retrieveFirstConfiguredPrice(proIds),
    retrieveFirstConfiguredPrice(proPlusIds),
  ]);
  const proProductId = objectId(proPrice?.product);
  const proPlusProductId = objectId(proPlusPrice?.product);
  const productsAreDistinct = Boolean(
    !hasOverlap && proProductId && proPlusProductId && proProductId !== proPlusProductId,
  );

  const catalog = {
    // Product matching is only an optional fallback for alternate portal
    // prices. Exact configured Price ID matching remains usable even if this
    // enrichment cannot be loaded.
    proProductId: productsAreDistinct ? proProductId : null,
    proPlusProductId: productsAreDistinct ? proPlusProductId : null,
    proPriceFound: Boolean(proPrice),
    proPlusPriceFound: Boolean(proPlusPrice),
    proPriceActive: proPrice?.active === true,
    proPlusPriceActive: proPlusPrice?.active === true,
    productFallbackAvailable: productsAreDistinct,
    validationErrorCode:
      hasOverlap
        ? "configured_price_tiers_overlap"
        : !proPrice || !proPlusPrice
        ? "configured_price_lookup_failed"
        : productsAreDistinct
          ? null
          : "configured_products_not_distinct",
  };
  priceCatalogCache.set(cacheKey, { catalog, loadedAt: Date.now() });
  return catalog;
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

function toSubscriptionRecord(subscription, userId, priceIds, catalog = {}) {
  const status = subscription?.status || "inactive";
  const normalized = getTierFromStripeSubscription(subscription, priceIds, catalog);
  const priceId = normalized.priceId;
  const plan = normalized.tier;

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

function selectRelevantSubscription(subscriptions, priceIds, catalog = {}) {
  const candidates = subscriptions
    .filter((subscription) => {
      return getTierFromStripeSubscription(subscription, priceIds, catalog).priceTier !== MEMBERSHIP_PLANS.FREE;
    })
    .filter((subscription) => SUBSCRIPTION_STATUS_PRIORITY.includes(subscription.status));

  return candidates.sort((left, right) => {
    const statusDifference =
      SUBSCRIPTION_STATUS_PRIORITY.indexOf(left.status) -
      SUBSCRIPTION_STATUS_PRIORITY.indexOf(right.status);
    return statusDifference || (right.created || 0) - (left.created || 0);
  })[0] || null;
}

function selectCurrentSubscription(subscriptions) {
  return subscriptions
    .filter((subscription) => SUBSCRIPTION_STATUS_PRIORITY.includes(subscription.status))
    .sort((left, right) => {
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
  getActivePriceIds,
  getPriceId,
  getTierFromStripeSubscription,
  getSubscriptionPeriod,
  loadStripePriceCatalog,
  objectId,
  selectRelevantSubscription,
  selectCurrentSubscription,
  subscriptionRecordChanged,
  toSubscriptionRecord,
  unixTimestampToIso,
};
