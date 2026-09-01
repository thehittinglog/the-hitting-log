const Stripe = require("stripe");
const {
  getAuthenticatedUserSubscription,
  getBearerToken,
  requireSupabasePublicConfig,
  requireSupabaseServerConfig,
  upsertSubscription,
  verifySupabaseUserWithDetails,
} = require("../lib/supabase-server");
const {
  MEMBERSHIP_PLANS,
  RECONCILABLE_SUBSCRIPTION_STATUSES,
  getEntitlements,
  getPlanForPriceId,
  getPlanForSubscription,
  getStripePriceIds,
} = require("../lib/membership");

const ENDPOINT = "/api/subscription-status";
const SUBSCRIPTION_STATUS_PRIORITY = RECONCILABLE_SUBSCRIPTION_STATUSES;
const LOCAL_SUBSCRIPTION_STATUSES = new Set([
  ...RECONCILABLE_SUBSCRIPTION_STATUSES,
  "canceled",
  "incomplete_expired",
]);
const FREE_PLAN_RESPONSE = {
  plan: "free",
  status: "inactive",
  entitlements: getEntitlements("free"),
  subscription: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
};

function sendResponse(res, statusCode, body) {
  console.info("Subscription status HTTP status:", statusCode);
  console.info("Subscription status final response:", body);
  return res.status(statusCode).json(body);
}

function objectId(value) {
  return typeof value === "string" ? value : value?.id || null;
}

function unixTimestampToIso(value) {
  return Number.isFinite(value) ? new Date(value * 1000).toISOString() : null;
}

function getSubscriptionPeriod(subscription, field) {
  const itemPeriods = (subscription.items?.data || [])
    .map((item) => item[field])
    .filter(Number.isFinite);

  if (itemPeriods.length > 0) {
    return field === "current_period_start"
      ? Math.min(...itemPeriods)
      : Math.max(...itemPeriods);
  }

  return subscription[field] || null;
}

function getPriceId(subscription) {
  const firstItem = subscription.items?.data?.[0];
  return objectId(firstItem?.price) || firstItem?.pricing?.price_details?.price || null;
}

