const Stripe = require("stripe");
const {
  getAuthenticatedUserSubscription,
  getBearerToken,
  requireSupabasePublicConfig,
  requireSupabaseServerConfig,
  verifySupabaseUserWithDetails,
} = require("../lib/supabase-server");
const { getEntitlements, getPlanDetails, getPlanForSubscription, getStripePriceIds } = require("../lib/membership");
const { loadStripePriceCatalog } = require("../lib/stripe-subscription");
const { isReconciliationDue, reconcileSubscription } = require("../lib/subscription-reconciliation");

const FREE_PLAN_RESPONSE = Object.freeze({
  plan: "free",
  displayName: "Free",
  priceMonthly: 0,
  status: "inactive",
  entitlements: getEntitlements("free"),
  subscription: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
});

function sendResponse(res, statusCode, body) {
  return res.status(statusCode).json(body);
}

function getStatusResponse(subscription, priceIds = getStripePriceIds()) {
  if (!subscription) return FREE_PLAN_RESPONSE;
  const status = subscription.subscription_status || "inactive";
  const plan = getPlanForSubscription(subscription, priceIds);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;
  const currentPeriodEnd = subscription.current_period_end || null;
  const planDetails = getPlanDetails(plan);
  return {
    plan,
    displayName: planDetails.displayName,
    priceMonthly: planDetails.priceMonthly,
    status,
    entitlements: getEntitlements(plan),
    subscription: {
      plan,
      displayName: planDetails.displayName,
      priceMonthly: planDetails.priceMonthly,
      status,
      hasStripeCustomer: Boolean(subscription.stripe_customer_id),
      currentPeriodEnd,
      cancelAtPeriodEnd,
    },
    cancelAtPeriodEnd,
    currentPeriodEnd,
  };
}

function logSync(details) {
  console.info("subscription_sync", JSON.stringify(details));
}

function getFallbackResponse(subscription, priceIds, reason) {
  return {
    ...getStatusResponse(subscription, priceIds),
    reconciliationPending: true,
    reconciliationError: reason,
  };
}

function logSubscriptionStatusError({ error, stage, subscription, userId, priceIds }) {
  console.error("SUBSCRIPTION_STATUS_ERROR", JSON.stringify({
    userId: userId || null,
    stage,
    stripeCustomerIdPresent: Boolean(subscription?.stripe_customer_id),
    stripeSubscriptionIdPresent: Boolean(subscription?.stripe_subscription_id),
    proPriceEnvPresent: Boolean(priceIds?.pro),
    proPlusPriceEnvPresent: Boolean(priceIds?.pro_plus),
    errorName: error?.name || "Error",
    errorCode: error?.code || null,
    httpStatus: error?.statusCode || error?.status || null,
  }));
}

