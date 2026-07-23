const Stripe = require("stripe");
const {
  getApplicationOrigin,
  getAuthenticatedUserSubscription,
  getBearerToken,
  requireSupabasePublicConfig,
  verifySupabaseUser,
} = require("../lib/supabase-server");

const MANAGED_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getStripeMode(secretKey) {
  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  return "unknown";
}

function getSafeStripeError(error) {
  if (error?.type === "StripeAuthenticationError") {
    return "Stripe authentication failed. Check the STRIPE_SECRET_KEY configured in Vercel.";
  }

  if (error?.code === "resource_missing") {
    return "The configured Stripe Price ID was not found. Make sure STRIPE_SECRET_KEY and STRIPE_PRICE_ID use the same Stripe test or live mode.";
  }

  if (error?.type === "StripeInvalidRequestError") {
    return "Stripe rejected the Checkout configuration. Verify that STRIPE_PRICE_ID is an active recurring Price.";
  }

  if (error?.type === "StripeRateLimitError" || error?.type === "StripeAPIError") {
    return "Stripe is temporarily unavailable. Please try again in a moment.";
  }

  return "Unable to start Stripe Checkout. Please try again.";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PRICE_ID;

  if (!stripeSecretKey || !stripePriceId) {
    console.error("Stripe Checkout configuration error: STRIPE_SECRET_KEY or STRIPE_PRICE_ID is missing.");
    return res.status(500).json({
      error: "Stripe Checkout is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Vercel, then redeploy.",
    });
  }

  if (getStripeMode(stripeSecretKey) === "unknown" || !stripePriceId.startsWith("price_")) {
    console.error("Stripe Checkout configuration error: Invalid Stripe secret key or Price ID format.");
    return res.status(500).json({
      error: "Stripe Checkout configuration is invalid. Check STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Vercel.",
    });
  }

  try {
    requireSupabasePublicConfig();
  } catch (error) {
    console.error("Stripe Checkout Supabase configuration error:", error.message);
    return res.status(500).json({
      error: "Checkout authentication is not configured. Check Vercel logs for the missing Supabase environment variable.",
    });
  }

  let origin;

  try {
    origin = getApplicationOrigin();
  } catch (error) {
    console.error("Stripe Checkout application URL error:", error);
    return res.status(500).json({
      error: "Checkout return URLs are not configured. Set APP_URL in Vercel, then redeploy.",
    });
  }

  const accessToken = getBearerToken(req);

  if (!accessToken) {
    return res.status(401).json({
      error: "You must be signed in to upgrade.",
    });
  }

  let user;

  try {
    user = await verifySupabaseUser(accessToken);
  } catch (error) {
    console.error("Stripe Checkout Supabase authentication error:", error);
    return res.status(502).json({
      error: "Your login could not be verified right now. Please try again.",
    });
  }

  if (!user) {
    return res.status(401).json({
      error: "Your login session has expired. Please sign in again.",
    });
  }

  const customerEmail = String(user.email || "").trim().toLowerCase();

  if (!EMAIL_PATTERN.test(customerEmail)) {
    return res.status(422).json({
      error: "Your authenticated account does not have a valid email address for Stripe Checkout.",
    });
  }

  let existingSubscription;

  console.info("Stripe Checkout authenticated user ID:", user.id);

  try {
    existingSubscription = await getAuthenticatedUserSubscription(accessToken, user.id);
    console.info("Stripe Checkout subscription record exists:", Boolean(existingSubscription));
    console.info("Stripe Checkout Stripe customer ID exists:", Boolean(existingSubscription?.stripe_customer_id));
  } catch (error) {
    console.error("Stripe Checkout subscription lookup error:", error);
    return res.status(502).json({
      error: "Your subscription status could not be verified. Please try again.",
    });
  }

  if (MANAGED_SUBSCRIPTION_STATUSES.has(existingSubscription?.subscription_status)) {
    return res.status(409).json({
      error: "You already have a subscription. Use Manage Billing from your account page.",
    });
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    const price = await stripe.prices.retrieve(stripePriceId);
    const expectedLiveMode = getStripeMode(stripeSecretKey) === "live";

    if (price.livemode !== expectedLiveMode) {
      console.error("Stripe Checkout configuration error: Stripe key and Price modes do not match.");
      return res.status(500).json({
        error: "Stripe test and live values are mixed. Use a Price ID from the same mode as STRIPE_SECRET_KEY.",
      });
    }

    if (!price.active || price.type !== "recurring" || !price.recurring) {
      console.error("Stripe Checkout configuration error: The configured Price is not active and recurring.");
      return res.status(500).json({
        error: "The configured Stripe Price must be active and recurring.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      allow_promotion_codes: true,
      ...(existingSubscription?.stripe_customer_id
        ? { customer: existingSubscription.stripe_customer_id }
        : { customer_email: customerEmail }),
      client_reference_id: user.id,
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/account?checkout=cancelled`,
    });

    if (!session.url) {
      console.error("Stripe Checkout error: Checkout Session was created without a URL.", session.id);
      return res.status(502).json({
        error: "Stripe did not return a Checkout URL. Please try again.",
      });
    }

    return res.status(200).json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe Checkout error:", error);
    return res.status(500).json({
      error: getSafeStripeError(error),
    });
  }
};
