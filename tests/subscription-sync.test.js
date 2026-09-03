const assert = require("node:assert/strict");
const {
  getEntitlements,
  getPlanForSubscription,
  hasSubscriptionEntitlement,
} = require("../lib/membership");
const {
  getPriceId,
  getTierFromStripeSubscription,
  loadStripePriceCatalog,
  selectRelevantSubscription,
  subscriptionRecordChanged,
  toSubscriptionRecord,
} = require("../lib/stripe-subscription");
const {
  isReconciliationDue,
  reconcileSubscription,
} = require("../lib/subscription-reconciliation");

const priceIds = { pro: "price_pro", pro_plus: "price_pro_plus" };
const userId = "11111111-1111-4111-8111-111111111111";

function stripeSubscription({
  id = "sub_1",
  customer = "cus_1",
  price = priceIds.pro,
  status = "active",
  cancelAtPeriodEnd = false,
  created = 100,
  extraPrices = [],
  metadata,
  product = "prod_pro",
} = {}) {
  return {
    id,
    customer,
    status,
    cancel_at_period_end: cancelAtPeriodEnd,
    created,
    metadata,
    items: {
      data: [price, ...extraPrices].map((itemPrice) => ({
        price: { id: itemPrice, product: itemPrice === priceIds.pro_plus ? "prod_plus" : product },
        current_period_start: 100,
        current_period_end: 200,
      })),
    },
  };
}

// 1. Free -> Pro: Pro capabilities are active but AI remains denied.
let record = toSubscriptionRecord(stripeSubscription(), userId, priceIds);
assert.equal(record.plan, "pro");
assert.equal(getEntitlements(record.plan).fullStatistics, true);
assert.equal(hasSubscriptionEntitlement(record, "ai", priceIds), false);

// 2. Free -> Pro Plus: the configured Price ID grants AI.
record = toSubscriptionRecord(stripeSubscription({ price: priceIds.pro_plus }), userId, priceIds);
assert.equal(record.plan, "pro_plus");
assert.equal(hasSubscriptionEntitlement(record, "ai", priceIds), true);

// 3/4. Upgrade and subsequent subscription.updated deliveries preserve Pro Plus.
const oldPro = toSubscriptionRecord(stripeSubscription(), userId, priceIds);
const upgraded = toSubscriptionRecord(stripeSubscription({ price: priceIds.pro_plus }), userId, priceIds);
assert.equal(subscriptionRecordChanged(oldPro, upgraded), true);
assert.equal(subscriptionRecordChanged(upgraded, { ...upgraded }), false);
assert.equal(upgraded.plan, "pro_plus");

// Stripe can briefly include multiple items; Pro Plus must not be missed just
// because the Pro item is first.
const multiItem = stripeSubscription({ price: priceIds.pro, extraPrices: [priceIds.pro_plus] });
assert.equal(getPriceId(multiItem, priceIds), priceIds.pro_plus);
assert.equal(toSubscriptionRecord(multiItem, userId, priceIds).plan, "pro_plus");

// Exact production failure: the portal can select a different recurring Price
// under the configured Pro Plus product. Product identity is anchored by the
// configured prices, never inferred from its display name or amount.
const catalog = { proProductId: "prod_pro", proPlusProductId: "prod_plus" };
const portalProPlus = stripeSubscription({ price: "price_portal_plus", product: "prod_plus" });
const portalTier = getTierFromStripeSubscription(portalProPlus, priceIds, catalog);
assert.equal(portalTier.priceId, "price_portal_plus");
assert.equal(portalTier.proPlusPriceMatch, false);
assert.equal(portalTier.resolution, "configured_product");
assert.equal(portalTier.tier, "pro_plus");
assert.equal(toSubscriptionRecord(portalProPlus, userId, priceIds, catalog).plan, "pro_plus");

// 5. An effective downgrade changes the normalized tier and removes AI.
const downgraded = toSubscriptionRecord(stripeSubscription({ price: priceIds.pro }), userId, priceIds);
assert.equal(downgraded.plan, "pro");
assert.equal(hasSubscriptionEntitlement(downgraded, "ai", priceIds), false);

