const Stripe = require("stripe");
const {
  getAuthenticatedUserSubscription,
  getBearerToken,
  requireSupabasePublicConfig,
  requireSupabaseServerConfig,
  verifySupabaseUserWithDetails,
} = require("../lib/supabase-server");
const { analyzeQuestion, formatDeterministicAnswer, isDirectStatisticalResult } = require("../lib/hitting-ai-stats");
const { explainCalculatedResult, getSafeOpenAIErrorLog } = require("../lib/openai-hitting-client");
const { getStripePriceIds, hasSubscriptionEntitlement } = require("../lib/membership");
const { getAiEligibility } = require("../lib/age-eligibility");
const { loadStripePriceCatalog } = require("../lib/stripe-subscription");
const { isReconciliationDue, reconcileSubscription } = require("../lib/subscription-reconciliation");

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_ITEMS = 6;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_REQUESTS = 12;
const rateLimits = new Map();
const deniedReconciliationTimes = new Map();
const DENIED_RECONCILIATION_COOLDOWN_MS = 60 * 1000;

function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-MAX_HISTORY_ITEMS)
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .map((item) => ({ role: item.role, content: String(item.content || "").trim().slice(0, MAX_MESSAGE_LENGTH) }))
    .filter((item) => item.content);
}

function consumeRateLimit(userId) {
  const now = Date.now();
  const current = rateLimits.get(userId);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= RATE_LIMIT_REQUESTS) return false;
  current.count += 1;
  return true;
}

function shouldReconcileDeniedUser(userId) {
  const now = Date.now();
  const lastChecked = deniedReconciliationTimes.get(userId) || 0;
  if (now - lastChecked < DENIED_RECONCILIATION_COOLDOWN_MS) return false;
  deniedReconciliationTimes.set(userId, now);
  return true;
}

function isMissingProfileColumnError(error, columnName) {
  const message = String(error?.message || "").toLowerCase();
  return (
    ["42703", "PGRST204"].includes(error?.code) && message.includes(columnName)
  ) || (
    message.includes(columnName) &&
    (message.includes("does not exist") || message.includes("could not find"))
  );
}

function isMissingEligibilityColumnError(error) {
  return isMissingProfileColumnError(error, "date_of_birth")
    || isMissingProfileColumnError(error, "guardian_permission_confirmed_at");
}

function isMissingHandednessColumnError(error) {
  return isMissingProfileColumnError(error, "handedness");
}

async function reconcileAiSubscription(user, subscription) {
  const priceIds = getStripePriceIds();
  const entitlementDenied = !hasSubscriptionEntitlement(subscription, "ai", priceIds);
  const due = isReconciliationDue(subscription, { priceIds });
  if (!entitlementDenied && !due) return subscription;
  if (entitlementDenied && !shouldReconcileDeniedUser(user.id)) return subscription;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
  if (!stripeSecretKey || !priceIds.pro || !priceIds.pro_plus) {
    return entitlementDenied ? subscription : null;
  }
  requireSupabaseServerConfig();
  const stripe = new Stripe(stripeSecretKey);
  const catalog = await loadStripePriceCatalog(stripe, priceIds);
  const result = await reconcileSubscription(stripe, user, subscription, priceIds, catalog);
  console.info("subscription_sync", JSON.stringify({
    source: "ai_authorization",
    userId: user.id,
    stripeCustomerId: result.subscription?.stripe_customer_id || subscription?.stripe_customer_id || null,
    stripeSubscriptionId: result.subscription?.stripe_subscription_id || null,
    stripePriceId: result.subscription?.stripe_price_id || null,
    normalizedTier: result.subscription?.plan || "free",
    subscriptionStatus: result.subscription?.subscription_status || "inactive",
    databaseChanged: result.changed,
  }));
  return result.subscription;
}

