const Stripe = require("stripe");
const {
  getApplicationOrigin,
  getBearerToken,
  getSubscriptionBy,
  verifySupabaseUser,
} = require("../lib/supabase-server");

const MANAGED_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;

    if (!stripeSecretKey || !stripePriceId) {
      return res.status(500).json({
        error: "Stripe environment variables are missing.",
      });
    }

    const accessToken = getBearerToken(req);

    if (!accessToken) {
      return res.status(401).json({
        error: "You must be signed in to upgrade.",
      });
    }

    const user = await verifySupabaseUser(accessToken);

    if (!user) {
      return res.status(401).json({
        error: "Your login session could not be verified.",
      });
    }

    const existingSubscription = await getSubscriptionBy("user_id", user.id);

    if (MANAGED_SUBSCRIPTION_STATUSES.has(existingSubscription?.subscription_status)) {
      return res.status(409).json({
        error: "You already have a subscription. Use Manage Billing from your account page.",
      });
    }

    const stripe = new Stripe(stripeSecretKey);

    const origin = getApplicationOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(existingSubscription?.stripe_customer_id
        ? { customer: existingSubscription.stripe_customer_id }
        : { customer_email: user.email }),
      client_reference_id: user.id,
      line_items: [
        {
          price: stripePriceId,
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

    return res.status(200).json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe Checkout error:", error);

    return res.status(500).json({
      error: "Unable to start Stripe Checkout. Please try again.",
    });
  }
};