// 6. cancel_at_period_end keeps access; Stripe's canceled status removes it.
const ending = toSubscriptionRecord(stripeSubscription({
  price: priceIds.pro_plus,
  cancelAtPeriodEnd: true,
}), userId, priceIds);
assert.equal(ending.plan, "pro_plus");
const canceled = toSubscriptionRecord(stripeSubscription({
  price: priceIds.pro_plus,
  status: "canceled",
}), userId, priceIds);
assert.equal(canceled.plan, "free");
assert.equal(hasSubscriptionEntitlement(canceled, "ai", priceIds), false);

// 7. Duplicate normalization is idempotent; an older canceled subscription does
// not outrank the current active subscription.
assert.equal(subscriptionRecordChanged(upgraded, toSubscriptionRecord(
  stripeSubscription({ price: priceIds.pro_plus }), userId, priceIds,
)), false);
assert.equal(selectRelevantSubscription([
  stripeSubscription({ id: "sub_old", price: priceIds.pro_plus, status: "canceled", created: 50 }),
  stripeSubscription({ id: "sub_current", price: priceIds.pro, status: "active", created: 100 }),
], priceIds).id, "sub_current");

// A consistent database row is periodically checked, and payment-return flows
// can force an immediate check instead of trusting it forever.
const freshLocal = { ...oldPro, updated_at: new Date(1_000).toISOString() };
assert.equal(isReconciliationDue(freshLocal, { priceIds, now: 1_001, maxAgeMs: 100 }), false);
assert.equal(isReconciliationDue(freshLocal, { priceIds, force: true, now: 1_001 }), true);
assert.equal(isReconciliationDue(freshLocal, { priceIds, now: 1_101, maxAgeMs: 100 }), true);
assert.equal(isReconciliationDue({
  plan: "free",
  subscription_status: "inactive",
  stripe_subscription_id: null,
  stripe_price_id: null,
  updated_at: new Date(1_000).toISOString(),
}, { priceIds, now: 1_001, maxAgeMs: 100 }), false);

// 8. Stripe-active Pro Plus repairs a stale Pro database row.
const originalEnvironment = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  publicKey: process.env.SUPABASE_ANON_KEY,
  proPrice: process.env.STRIPE_PRO_PRICE_ID,
  proPlusPrice: process.env.STRIPE_PRO_PLUS_PRICE_ID,
};
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
process.env.SUPABASE_ANON_KEY = "public-test-key";
process.env.STRIPE_PRO_PRICE_ID = priceIds.pro;
process.env.STRIPE_PRO_PLUS_PRICE_ID = priceIds.pro_plus;
const writes = [];
const originalFetch = global.fetch;
global.fetch = async (_url, options = {}) => {
  if (options.method === "POST") writes.push(JSON.parse(options.body));
  return { ok: true, status: 201, text: async () => "[]" };
};