function getLocalStatusResponse(subscription, priceIds = getStripePriceIds()) {
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

function isUsableLocalSubscription(subscription, priceIds) {
  const pricePlan = getPlanForPriceId(subscription?.stripe_price_id, priceIds);
  const expectedPlan = getPlanForSubscription(subscription, priceIds);
  const storedPlan = [MEMBERSHIP_PLANS.PRO, MEMBERSHIP_PLANS.PRO_PLUS].includes(subscription?.plan)
    ? subscription.plan
    : MEMBERSHIP_PLANS.FREE;

  return Boolean(
    subscription?.stripe_customer_id &&
      subscription?.stripe_subscription_id &&
      LOCAL_SUBSCRIPTION_STATUSES.has(subscription.subscription_status) &&
      pricePlan !== MEMBERSHIP_PLANS.FREE &&
      storedPlan === expectedPlan
  );
}

function addCustomerId(customerIds, value) {
  const customerId = objectId(value);

  if (customerId && !customerIds.includes(customerId)) {
    customerIds.push(customerId);
  }
}

async function findEmailCustomerIds(stripe, user) {
  const customerIds = [];
  const userEmail = String(user.email || "").trim().toLowerCase();

  if (userEmail) {
    const customers = await stripe.customers.list({ email: userEmail, limit: 100 });
    const orderedCustomers = [...customers.data].sort((left, right) => {
      const leftMatchesUser = left.metadata?.supabase_user_id === user.id ? 1 : 0;
      const rightMatchesUser = right.metadata?.supabase_user_id === user.id ? 1 : 0;
      return rightMatchesUser - leftMatchesUser || (right.created || 0) - (left.created || 0);
    });

    for (const customer of orderedCustomers) {
      if (!customer.deleted) {
        addCustomerId(customerIds, customer.id);
      }
    }
  }

  return customerIds;
}

async function findCheckoutSessionCustomerIds(stripe, user) {
  const customerIds = [];
  const userEmail = String(user.email || "").trim().toLowerCase();

  const sessions = await stripe.checkout.sessions.list({ limit: 100 });

  for (const session of sessions.data) {
    const sessionEmail = String(
      session.customer_details?.email || session.customer_email || ""
    ).trim().toLowerCase();
    const matchesUser =
      session.client_reference_id === user.id ||
      session.metadata?.supabase_user_id === user.id ||
      (userEmail && sessionEmail === userEmail);

    if (matchesUser) {
      addCustomerId(customerIds, session.customer);
    }
  }

  return customerIds;
}

function selectRelevantSubscription(subscriptions, priceIds) {
  const candidates = subscriptions
    .filter((subscription) => getPlanForPriceId(getPriceId(subscription), priceIds) !== MEMBERSHIP_PLANS.FREE)
    .filter((subscription) => SUBSCRIPTION_STATUS_PRIORITY.includes(subscription.status));

  return candidates.sort((left, right) => {
    const statusDifference =
      SUBSCRIPTION_STATUS_PRIORITY.indexOf(left.status) -
      SUBSCRIPTION_STATUS_PRIORITY.indexOf(right.status);
    return statusDifference || (right.created || 0) - (left.created || 0);
  })[0] || null;
}

async function findRelevantStripeSubscription(stripe, customerIds, priceIds) {
  let customerFound = false;

  for (const customerId of customerIds) {
    let subscriptions;

    try {
      subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
        expand: ["data.items.data.price"],
      });
      customerFound = true;
    } catch (error) {
      if (error.code === "resource_missing") {
        continue;
      }

      throw error;
    }

    const subscription = selectRelevantSubscription(subscriptions.data, priceIds);

    if (subscription) {
      return { customerFound, subscription };
    }
  }

  return { customerFound, subscription: null };
}

