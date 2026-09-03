const {
  MEMBERSHIP_PLANS,
  RECONCILABLE_SUBSCRIPTION_STATUSES,
  getPlanForPriceId,
  getPlanForSubscription,
  isEntitledSubscriptionStatus,
} = require("./membership");
const { upsertSubscription } = require("./supabase-server");
const {
  objectId,
  getTierFromStripeSubscription,
  getActivePriceIds,
  selectCurrentSubscription,
  selectRelevantSubscription,
  subscriptionRecordChanged,
  toSubscriptionRecord,
} = require("./stripe-subscription");

const LOCAL_SUBSCRIPTION_STATUSES = new Set([
  ...RECONCILABLE_SUBSCRIPTION_STATUSES,
  "canceled",
  "incomplete_expired",
]);
const DEFAULT_RECONCILIATION_MAX_AGE_MS = 5 * 60 * 1000;

function isUsableLocalSubscription(subscription, priceIds) {
  if (
    subscription?.plan === MEMBERSHIP_PLANS.FREE &&
    subscription?.subscription_status === "inactive" &&
    !subscription?.stripe_subscription_id &&
    !subscription?.stripe_price_id
  ) {
    return true;
  }

  const pricePlan = getPlanForPriceId(subscription?.stripe_price_id, priceIds);
  const expectedPlan = isEntitledSubscriptionStatus(subscription?.subscription_status)
    ? pricePlan === MEMBERSHIP_PLANS.FREE
      ? getPlanForSubscription(subscription, priceIds)
      : pricePlan
    : MEMBERSHIP_PLANS.FREE;
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

function isReconciliationDue(subscription, {
  force = false,
  now = Date.now(),
  maxAgeMs = DEFAULT_RECONCILIATION_MAX_AGE_MS,
  priceIds,
} = {}) {
  if (force || !isUsableLocalSubscription(subscription, priceIds)) return true;
  const lastUpdated = Date.parse(subscription.updated_at || "");
  return !Number.isFinite(lastUpdated) || now - lastUpdated >= maxAgeMs;
}

function addCustomerId(customerIds, value) {
  const customerId = objectId(value);
  if (customerId && !customerIds.includes(customerId)) customerIds.push(customerId);
}

async function findEmailCustomerIds(stripe, user) {
  const customerIds = [];
  const userEmail = String(user.email || "").trim().toLowerCase();
  if (!userEmail) return customerIds;

  const customers = await stripe.customers.list({ email: userEmail, limit: 100 });
  const orderedCustomers = [...customers.data].sort((left, right) => {
    const leftMatchesUser = left.metadata?.supabase_user_id === user.id ? 1 : 0;
    const rightMatchesUser = right.metadata?.supabase_user_id === user.id ? 1 : 0;
    return rightMatchesUser - leftMatchesUser || (right.created || 0) - (left.created || 0);
  });
  for (const customer of orderedCustomers) {
    const mappedUserId = customer.metadata?.supabase_user_id;
    if (!customer.deleted && (!mappedUserId || mappedUserId === user.id)) {
      addCustomerId(customerIds, customer.id);
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
      session.customer_details?.email || session.customer_email || "",
    ).trim().toLowerCase();
    const mappedUserId = session.client_reference_id || session.metadata?.supabase_user_id || null;
    if (mappedUserId === user.id || (!mappedUserId && userEmail && sessionEmail === userEmail)) {
      addCustomerId(customerIds, session.customer);
    }
  }
  return customerIds;
}

async function findRelevantStripeSubscription(stripe, customerIds, priceIds, catalog = {}) {
  let customerFound = false;
  let unmatchedSubscription = null;
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
      if (error.code === "resource_missing") continue;
      throw error;
    }
    const currentSubscription = selectCurrentSubscription(subscriptions.data);
    if (
      currentSubscription &&
      getTierFromStripeSubscription(currentSubscription, priceIds, catalog).priceTier !== MEMBERSHIP_PLANS.FREE
    ) {
      return { customerFound, subscription: currentSubscription };
    }
    unmatchedSubscription = unmatchedSubscription || currentSubscription;
  }
  return { customerFound, subscription: null, unmatchedSubscription };
}