async function readUserHittingData(accessToken, userId) {
  const { url, publicKey } = requireSupabasePublicConfig();
  const headers = { Authorization: `Bearer ${accessToken}`, apikey: publicKey };
  const profileParams = new URLSearchParams({
    select: "athlete_name,sport_type,handedness,date_of_birth,guardian_permission_confirmed_at",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const gamesParams = new URLSearchParams({
    select: "payload",
    user_id: `eq.${userId}`,
    order: "updated_at.asc",
  });
  let [profileResponse, gamesResponse] = await Promise.all([
    fetch(`${url}/rest/v1/hitting_log_profiles?${profileParams}`, { headers }),
    fetch(`${url}/rest/v1/hitting_log_games?${gamesParams}`, { headers }),
  ]);

  if (!profileResponse.ok) {
    const profileError = await profileResponse.clone().json().catch(() => null);
    if (isMissingEligibilityColumnError(profileError)) {
      console.warn("Hitting Log AI profile schema does not include age eligibility fields; treating date of birth as missing.", {
        userId,
        code: profileError.code || null,
      });
      const compatibleProfileParams = new URLSearchParams({
        select: "athlete_name,sport_type,handedness",
        user_id: `eq.${userId}`,
        limit: "1",
      });
      profileResponse = await fetch(`${url}/rest/v1/hitting_log_profiles?${compatibleProfileParams}`, { headers });
    }
  }

  if (!profileResponse.ok) {
    const profileError = await profileResponse.clone().json().catch(() => null);
    if (isMissingHandednessColumnError(profileError)) {
      console.warn("Hitting Log AI profile schema does not include handedness; using neutral location descriptions.", {
        userId,
        code: profileError.code || null,
      });
      const legacyProfileParams = new URLSearchParams({
        select: "athlete_name,sport_type",
        user_id: `eq.${userId}`,
        limit: "1",
      });
      profileResponse = await fetch(`${url}/rest/v1/hitting_log_profiles?${legacyProfileParams}`, { headers });
    }
  }

  if (!profileResponse.ok || !gamesResponse.ok) {
    throw new Error("Unable to load the authenticated hitter's data.");
  }
  const [profiles, gameRows] = await Promise.all([profileResponse.json(), gamesResponse.json()]);
  return {
    athleteName: profiles?.[0]?.athlete_name || "Your hitter",
    handedness: ["right", "left"].includes(profiles?.[0]?.handedness) ? profiles[0].handedness : null,
    dateOfBirth: profiles?.[0]?.date_of_birth || null,
    guardianPermissionConfirmedAt: profiles?.[0]?.guardian_permission_confirmed_at || null,
    games: (Array.isArray(gameRows) ? gameRows : []).map((row) => row?.payload).filter(Boolean),
  };
}

function directAnswer(result) {
  if (result.type === "refusal") {
    return "I’m the AI Hitting Assistant. I can only help analyze your hitting performance and hitting data.";
  }
  if (result.type === "no_data") {
    return "I don’t have enough hitting data recorded yet to answer that question.";
  }
  if (result.type === "missing_data") {
    if (result.reason === "insufficient_velocity_data") {
      return "I don’t have enough recorded pitch-velocity data yet to determine which velocity you struggle with most.";
    }
    return `I can’t calculate that yet because ${result.field} is not recorded for enough at-bats.`;
  }
  if (result.type === "insufficient_sample") {
    const unit = result.unit === "games" ? "games" : "official at-bats";
    return `I need at least ${result.minimum} ${unit} to evaluate that ${result.unit === "games" ? "comparison" : "trend"}. There are currently ${result.available}.`;
  }
  if (isDirectStatisticalResult(result)) return formatDeterministicAnswer(result);
  return "";
}

function modelFailureAnswer(result) {
  return formatDeterministicAnswer(result);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed", code: "method_not_allowed" });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) return send(res, 401, { error: "Please sign in to use the AI Hitting Assistant.", code: "missing_auth_token" });

  let authentication;
  try {
    authentication = await verifySupabaseUserWithDetails(accessToken);
  } catch (error) {
    console.error("Hitting Log AI authentication failed:", error.message);
    return send(res, 500, { error: "Unable to verify your session.", code: "authentication_failed" });
  }
  if (!authentication.user) {
    return send(res, 401, { error: "Your session has expired. Please sign in again.", code: "invalid_auth_token" });
  }

  let hitterData;
  try {
    hitterData = await readUserHittingData(accessToken, authentication.user.id);
  } catch (error) {
    console.error("Hitting Log AI data lookup failed:", error.message);
    return send(res, 503, { error: "We couldn’t load this hitter’s data right now.", code: "data_load_failed" });
  }

  const eligibility = getAiEligibility(hitterData);
  if (!eligibility.eligible) {
    const responses = {
      date_of_birth_required: {
        error: "We need your date of birth to confirm eligibility for Hitting Log AI. You can add it in My Account.",
        code: "date_of_birth_required",
        actionUrl: "/account.html#profile-date-of-birth-input",
      },
      guardian_permission_required: {
        error: "Parent or legal guardian permission is required to use Hitting Log AI. Confirm permission in My Account.",
        code: "guardian_permission_required",
        actionUrl: "/account.html#profile-date-of-birth-input",
      },
      ai_age_restricted: {
        error: "Hitting Log AI is available only to users age 13 or older.",
        code: "ai_age_restricted",
      },
    };
    return send(res, 403, responses[eligibility.code] || responses.date_of_birth_required);
  }

  let subscription;
  try {
    subscription = await getAuthenticatedUserSubscription(accessToken, authentication.user.id);
    subscription = await reconcileAiSubscription(authentication.user, subscription);
  } catch (error) {
    console.error("Hitting Log AI subscription lookup failed:", error.message);
    return send(res, 503, { error: "We couldn’t verify your membership right now.", code: "subscription_check_failed" });
  }
  if (!hasSubscriptionEntitlement(subscription, "ai")) {
    return send(res, 402, {
      error: "AI Hitting Assistant is available with Pro Plus.",
      code: "upgrade_required",
      upgradeUrl: "/account",
    });
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return send(res, 400, { error: "Enter a question about your hitting data.", code: "message_required" });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return send(res, 400, { error: `Keep questions under ${MAX_MESSAGE_LENGTH} characters.`, code: "message_too_long" });
  }
  const history = sanitizeHistory(req.body?.history);
  if (!consumeRateLimit(authentication.user.id)) {
    return send(res, 429, { error: "You’ve asked several questions quickly. Please wait a few minutes and try again.", code: "rate_limited" });
  }

  const result = analyzeQuestion({ message, history, games: hitterData.games, handedness: hitterData.handedness });
  const immediateAnswer = directAnswer(result);
  if (immediateAnswer) {
    return send(res, 200, { answer: immediateAnswer, athleteName: hitterData.athleteName });
  }

  try {
    const answer = await explainCalculatedResult({
      message,
      result,
      userId: authentication.user.id,
    });
    return send(res, 200, { answer, athleteName: hitterData.athleteName });
  } catch (error) {
    console.error("Hitting Log AI OpenAI request failed:", JSON.stringify(getSafeOpenAIErrorLog(error)));
    const fallbackAnswer = modelFailureAnswer(result);
    if (fallbackAnswer) {
      return send(res, 200, { answer: fallbackAnswer, athleteName: hitterData.athleteName });
    }
    const notConfigured = error.code === "OPENAI_API_KEY_MISSING";
    return send(res, notConfigured ? 503 : 502, {
      error: notConfigured
        ? "The AI Hitting Assistant is being configured. Please try again soon."
        : "The AI Hitting Assistant couldn’t generate a response. Please try again.",
      code: notConfigured ? "ai_not_configured" : "ai_request_failed",
    });
  }
};

module.exports._test = {
  consumeRateLimit,
  directAnswer,
  isMissingEligibilityColumnError,
  isMissingHandednessColumnError,
  isMissingProfileColumnError,
  modelFailureAnswer,
  sanitizeHistory,
  shouldReconcileDeniedUser,
};
