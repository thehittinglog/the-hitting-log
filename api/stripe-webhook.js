const Stripe = require("stripe");
const {
  getSubscriptionBy,
  isValidUserId,
  requireSupabaseServerConfig,
  upsertSubscription,
} = require("../lib/supabase-server");
const {
  getStripePriceIds,
} = require("../lib/membership");
const {
  objectId,
  getTierFromStripeSubscription,
  loadStripePriceCatalog,
  selectRelevantSubscription,
  subscriptionRecordChanged,
  toSubscriptionRecord,
} = require("../lib/stripe-subscription");

const HANDLED_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

function getInvoiceSubscriptionId(invoice) {
  if (invoice.parent?.type === "subscription_details") {
    return objectId(invoice.parent.subscription_details?.subscription);
  }

  return objectId(invoice.subscription);
}

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length > 0) {
    return Buffer.concat(chunks);
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return Buffer.from(req.body);
  }

  throw new Error("The webhook request body was not available in its original form.");
}

async function resolveSupabaseUserId(subscription, hintedUserId) {
  const stripeSubscriptionId = objectId(subscription.id);
  const stripeCustomerId = objectId(subscription.customer);
  const metadataUserId = isValidUserId(subscription.metadata?.supabase_user_id)
    ? subscription.metadata.supabase_user_id
    : null;
  const trustedHint = isValidUserId(hintedUserId) ? hintedUserId : null;
  const subscriptionRow = stripeSubscriptionId
    ? await getSubscriptionBy("stripe_subscription_id", stripeSubscriptionId)
    : null;
  const customerRow = stripeCustomerId
    ? await getSubscriptionBy("stripe_customer_id", stripeCustomerId)
    : null;
  const candidateUserIds = new Set(
    [metadataUserId, trustedHint, subscriptionRow?.user_id, customerRow?.user_id].filter(Boolean),
  );

  if (candidateUserIds.size !== 1) {
    throw new Error(
      candidateUserIds.size === 0
        ? "Stripe subscription is missing its Supabase user mapping."
        : "Stripe subscription has conflicting Supabase user mappings.",
    );
  }

  return [...candidateUserIds][0];
}

async function syncSubscription(subscription, hintedUserId, eventType = "unknown", priceIds = getStripePriceIds(), catalog = {}) {
  const userId = await resolveSupabaseUserId(subscription, hintedUserId);
  const existing = await getSubscriptionBy("user_id", userId);
  const normalized = getTierFromStripeSubscription(subscription, priceIds, catalog);
  const record = toSubscriptionRecord(subscription, userId, priceIds, catalog);
  const changed = subscriptionRecordChanged(existing, record);
  await upsertSubscription(record);
  console.info("subscription_sync", JSON.stringify({
    source: "webhook",
    eventType,
    userId,
    stripeCustomerId: record.stripe_customer_id,
    stripeSubscriptionId: record.stripe_subscription_id,
    stripePriceId: record.stripe_price_id,
    normalizedTier: record.plan,
    subscriptionStatus: record.subscription_status,
    databaseChanged: changed,
    proPriceMatch: normalized.proPriceMatch,
    proPlusPriceMatch: normalized.proPlusPriceMatch,
    tierResolution: normalized.resolution,
    databaseTierBefore: existing?.plan || "free",
    databaseTierAfter: record.plan,
    aiEntitlement: record.plan === "pro_plus" && new Set(["active", "trialing"]).has(record.subscription_status),
  }));
}

async function retrieveSubscription(stripe, subscriptionId) {
  if (!subscriptionId) {
    throw new Error("Stripe event is missing a subscription ID.");
  }

  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
}

async function retrieveCurrentCustomerSubscription(stripe, subscription, priceIds, catalog = {}) {
  const customerId = objectId(subscription?.customer);
  if (!customerId) return subscription;
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
    expand: ["data.items.data.price"],
  });
  return selectRelevantSubscription(subscriptions.data, priceIds, catalog) || subscription;
}

async function processEvent(stripe, event) {
  const stripeObject = event.data.object;
  const priceIds = getStripePriceIds();
  const catalog = await loadStripePriceCatalog(stripe, priceIds);

  if (event.type === "checkout.session.completed") {
    const subscription = await retrieveSubscription(stripe, objectId(stripeObject.subscription));
    const hintedUserId =
      stripeObject.metadata?.supabase_user_id || stripeObject.client_reference_id || null;
    await syncSubscription(subscription, hintedUserId, event.type, priceIds, catalog);
    return;
  }

  if (event.type.startsWith("customer.subscription.")) {
    const eventSubscription =
      event.type === "customer.subscription.deleted"
        ? stripeObject
        : await retrieveSubscription(stripe, objectId(stripeObject.id));
    const subscription = await retrieveCurrentCustomerSubscription(
      stripe,
      eventSubscription,
      priceIds,
      catalog,
    );
    await syncSubscription(subscription, null, event.type, priceIds, catalog);
    return;
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const subscriptionId = getInvoiceSubscriptionId(stripeObject);

    if (!subscriptionId) {
      return;
    }

    const invoiceSubscription = await retrieveSubscription(stripe, subscriptionId);
    const subscription = await retrieveCurrentCustomerSubscription(
      stripe,
      invoiceSubscription,
      priceIds,
      catalog,
    );
    await syncSubscription(subscription, null, event.type, priceIds, catalog);
  }
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceIds = getStripePriceIds();

  try {
    requireSupabaseServerConfig();
  } catch (error) {
    console.error("Stripe webhook Supabase configuration error:", error.message);
    return res.status(500).json({
      error: "Webhook configuration is incomplete.",
      code: "missing_supabase_config",
    });
  }

  if (!stripeSecretKey || !webhookSecret || !priceIds.pro || !priceIds.pro_plus) {
    const missingVariables = [
      ...(!stripeSecretKey ? ["STRIPE_SECRET_KEY"] : []),
      ...(!webhookSecret ? ["STRIPE_WEBHOOK_SECRET"] : []),
      ...(!priceIds.pro ? ["STRIPE_PRO_PRICE_ID (or legacy STRIPE_PRICE_ID)"] : []),
      ...(!priceIds.pro_plus ? ["STRIPE_PRO_PLUS_PRICE_ID"] : []),
    ];
    console.error(
      "Stripe webhook configuration error. Missing environment variables:",
      missingVariables.join(", ")
    );
    return res.status(500).json({
      error: "Webhook configuration is incomplete.",
      code: "missing_stripe_config",
    });
  }

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).json({ error: "Missing Stripe signature." });
  }

  const stripe = new Stripe(stripeSecretKey);
  let event;

  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return res.status(400).json({ error: "Invalid webhook signature." });
  }

  if (!HANDLED_EVENT_TYPES.has(event.type)) {
    return res.status(200).json({ received: true });
  }

  try {
    await processEvent(stripe, event);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook processing failed for ${event.type} (${event.id}):`, error);
    return res.status(500).json({ error: "Webhook processing failed." });
  }
}

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
module.exports._test = { processEvent, retrieveCurrentCustomerSubscription, syncSubscription };
