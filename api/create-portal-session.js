const Stripe = require("stripe");
const {
  getApplicationOrigin,
  getBearerToken,
  getSubscriptionBy,
  requireSupabaseServerConfig,
  verifySupabaseUser,
} = require("../lib/supabase-server");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    requireSupabaseServerConfig({ requirePublicKey: true });

    if (!stripeSecretKey) {
      return res.status(500).json({ error: "Billing is temporarily unavailable." });
    }

    const user = await verifySupabaseUser(getBearerToken(req));

    if (!user) {
      return res.status(401).json({ error: "Your login session could not be verified." });
    }

    const subscription = await getSubscriptionBy("user_id", user.id);

    if (!subscription?.stripe_customer_id) {
      return res.status(404).json({ error: "No Stripe billing account was found." });
    }

    const stripe = new Stripe(stripeSecretKey);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${getApplicationOrigin()}/account`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe Billing Portal error:", error);
    return res.status(500).json({ error: "Unable to open billing management. Please try again." });
  }
};