async function handleRequest(req, res, dependencies = {}) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendResponse(res, 405, { error: "Method not allowed", code: "method_not_allowed" });
  }
  const priceIds = getStripePriceIds();

  try {
    requireSupabasePublicConfig();
  } catch (error) {
    logSubscriptionStatusError({
      error,
      stage: "authentication_configuration",
      subscription: null,
      userId: null,
      priceIds,
    });
    return sendResponse(res, 500, {
      error: "Subscription authentication is not configured",
      code: "missing_supabase_config",
    });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return sendResponse(res, 401, { error: "Missing authentication token", code: "missing_auth_token" });
  }

  let authentication;
  try {
    authentication = await verifySupabaseUserWithDetails(accessToken);
  } catch (error) {
    logSubscriptionStatusError({ error, stage: "authentication", subscription: null, userId: null, priceIds });
    return sendResponse(res, 500, { error: "Unable to load subscription status", code: "subscription_status_failed" });
  }
  if (!authentication.user) {
    return sendResponse(res, 401, {
      error: "Invalid or expired authentication token",
      code: "invalid_auth_token",
    });
  }

  const user = authentication.user;
  let subscription;
  try {
    subscription = await getAuthenticatedUserSubscription(accessToken, user.id);
  } catch (error) {
    logSubscriptionStatusError({ error, stage: "database_read", subscription: null, userId: user.id, priceIds });
    return sendResponse(res, 500, { error: "Unable to load subscription status", code: "subscription_status_failed" });
  }

  const force = req.query?.reconcile === "1";
  if (!isReconciliationDue(subscription, { force, priceIds })) {
    return sendResponse(res, 200, getStatusResponse(subscription, priceIds));
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
  if (!stripeSecretKey) {
    const error = new Error("Subscription reconciliation configuration is incomplete.");
    error.code = "missing_stripe_config";
    logSubscriptionStatusError({ error, stage: "configuration", subscription, userId: user.id, priceIds });
    return sendResponse(res, 200, getFallbackResponse(subscription, priceIds, error.code));
  }

  const priceConfigurationComplete = Boolean(priceIds.pro && priceIds.pro_plus);
  if (!priceConfigurationComplete) {
    const error = new Error("One or more Stripe membership Price IDs are missing.");
    error.code = "missing_stripe_price_config";
    logSubscriptionStatusError({ error, stage: "configuration", subscription, userId: user.id, priceIds });
  }

  try {
    requireSupabaseServerConfig();
    const stripe = dependencies.createStripe
      ? dependencies.createStripe(stripeSecretKey)
      : new Stripe(stripeSecretKey);
    const loadCatalog = dependencies.loadStripePriceCatalog || loadStripePriceCatalog;
    const reconcile = dependencies.reconcileSubscription || reconcileSubscription;
    const catalog = priceConfigurationComplete
      ? await loadCatalog(stripe, priceIds)
      : {
          proPriceFound: false,
          proPlusPriceFound: false,
          proPriceActive: false,
          proPlusPriceActive: false,
          productFallbackAvailable: false,
          validationErrorCode: "missing_stripe_price_config",
        };
    if (!catalog.proPriceFound || !catalog.proPlusPriceFound) {
      const error = new Error("One or more configured Stripe prices could not be retrieved.");
      error.code = catalog.validationErrorCode || "configured_price_lookup_failed";
      logSubscriptionStatusError({ error, stage: "price_catalog", subscription, userId: user.id, priceIds });
    }
    const result = await reconcile(stripe, user, subscription, priceIds, catalog);
    const activePriceIds = result.activePriceIds || [];
    const proIds = priceIds.pro_ids || [priceIds.pro].filter(Boolean);
    const proPlusIds = priceIds.pro_plus_ids || [priceIds.pro_plus].filter(Boolean);
    console.info("SUBSCRIPTION_PRICE_DIAGNOSTIC", JSON.stringify({
      stripeCustomerId: result.stripeCustomerId || subscription?.stripe_customer_id || null,
      stripeSubscriptionId: result.stripeSubscriptionId || null,
      activeSubscriptionStatus: result.activeSubscriptionStatus || "inactive",
      activePriceIds,
      proPriceConfigured: proIds.length > 0,
      proPlusPriceConfigured: proPlusIds.length > 0,
      matchesProPrice: activePriceIds.some((priceId) => proIds.includes(priceId)),
      matchesProPlusPrice: activePriceIds.some((priceId) => proPlusIds.includes(priceId)),
      normalizedTier: result.normalization?.tier || result.subscription?.plan || "free",
    }));
    logSync({
      source: force ? "account_return" : "stale_cache",
      userId: user.id,
      stripeCustomerId: result.subscription?.stripe_customer_id || subscription?.stripe_customer_id || null,
      stripeSubscriptionId: result.subscription?.stripe_subscription_id || null,
      stripePriceId: result.subscription?.stripe_price_id || null,
      normalizedTier: result.subscription?.plan || "free",
      subscriptionStatus: result.subscription?.subscription_status || "inactive",
      databaseChanged: result.changed,
      stripeCustomerFound: result.customerFound,
      proPriceMatch: activePriceIds.some((priceId) => proIds.includes(priceId)),
      proPlusPriceMatch: activePriceIds.some((priceId) => proPlusIds.includes(priceId)),
      configuredProPriceActive: catalog.proPriceActive,
      configuredProPlusPriceActive: catalog.proPlusPriceActive,
      productFallbackAvailable: catalog.productFallbackAvailable,
      priceCatalogValidationError: catalog.validationErrorCode,
      databaseTierBefore: subscription?.plan || "free",
      databaseTierAfter: result.subscription?.plan || "free",
      aiEntitlement: result.subscription?.plan === "pro_plus" && new Set(["active", "trialing"]).has(result.subscription?.subscription_status),
      tierResolution: result.normalization?.resolution || "no_active_subscription",
    });
    return sendResponse(res, 200, getStatusResponse(result.subscription, priceIds));
  } catch (error) {
    logSubscriptionStatusError({
      error,
      stage: error.code === "SUPABASE_ENVIRONMENT_MISSING" || error.subscriptionWriteFailed
        ? "database_write"
        : error.code === "stripe_price_config_invalid"
          ? "price_catalog"
          : "stripe_reconciliation",
      subscription,
      userId: user.id,
      priceIds,
    });
    return sendResponse(res, 200, getFallbackResponse(
      subscription,
      priceIds,
      error.code || "subscription_reconciliation_failed",
    ));
  }
}

module.exports = async function handler(req, res) {
  try {
    return await handleRequest(req, res);
  } catch (error) {
    console.error("Subscription status unexpected error:", error.message);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    return sendResponse(res, 500, { error: "Unable to load subscription status", code: "subscription_status_failed" });
  }
};

module.exports._test = { getFallbackResponse, getStatusResponse, handleRequest };
