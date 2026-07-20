const Stripe = require("stripe");

function getSupabaseConfig() {
  return {
    url:
      process.env.HITTING_LOG_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "",
    anonKey:
      process.env.HITTING_LOG_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "",
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;
    const { url: supabaseUrl, anonKey } = getSupabaseConfig();

    if (!stripeSecretKey || !stripePriceId) {
      return res.status(500).json({
        error: "Stripe environment variables are missing.",
      });
    }

    if (!supabaseUrl || !anonKey) {
      return res.status(500).json({
        error: "Supabase environment variables are missing.",
      });
    }

    const authorization = req.headers.authorization || "";
    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!accessToken) {
      return res.status(401).json({
        error: "You must be signed in to upgrade.",
      });
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
    });

    if (!userResponse.ok) {
      return res.status(401).json({
        error: "Your login session could not be verified.",
      });
    }

    const user = await userResponse.json();
    const stripe = new Stripe(stripeSecretKey);

    const origin =
      req.headers.origin ||
      `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
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
      error: error.message || "Unable to start Stripe Checkout.",
    });
  }
};