(async () => {
  try {
    const stripe = {
      subscriptions: {
        list: async () => ({ data: [portalProPlus] }),
      },
      customers: { list: async () => ({ data: [] }) },
      checkout: { sessions: { list: async () => ({ data: [] }) } },
    };
    const result = await reconcileSubscription(
      stripe,
      { id: userId, email: "player@example.com" },
      freshLocal,
      priceIds,
      catalog,
    );
    assert.equal(result.subscription.plan, "pro_plus");
    assert.equal(result.changed, true);
    assert.equal(writes[0].plan, "pro_plus");
    const { getStatusResponse } = require("../api/subscription-status")._test;
    const response = getStatusResponse(result.subscription, priceIds);
    assert.equal(response.plan, "pro_plus");
    assert.equal(response.displayName, "Pro Plus");
    assert.equal(response.entitlements.ai, true);

    // Price-catalog enrichment is optional. A temporary configured-price
    // lookup failure is represented in diagnostics instead of throwing and
    // taking down the Account endpoint.
    const partialCatalog = await loadStripePriceCatalog({
      prices: {
        retrieve: async (priceId) => {
          if (priceId === "price_catalog_plus") throw Object.assign(new Error("temporary"), { code: "api_error" });
          return { id: priceId, active: true, product: "prod_catalog_pro" };
        },
      },
    }, { pro: "price_catalog_pro", pro_plus: "price_catalog_plus" });
    assert.equal(partialCatalog.proPriceFound, true);
    assert.equal(partialCatalog.proPlusPriceFound, false);
    assert.equal(partialCatalog.validationErrorCode, "configured_price_lookup_failed");

    const { getFallbackResponse } = require("../api/subscription-status")._test;
    const proFallback = getFallbackResponse(freshLocal, priceIds, "api_error");
    assert.equal(proFallback.plan, "pro");
    assert.equal(proFallback.reconciliationPending, true);
    assert.equal(proFallback.entitlements.ai, false);
    const freeFallback = getFallbackResponse(null, priceIds, "missing_stripe_config");
    assert.equal(freeFallback.plan, "free");

    // The real authenticated route returns HTTP 200 with stored state when
    // reconciliation configuration is unavailable.
    const { handleRequest } = require("../api/subscription-status")._test;
    const originalStripeSecret = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    let databaseRows = [{ ...freshLocal, user_id: userId }];
    global.fetch = async (url) => {
      const body = String(url).includes("/auth/v1/user")
        ? { id: userId, email: "player@example.com" }
        : databaseRows;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(body),
        json: async () => body,
      };
    };
    const routeResult = { statusCode: null, body: null, headers: {} };
    const responseAdapter = {
      setHeader: (name, value) => { routeResult.headers[name] = value; },
      status: (statusCode) => {
        routeResult.statusCode = statusCode;
        return { json: (body) => { routeResult.body = body; return body; } };
      },
    };
    await handleRequest({
      method: "GET",
      headers: { authorization: "Bearer test-token" },
      query: { reconcile: "1" },
    }, responseAdapter);
    assert.equal(routeResult.statusCode, 200);
    assert.equal(routeResult.body.plan, "pro");
    assert.equal(routeResult.body.reconciliationPending, true);

    process.env.STRIPE_SECRET_KEY = "sk_test_subscription_status";
    routeResult.statusCode = null;
    routeResult.body = null;
    await handleRequest({
      method: "GET",
      headers: { authorization: "Bearer test-token" },
      query: { reconcile: "1" },
    }, responseAdapter, {
      createStripe: () => ({}),
      loadStripePriceCatalog: async () => ({
        proPriceFound: true,
        proPlusPriceFound: true,
        productFallbackAvailable: true,
      }),
      reconcileSubscription: async () => {
        throw Object.assign(new Error("Stripe temporarily unavailable"), {
          code: "api_error",
          statusCode: 503,
        });
      },
    });
    assert.equal(routeResult.statusCode, 200);
    assert.equal(routeResult.body.plan, "pro");
    assert.equal(routeResult.body.reconciliationError, "api_error");

    routeResult.statusCode = null;
    routeResult.body = null;
    await handleRequest({
      method: "GET",
      headers: { authorization: "Bearer test-token" },
      query: { reconcile: "1" },
    }, responseAdapter, {
      createStripe: () => ({}),
      loadStripePriceCatalog: async () => ({
        proPriceFound: true,
        proPlusPriceFound: true,
        proPriceActive: true,
        proPlusPriceActive: true,
        productFallbackAvailable: true,
      }),
      reconcileSubscription: async () => ({
        customerFound: true,
        changed: true,
        normalization: { resolution: "price_id" },
        subscription: upgraded,
      }),
    });
    assert.equal(routeResult.statusCode, 200);
    assert.equal(routeResult.body.plan, "pro_plus");
    assert.equal(routeResult.body.entitlements.ai, true);

    databaseRows = [];
    delete process.env.STRIPE_SECRET_KEY;
    routeResult.statusCode = null;
    routeResult.body = null;
    await handleRequest({
      method: "GET",
      headers: { authorization: "Bearer test-token" },
      query: { reconcile: "1" },
    }, responseAdapter);
    assert.equal(routeResult.statusCode, 200);
    assert.equal(routeResult.body.plan, "free");

    databaseRows = [{ ...freshLocal, user_id: userId }];
    process.env.STRIPE_SECRET_KEY = "sk_test_subscription_status";
    delete process.env.STRIPE_PRO_PLUS_PRICE_ID;
    routeResult.statusCode = null;
    routeResult.body = null;
    await handleRequest({
      method: "GET",
      headers: { authorization: "Bearer test-token" },
      query: { reconcile: "1" },
    }, responseAdapter);
    assert.equal(routeResult.statusCode, 200);
    assert.equal(routeResult.body.plan, "pro");
    assert.equal(routeResult.body.reconciliationError, "missing_stripe_config");
    process.env.STRIPE_PRO_PLUS_PRICE_ID = priceIds.pro_plus;
    if (originalStripeSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalStripeSecret;

    global.fetch = async (_url, options = {}) => {
      if (options.method === "POST") writes.push(JSON.parse(options.body));
      return { ok: true, status: 201, text: async () => "[]" };
    };

    // No stored customer and no Stripe match safely creates the canonical Free
    // state. A Stripe outage propagates to the endpoint, which uses the tested
    // stored-state fallback above.
    const noSubscription = await reconcileSubscription(
      stripe,
      { id: userId, email: "new-player@example.com" },
      null,
      priceIds,
      catalog,
    );
    assert.equal(noSubscription.subscription.plan, "free");
    await assert.rejects(reconcileSubscription(
      {
        subscriptions: { list: async () => { throw Object.assign(new Error("Stripe unavailable"), { code: "api_error" }); } },
        customers: { list: async () => ({ data: [] }) },
        checkout: { sessions: { list: async () => ({ data: [] }) } },
      },
      { id: userId, email: "player@example.com" },
      freshLocal,
      priceIds,
      catalog,
    ));

    await assert.rejects(
      loadStripePriceCatalog({ prices: { retrieve: async () => ({}) } }, { pro: "", pro_plus: "" }),
      (error) => error.code === "stripe_price_config_invalid",
    );

    // A failed webhook write rejects so Stripe can retry. Repeating the same
    // delivery then upserts the same canonical record without corruption.
    const { syncSubscription } = require("../api/stripe-webhook")._test;
    let failNextWrite = true;
    global.fetch = async (_url, options = {}) => {
      if (options.method === "POST" && failNextWrite) {
        failNextWrite = false;
        return { ok: false, status: 503, text: async () => "temporary failure" };
      }
      if (options.method === "POST") writes.push(JSON.parse(options.body));
      return { ok: true, status: options.method === "POST" ? 201 : 200, text: async () => "[]" };
    };
    await assert.rejects(
      syncSubscription(stripeSubscription({ price: priceIds.pro_plus, metadata: { supabase_user_id: userId } }), userId, "customer.subscription.updated"),
    );
    await syncSubscription(
      { ...stripeSubscription({ price: priceIds.pro_plus }), metadata: { supabase_user_id: userId } },
      userId,
      "customer.subscription.updated",
    );
    await syncSubscription(
      { ...stripeSubscription({ price: priceIds.pro_plus }), metadata: { supabase_user_id: userId } },
      userId,
      "customer.subscription.updated",
    );
    assert.equal(writes.at(-1).plan, "pro_plus");
    assert.equal(writes.at(-2).stripe_subscription_id, writes.at(-1).stripe_subscription_id);

    // 9/10. The same server-side predicate rejects Pro and authorizes Pro Plus.
    assert.equal(hasSubscriptionEntitlement(oldPro, "ai", priceIds), false);
    assert.equal(hasSubscriptionEntitlement(result.subscription, "ai", priceIds), true);
    assert.equal(getPlanForSubscription(result.subscription, priceIds), "pro_plus");
    console.log("Subscription synchronization tests passed");
  } finally {
    global.fetch = originalFetch;
    if (originalEnvironment.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalEnvironment.url;
    if (originalEnvironment.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnvironment.key;
    if (originalEnvironment.publicKey === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = originalEnvironment.publicKey;
    if (originalEnvironment.proPrice === undefined) delete process.env.STRIPE_PRO_PRICE_ID;
    else process.env.STRIPE_PRO_PRICE_ID = originalEnvironment.proPrice;
    if (originalEnvironment.proPlusPrice === undefined) delete process.env.STRIPE_PRO_PLUS_PRICE_ID;
    else process.env.STRIPE_PRO_PLUS_PRICE_ID = originalEnvironment.proPlusPrice;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
