const assert = require("node:assert/strict");
const Module = require("node:module");

let profile = {};
let openAIRequests = 0;
let lastOpenAIInput = "";
const originalLoad = Module._load;
const originalFetch = global.fetch;

Module._load = function mockLoad(request, parent, isMain) {
  if (request === "stripe") return function Stripe() {};
  if (request === "../lib/supabase-server") return {
    getAuthenticatedUserSubscription: async () => ({ plan: "pro_plus", subscription_status: "active" }),
    getBearerToken: () => "token",
    requireSupabasePublicConfig: () => ({ url: "https://example.supabase.co", publicKey: "public-key" }),
    requireSupabaseServerConfig: () => ({}),
    verifySupabaseUserWithDetails: async () => ({ user: { id: "user-1" } }),
  };
  if (request === "../lib/hitting-ai-stats") return {
    analyzeQuestion: () => ({ type: "performance_analysis" }),
    formatDeterministicAnswer: () => "fallback",
    isDirectStatisticalResult: () => false,
  };
  if (request === "../lib/openai-hitting-client") return {
    explainCalculatedResult: async (input) => {
      openAIRequests += 1;
      lastOpenAIInput = JSON.stringify(input);
      return "answer";
    },
    getSafeOpenAIErrorLog: () => ({}),
  };
  if (request === "../lib/membership") return {
    getStripePriceIds: () => ({ pro: "pro", pro_plus: "pro-plus" }),
    hasSubscriptionEntitlement: () => true,
  };
  if (request === "../lib/stripe-subscription") return { loadStripePriceCatalog: async () => ({}) };
  if (request === "../lib/subscription-reconciliation") return {
    isReconciliationDue: () => false,
    reconcileSubscription: async () => ({ subscription: null, changed: false }),
  };
  return originalLoad(request, parent, isMain);
};

global.fetch = async (url) => ({
  ok: true,
  async json() {
    return String(url).includes("hitting_log_profiles") ? [profile] : [];
  },
  clone() { return this; },
});

const handler = require("../api/hitting-ai");

function invoke() {
  return new Promise((resolve, reject) => {
    const response = {
      setHeader() {},
      status(status) { this.statusCode = status; return this; },
      json(body) { resolve({ status: this.statusCode, body }); },
    };
    Promise.resolve(handler({ method: "POST", body: { message: "How am I doing?" } }, response)).catch(reject);
  });
}

function birthDateYearsAgo(years) {
  const today = new Date();
  const year = today.getUTCFullYear() - years;
  return `${year}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
}

(async () => {
  profile = { athlete_name: "Existing Player", date_of_birth: null };
  let result = await invoke();
  assert.equal(result.status, 403);
  assert.equal(result.body.code, "date_of_birth_required");
  assert.equal(openAIRequests, 0);

  profile = { athlete_name: "Young Player", date_of_birth: birthDateYearsAgo(12) };
  result = await invoke();
  assert.equal(result.body.code, "ai_age_restricted");
  assert.equal(openAIRequests, 0);

  profile = { athlete_name: "Teen Player", date_of_birth: birthDateYearsAgo(13), guardian_permission_confirmed_at: null };
  result = await invoke();
  assert.equal(result.body.code, "guardian_permission_required");
  assert.equal(openAIRequests, 0);

  profile = { athlete_name: "Teen Player", date_of_birth: birthDateYearsAgo(17), guardian_permission_confirmed_at: null };
  result = await invoke();
  assert.equal(result.body.code, "guardian_permission_required");
  assert.equal(openAIRequests, 0);

  profile = { athlete_name: "Teen Player", date_of_birth: birthDateYearsAgo(17), guardian_permission_confirmed_at: "2026-09-06T00:00:00Z" };
  result = await invoke();
  assert.equal(result.status, 200);
  assert.equal(openAIRequests, 1);

  profile = { athlete_name: "Adult Player", date_of_birth: birthDateYearsAgo(18) };
  result = await invoke();
  assert.equal(result.status, 200);
  assert.equal(openAIRequests, 2);

  profile = {
    athlete_name: "Adult Player",
    date_of_birth: birthDateYearsAgo(29),
    guardian_permission_confirmed_at: "2020-01-01T00:00:00Z",
  };
  result = await invoke();
  assert.equal(result.status, 200);
  assert.equal(openAIRequests, 3);
  assert.doesNotMatch(lastOpenAIInput, /dateOfBirth|date_of_birth|guardianPermission|guardian_permission|\bage\b/i);

  console.log("Hitting Log AI age-gate tests passed");
})().finally(() => {
  Module._load = originalLoad;
  global.fetch = originalFetch;
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