async function reconcileSubscription(stripe, user, localSubscription, priceIds) {
  let customerFound = false;
  let stripeSubscription = null;
  const localCustomerIds = [];
  addCustomerId(localCustomerIds, localSubscription?.stripe_customer_id);

  if (localCustomerIds.length > 0) {
    const localResult = await findRelevantStripeSubscription(
      stripe,
      localCustomerIds,
      priceIds
    );
    customerFound = customerFound || localResult.customerFound;
    stripeSubscription = localResult.subscription;
  }

  if (!stripeSubscription) {
    const emailCustomerIds = await findEmailCustomerIds(stripe, user);
    const emailResult = await findRelevantStripeSubscription(
      stripe,
      emailCustomerIds,
      priceIds
    );
    customerFound = customerFound || emailResult.customerFound;
    stripeSubscription = emailResult.subscription;
  }

  if (!stripeSubscription) {
    const checkoutCustomerIds = await findCheckoutSessionCustomerIds(stripe, user);
    const checkoutResult = await findRelevantStripeSubscription(
      stripe,
      checkoutCustomerIds,
      priceIds
    );
    customerFound = customerFound || checkoutResult.customerFound;
    stripeSubscription = checkoutResult.subscription;
  }

  console.info("Subscription reconciliation Stripe customer found:", customerFound);
  console.info("Subscription reconciliation Stripe subscription found:", Boolean(stripeSubscription));

  if (!stripeSubscription) {
    return null;
  }

  const status = stripeSubscription.status || "inactive";
  const priceId = getPriceId(stripeSubscription);
  const plan = getPlanForSubscription({
    subscription_status: status,
    stripe_price_id: priceId,
  }, priceIds);

  try {
    await upsertSubscription({
      user_id: user.id,
      stripe_customer_id: objectId(stripeSubscription.customer),
      stripe_subscription_id: objectId(stripeSubscription.id),
      stripe_price_id: priceId,
      subscription_status: status,
      cancel_at_period_end: Boolean(stripeSubscription.cancel_at_period_end),
      current_period_start: unixTimestampToIso(
        getSubscriptionPeriod(stripeSubscription, "current_period_start")
      ),
      current_period_end: unixTimestampToIso(
        getSubscriptionPeriod(stripeSubscription, "current_period_end")
      ),
      created_at: unixTimestampToIso(stripeSubscription.created) || new Date().toISOString(),
      plan,
    });
    console.info("Subscription reconciliation Supabase upsert succeeded:", true);
  } catch (error) {
    console.info("Subscription reconciliation Supabase upsert succeeded:", false);
    error.code = "subscription_upsert_failed";
    throw error;
  }

  return {
    user_id: user.id,
    stripe_customer_id: objectId(stripeSubscription.customer),
    stripe_subscription_id: objectId(stripeSubscription.id),
    stripe_price_id: priceId,
    subscription_status: status,
    cancel_at_period_end: Boolean(stripeSubscription.cancel_at_period_end),
    current_period_start: unixTimestampToIso(
      getSubscriptionPeriod(stripeSubscription, "current_period_start")
    ),
    current_period_end: unixTimestampToIso(
      getSubscriptionPeriod(stripeSubscription, "current_period_end")
    ),
    plan,
  };
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

  if (!accessToken) {
    console.info("Subscription status Stripe queried:", false);
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
    console.info("Subscription status Stripe queried:", false);
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
    console.info("Subscription status Stripe queried:", false);
    console.error("Subscription status Supabase subscription error:", error.message);
    return sendResponse(res, 500, {
      error: "Unable to load subscription status",
      code: "subscription_status_failed",
    });
  }

  console.info("Subscription status subscription record exists:", Boolean(subscription));
  console.info("Subscription status Stripe customer ID exists:", Boolean(subscription?.stripe_customer_id));

  const priceIds = getStripePriceIds();

  if (isUsableLocalSubscription(subscription, priceIds)) {
    console.info("Subscription status Stripe queried:", false);
    const responseBody = getLocalStatusResponse(subscription, priceIds);
    console.info("Subscription status final plan and status:", responseBody.plan, responseBody.status);
    return sendResponse(res, 200, responseBody);
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

  if (!stripeSecretKey || !priceIds.pro || !priceIds.pro_plus) {
    console.info("Subscription status Stripe queried:", false);
    console.error("Subscription reconciliation configuration error: Stripe configuration is missing.");
    return sendResponse(res, 502, {
      error: "Stripe subscription lookup failed",
      code: "stripe_lookup_failed",
    });
  }

  try {
    requireSupabaseServerConfig();
  } catch (error) {
    console.info("Subscription status Stripe queried:", false);
    console.error("Subscription reconciliation Supabase configuration error:", error.message);
    return sendResponse(res, 500, {
      error: "Unable to load subscription status",
      code: "subscription_status_failed",
    });
  }

  console.info("Subscription status Stripe queried:", true);
  let reconciledSubscription;

  try {
    const stripe = new Stripe(stripeSecretKey);
    reconciledSubscription = await reconcileSubscription(
      stripe,
      user,
      subscription,
      priceIds
    );
  } catch (error) {
    console.error("Subscription reconciliation error:", error.message);

    if (error.code === "subscription_upsert_failed") {
      return sendResponse(res, 500, {
        error: "Unable to load subscription status",
        code: "subscription_status_failed",
      });
    }

    return sendResponse(res, 502, {
      error: "Stripe subscription lookup failed",
      code: "stripe_lookup_failed",
    });
  }

  if (!reconciledSubscription) {
    console.info("Subscription status final plan and status:", "free", "inactive");
    return sendResponse(res, 200, FREE_PLAN_RESPONSE);
  }

  const responseBody = getLocalStatusResponse(reconciledSubscription, priceIds);
  console.info("Subscription status final plan and status:", responseBody.plan, responseBody.status);
  return sendResponse(res, 200, responseBody);
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
