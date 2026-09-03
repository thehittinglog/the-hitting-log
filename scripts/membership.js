(function () {
  const FREE_GAME_LIMIT = 10;
  const PAID_PLANS = new Set(["pro", "pro_plus"]);
  const ACTIVE_STATUSES = new Set(["active", "trialing"]);
  let statusPromise = null;

  function normalizeState(data) {
    const status = typeof data?.status === "string" ? data.status : "inactive";
    const requestedPlan = ["free", "pro", "pro_plus"].includes(data?.plan) ? data.plan : "free";
    const plan = PAID_PLANS.has(requestedPlan) && ACTIVE_STATUSES.has(status)
      ? requestedPlan
      : "free";

    return {
      ...data,
      plan,
      status,
      entitlements: {
        gameLimit: plan === "free" ? FREE_GAME_LIMIT : null,
        unlimitedGames: PAID_PLANS.has(plan),
        fullStatistics: PAID_PLANS.has(plan),
        charts: PAID_PLANS.has(plan),
        ai: plan === "pro_plus",
      },
    };
  }

  async function loadStatus({ force = false } = {}) {
    if (!force && statusPromise) {
      return statusPromise;
    }

    statusPromise = (async () => {
      if (!window.hittingLogAuth?.getCurrentSession) {
        throw new Error("Authentication is not available.");
      }

      const { data, error } = await window.hittingLogAuth.getCurrentSession();
      if (error) {
        throw error;
      }

      if (!data?.session?.access_token) {
        throw new Error("Your login session has expired.");
      }

      const endpoint = force ? "/api/subscription-status?reconcile=1" : "/api/subscription-status";
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData.error || "Your membership could not be verified.");
      }

      const state = normalizeState(responseData);
      window.hittingLogMembershipState = state;
      return state;
    })();

    try {
      return await statusPromise;
    } catch (error) {
      statusPromise = null;
      throw error;
    }
  }

  window.hittingLogMembership = {
    FREE_GAME_LIMIT,
    loadStatus,
    normalizeState,
  };
})();
