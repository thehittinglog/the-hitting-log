(function () {
  const PUBLIC_SIGNUP_ENABLED = true;
  const LOGIN_MESSAGES = {
    invalid_credentials: "Incorrect email or password.",
    unverified_email: "Please verify your email address before signing in. Check your inbox for the verification link.",
    rate_limited: "Too many sign-in attempts. Please wait a few minutes and try again.",
    connection: "We couldn't connect to the authentication service. Check your connection and try again.",
    service: "Sign-in is temporarily unavailable. Please try again in a few minutes.",
    unexpected: "We couldn't sign you in. Please try again.",
  };

  function getSafeAuthCode(error) {
    const code = typeof error?.code === "string" ? error.code.trim().toLowerCase() : "";
    return /^[a-z0-9_]{1,80}$/.test(code) ? code : null;
  }

  function getSafeHttpStatus(error) {
    const status = Number(error?.status);
    return Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
  }

  function classifyLoginError(error) {
    const code = getSafeAuthCode(error);
    const status = getSafeHttpStatus(error);
    const errorName = typeof error?.name === "string" ? error.name : "";
    const errorMessage = typeof error?.message === "string" ? error.message : "";
    let category = "unexpected";

    if (code === "invalid_credentials") {
      category = "invalid_credentials";
    } else if (code === "email_not_confirmed") {
      category = "unverified_email";
    } else if (
      status === 429 ||
      code === "over_request_rate_limit" ||
      code === "over_email_send_rate_limit"
    ) {
      category = "rate_limited";
    } else if (
      errorName === "AuthRetryableFetchError" ||
      /failed to fetch|network(?: request)? failed|load failed|connection|offline|timed? out/i.test(errorMessage)
    ) {
      category = "connection";
    } else if (
      (status !== null && status >= 500) ||
      code === "unexpected_failure" ||
      code === "hook_timeout" ||
      code === "hook_timeout_after_retry"
    ) {
      category = "service";
    }

    return {
      category,
      message: LOGIN_MESSAGES[category],
    };
  }

  function createLoginFailureDiagnostic(error, requestStartedAt, recordedAt = Date.now()) {
    const start = Number(requestStartedAt);
    const end = Number(recordedAt);
    const requestDurationMs = Number.isFinite(start) && Number.isFinite(end)
      ? Math.max(0, Math.round(end - start))
      : null;

    return {
      category: classifyLoginError(error).category,
      code: getSafeAuthCode(error),
      httpStatus: getSafeHttpStatus(error),
      timestamp: new Date(Number.isFinite(end) ? end : Date.now()).toISOString(),
      requestDurationMs,
    };
  }

  async function getClient() {
    const client = await window.hittingLogSupabaseReady;

    if (!client) {
      throw new Error("Supabase authentication is not configured yet.");
    }

    return client;
  }

  async function signUp({ email, password, options } = {}) {
    if (!PUBLIC_SIGNUP_ENABLED) {
      return {
        data: null,
        error: new Error("Account creation is temporarily unavailable."),
      };
    }

    const client = await getClient();
    console.info("[Signup][Auth] Supabase signUp request started");

    const result = await client.auth.signUp({
      email,
      password,
      options,
    });

    console.info("[Signup][Auth] Supabase signUp response", {
      userId: result.data?.user?.id || null,
      hasSession: Boolean(result.data?.session),
      authError: result.error
        ? {
            message: result.error.message,
            status: result.error.status,
            code: result.error.code,
            name: result.error.name,
          }
        : null,
    });

    if (result.error) {
      const authError = result.error;
      console.error("[Signup][Auth] Full error:", {
        message: authError?.message,
        status: authError?.status,
        code: authError?.code,
        name: authError?.name,
        error: authError,
      });
      console.log(
        "[Signup][Auth] Error JSON:",
        JSON.stringify(authError, null, 2)
      );
    }

    return result;
  }

  async function logIn({ email, password } = {}) {
    const client = await getClient();
    return client.auth.signInWithPassword({
      email,
      password,
    });
  }

  async function logOut() {
    const client = await getClient();
    return client.auth.signOut();
  }

  async function getCurrentSession() {
    const client = await getClient();
    return client.auth.getSession();
  }

  async function requestPasswordReset({ email, redirectTo } = {}) {
    const client = await getClient();
    return client.auth.resetPasswordForEmail(email, { redirectTo });
  }

  async function updatePassword(password) {
    const client = await getClient();
    return client.auth.updateUser({ password });
  }

  async function updateProfile(data) {
    const client = await getClient();
    return client.auth.updateUser({ data });
  }

  async function onAuthStateChange(callback) {
    const client = await getClient();
    return client.auth.onAuthStateChange(callback);
  }

  window.hittingLogAuth = {
    PUBLIC_SIGNUP_ENABLED,
    signUp,
    logIn,
    logOut,
    getCurrentSession,
    requestPasswordReset,
    updatePassword,
    updateProfile,
    onAuthStateChange,
    classifyLoginError,
    createLoginFailureDiagnostic,
  };
})();
