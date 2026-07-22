const {
  getAuthenticatedUserSubscription,
  getBearerToken,
  requireSupabasePublicConfig,
  verifySupabaseUserWithDetails,
} = require("../lib/supabase-server");

const ENDPOINT = "/api/subscription-status";
const FREE_PLAN_RESPONSE = {
  plan: "free",
  status: "inactive",
  subscription: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
};

function sendResponse(res, statusCode, body) {
  console.info("Subscription status HTTP status:", statusCode);
  console.info("Subscription status final response:", body);
  return res.status(statusCode).json(body);
}

async function handleRequest(req, res) {
  console.info("Subscription status requested endpoint:", ENDPOINT);
  console.info("Subscription status request method:", req.method);
  const hasAuthorizationHeader = Boolean(req.headers.authorization || req.headers.Authorization);
  console.info("Subscription status Authorization header exists:", hasAuthorizationHeader);
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendResponse(res, 405, {
      error: "Method not allowed",
      code: "method_not_allowed",
    });
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
  console.info("Subscription status bearer token extracted:", Boolean(accessToken));
  console.info("Subscription status Stripe queried:", false);

  if (!accessToken) {
    console.warn("Subscription status authenticated user ID: unavailable");
    return sendResponse(res, 401, {
      error: "Missing authentication token",
      code: "missing_auth_token",
    });
  }

  let authentication;

  try {
    authentication = await verifySupabaseUserWithDetails(accessToken);
  } catch (error) {
    console.error("Subscription status Supabase authentication error:", error.message);
    console.info("Subscription status auth.getUser(token) succeeded:", false);
    return sendResponse(res, 500, {
      error: "Unable to load subscription status",
      code: "subscription_status_failed",
    });
  }

  console.info(
    "Subscription status auth.getUser(token) succeeded:",
    Boolean(authentication.user)
  );

  if (!authentication.user) {
    console.error("Subscription status Supabase authentication error:", authentication.error);
    console.warn("Subscription status authenticated user ID: unavailable");
    return sendResponse(res, 401, {
      error: "Invalid or expired authentication token",
      code: "invalid_auth_token",
    });
  }

  const user = authentication.user;
  console.info("Subscription status authenticated user ID:", user.id);

  let subscription;

  try {
    subscription = await getAuthenticatedUserSubscription(accessToken, user.id);
  } catch (error) {
    console.error("Subscription status Supabase subscription error:", error.message);
    return sendResponse(res, 500, {
      error: "Unable to load subscription status",
      code: "subscription_status_failed",
    });
  }

  console.info("Subscription status subscription record exists:", Boolean(subscription));
  console.info("Subscription status Stripe customer ID exists:", Boolean(subscription?.stripe_customer_id));

  const status = subscription?.subscription_status || "inactive";
  const hasActiveSubscription = new Set(["active", "trialing"]).has(status);

  if (
    !subscription ||
    !subscription.stripe_customer_id ||
    !subscription.stripe_subscription_id ||
    !hasActiveSubscription
  ) {
    return sendResponse(res, 200, FREE_PLAN_RESPONSE);
  }

  const plan = subscription.plan === "pro" ? "pro" : "free";
  const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;
  const currentPeriodEnd = subscription.current_period_end || null;

  return sendResponse(res, 200, {
    plan,
    status,
    subscription: {
      plan,
      status,
      hasStripeCustomer: true,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    },
    cancelAtPeriodEnd,
    currentPeriodEnd,
  });
}

module.exports = async function handler(req, res) {
  try {
    return await handleRequest(req, res);
  } catch (error) {
    console.error("Subscription status unexpected error:", error.message);
    res.setHeader("Cache-Control", "no-store");
    return sendResponse(res, 500, {
      error: "Unable to load subscription status",
      code: "subscription_status_failed",
    });
  }
};
