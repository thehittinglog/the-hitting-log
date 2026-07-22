const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILTERABLE_SUBSCRIPTION_COLUMNS = new Set([
  "user_id",
  "stripe_customer_id",
  "stripe_subscription_id",
]);

function getSupabaseServerConfig() {
  return {
    url:
      process.env.HITTING_LOG_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "",
    publicKey:
      process.env.HITTING_LOG_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      "",
    adminKey:
      process.env.HITTING_LOG_SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.HITTING_LOG_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "",
  };
}

function requireSupabaseServerConfig({ requirePublicKey = false } = {}) {
  const config = getSupabaseServerConfig();

  if (!config.url || !config.adminKey || (requirePublicKey && !config.publicKey)) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return config;
}

function requireSupabasePublicConfig() {
  const config = getSupabaseServerConfig();

  if (!config.url || !config.publicKey) {
    throw new Error("Supabase public server environment variables are missing.");
  }

  return config;
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";
  return typeof authorization === "string" && authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
}

function getApplicationOrigin() {
  const configuredOrigin =
    process.env.APP_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";

  if (!configuredOrigin) {
    throw new Error("The application URL environment variable is missing.");
  }

  const url = new URL(configuredOrigin);

  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("The application URL is invalid.");
  }

  return url.origin;
}

async function verifySupabaseUser(accessToken) {
  const { url, publicKey } = requireSupabasePublicConfig();

  if (!accessToken) {
    return null;
  }

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: publicKey,
    },
  });

  if (!response.ok) {
    return null;
  }

  const user = await response.json();
  return isValidUserId(user?.id) ? user : null;
}

function isValidUserId(value) {
  return typeof value === "string" && USER_ID_PATTERN.test(value);
}

async function runAdminRequest(path, options = {}) {
  const { url, adminKey } = requireSupabaseServerConfig();
  const authorizationHeaders = adminKey.startsWith("sb_secret_")
    ? {}
    : { Authorization: `Bearer ${adminKey}` };
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: adminKey,
      ...authorizationHeaders,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Supabase database request failed (${response.status}): ${responseText.slice(0, 300)}`);
  }

  if (response.status === 204) {
    return null;
  }

  const responseText = await response.text();
  return responseText ? JSON.parse(responseText) : null;
}

async function getSubscriptionBy(column, value) {
  if (!FILTERABLE_SUBSCRIPTION_COLUMNS.has(column) || !value) {
    return null;
  }

  const parameters = new URLSearchParams({
    select:
      "user_id,stripe_customer_id,stripe_subscription_id,subscription_status,stripe_price_id,current_period_end,cancel_at_period_end,plan",
    [column]: `eq.${value}`,
    limit: "1",
  });
  const rows = await runAdminRequest(`subscriptions?${parameters.toString()}`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function getAuthenticatedUserSubscription(accessToken, userId) {
  if (!accessToken || !isValidUserId(userId)) {
    return null;
  }

  const { url, publicKey } = requireSupabasePublicConfig();
  const parameters = new URLSearchParams({
    select:
      "user_id,stripe_customer_id,stripe_subscription_id,subscription_status,stripe_price_id,current_period_end,cancel_at_period_end,plan",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const response = await fetch(`${url}/rest/v1/subscriptions?${parameters.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: publicKey,
    },
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Supabase subscription request failed (${response.status}): ${responseText.slice(0, 300)}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function upsertSubscription(record) {
  if (!isValidUserId(record?.user_id)) {
    throw new Error("Cannot update a subscription without a valid Supabase user ID.");
  }

  const parameters = new URLSearchParams({ on_conflict: "user_id" });
  await runAdminRequest(`subscriptions?${parameters.toString()}`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      ...record,
      updated_at: new Date().toISOString(),
    }),
  });
}

module.exports = {
  getApplicationOrigin,
  getAuthenticatedUserSubscription,
  getBearerToken,
  getSubscriptionBy,
  isValidUserId,
  requireSupabasePublicConfig,
  requireSupabaseServerConfig,
  upsertSubscription,
  verifySupabaseUser,
};
