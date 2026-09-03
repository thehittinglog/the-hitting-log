const Stripe = require("stripe");
const {
  getAuthenticatedUserSubscription,
  getBearerToken,
  requireSupabasePublicConfig,
  requireSupabaseServerConfig,
  verifySupabaseUserWithDetails,
} = require("../lib/supabase-server");
const { getEntitlements, getPlanForSubscription, getStripePriceIds } = require("../lib/membership");
const { isReconciliationDue, reconcileSubscription } = require("../lib/subscription-reconciliation");

const FREE_PLAN_RESPONSE = Object.freeze({
  plan: "free",
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
  return {
    plan,
    status,
    entitlements: getEntitlements(plan),
    subscription: {
      plan,
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

async function handleRequest(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendResponse(res, 405, { error: "Method not allowed", code: "method_not_allowed" });
  }

  try {
    requireSupabasePublicConfig();
  } catch (error) {
    console.error("Subscription status Supabase configuration error:", error.message);
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
    console.error("Subscription status authentication error:", error.message);
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
    console.error("Subscription status database lookup failed:", error.message);
    return sendResponse(res, 500, { error: "Unable to load subscription status", code: "subscription_status_failed" });
  }

  const priceIds = getStripePriceIds();
  const force = req.query?.reconcile === "1";
  if (!isReconciliationDue(subscription, { force, priceIds })) {
    return sendResponse(res, 200, getStatusResponse(subscription, priceIds));
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
  if (!stripeSecretKey || !priceIds.pro || !priceIds.pro_plus) {
    console.error("Subscription reconciliation configuration is incomplete.");
    return sendResponse(res, 502, { error: "Stripe subscription lookup failed", code: "stripe_lookup_failed" });
  }

  try {
    requireSupabaseServerConfig();
    const result = await reconcileSubscription(new Stripe(stripeSecretKey), user, subscription, priceIds);
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
    });
    return sendResponse(res, 200, getStatusResponse(result.subscription, priceIds));
  } catch (error) {
    console.error("Subscription reconciliation failed:", error.message);
    const databaseFailure = error.code === "subscription_upsert_failed";
    return sendResponse(res, databaseFailure ? 500 : 502, {
      error: databaseFailure ? "Unable to load subscription status" : "Stripe subscription lookup failed",
      code: databaseFailure ? "subscription_status_failed" : "stripe_lookup_failed",
    });
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

module.exports._test = { getStatusResponse };
