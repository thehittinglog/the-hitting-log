const {
  getBearerToken,
  getSubscriptionBy,
  requireSupabaseServerConfig,
  verifySupabaseUser,
} = require("../lib/supabase-server");

const ENDPOINT = "/api/subscription-status";
const FREE_PLAN_RESPONSE = {
  plan: "free",
  status: "inactive",
  subscription: null,
};

function sendResponse(res, statusCode, body) {
  console.info("Subscription status HTTP status:", statusCode);
  console.info("Subscription status final response:", body);
  return res.status(statusCode).json(body);
}

module.exports = async function handler(req, res) {
  console.info("Subscription status requested endpoint:", ENDPOINT);
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendResponse(res, 405, { error: "Method not allowed." });
  }

  try {
    requireSupabaseServerConfig({ requirePublicKey: true });
  } catch (error) {
    console.error("Subscription status Supabase configuration error:", error);
    return sendResponse(res, 500, {
      error: "Subscription verification is not configured.",
    });
  }

  const accessToken = getBearerToken(req);

  if (!accessToken) {
    console.warn("Subscription status authenticated user ID: unavailable");
    return sendResponse(res, 401, { error: "You must be signed in to view subscription status." });
  }

  let user;

  try {
    user = await verifySupabaseUser(accessToken);
  } catch (error) {
    console.error("Subscription status authentication error:", error);
    return sendResponse(res, 502, {
      error: "Your login could not be verified right now. Please try again.",
    });
  }

  if (!user) {
    console.warn("Subscription status authenticated user ID: unavailable");
    return sendResponse(res, 401, { error: "Your login session has expired. Please sign in again." });
  }

  console.info("Subscription status authenticated user ID:", user.id);

  let subscription;

  try {
    subscription = await getSubscriptionBy("user_id", user.id);
  } catch (error) {
    console.error("Subscription status Supabase error:", error);
    return sendResponse(res, 502, {
      error: "Your subscription status could not be verified. Please try again.",
    });
  }

  console.info("Subscription status subscription record exists:", Boolean(subscription));
  console.info("Subscription status Stripe customer ID exists:", Boolean(subscription?.stripe_customer_id));
  console.info("Subscription status Stripe queried:", false);

  if (!subscription || !subscription.stripe_customer_id) {
    return sendResponse(res, 200, FREE_PLAN_RESPONSE);
  }

  const status = subscription.subscription_status || "inactive";
  const plan = subscription.plan === "pro" ? "pro" : "free";

  return sendResponse(res, 200, {
    plan,
    status,
    subscription: {
      plan,
      status,
      hasStripeCustomer: true,
      currentPeriodEnd: subscription.current_period_end || null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    },
  });
};
