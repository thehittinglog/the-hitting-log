const {
  getAuthenticatedUserSubscription,
  getBearerToken,
  requireSupabasePublicConfig,
  verifySupabaseUserWithDetails,
} = require("../lib/supabase-server");
const { analyzeQuestion } = require("../lib/hitting-ai-stats");
const { explainCalculatedResult } = require("../lib/openai-hitting-client");

const PAID_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);
const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_ITEMS = 6;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_REQUESTS = 12;
const rateLimits = new Map();

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

async function readUserHittingData(accessToken, userId) {
  const { url, publicKey } = requireSupabasePublicConfig();
  const headers = { Authorization: `Bearer ${accessToken}`, apikey: publicKey };
  const profileParams = new URLSearchParams({
    select: "athlete_name,sport_type",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const gamesParams = new URLSearchParams({
    select: "payload",
    user_id: `eq.${userId}`,
    order: "updated_at.asc",
  });
  const [profileResponse, gamesResponse] = await Promise.all([
    fetch(`${url}/rest/v1/hitting_log_profiles?${profileParams}`, { headers }),
    fetch(`${url}/rest/v1/hitting_log_games?${gamesParams}`, { headers }),
  ]);
  if (!profileResponse.ok || !gamesResponse.ok) {
    throw new Error("Unable to load the authenticated hitter's data.");
  }
  const [profiles, gameRows] = await Promise.all([profileResponse.json(), gamesResponse.json()]);
  return {
    athleteName: profiles?.[0]?.athlete_name || "Your hitter",
    games: (Array.isArray(gameRows) ? gameRows : []).map((row) => row?.payload).filter(Boolean),
  };
}

function directAnswer(result) {
  if (result.type === "refusal") {
    return "I’m Hitting AI, so I can only answer questions about this hitter’s statistics and hitting performance.";
  }
  if (result.type === "no_data") {
    return "I don’t have enough hitting data recorded yet to answer that question.";
  }
  if (result.type === "missing_data") {
    return `I can’t calculate that yet because ${result.field} is not recorded for enough at-bats.`;
  }
  if (result.type === "insufficient_sample") {
    return `I need at least ${result.minimum} official at-bats to evaluate that trend. There are currently ${result.available}.`;
  }
  return "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed", code: "method_not_allowed" });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) return send(res, 401, { error: "Please sign in to use Hitting AI.", code: "missing_auth_token" });

  let authentication;
  try {
    authentication = await verifySupabaseUserWithDetails(accessToken);
  } catch (error) {
    console.error("Hitting AI authentication failed:", error.message);
    return send(res, 500, { error: "Unable to verify your session.", code: "authentication_failed" });
  }
  if (!authentication.user) {
    return send(res, 401, { error: "Your session has expired. Please sign in again.", code: "invalid_auth_token" });
  }

  let subscription;
  try {
    subscription = await getAuthenticatedUserSubscription(accessToken, authentication.user.id);
  } catch (error) {
    console.error("Hitting AI subscription lookup failed:", error.message);
    return send(res, 503, { error: "We couldn’t verify your membership right now.", code: "subscription_check_failed" });
  }
  if (subscription?.plan !== "pro" || !PAID_STATUSES.has(subscription?.subscription_status)) {
    return send(res, 402, {
      error: "AI Hitting Insights is available with a paid Hitting Log membership. Upgrade to ask questions about your hitting data and uncover deeper performance trends.",
      code: "upgrade_required",
      upgradeUrl: "/account",
    });
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return send(res, 400, { error: "Enter a question about your hitting data.", code: "message_required" });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return send(res, 400, { error: `Keep questions under ${MAX_MESSAGE_LENGTH} characters.`, code: "message_too_long" });
  }
  if (!consumeRateLimit(authentication.user.id)) {
    return send(res, 429, { error: "You’ve asked several questions quickly. Please wait a few minutes and try again.", code: "rate_limited" });
  }

  const history = sanitizeHistory(req.body?.history);
  let hitterData;
  try {
    hitterData = await readUserHittingData(accessToken, authentication.user.id);
  } catch (error) {
    console.error("Hitting AI data lookup failed:", error.message);
    return send(res, 503, { error: "We couldn’t load this hitter’s data right now.", code: "data_load_failed" });
  }

  const result = analyzeQuestion({ message, history, games: hitterData.games });
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
    console.error("Hitting AI model request failed:", error.code || error.message);
    const notConfigured = error.code === "OPENAI_API_KEY_MISSING";
    return send(res, notConfigured ? 503 : 502, {
      error: notConfigured
        ? "Hitting AI is being configured. Please try again soon."
        : "Hitting AI couldn’t generate a response. Please try again.",
      code: notConfigured ? "ai_not_configured" : "ai_request_failed",
    });
  }
};

module.exports._test = { consumeRateLimit, directAnswer, sanitizeHistory };
