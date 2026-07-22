const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILTERABLE_SUBSCRIPTION_COLUMNS = new Set([
  "user_id",
  "stripe_customer_id",
  "stripe_subscription_id",
]);
const SUPABASE_ENVIRONMENT_VARIABLES = {
  url: [
    "HITTING_LOG_SUPABASE_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "VITE_SUPABASE_URL",
  ],
  publicKey: [
    "HITTING_LOG_SUPABASE_ANON_KEY",
    "HITTING_LOG_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ],
  adminKey: [
    "HITTING_LOG_SUPABASE_SECRET_KEY",
    "SUPABASE_SECRET_KEY",
    "HITTING_LOG_SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
};

function readEnvironmentValue(variableNames) {
  for (const variableName of variableNames) {
    if (process.env[variableName]) {
      return process.env[variableName];
    }
  }

  return "";
}

function createMissingEnvironmentError(missingGroups) {
  const descriptions = missingGroups.map((groupName) => {
    return `Missing environment variable: ${SUPABASE_ENVIRONMENT_VARIABLES[groupName].join(" or ")}`;
  });

  const error = new Error(descriptions.join("; "));
  error.code = "SUPABASE_ENVIRONMENT_MISSING";
  error.missingGroups = missingGroups;
  return error;
}

function getSupabaseServerConfig() {
  return {
    url: readEnvironmentValue(SUPABASE_ENVIRONMENT_VARIABLES.url),
    publicKey: readEnvironmentValue(SUPABASE_ENVIRONMENT_VARIABLES.publicKey),
    adminKey: readEnvironmentValue(SUPABASE_ENVIRONMENT_VARIABLES.adminKey),
  };
}

function requireSupabaseServerConfig({ requirePublicKey = false } = {}) {
  const config = getSupabaseServerConfig();

  const missingGroups = [
    ...(!config.url ? ["url"] : []),
    ...(!config.adminKey ? ["adminKey"] : []),
    ...(requirePublicKey && !config.publicKey ? ["publicKey"] : []),
  ];

  if (missingGroups.length > 0) {
    throw createMissingEnvironmentError(missingGroups);
  }

  return config;
}

function requireSupabasePublicConfig() {
  const config = getSupabaseServerConfig();

  const missingGroups = [
    ...(!config.url ? ["url"] : []),
    ...(!config.publicKey ? ["publicKey"] : []),
  ];

  if (missingGroups.length > 0) {
    throw createMissingEnvironmentError(missingGroups);
  }

  return config;
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || req.headers.Authorization || "";
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

async function verifySupabaseUserWithDetails(accessToken) {
  const { url, publicKey } = requireSupabasePublicConfig();

  if (!accessToken) {
    return {
      user: null,
      status: 401,
      error: "Missing authentication token",
    };
  }

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: publicKey,
    },
  });

  const responseText = await response.text();
  let responseBody = null;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch (error) {
      responseBody = null;
    }
  }

  if (!response.ok) {
    return {
      user: null,
      status: response.status,
      error:
        responseBody?.message ||
        responseBody?.error_description ||
        responseBody?.error ||
        responseText ||
        `Supabase authentication failed with HTTP ${response.status}`,
    };
  }

  if (!isValidUserId(responseBody?.id)) {
    return {
      user: null,
      status: response.status,
      error: "Supabase returned an invalid authenticated user",
    };
  }

  return {
    user: responseBody,
    status: response.status,
    error: null,
  };
}

async function verifySupabaseUser(accessToken) {
  const result = await verifySupabaseUserWithDetails(accessToken);
  return result.user;
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
    throw new Error(`Supabase subscription request failed (${response.status}): ${responseText}`);
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
  getSupabaseServerConfig,
  getSubscriptionBy,
  isValidUserId,
  requireSupabasePublicConfig,
  requireSupabaseServerConfig,
  upsertSubscription,
  verifySupabaseUser,
  verifySupabaseUserWithDetails,
};
