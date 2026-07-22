const Stripe = require("stripe");
const {
  getSubscriptionBy,
  isValidUserId,
  requireSupabaseServerConfig,
  upsertSubscription,
} = require("../lib/supabase-server");

const HANDLED_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);
const PRO_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

function objectId(value) {
  return typeof value === "string" ? value : value?.id || null;
}

function unixTimestampToIso(value) {
  return Number.isFinite(value) ? new Date(value * 1000).toISOString() : null;
}

function getCurrentPeriodEnd(subscription) {
  const itemPeriodEnds = (subscription.items?.data || [])
    .map((item) => item.current_period_end)
    .filter(Number.isFinite);

  if (itemPeriodEnds.length > 0) {
    return Math.max(...itemPeriodEnds);
  }

  return subscription.current_period_end || null;
}

function getCurrentPeriodStart(subscription) {
  const itemPeriodStarts = (subscription.items?.data || [])
    .map((item) => item.current_period_start)
    .filter(Number.isFinite);

  if (itemPeriodStarts.length > 0) {
    return Math.min(...itemPeriodStarts);
  }

  return subscription.current_period_start || null;
}

function getPriceId(subscription) {
  const firstItem = subscription.items?.data?.[0];
  return objectId(firstItem?.price) || firstItem?.pricing?.price_details?.price || null;
}

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

async function syncSubscription(subscription, hintedUserId) {
  const userId = await resolveSupabaseUserId(subscription, hintedUserId);
  const status = subscription.status || "inactive";
  const priceId = getPriceId(subscription);

  await upsertSubscription({
    user_id: userId,
    stripe_customer_id: objectId(subscription.customer),
    stripe_subscription_id: objectId(subscription.id),
    subscription_status: status,
    stripe_price_id: priceId,
    current_period_start: unixTimestampToIso(getCurrentPeriodStart(subscription)),
    current_period_end: unixTimestampToIso(getCurrentPeriodEnd(subscription)),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    created_at: unixTimestampToIso(subscription.created) || new Date().toISOString(),
    plan:
      PRO_SUBSCRIPTION_STATUSES.has(status) && priceId === process.env.STRIPE_PRICE_ID
        ? "pro"
        : "free",
  });
}

async function retrieveSubscription(stripe, subscriptionId) {
  if (!subscriptionId) {
    throw new Error("Stripe event is missing a subscription ID.");
  }

  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
}

async function processEvent(stripe, event) {
  const stripeObject = event.data.object;

  if (event.type === "checkout.session.completed") {
    const subscription = await retrieveSubscription(stripe, objectId(stripeObject.subscription));
    const hintedUserId =
      stripeObject.metadata?.supabase_user_id || stripeObject.client_reference_id || null;
    await syncSubscription(subscription, hintedUserId);
    return;
  }

  if (event.type.startsWith("customer.subscription.")) {
    const subscription =
      event.type === "customer.subscription.deleted"
        ? stripeObject
        : await retrieveSubscription(stripe, objectId(stripeObject.id));
    await syncSubscription(subscription);
    return;
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const subscriptionId = getInvoiceSubscriptionId(stripeObject);

    if (!subscriptionId) {
      return;
    }

    const subscription = await retrieveSubscription(stripe, subscriptionId);
    await syncSubscription(subscription);
  }
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripePriceId = process.env.STRIPE_PRICE_ID;

  try {
    requireSupabaseServerConfig();
  } catch (error) {
    console.error("Stripe webhook Supabase configuration error:", error.message);
    return res.status(500).json({
      error: "Webhook configuration is incomplete.",
      code: "missing_supabase_config",
    });
  }

  if (!stripeSecretKey || !webhookSecret || !stripePriceId) {
    const missingVariables = [
      ...(!stripeSecretKey ? ["STRIPE_SECRET_KEY"] : []),
      ...(!webhookSecret ? ["STRIPE_WEBHOOK_SECRET"] : []),
      ...(!stripePriceId ? ["STRIPE_PRICE_ID"] : []),
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