async function reconcileSubscription(stripe, user, localSubscription, priceIds, catalog = {}) {
  let customerFound = false;
  let stripeSubscription = null;
  let unmatchedSubscription = null;
  const localCustomerIds = [];
  addCustomerId(localCustomerIds, localSubscription?.stripe_customer_id);
  if (localCustomerIds.length) {
    const result = await findRelevantStripeSubscription(stripe, localCustomerIds, priceIds, catalog);
    customerFound = customerFound || result.customerFound;
    stripeSubscription = result.subscription;
    unmatchedSubscription = result.unmatchedSubscription || unmatchedSubscription;
  }

  if (!stripeSubscription || !RECONCILABLE_SUBSCRIPTION_STATUSES.includes(stripeSubscription.status)) {
    const emailCustomerIds = await findEmailCustomerIds(stripe, user);
    const result = await findRelevantStripeSubscription(stripe, emailCustomerIds, priceIds, catalog);
    customerFound = customerFound || result.customerFound;
    unmatchedSubscription = result.unmatchedSubscription || unmatchedSubscription;
    stripeSubscription = selectRelevantSubscription(
      [stripeSubscription, result.subscription].filter(Boolean),
      priceIds,
      catalog,
    );
  }

  if (!stripeSubscription || !RECONCILABLE_SUBSCRIPTION_STATUSES.includes(stripeSubscription.status)) {
    const sessionCustomerIds = await findCheckoutSessionCustomerIds(stripe, user);
    const result = await findRelevantStripeSubscription(stripe, sessionCustomerIds, priceIds, catalog);
    customerFound = customerFound || result.customerFound;
    unmatchedSubscription = result.unmatchedSubscription || unmatchedSubscription;
    stripeSubscription = selectRelevantSubscription(
      [stripeSubscription, result.subscription].filter(Boolean),
      priceIds,
      catalog,
    );
  }

  if (!stripeSubscription && unmatchedSubscription) {
    const normalization = getTierFromStripeSubscription(unmatchedSubscription, priceIds, catalog);
    return {
      customerFound,
      subscription: localSubscription || {
        user_id: user.id,
        stripe_customer_id: objectId(unmatchedSubscription.customer),
        stripe_subscription_id: null,
        stripe_price_id: null,
        subscription_status: "inactive",
        plan: MEMBERSHIP_PLANS.FREE,
      },
      changed: false,
      normalization,
      activePriceIds: getActivePriceIds(unmatchedSubscription),
      unrecognizedPrice: true,
      stripeCustomerId: objectId(unmatchedSubscription.customer),
      stripeSubscriptionId: objectId(unmatchedSubscription.id),
      activeSubscriptionStatus: unmatchedSubscription.status || "inactive",
    };
  }

  if (!stripeSubscription) {
    const freeRecord = {
      user_id: user.id,
      stripe_customer_id: localSubscription?.stripe_customer_id || null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      subscription_status: "inactive",
      cancel_at_period_end: false,
      current_period_start: null,
      current_period_end: null,
      created_at: localSubscription?.created_at || new Date().toISOString(),
      plan: MEMBERSHIP_PLANS.FREE,
    };
    const changed = subscriptionRecordChanged(localSubscription, freeRecord);
    try {
      await upsertSubscription(freeRecord);
    } catch (error) {
      error.code = "subscription_upsert_failed";
      throw error;
    }
    return {
      customerFound,
      subscription: freeRecord,
      changed,
      normalization: null,
      activePriceIds: [],
      stripeCustomerId: freeRecord.stripe_customer_id,
      stripeSubscriptionId: null,
      activeSubscriptionStatus: "inactive",
    };
  }

  const normalization = getTierFromStripeSubscription(stripeSubscription, priceIds, catalog);
  const record = toSubscriptionRecord(stripeSubscription, user.id, priceIds, catalog);
  const changed = subscriptionRecordChanged(localSubscription, record);
  try {
    await upsertSubscription(record);
  } catch (error) {
    error.code = "subscription_upsert_failed";
    throw error;
  }
  return {
    customerFound,
    subscription: record,
    changed,
    normalization,
    activePriceIds: getActivePriceIds(stripeSubscription),
    stripeCustomerId: objectId(stripeSubscription.customer),
    stripeSubscriptionId: objectId(stripeSubscription.id),
    activeSubscriptionStatus: stripeSubscription.status || "inactive",
  };
}

module.exports = {
  DEFAULT_RECONCILIATION_MAX_AGE_MS,
  findRelevantStripeSubscription,
  isReconciliationDue,
  isUsableLocalSubscription,
  reconcileSubscription,
};
